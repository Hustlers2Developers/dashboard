import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, ensureSupabaseSession } from '@/lib/supabase-client';
import { getUserId } from '@/lib/auth/token-manager';

export type ConversationKind = 'dm' | 'group' | 'temp_group';

export interface ConversationRow {
  id: string;
  kind: ConversationKind;
  title: string | null;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  archived_at: string | null;
}

export interface ConversationMemberRow {
  conversation_id: string;
  app_user_id: string;
  joined_at: string;
  last_read_at: string;
  hidden_at: string | null;
  muted_at: string | null;
  pinned_at: string | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_app_user_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  reply_to_message_id: string | null;
}

export interface ConversationSummary extends ConversationRow {
  members: ConversationMemberRow[];
  lastMessage: MessageRow | null;
  unreadCount: number;
  /** My own membership row's pinned/muted state — null if I'm somehow not a member. */
  myMembership: ConversationMemberRow | null;
}

/** Lists the current user's conversations with members, last message, and unread count. Re-run manually via refresh(). */
export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Multiple components (Chat page, NotificationBell) mount this hook at the
  // same time — each needs its own Realtime channel instance, or a shared
  // channel name causes the client to silently drop one side's subscription.
  const instanceId = useId();

  const load = useCallback(async () => {
    try {
      await ensureSupabaseSession();
      const myAppUserId = getUserId() ?? undefined;

      const { data: memberRows, error: memberErr } = await supabase
        .from('conversation_members')
        .select('conversation_id, app_user_id, joined_at, last_read_at, hidden_at, muted_at, pinned_at');
      if (memberErr) throw memberErr;

      // "Delete for me" (hidden_at set on MY OWN membership row) drops a
      // conversation from this list entirely — it's a per-member hide, not a
      // shared delete, so it never touches the conversations/messages rows.
      const myConversationIds = Array.from(
        new Set(
          (memberRows ?? [])
            .filter((m) => m.app_user_id === myAppUserId && !m.hidden_at)
            .map((m) => m.conversation_id),
        ),
      );
      if (myConversationIds.length === 0) {
        setConversations([]);
        return;
      }

      const { data: convoRows, error: convoErr } = await supabase
        .from('conversations')
        .select('*')
        .in('id', myConversationIds)
        .order('created_at', { ascending: false });
      if (convoErr) throw convoErr;

      const { data: allMembers, error: allMembersErr } = await supabase
        .from('conversation_members')
        .select('conversation_id, app_user_id, joined_at, last_read_at, hidden_at, muted_at, pinned_at')
        .in('conversation_id', myConversationIds);
      if (allMembersErr) throw allMembersErr;

      const { data: lastMessages, error: msgErr } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', myConversationIds)
        .order('created_at', { ascending: false });
      if (msgErr) throw msgErr;

      const membersByConvo = new Map<string, ConversationMemberRow[]>();
      for (const m of allMembers ?? []) {
        const arr = membersByConvo.get(m.conversation_id) ?? [];
        arr.push(m);
        membersByConvo.set(m.conversation_id, arr);
      }

      const lastMessageByConvo = new Map<string, MessageRow>();
      const unreadByConvo = new Map<string, number>();
      const myReadCursor = new Map(
        (memberRows ?? [])
          .filter((m) => m.app_user_id === myAppUserId)
          .map((m) => [m.conversation_id, m.last_read_at] as const),
      );
      for (const msg of lastMessages ?? []) {
        if (!lastMessageByConvo.has(msg.conversation_id)) {
          lastMessageByConvo.set(msg.conversation_id, msg);
        }
        const readAt = myReadCursor.get(msg.conversation_id);
        if (readAt && msg.created_at > readAt && msg.sender_app_user_id !== myAppUserId) {
          unreadByConvo.set(msg.conversation_id, (unreadByConvo.get(msg.conversation_id) ?? 0) + 1);
        }
      }

      const summaries: ConversationSummary[] = (convoRows ?? []).map((c) => {
        const members = membersByConvo.get(c.id) ?? [];
        return {
          ...c,
          members,
          lastMessage: lastMessageByConvo.get(c.id) ?? null,
          unreadCount: unreadByConvo.get(c.id) ?? 0,
          myMembership: members.find((m) => m.app_user_id === myAppUserId) ?? null,
        };
      });

      // Pinned conversations float to the top (most-recently-active pinned
      // chat first), everything else follows sorted by last activity.
      summaries.sort((a, b) => {
        const aPinned = !!a.myMembership?.pinned_at;
        const bPinned = !!b.myMembership?.pinned_at;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        const at = a.lastMessage?.created_at ?? a.created_at;
        const bt = b.lastMessage?.created_at ?? b.created_at;
        return bt.localeCompare(at);
      });

      setConversations(summaries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: any new message or membership change refreshes the whole list —
  // conversation lists are small enough that a full reload is simpler and
  // more correct than patching unread counts/last-message in place.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSupabaseSession();
      if (cancelled) return;
      const channel = supabase
        .channel(`conversations-overview-${instanceId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void load())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members' }, () => void load())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => void load())
        .subscribe();
      channelRef.current = channel;
    })();
    return () => {
      cancelled = true;
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
    };
  }, [load, instanceId]);

  return { conversations, loading, error, refresh: load };
}

// How long a peer's typing indicator stays visible after their last
// keystroke broadcast before we assume they stopped (covers a missed
// "stopped typing" event from a closed tab/dropped connection) — comfortably
// longer than the sender's own TYPING_BROADCAST_THROTTLE_MS so a still-typing
// peer never visibly flickers off between broadcasts.
const TYPING_EXPIRY_MS = 4000;
// Throttle for the sender's own broadcasts — avoids firing one per keystroke.
const TYPING_BROADCAST_THROTTLE_MS = 2000;

/** Messages within a single conversation, live-updated via Supabase Realtime. */
export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [memberReadCursors, setMemberReadCursors] = useState<ConversationMemberRow[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingBroadcastAt = useRef(0);
  const typingExpiryTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const load = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setMemberReadCursors([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await ensureSupabaseSession();
      const [{ data: messageRows, error: messagesErr }, { data: memberRows, error: membersErr }] = await Promise.all([
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(500),
        supabase
          .from('conversation_members')
          .select('conversation_id, app_user_id, joined_at, last_read_at, hidden_at, muted_at, pinned_at')
          .eq('conversation_id', conversationId),
      ]);
      // A failed fetch previously looked identical to "no messages yet" —
      // silently leaving messages empty with no way to tell the user
      // something actually went wrong (network blip, RLS issue, timeout)
      // versus a genuinely empty conversation.
      if (messagesErr) throw messagesErr;
      setMessages(messageRows ?? []);
      if (membersErr) throw membersErr;
      setMemberReadCursors(memberRows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setTypingUserIds([]);
    const timers = typingExpiryTimers.current;
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();

    if (!conversationId) return;
    let cancelled = false;
    const myAppUserId = getUserId();
    (async () => {
      await ensureSupabaseSession();
      if (cancelled) return;
      const channel = supabase
        .channel(`messages-${conversationId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as MessageRow]);
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const updated = payload.new as MessageRow;
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversation_members',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const updated = payload.new as ConversationMemberRow;
            setMemberReadCursors((prev) => {
              const next = prev.filter((m) => m.app_user_id !== updated.app_user_id);
              next.push(updated);
              return next;
            });
          },
        )
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          const senderId = payload?.userId as string | undefined;
          if (!senderId || senderId === myAppUserId) return;

          setTypingUserIds((prev) => (prev.includes(senderId) ? prev : [...prev, senderId]));

          const existing = timers.get(senderId);
          if (existing) clearTimeout(existing);
          timers.set(
            senderId,
            setTimeout(() => {
              setTypingUserIds((prev) => prev.filter((id) => id !== senderId));
              timers.delete(senderId);
            }, TYPING_EXPIRY_MS),
          );
        })
        .subscribe();
      channelRef.current = channel;
    })();
    return () => {
      cancelled = true;
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (body: string, replyToMessageId?: string | null) => {
      if (!conversationId || !body.trim()) return;
      await ensureSupabaseSession();
      const myAppUserId = getUserId() ?? undefined;
      if (!myAppUserId) throw new Error('Not authenticated for chat');
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_app_user_id: myAppUserId,
        body: body.trim(),
        reply_to_message_id: replyToMessageId ?? null,
      });
      if (error) throw error;
    },
    [conversationId],
  );

  /** Throttled broadcast that "I'm typing" — call on every keystroke, cheap to call often. */
  const notifyTyping = useCallback(() => {
    if (!conversationId || !channelRef.current) return;
    const now = Date.now();
    if (now - lastTypingBroadcastAt.current < TYPING_BROADCAST_THROTTLE_MS) return;
    lastTypingBroadcastAt.current = now;

    const myAppUserId = getUserId();
    if (!myAppUserId) return;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: myAppUserId },
    });
  }, [conversationId]);

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    await ensureSupabaseSession();
    const myAppUserId = getUserId() ?? undefined;
    if (!myAppUserId) return;
    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('app_user_id', myAppUserId);
  }, [conversationId]);

  /** Soft-deletes a message I sent — RLS/trigger only allow the sender to do this, and only the deleted_at/deleted_by fields to change. */
  const deleteMessage = useCallback(async (messageId: string) => {
    await ensureSupabaseSession();
    const myAppUserId = getUserId() ?? undefined;
    if (!myAppUserId) throw new Error('Not authenticated for chat');
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString(), deleted_by: myAppUserId })
      .eq('id', messageId);
    if (error) throw error;
  }, []);

  return {
    messages,
    loading,
    error,
    typingUserIds,
    memberReadCursors,
    sendMessage,
    deleteMessage,
    notifyTyping,
    markRead,
    refresh: load,
  };
}

