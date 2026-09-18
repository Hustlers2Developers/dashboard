import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { Bell, PartyPopper, Megaphone, Cake, Award, MessageSquare } from "lucide-react";
import {
  MY_NOTIFICATIONS,
  MY_UNREAD_NOTIFICATION_COUNT,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from "@/graphql/mutations/notifications";
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

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  COMMUNITY_REPLY: MessageSquare,
  ANNOUNCEMENT: Megaphone,
  BIRTHDAY: Cake,
  WORK_ANNIVERSARY: PartyPopper,
  ACHIEVEMENT: Award,
};

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const navigate = useNavigate();

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

  const unreadCount = countData?.myUnreadNotificationCount ?? 0;
  const notifications = listData?.myNotifications.data ?? [];

  const handleOpenNotification = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await markRead({ variables: { id: n.id } });
        await refetchList();
      } catch {
        // best-effort — clicking through still works even if the read-mark fails
      }
    }
    if (n.type === "COMMUNITY_REPLY" && n.metadata) {
      try {
        const parsed = JSON.parse(n.metadata) as { postId?: string };
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
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-4 min-w-4 animate-pop-in items-center justify-center rounded-full px-1 text-[10px] shadow-sm"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n, idx) => {
                const Icon = TYPE_ICON[n.type] ?? Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => void handleOpenNotification(n)}
                    style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}
                    className={cn(
                      "flex w-full animate-fade-slide-up items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary",
                      !n.isRead && "bg-primary/5",
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-snug text-foreground">{n.title}</p>
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{n.message}</p>
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground/80">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
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
