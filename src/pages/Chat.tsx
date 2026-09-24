import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import {
  Send,
  Plus,
  Users,
  Clock,
  MessagesSquare,
  Search,
  Check,
  CheckCheck,
  ArrowLeft,
  MoreVertical,
  Archive,
  ArchiveRestore,
  Trash2,
  Pin,
  PinOff,
  BellOff,
  Bell,
  UserMinus,
  LogOut,
  Ban,
  ShieldOff,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthStore } from "@/stores/auth-store";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import {
  useConversations,
  useMessages,
  useOnlinePresence,
  useConversationActions,
  useBlockedUsers,
  ConversationSummary,
  MessageRow,
} from "@/hooks/use-chat";
import { useIsMobile } from "@/hooks/use-mobile";
import { NewChatDialog } from "@/components/chat/NewChatDialog";
import { initials, colorFor } from "@/components/AuthorTag";
import { timeAgo } from "@/lib/time-ago";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;!?'")\]]/gi;

/** Renders any http(s)/www URLs in message text as clickable links, opened in a new tab. */
function linkify(text: string) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0];
    const start = match.index ?? 0;
    if (start > lastIndex) nodes.push(<span key={key++}>{text.slice(lastIndex, start)}</span>);
    const href = url.startsWith("www.") ? `https://${url}` : url;
    nodes.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-current/40 underline-offset-2 hover:decoration-current"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    lastIndex = start + url.length;
  }
  if (lastIndex < text.length) nodes.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  return nodes;
}

type PlatformUserDetails = { id: string; email: string; name?: string | null; details?: { profilePicUrl?: string | null } | null };

function useUserDirectory() {
  const orgId = useAuthStore((s) => s.user?.orgId);
  const { data, loading, error } = useQuery<{ getAllUsers: PlatformUserDetails[] }>(GET_ALL_USERS, {
    variables: { orgId },
    // Was `skip: !isAuthenticated` — isAuthenticated can flip true before
    // user.orgId is populated in the store (AuthProvider/ProtectedRoute set
    // these independently), so the query could fire with orgId: undefined.
    // resolveOrgId() on the backend then falls through to a BadRequestException
    // ("Organization context missing in token") for non-SUPER_ADMIN callers,
    // since the token payload itself IS present but the query variable isn't
    // what the backend expects to correlate — surfaced here as [Chat] getAllUsers
    // failed. Gating on orgId directly (like NotificationBell.tsx already does)
    // means the query only ever fires once it has a real value to send.
    skip: !orgId,
    fetchPolicy: "cache-and-network",
  });
  const map = useMemo(() => {
    const m = new Map<string, PlatformUserDetails>();
    for (const u of data?.getAllUsers ?? []) m.set(u.id, u);
    return m;
  }, [data]);
  useEffect(() => {
    if (error) {
      // Surfaced so a role where getAllUsers silently fails/returns partial
      // data (e.g. viewer/member accounts) is visible instead of just
      // showing "Direct message" everywhere with no explanation.
      console.error("[Chat] getAllUsers failed — conversation names won't resolve:", error);
      toast.error("Couldn't load the member directory — names may not show correctly.");
    }
  }, [error]);
  // Only "loading" on the very first fetch (no cached data yet) — once we
  // have a directory, a cache-and-network refetch shouldn't blank out names.
  return { directory: map, directoryLoading: loading && !data, directoryError: error };
}

function conversationTitle(
  convo: ConversationSummary,
  myUserId: string | undefined,
  directory: Map<string, PlatformUserDetails>,
  directoryLoading?: boolean,
): string {
  if (convo.title) return convo.title;
  if (convo.kind === "dm") {
    const otherId = convo.members.find((m) => m.app_user_id !== myUserId)?.app_user_id;
    const other = otherId ? directory.get(otherId) : undefined;
    if (other?.name || other?.email) return other.name || other.email;
    return directoryLoading ? "Loading…" : "Direct message";
  }
  return "Group chat";
}