/** Creates a DM (reuses an existing one if it already exists), a named group, or a temp group with an expiry. */
export function useCreateConversation() {
  const createDm = useCallback(async (otherAppUserId: string): Promise<string> => {
    await ensureSupabaseSession();
    const myAppUserId = getUserId() ?? undefined;
    if (!myAppUserId) throw new Error('Not authenticated for chat');

    // Look for an existing DM between exactly these two members before creating a new one.
    const { data: myMemberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('app_user_id', myAppUserId);
    const candidateIds = (myMemberships ?? []).map((m) => m.conversation_id);
    if (candidateIds.length > 0) {
      const { data: candidateConvos } = await supabase
        .from('conversations')
        .select('id')
        .eq('kind', 'dm')
        .in('id', candidateIds);
      for (const convo of candidateConvos ?? []) {
        const { data: members } = await supabase
          .from('conversation_members')
          .select('app_user_id')
          .eq('conversation_id', convo.id);
        const ids = new Set((members ?? []).map((m) => m.app_user_id));
        if (ids.size === 2 && ids.has(otherAppUserId) && ids.has(myAppUserId)) {
          // I may have previously "deleted for me" (hidden) this DM — starting
          // it again from the New Chat dialog should bring it back into my
          // list, not just silently reuse an invisible conversation.
          const { error: unhideErr } = await supabase
            .from('conversation_members')
            .update({ hidden_at: null })
            .eq('conversation_id', convo.id)
            .eq('app_user_id', myAppUserId);
          if (unhideErr) throw unhideErr;
          return convo.id;
        }
      }
    }

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ kind: 'dm', created_by: myAppUserId })
      .select()
      .single();
    if (error) throw error;

    // The `conversations_add_creator_as_member` DB trigger (AFTER INSERT on
    // conversations) already adds the creator to conversation_members —
    // inserting myAppUserId here too would collide with that and, since
    // it's a single multi-row insert, roll back the other member's row too.
    // Only the other side needs to be added explicitly.
    const { error: memberErr } = await supabase
      .from('conversation_members')
      .insert({ conversation_id: created.id, app_user_id: otherAppUserId });
    if (memberErr) throw memberErr;

    return created.id;
  }, []);

  const createGroup = useCallback(
    async (title: string, memberAppUserIds: string[], expiresAt?: Date): Promise<string> => {
      await ensureSupabaseSession();
      const myAppUserId = getUserId() ?? undefined;
      if (!myAppUserId) throw new Error('Not authenticated for chat');

      const { data: created, error } = await supabase
        .from('conversations')
        .insert({
          kind: expiresAt ? 'temp_group' : 'group',
          title,
          created_by: myAppUserId,
          expires_at: expiresAt ? expiresAt.toISOString() : null,
        })
        .select()
        .single();
      if (error) throw error;

      // The `conversations_add_creator_as_member` DB trigger already adds
      // the creator — only the other members need to be inserted here.
      const others = memberAppUserIds.filter((id) => id !== myAppUserId);
      if (others.length > 0) {
        const { error: memberErr } = await supabase
          .from('conversation_members')
          .insert(others.map((app_user_id) => ({ conversation_id: created.id, app_user_id })));
        if (memberErr) throw memberErr;
      }

      return created.id;
    },
    [],
  );

  return { createDm, createGroup };
}

