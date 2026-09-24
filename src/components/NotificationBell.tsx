import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { Bell, PartyPopper, Megaphone, Cake, Award, MessageSquare, MessagesSquare } from "lucide-react";
import {
  MY_NOTIFICATIONS,
  MY_UNREAD_NOTIFICATION_COUNT,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from "@/graphql/mutations/notifications";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { useConversations, ConversationSummary } from "@/hooks/use-chat";
import { useAuthStore } from "@/stores/auth-store";
import { timeAgo } from "@/lib/time-ago";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type NotificationType = "COMMUNITY_REPLY" | "ANNOUNCEMENT" | "BIRTHDAY" | "WORK_ANNIVERSARY" | "ACHIEVEMENT";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: string | null;
  isRead: boolean;
  createdAt: string;
};

// Client-side merge target: an unread chat conversation rendered as a bell
// entry. Chat lives entirely in Supabase (see backend's chat.service.ts /
// 20260924_chat_schema.sql) — it's deliberately never written into the
// GraphQL myNotifications table, so this stays a display-time merge instead
// of routing chat traffic through the backend.
type ChatEntry = {
  id: string;
  kind: "chat";
  conversationId: string;
  title: string;
  message: string;
  createdAt: string;
};

type FeedEntry = (Notification & { kind: "graphql" }) | ChatEntry;

type PlatformUserDetails = { id: string; email: string; name?: string | null };

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  COMMUNITY_REPLY: MessageSquare,
  ANNOUNCEMENT: Megaphone,
  BIRTHDAY: Cake,
  WORK_ANNIVERSARY: PartyPopper,
  ACHIEVEMENT: Award,
};

const POLL_INTERVAL_MS = 30_000;

function chatConversationTitle(
  convo: ConversationSummary,
  myUserId: string | undefined,
  directory: Map<string, PlatformUserDetails>,
): string {
  if (convo.title) return convo.title;
  if (convo.kind === "dm") {
    const otherId = convo.members.find((m) => m.app_user_id !== myUserId)?.app_user_id;
    const other = otherId ? directory.get(otherId) : undefined;
    return other?.name || other?.email || "Direct message";
  }
  return "Group chat";
}

export function NotificationBell() {
  const navigate = useNavigate();
  const myUserId = useAuthStore((s) => s.user?.sub);
  const orgId = useAuthStore((s) => s.user?.orgId);

  const { data: countData } = useQuery<{ myUnreadNotificationCount: number }>(
    MY_UNREAD_NOTIFICATION_COUNT,
    { pollInterval: POLL_INTERVAL_MS, fetchPolicy: "cache-and-network" },
  );

  const {
    data: listData,
    refetch: refetchList,
  } = useQuery<{ myNotifications: { data: Notification[] } }>(MY_NOTIFICATIONS, {
    variables: { pagination: { page: 1, limit: 20 } },
    pollInterval: POLL_INTERVAL_MS,
    fetchPolicy: "cache-and-network",
  });

  const [markRead] = useMutation(MARK_NOTIFICATION_READ);
  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ);

  // Chat conversations come straight from Supabase Realtime (see use-chat.ts) —
  // updates land here as soon as a message arrives, no 30s poll wait.
  const { conversations: chatConversations } = useConversations();
  const { data: usersData } = useQuery<{ getAllUsers: PlatformUserDetails[] }>(GET_ALL_USERS, {
    variables: { orgId },
    skip: !orgId,
  });
  const userDirectory = useMemo(() => {
    const map = new Map<string, PlatformUserDetails>();
    for (const u of usersData?.getAllUsers ?? []) map.set(u.id, u);
    return map;
  }, [usersData]);

  // Muted conversations don't surface here either — same "muting means no
  // badge/alert" rule as the sidebar's useChatUnreadCount().
  const unreadChatConvos = chatConversations.filter((c) => c.unreadCount > 0 && !c.myMembership?.muted_at);

  const feed: FeedEntry[] = useMemo(() => {
    const graphqlNotifications = listData?.myNotifications.data ?? [];
    const chatEntries: ChatEntry[] = unreadChatConvos.map((c) => ({
      id: `chat-${c.id}`,
      kind: "chat",
      conversationId: c.id,
      title: chatConversationTitle(c, myUserId, userDirectory),
      message: c.lastMessage?.body ?? "New message",
      createdAt: c.lastMessage?.created_at ?? c.created_at,
    }));
    const merged: FeedEntry[] = [
      ...graphqlNotifications.map((n) => ({ ...n, kind: "graphql" as const })),
      ...chatEntries,
    ];
    return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [listData, unreadChatConvos, myUserId, userDirectory]);

  const unreadCount = (countData?.myUnreadNotificationCount ?? 0) + unreadChatConvos.length;

  const handleOpenNotification = async (entry: FeedEntry) => {
    if (entry.kind === "chat") {
      navigate(`/chat?c=${entry.conversationId}`);
      return;
    }
    if (!entry.isRead) {
      try {
        await markRead({ variables: { id: entry.id } });
        await refetchList();
      } catch {
        // best-effort — clicking through still works even if the read-mark fails
      }
    }
    if (entry.type === "COMMUNITY_REPLY" && entry.metadata) {
      try {
        const parsed = JSON.parse(entry.metadata) as { postId?: string };
        if (parsed.postId) navigate(`/community/posts/${parsed.postId}`);
      } catch {
        // metadata isn't parseable JSON — nothing to deep-link to
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      await refetchList();
    } catch {
      // best-effort
    }
    // Chat unread state lives in Supabase (conversation_members.last_read_at),
    // not the GraphQL notifications table — "mark all read" only clears the
    // GraphQL side; chat threads still clear individually when opened.
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-4 min-w-4 animate-pop-in items-center justify-center rounded-full border-0 bg-primary px-1 text-[10px] text-primary-foreground shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 overflow-hidden rounded-2xl border-border p-0 shadow-lg">
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-br from-primary/5 to-transparent px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary hover:text-primary" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {feed.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <div className="glow-primary flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">You're all caught up.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {feed.map((entry, idx) => {
                const isUnread = entry.kind === "chat" || !entry.isRead;
                const Icon = entry.kind === "chat" ? MessagesSquare : (TYPE_ICON[entry.type] ?? Bell);
                return (
                  <button
                    key={entry.id}
                    onClick={() => void handleOpenNotification(entry)}
                    style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}
                    className={cn(
                      "flex w-full animate-fade-slide-up items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/70",
                      isUnread && "bg-primary/5",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 transition-shadow",
                        isUnread && "glow-primary",
                      )}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm leading-snug text-foreground", isUnread ? "font-semibold" : "font-medium")}>
                        {entry.title}
                      </p>
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{entry.message}</p>
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground/80">{timeAgo(entry.createdAt)}</p>
                    </div>
                    {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 animate-pop-in rounded-full gold-gradient" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