function ConversationListItem({
  convo,
  active,
  myUserId,
  directory,
  directoryLoading,
  onlineIds,
  index,
  onClick,
  onArchiveToggle,
  onDeleteForMe,
  onDelete,
  onPinToggle,
  onMuteToggle,
}: {
  convo: ConversationSummary;
  active: boolean;
  myUserId: string | undefined;
  directory: Map<string, PlatformUserDetails>;
  directoryLoading?: boolean;
  onlineIds: Set<string>;
  index: number;
  onClick: () => void;
  onArchiveToggle: () => void;
  onDeleteForMe: () => void;
  onDelete: (() => void) | null;
  onPinToggle: () => void;
  onMuteToggle: () => void;
}) {
  const title = conversationTitle(convo, myUserId, directory, directoryLoading);
  const otherId =
    convo.kind === "dm" ? convo.members.find((m) => m.app_user_id !== myUserId)?.app_user_id : undefined;
  const other = otherId ? directory.get(otherId) : undefined;
  const picUrl = other?.details?.profilePicUrl;
  const isTemp = convo.kind === "temp_group";
  const unread = convo.unreadCount > 0;
  const isOnline = otherId ? onlineIds.has(otherId) : false;
  const isArchived = !!convo.archived_at;
  const isPinned = !!convo.myMembership?.pinned_at;
  const isMuted = !!convo.myMembership?.muted_at;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
      className={cn(
        "group relative flex w-full animate-fade-slide-up items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-secondary/70",
        active && "bg-secondary",
      )}
    >
      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full gold-gradient" />}
      <div className="relative shrink-0">
        {picUrl ? (
          <img
            src={picUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className={cn(
              "h-11 w-11 rounded-full object-cover ring-2 ring-transparent transition-shadow",
              unread && "glow-primary",
            )}
          />
        ) : (
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition-shadow",
              convo.kind === "dm" ? colorFor(otherId ?? convo.id) : "bg-gradient-to-br from-primary/20 to-accent/20 text-primary",
              unread && "glow-primary",
            )}
          >
            {convo.kind === "dm" ? initials(other?.name, other?.email) : <Users className="h-4 w-4" />}
          </div>
        )}
        {convo.kind === "dm" && isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            {isPinned && <Pin className="h-3 w-3 shrink-0 fill-current text-muted-foreground" />}
            <p className={cn("truncate text-sm text-foreground", unread ? "font-semibold" : "font-medium")}>{title}</p>
          </div>
          {convo.lastMessage && (
            <span className={cn("shrink-0 text-[11px]", unread ? "text-primary font-medium" : "text-muted-foreground")}>
              {timeAgo(convo.lastMessage.created_at)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {isTemp && <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />}
          {isMuted && <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" />}
          <p className={cn("truncate text-xs", unread ? "text-foreground/80" : "text-muted-foreground")}>
            {convo.lastMessage ? (convo.lastMessage.deleted_at ? "Message deleted" : convo.lastMessage.body) : "No messages yet"}
          </p>
        </div>
      </div>
      {unread && (
        <Badge className="mt-1 h-5 min-w-5 shrink-0 animate-pop-in justify-center rounded-full border-0 bg-primary px-1.5 text-[10px] text-primary-foreground shadow-sm">
          {convo.unreadCount > 99 ? "99+" : convo.unreadCount}
        </Badge>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onPinToggle}>
            {isPinned ? (
              <>
                <PinOff className="mr-2 h-4 w-4" />
                Unpin
              </>
            ) : (
              <>
                <Pin className="mr-2 h-4 w-4" />
                Pin
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMuteToggle}>
            {isMuted ? (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Unmute
              </>
            ) : (
              <>
                <BellOff className="mr-2 h-4 w-4" />
                Mute
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onArchiveToggle}>
            {isArchived ? (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDeleteForMe}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete for me
          </DropdownMenuItem>
          {onDelete && (
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete for everyone
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type ReceiptStatus = "sent" | "read";

function MessageReceipt({ status }: { status: ReceiptStatus }) {
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-sky-500" />;
  return <Check className="h-3.5 w-3.5 text-muted-foreground/70" />;
}

function MessageBubble({
  mine,
  body,
  createdAt,
  senderName,
  receipt,
  deleted,
  onDelete,
}: {
  mine: boolean;
  body: string;
  createdAt: string;
  senderName?: string;
  receipt?: ReceiptStatus;
  deleted: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className={cn("group flex w-full animate-fade-slide-up items-end gap-1.5", mine ? "flex-row-reverse" : "flex-row")}>
      <div className={cn("flex min-w-0 max-w-[75%] flex-col", mine ? "items-end" : "items-start")}>
        {!mine && senderName && <span className="mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">{senderName}</span>}
        <div
          className={cn(
            "min-w-0 max-w-full rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
            deleted
              ? "rounded-bl-sm border border-dashed border-border bg-transparent italic text-muted-foreground"
              : mine
                ? "rounded-br-sm gold-gradient text-primary-foreground"
                : "rounded-bl-sm border border-border bg-card text-foreground",
          )}
        >
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{deleted ? "This message was deleted" : linkify(body)}</p>
        </div>
        <span className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-muted-foreground/70">
          {timeAgo(createdAt)}
          {mine && receipt && !deleted && <MessageReceipt status={receipt} />}
        </span>
      </div>
      {mine && !deleted && onDelete && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0 self-center opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

function TypingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex animate-fade-slide-up flex-col items-start">
      {label && <span className="mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">{label}</span>}
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5 shadow-sm">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
      </div>
    </div>
  );
}

export default function Chat() {
  const myUserId = useAuthStore((s) => s.user?.sub);
  const { directory, directoryLoading } = useUserDirectory();
  const onlineIds = useOnlinePresence();
  const isMobile = useIsMobile();
  const { conversations, loading: loadingConversations, refresh } = useConversations();
  const { setArchived, hideForMe, deleteConversation, setMuted, setPinned, removeMember, leaveGroup } =
    useConversationActions();
  const { blockedIds, block, unblock } = useBlockedUsers();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(searchParams.get("c"));
  const [mobileThreadOpen, setMobileThreadOpen] = useState(!!searchParams.get("c"));
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [pendingDelete, setPendingDelete] = useState<ConversationSummary | null>(null);
  const [pendingLeave, setPendingLeave] = useState<ConversationSummary | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    loading: loadingMessages,
    typingUserIds,
    memberReadCursors,
    sendMessage,
    deleteMessage,
    notifyTyping,
    markRead,
  } = useMessages(activeId);

  // Deep-link support (e.g. from the notification bell): ?c=<conversationId>
  // opens that conversation directly instead of defaulting to the first one.
  useEffect(() => {
    const paramId = searchParams.get("c");
    if (paramId && paramId !== activeId) setActiveId(paramId);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setMobileThreadOpen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("c", id);
      return next;
    });
  };

  const handleBackToList = () => {
    setMobileThreadOpen(false);
  };

  useEffect(() => {
    if (activeId) void markRead();
  }, [activeId, messages.length, markRead]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingUserIds.length]);

  const activeConvo = conversations.find((c) => c.id === activeId) ?? null;
  const activeOtherId =
    activeConvo?.kind === "dm" ? activeConvo.members.find((m) => m.app_user_id !== myUserId)?.app_user_id : undefined;
  const activeOtherOnline = activeOtherId ? onlineIds.has(activeOtherId) : false;
  // Either direction counts — a DM I blocked, or one where the other side
  // blocked me, both stop new messages (enforced server-side too, by the
  // messages_enforce_dm_block trigger; this just disables the composer).
  const activeOtherBlockedByMe = activeOtherId ? blockedIds.has(activeOtherId) : false;

  // "Read" = every other member's read cursor has caught up to this message —
  // for a DM that's a single person, for a group it means all of them.
  const otherReadCursors = memberReadCursors.filter((m) => m.app_user_id !== myUserId);
  const receiptFor = (message: MessageRow): ReceiptStatus => {
    if (otherReadCursors.length === 0) return "sent";
    const allRead = otherReadCursors.every((m) => m.last_read_at >= message.created_at);
    return allRead ? "read" : "sent";
  };

  const filteredConversations = conversations
    .filter((c) => (tab === "archived" ? !!c.archived_at : !c.archived_at))
    .filter((c) => {
      if (!search.trim()) return true;
      const title = conversationTitle(c, myUserId, directory).toLowerCase();
      return title.includes(search.toLowerCase());
    });
  const archivedCount = conversations.filter((c) => !!c.archived_at).length;

  const handleArchiveToggle = async (convo: ConversationSummary) => {
    const nextArchived = !convo.archived_at;
    try {
      await setArchived(convo.id, nextArchived);
      await refresh();
      toast.success(nextArchived ? "Conversation archived" : "Conversation unarchived");
    } catch {
      toast.error("Couldn't update this conversation");
    }
  };

  const handleDeleteForMe = async (convo: ConversationSummary) => {
    try {
      await hideForMe(convo.id);
      if (activeId === convo.id) setActiveId(null);
      await refresh();
      toast.success("Conversation removed");
    } catch {
      toast.error("Couldn't remove this conversation");
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const convo = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteConversation(convo.id);
      if (activeId === convo.id) setActiveId(null);
      await refresh();
      toast.success("Conversation deleted for everyone");
    } catch {
      toast.error("Couldn't delete this conversation");
    }
  };

  const handlePinToggle = async (convo: ConversationSummary) => {
    const nextPinned = !convo.myMembership?.pinned_at;
    try {
      await setPinned(convo.id, nextPinned);
      await refresh();
      toast.success(nextPinned ? "Conversation pinned" : "Conversation unpinned");
    } catch {
      toast.error("Couldn't update this conversation");
    }
  };

  const handleMuteToggle = async (convo: ConversationSummary) => {
    const nextMuted = !convo.myMembership?.muted_at;
    try {
      await setMuted(convo.id, nextMuted);
      await refresh();
      toast.success(nextMuted ? "Conversation muted" : "Conversation unmuted");
    } catch {
      toast.error("Couldn't update this conversation");
    }
  };

  const handleRemoveMember = async (convo: ConversationSummary, memberAppUserId: string) => {
    try {
      await removeMember(convo.id, memberAppUserId);
      await refresh();
      toast.success("Member removed");
    } catch {
      toast.error("Couldn't remove this member");
    }
  };

  const handleConfirmLeave = async () => {
    if (!pendingLeave) return;
    const convo = pendingLeave;
    setPendingLeave(null);
    try {
      await leaveGroup(convo.id);
      if (activeId === convo.id) setActiveId(null);
      await refresh();
      toast.success("Left the group");
    } catch {
      toast.error("Couldn't leave this group");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch {
      toast.error("Couldn't delete this message");
    }
  };

  const handleToggleBlock = async (otherAppUserId: string, currentlyBlocked: boolean) => {
    try {
      if (currentlyBlocked) {
        await unblock(otherAppUserId);
        toast.success("User unblocked");
      } else {
        await block(otherAppUserId);
        toast.success("User blocked");
      }
    } catch {
      toast.error("Couldn't update block status");
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || sending || activeOtherBlockedByMe) return;
    setSending(true);
    const body = draft;
    setDraft("");
    try {
      await sendMessage(body);
    } catch {
      setDraft(body);
      toast.error("Message couldn't be sent — this DM may be blocked");
    } finally {
      setSending(false);
    }
  };

  const showThread = isMobile ? mobileThreadOpen && !!activeConvo : true;

  return (
    <DashboardLayout>
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Chat</h2>
          <p className="hidden text-muted-foreground sm:block">Direct messages and group conversations with your team.</p>
        </div>
      </div>

      <div className="premium-card flex h-[calc(100dvh-11rem)] overflow-hidden p-0 sm:h-[calc(100dvh-13rem)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            background:
              "radial-gradient(circle at 10% 10%, hsl(var(--primary)) 0%, transparent 40%), radial-gradient(circle at 90% 90%, hsl(var(--saffron)) 0%, transparent 40%)",
          }}
        />
        {/* Conversation list */}
        <aside
          className={cn(
            "relative flex w-full shrink-0 flex-col border-border md:w-80 md:border-r",
            isMobile && showThread && "hidden",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border p-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 border-border bg-background/60 pl-8"
              />
            </div>
            <Button size="icon" className="h-9 w-9 shrink-0 gold-gradient text-primary-foreground" onClick={() => setNewChatOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {archivedCount > 0 && (
            <div className="border-b border-border px-3 pt-2.5">
              <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "archived")}>
                <TabsList className="h-8 w-full">
                  <TabsTrigger value="active" className="flex-1 text-xs">
                    Chats
                  </TabsTrigger>
                  <TabsTrigger value="archived" className="flex-1 text-xs">
                    Archived ({archivedCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          <ScrollArea className="flex-1">
            {loadingConversations ? (
              <div className="space-y-3 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <div className="glow-primary flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <MessagesSquare className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {conversations.length === 0
                    ? "No conversations yet"
                    : tab === "archived"
                      ? "No archived chats"
                      : "No matches"}
                </p>
                {conversations.length === 0 && (
                  <Button size="sm" className="gap-1.5 gold-gradient text-primary-foreground" onClick={() => setNewChatOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Start a chat
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredConversations.map((c, index) => (
                  <ConversationListItem
                    key={c.id}
                    convo={c}
                    active={c.id === activeId}
                    myUserId={myUserId}
                    directory={directory}
                    directoryLoading={directoryLoading}
                    onlineIds={onlineIds}
                    index={index}
                    onClick={() => handleSelectConversation(c.id)}
                    onArchiveToggle={() => void handleArchiveToggle(c)}
                    onDeleteForMe={() => void handleDeleteForMe(c)}
                    onDelete={c.created_by === myUserId ? () => setPendingDelete(c) : null}
                    onPinToggle={() => void handlePinToggle(c)}
                    onMuteToggle={() => void handleMuteToggle(c)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Thread */}
        <div className={cn("relative flex flex-1 flex-col bg-background/40", isMobile && !showThread && "hidden")}>
          {!activeConvo ? (
            <div className="hidden flex-1 flex-col items-center justify-center gap-3 text-center md:flex">
              <div className="glow-primary flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <MessagesSquare className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border bg-card/60 px-3 py-2.5 backdrop-blur-sm sm:px-4 sm:py-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="-ml-1 h-9 w-9 shrink-0 md:hidden"
                  onClick={handleBackToList}
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight text-foreground">
                    {conversationTitle(activeConvo, myUserId, directory, directoryLoading)}
                  </p>
                  {activeConvo.kind === "dm" && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className={cn("h-1.5 w-1.5 rounded-full", activeOtherOnline ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                      {activeOtherOnline ? "Online" : "Offline"}
                    </p>
                  )}
                </div>
                {activeConvo.kind === "temp_group" && activeConvo.expires_at && (
                  <Badge variant="outline" className="gap-1 border-primary/30 text-[10px] text-primary">
                    <Clock className="h-3 w-3" />
                    Expires {timeAgo(activeConvo.expires_at)}
                  </Badge>
                )}
                {activeConvo.kind !== "dm" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Badge variant="secondary" className="cursor-pointer text-[10px]">
                        {activeConvo.members.length} members
                      </Badge>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 p-0">
                      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-foreground">Members</div>
                      <ScrollArea className="max-h-64">
                        <div className="divide-y divide-border">
                          {activeConvo.members.map((m) => {
                            const u = directory.get(m.app_user_id);
                            const isCreator = m.app_user_id === activeConvo.created_by;
                            return (
                              <div key={m.app_user_id} className="flex items-center justify-between gap-2 px-3 py-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span
                                    className={cn(
                                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                                      colorFor(m.app_user_id),
                                    )}
                                  >
                                    {initials(u?.name, u?.email)}
                                  </span>
                                  <span className="truncate text-xs text-foreground">
                                    {u?.name || u?.email || "Unknown"}
                                    {isCreator && <span className="ml-1 text-muted-foreground">(admin)</span>}
                                  </span>
                                </div>
                                {activeConvo.created_by === myUserId && m.app_user_id !== myUserId && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => void handleRemoveMember(activeConvo, m.app_user_id)}
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void handlePinToggle(activeConvo)}>
                      {activeConvo.myMembership?.pinned_at ? (
                        <>
                          <PinOff className="mr-2 h-4 w-4" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="mr-2 h-4 w-4" />
                          Pin
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void handleMuteToggle(activeConvo)}>
                      {activeConvo.myMembership?.muted_at ? (
                        <>
                          <Bell className="mr-2 h-4 w-4" />
                          Unmute
                        </>
                      ) : (
                        <>
                          <BellOff className="mr-2 h-4 w-4" />
                          Mute
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void handleArchiveToggle(activeConvo)}>
                      {activeConvo.archived_at ? (
                        <>
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Unarchive
                        </>
                      ) : (
                        <>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </>
                      )}
                    </DropdownMenuItem>
                    {activeConvo.kind === "dm" && activeOtherId && (
                      <DropdownMenuItem onClick={() => void handleToggleBlock(activeOtherId, activeOtherBlockedByMe)}>
                        {activeOtherBlockedByMe ? (
                          <>
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Unblock
                          </>
                        ) : (
                          <>
                            <Ban className="mr-2 h-4 w-4" />
                            Block
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    {activeConvo.kind !== "dm" && activeConvo.created_by !== myUserId && (
                      <DropdownMenuItem onClick={() => setPendingLeave(activeConvo)}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Leave group
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => void handleDeleteForMe(activeConvo)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete for me
                    </DropdownMenuItem>
                    {activeConvo.created_by === myUserId && (
                      <DropdownMenuItem
                        onClick={() => setPendingDelete(activeConvo)}
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete for everyone
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <ScrollArea className="flex-1 px-3 py-3 sm:px-4">
                {loadingMessages ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className={cn("h-12 w-2/3 rounded-2xl", i % 2 === 0 ? "ml-auto" : "")} />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <span className="text-2xl">👋</span>
                    <p className="text-sm text-muted-foreground">No messages yet — say hello</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => {
                      const sender = directory.get(m.sender_app_user_id);
                      const mine = m.sender_app_user_id === myUserId;
                      return (
                        <MessageBubble
                          key={m.id}
                          mine={mine}
                          body={m.body}
                          createdAt={m.created_at}
                          senderName={activeConvo.kind !== "dm" ? sender?.name || sender?.email : undefined}
                          receipt={mine ? receiptFor(m) : undefined}
                          deleted={!!m.deleted_at}
                          onDelete={mine ? () => void handleDeleteMessage(m.id) : undefined}
                        />
                      );
                    })}
                    {typingUserIds.length > 0 && (
                      <TypingIndicator
                        label={
                          activeConvo.kind === "dm"
                            ? undefined
                            : typingUserIds
                                .map((id) => directory.get(id)?.name || directory.get(id)?.email || "Someone")
                                .join(", ")
                        }
                      />
                    )}
                    <div ref={scrollRef} />
                  </div>
                )}
              </ScrollArea>

              {activeOtherBlockedByMe ? (
                <div className="border-t border-border bg-card/60 p-3 text-center text-xs text-muted-foreground">
                  You've blocked this user — unblock them to send messages.
                </div>
              ) : (
                <div className="flex items-end gap-2 border-t border-border bg-card/60 p-2.5 backdrop-blur-sm sm:p-3">
                  <Textarea
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      notifyTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder="Type a message..."
                    className="max-h-32 min-h-10 flex-1 resize-none border-border bg-background/60 text-base sm:text-sm"
                    rows={1}
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 gold-gradient text-primary-foreground disabled:opacity-40"
                    disabled={!draft.trim() || sending}
                    onClick={() => void handleSend()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onCreated={(id) => {
          void refresh();
          setActiveId(id);
        }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && conversationTitle(pendingDelete, myUserId, directory)} and all its messages will be
              permanently deleted for every member. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleConfirmDelete()}
            >
              Delete for everyone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingLeave} onOpenChange={(open) => !open && setPendingLeave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this group?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll stop receiving messages from{" "}
              {pendingLeave && conversationTitle(pendingLeave, myUserId, directory)}. You can be re-added by another
              member later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleConfirmLeave()}
            >
              Leave group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