/** Archive/unarchive (shared — visible to every member), "delete for me"
 * (per-member hide), and full delete (creator only) for a conversation. */
export function useConversationActions() {
  /** Marks a specific conversation read by ID — for callers that don't already have it open (e.g. "mark all read" in the notification bell). */
  const markConversationRead = useCallback(async (conversationId: string) => {
    await ensureSupabaseSession();
    const myAppUserId = getUserId() ?? undefined;
    if (!myAppUserId) throw new Error('Not authenticated for chat');
    const { error } = await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('app_user_id', myAppUserId);
    if (error) throw error;
  }, []);

  const setArchived = useCallback(async (conversationId: string, archived: boolean) => {
    await ensureSupabaseSession();
    const { error } = await supabase
      .from('conversations')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', conversationId);
    if (error) throw error;
  }, []);

  /** Hides the conversation from MY list only — other members still see it and it isn't deleted. */
  const hideForMe = useCallback(async (conversationId: string) => {
    await ensureSupabaseSession();
    const myAppUserId = getUserId() ?? undefined;
    if (!myAppUserId) throw new Error('Not authenticated for chat');
    const { error } = await supabase
      .from('conversation_members')
      .update({ hidden_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('app_user_id', myAppUserId);
    if (error) throw error;
  }, []);

  /** Permanently deletes the conversation (and its members/messages, via cascade) for everyone. RLS restricts this to the creator. */
  const deleteConversation = useCallback(async (conversationId: string) => {
    await ensureSupabaseSession();
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
    if (error) throw error;
  }, []);

  /** Mutes/unmutes MY OWN notifications for this conversation — other members are unaffected. */
  const setMuted = useCallback(async (conversationId: string, muted: boolean) => {
    await ensureSupabaseSession();
    const myAppUserId = getUserId() ?? undefined;
    if (!myAppUserId) throw new Error('Not authenticated for chat');
    const { error } = await supabase
      .from('conversation_members')
      .update({ muted_at: muted ? new Date().toISOString() : null })
      .eq('conversation_id', conversationId)
      .eq('app_user_id', myAppUserId);
    if (error) throw error;
  }, []);

  /** Pins/unpins this conversation for ME ONLY — sort order for other members is unaffected. */
  const setPinned = useCallback(async (conversationId: string, pinned: boolean) => {
    await ensureSupabaseSession();
    const myAppUserId = getUserId() ?? undefined;
    if (!myAppUserId) throw new Error('Not authenticated for chat');
    const { error } = await supabase
      .from('conversation_members')
      .update({ pinned_at: pinned ? new Date().toISOString() : null })
      .eq('conversation_id', conversationId)
      .eq('app_user_id', myAppUserId);
    if (error) throw error;
  }, []);

  /** Removes another member from a group — RLS restricts this to the conversation's creator. */
  const removeMember = useCallback(async (conversationId: string, memberAppUserId: string) => {
    await ensureSupabaseSession();
    const { error } = await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('app_user_id', memberAppUserId);
    if (error) throw error;
  }, []);

  /** Leaves a group I'm a member of (removes my own membership row). */
  const leaveGroup = useCallback(async (conversationId: string) => {
    await ensureSupabaseSession();
    const myAppUserId = getUserId() ?? undefined;
    if (!myAppUserId) throw new Error('Not authenticated for chat');
    const { error } = await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('app_user_id', myAppUserId);
    if (error) throw error;
  }, []);

  return {
    markConversationRead,
    setArchived,
    hideForMe,
    deleteConversation,
    setMuted,
    setPinned,
    removeMember,
    leaveGroup,
  };
}

/** Block/unblock another platform user — blocks a DM in both directions (new DM creation and new messages in an existing DM). */
export function useBlockedUsers() {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    await ensureSupabaseSession();
    const myAppUserId = getUserId() ?? undefined;
    if (!myAppUserId) {
      setBlockedIds(new Set());
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('blocked_users')
      .select('blocked_app_user_id')
      .eq('blocker_app_user_id', myAppUserId);
    setBlockedIds(new Set((data ?? []).map((r) => r.blocked_app_user_id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const block = useCallback(
    async (otherAppUserId: string) => {
      await ensureSupabaseSession();
      const myAppUserId = getUserId() ?? undefined;
      if (!myAppUserId) throw new Error('Not authenticated for chat');
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocker_app_user_id: myAppUserId, blocked_app_user_id: otherAppUserId });
      if (error) throw error;
      await load();
    },
    [load],
  );

  const unblock = useCallback(
    async (otherAppUserId: string) => {
      await ensureSupabaseSession();
      const myAppUserId = getUserId() ?? undefined;
      if (!myAppUserId) throw new Error('Not authenticated for chat');
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_app_user_id', myAppUserId)
        .eq('blocked_app_user_id', otherAppUserId);
      if (error) throw error;
      await load();
    },
    [load],
  );

  return { blockedIds, loading, block, unblock, refresh: load };
}

/** Total unread message count across all conversations, for the sidebar nav badge. */
export function useChatUnreadCount(): number {
  const { conversations } = useConversations();
  // Muted conversations still accrue unreads (so opening them shows what you
  // missed) but don't count toward the badge — that's the whole point of muting.
  return conversations.reduce((sum, c) => (c.myMembership?.muted_at ? sum : sum + c.unreadCount), 0);
}

export type MessageRequestStatus = 'pending' | 'accepted' | 'declined';

export interface MessageRequestRow {
  id: string;
  from_app_user_id: string;
  to_app_user_id: string;
  status: MessageRequestStatus;
  created_at: string;
  responded_at: string | null;
}

/**
 * Message requests for private profiles — starting a DM with someone whose
 * profile is private creates a request instead of a conversation; the
 * recipient accepts/declines before either side can actually message.
 */
export function useMessageRequests() {
  const [incoming, setIncoming] = useState<MessageRequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<MessageRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const instanceId = useId();

  const load = useCallback(async () => {
    await ensureSupabaseSession();
    const myAppUserId = getUserId() ?? undefined;
    if (!myAppUserId) {
      setIncoming([]);
      setOutgoing([]);
      setLoading(false);
      return;
    }
    const [{ data: incomingRows }, { data: outgoingRows }] = await Promise.all([
      supabase
        .from('message_requests')
        .select('*')
        .eq('to_app_user_id', myAppUserId)
        .order('created_at', { ascending: false }),
      supabase
        .from('message_requests')
        .select('*')
        .eq('from_app_user_id', myAppUserId)
        .order('created_at', { ascending: false }),
    ]);
    setIncoming(incomingRows ?? []);
    setOutgoing(outgoingRows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSupabaseSession();
      if (cancelled) return;
      const channel = supabase
        .channel(`message-requests-${instanceId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'message_requests' }, () => void load())
        .subscribe();
      channelRef.current = channel;
    })();
    return () => {
      cancelled = true;
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
    };
  }, [load, instanceId]);

  /** Sends a request, or returns the existing pending/accepted one between these two if there already is one. */
  const sendRequest = useCallback(async (otherAppUserId: string): Promise<MessageRequestRow> => {
    await ensureSupabaseSession();
    const myAppUserId = getUserId() ?? undefined;
    if (!myAppUserId) throw new Error('Not authenticated for chat');

    const [a, b] = [myAppUserId, otherAppUserId].sort();
    const { data: existing } = await supabase
      .from('message_requests')
      .select('*')
      .or(`and(from_app_user_id.eq.${a},to_app_user_id.eq.${b}),and(from_app_user_id.eq.${b},to_app_user_id.eq.${a})`)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();
    if (existing) return existing;

    const { data: created, error } = await supabase
      .from('message_requests')
      .insert({ from_app_user_id: myAppUserId, to_app_user_id: otherAppUserId })
      .select()
      .single();
    if (error) {
      // 23505 = unique_violation on message_requests_one_active_per_pair —
      // a request already exists for this pair (e.g. local component state
      // hadn't caught up yet after a very recent send, so the pre-check
      // above didn't see it). Not a real failure: fetch and return the
      // existing row instead of surfacing an error for something that
      // already succeeded.
      if (error.code === '23505') {
        const { data: raceWinner, error: refetchErr } = await supabase
          .from('message_requests')
          .select('*')
          .or(`and(from_app_user_id.eq.${a},to_app_user_id.eq.${b}),and(from_app_user_id.eq.${b},to_app_user_id.eq.${a})`)
          .in('status', ['pending', 'accepted'])
          .maybeSingle();
        if (raceWinner) return raceWinner;
        if (refetchErr) throw refetchErr;
      }
      throw error;
    }
    return created;
  }, []);

  const respondToRequest = useCallback(async (requestId: string, accept: boolean) => {
    await ensureSupabaseSession();
    const { error } = await supabase
      .from('message_requests')
      .update({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) throw error;
  }, []);

  /** Accepted or pending connection with this specific user, if any — used to decide whether a DM can open directly. */
  const connectionWith = useCallback(
    (otherAppUserId: string): MessageRequestRow | undefined => {
      return [...incoming, ...outgoing].find(
        (r) =>
          (r.from_app_user_id === otherAppUserId || r.to_app_user_id === otherAppUserId) &&
          r.status !== 'declined',
      );
    },
    [incoming, outgoing],
  );

  const pendingIncomingCount = incoming.filter((r) => r.status === 'pending').length;

  return {
    incoming,
    outgoing,
    loading,
    pendingIncomingCount,
    sendRequest,
    respondToRequest,
    connectionWith,
    refresh: load,
  };
}

const PRESENCE_CHANNEL_NAME = 'chat-online-presence';

/**
 * Tracks which platform users currently have the chat page open, via a
 * single shared Presence channel (Supabase Realtime's built-in "who's here"
 * primitive) rather than per-conversation channels — one join covers every
 * DM/group online dot at once. Returns the live set of online app_user_ids.
 */
export function useOnlinePresence(): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    (async () => {
      await ensureSupabaseSession();
      if (cancelled) return;
      const myAppUserId = getUserId();
      if (!myAppUserId) return;

      channel = supabase.channel(PRESENCE_CHANNEL_NAME, {
        config: { presence: { key: myAppUserId } },
      });

      const syncState = () => {
        setOnlineIds(new Set(Object.keys(channel?.presenceState() ?? {})));
      };

      channel
        .on('presence', { event: 'sync' }, syncState)
        .subscribe(async (status, err) => {
          if (status === 'SUBSCRIBED') {
            const trackResult = await channel?.track({ online_at: new Date().toISOString() });
            if (trackResult !== 'ok') {
              console.error('[useOnlinePresence] track() did not confirm — presence may not broadcast:', trackResult);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error('[useOnlinePresence] presence channel failed to subscribe:', status, err);
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return onlineIds;
}
