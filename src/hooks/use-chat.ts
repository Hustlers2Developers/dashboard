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
      return;
    }
    setLoading(true);
    await ensureSupabaseSession();
    const [{ data: messageRows, error }, { data: memberRows }] = await Promise.all([
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
    if (!error) setMessages(messageRows ?? []);
    setMemberReadCursors(memberRows ?? []);
    setLoading(false);
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
    async (body: string) => {
      if (!conversationId || !body.trim()) return;
      await ensureSupabaseSession();
      const myAppUserId = getUserId() ?? undefined;
      if (!myAppUserId) throw new Error('Not authenticated for chat');
      const { error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_app_user_id: myAppUserId, body: body.trim() });
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

    // Insert both sides as members — without this, the creator never gets a
    // conversation_members row, so useConversations() (which lists only
    // conversations where I have a membership row) would never show a DM I
    // just started, and the "other member" lookups used for title/admin
    // labels would resolve against an incomplete member list.
    const { error: memberErr } = await supabase
      .from('conversation_members')
      .insert([
        { conversation_id: created.id, app_user_id: myAppUserId },
        { conversation_id: created.id, app_user_id: otherAppUserId },
      ]);
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

      // Insert the creator too — same reasoning as createDm() above: without
      // a membership row, the creator's own conversation list and admin
      // label lookups silently miss this group.
      const others = memberAppUserIds.filter((id) => id !== myAppUserId);
      const { error: memberErr } = await supabase
        .from('conversation_members')
        .insert([myAppUserId, ...others].map((app_user_id) => ({ conversation_id: created.id, app_user_id })));
      if (memberErr) throw memberErr;

      return created.id;
    },
    [],
  );

  return { createDm, createGroup };
}

/** Archive/unarchive (shared — visible to every member), "delete for me"
 * (per-member hide), and full delete (creator only) for a conversation. */
export function useConversationActions() {
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

  return { setArchived, hideForMe, deleteConversation, setMuted, setPinned, removeMember, leaveGroup };
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
