import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { Send, Plus, Users, Clock, MessagesSquare, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthStore } from "@/stores/auth-store";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { useConversations, useMessages, ConversationSummary } from "@/hooks/use-chat";
import { NewChatDialog } from "@/components/chat/NewChatDialog";
import { initials, colorFor } from "@/components/AuthorTag";
import { timeAgo } from "@/lib/time-ago";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PlatformUserDetails = { id: string; email: string; name?: string | null; details?: { profilePicUrl?: string | null } | null };

function useUserDirectory() {
  const orgId = useAuthStore((s) => s.user?.orgId);
  const { data } = useQuery<{ getAllUsers: PlatformUserDetails[] }>(GET_ALL_USERS, {
    variables: { orgId },
  });
  return useMemo(() => {
    const map = new Map<string, PlatformUserDetails>();
    for (const u of data?.getAllUsers ?? []) map.set(u.id, u);
    return map;
  }, [data]);
}

function conversationTitle(
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

function ConversationListItem({
  convo,
  active,
  myUserId,
  directory,
  index,
  onClick,
}: {
  convo: ConversationSummary;
  active: boolean;
  myUserId: string | undefined;
  directory: Map<string, PlatformUserDetails>;
  index: number;
  onClick: () => void;
}) {
  const title = conversationTitle(convo, myUserId, directory);
  const otherId =
    convo.kind === "dm" ? convo.members.find((m) => m.app_user_id !== myUserId)?.app_user_id : undefined;
  const other = otherId ? directory.get(otherId) : undefined;
  const picUrl = other?.details?.profilePicUrl;
  const isTemp = convo.kind === "temp_group";
  const unread = convo.unreadCount > 0;

  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
      className={cn(
        "relative flex w-full animate-fade-slide-up items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-secondary/70",
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
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("truncate text-sm text-foreground", unread ? "font-semibold" : "font-medium")}>{title}</p>
          {convo.lastMessage && (
            <span className={cn("shrink-0 text-[11px]", unread ? "text-primary font-medium" : "text-muted-foreground")}>
              {timeAgo(convo.lastMessage.created_at)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {isTemp && <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />}
          <p className={cn("truncate text-xs", unread ? "text-foreground/80" : "text-muted-foreground")}>
            {convo.lastMessage ? convo.lastMessage.body : "No messages yet"}
          </p>
        </div>
      </div>
      {unread && (
        <Badge className="mt-1 h-5 min-w-5 shrink-0 animate-pop-in justify-center rounded-full border-0 bg-primary px-1.5 text-[10px] text-primary-foreground shadow-sm">
          {convo.unreadCount > 99 ? "99+" : convo.unreadCount}
        </Badge>
      )}
    </button>
  );
}

function MessageBubble({
  mine,
  body,
  createdAt,
  senderName,
}: {
  mine: boolean;
  body: string;
  createdAt: string;
  senderName?: string;
}) {
  return (
    <div className={cn("flex animate-fade-slide-up flex-col", mine ? "items-end" : "items-start")}>
      {!mine && senderName && <span className="mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">{senderName}</span>}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
          mine
            ? "rounded-br-sm gold-gradient text-primary-foreground"
            : "rounded-bl-sm border border-border bg-card text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{body}</p>
      </div>
      <span className="mt-0.5 px-1 text-[10px] text-muted-foreground/70">{timeAgo(createdAt)}</span>
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
  const directory = useUserDirectory();
  const { conversations, loading: loadingConversations, refresh } = useConversations();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(searchParams.get("c"));
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, loading: loadingMessages, typingUserIds, sendMessage, notifyTyping, markRead } = useMessages(activeId);

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
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("c", id);
      return next;
    });
  };

  useEffect(() => {
    if (activeId) void markRead();
  }, [activeId, messages.length, markRead]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingUserIds.length]);

  const activeConvo = conversations.find((c) => c.id === activeId) ?? null;

  const filteredConversations = conversations.filter((c) => {
    if (!search.trim()) return true;
    const title = conversationTitle(c, myUserId, directory).toLowerCase();
    return title.includes(search.toLowerCase());
  });

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    const body = draft;
    setDraft("");
    try {
      await sendMessage(body);
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Chat</h2>
          <p className="text-muted-foreground">Direct messages and group conversations with your team.</p>
        </div>
      </div>

      <div className="premium-card flex h-[calc(100vh-13rem)] overflow-hidden p-0">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            background:
              "radial-gradient(circle at 10% 10%, hsl(var(--primary)) 0%, transparent 40%), radial-gradient(circle at 90% 90%, hsl(var(--saffron)) 0%, transparent 40%)",
          }}
        />
        {/* Conversation list */}
        <aside className="relative flex w-80 shrink-0 flex-col border-r border-border">
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
                  {conversations.length === 0 ? "No conversations yet" : "No matches"}
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
                    index={index}
                    onClick={() => handleSelectConversation(c.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Thread */}
        <div className="relative flex flex-1 flex-col bg-background/40">
          {!activeConvo ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="glow-primary flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <MessagesSquare className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
                <p className="font-semibold text-foreground">{conversationTitle(activeConvo, myUserId, directory)}</p>
                {activeConvo.kind === "temp_group" && activeConvo.expires_at && (
                  <Badge variant="outline" className="gap-1 border-primary/30 text-[10px] text-primary">
                    <Clock className="h-3 w-3" />
                    Expires {timeAgo(activeConvo.expires_at)}
                  </Badge>
                )}
                {activeConvo.kind !== "dm" && (
                  <Badge variant="secondary" className="text-[10px]">
                    {activeConvo.members.length} members
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1 px-4 py-3">
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
                      return (
                        <MessageBubble
                          key={m.id}
                          mine={m.sender_app_user_id === myUserId}
                          body={m.body}
                          createdAt={m.created_at}
                          senderName={activeConvo.kind !== "dm" ? sender?.name || sender?.email : undefined}
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

              <div className="flex items-end gap-2 border-t border-border bg-card/60 p-3 backdrop-blur-sm">
                <Textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    notifyTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="max-h-32 min-h-10 flex-1 resize-none border-border bg-background/60"
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
    </DashboardLayout>
  );
}
