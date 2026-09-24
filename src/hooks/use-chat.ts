import { useCallback, useEffect, useRef, useState } from 'react';
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
}

export interface ConversationMemberRow {
  conversation_id: string;
  app_user_id: string;
  joined_at: string;
  last_read_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_app_user_id: string;
  body: string;
  created_at: string;
}

export interface ConversationSummary extends ConversationRow {
  members: ConversationMemberRow[];
  lastMessage: MessageRow | null;
  unreadCount: number;
}

/** Lists the current user's conversations with members, last message, and unread count. Re-run manually via refresh(). */
export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const load = useCallback(async () => {
    try {
      await ensureSupabaseSession();
      const myAppUserId = getUserId() ?? undefined;

      const { data: memberRows, error: memberErr } = await supabase
        .from('conversation_members')
        .select('conversation_id, app_user_id, joined_at, last_read_at');
      if (memberErr) throw memberErr;

      const myConversationIds = Array.from(
        new Set((memberRows ?? []).filter((m) => m.app_user_id === myAppUserId).map((m) => m.conversation_id)),
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
        .select('conversation_id, app_user_id, joined_at, last_read_at')
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

      const summaries: ConversationSummary[] = (convoRows ?? []).map((c) => ({
        ...c,
        members: membersByConvo.get(c.id) ?? [],
        lastMessage: lastMessageByConvo.get(c.id) ?? null,
        unreadCount: unreadByConvo.get(c.id) ?? 0,
      }));

      summaries.sort((a, b) => {
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
        .channel('conversations-overview')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void load())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members' }, () => void load())
        .subscribe();
      channelRef.current = channel;
    })();
    return () => {
      cancelled = true;
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
    };
  }, [load]);

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
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingBroadcastAt = useRef(0);
  const typingExpiryTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const load = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    await ensureSupabaseSession();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(500);
    if (!error) setMessages(data ?? []);
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

  return { messages, loading, typingUserIds, sendMessage, notifyTyping, markRead, refresh: load };
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

/** Total unread message count across all conversations, for the sidebar nav badge. */
export function useChatUnreadCount(): number {
  const { conversations } = useConversations();
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}
