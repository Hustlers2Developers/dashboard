import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Users, MessageCirclePlus, Clock } from "lucide-react";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateConversation, useBlockedUsers } from "@/hooks/use-chat";
import { initials, colorFor, CommunityUser } from "@/components/AuthorTag";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/LoadingButton";
import { toast } from "sonner";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
}

export function NewChatDialog({ open, onOpenChange, onCreated }: NewChatDialogProps) {
  const currentUserId = useAuthStore((s) => s.user?.sub);
  const orgId = useAuthStore((s) => s.user?.orgId);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [tempExpiryHours, setTempExpiryHours] = useState("24");
  const [creating, setCreating] = useState(false);

  const { data, loading } = useQuery<{ getAllUsers: CommunityUser[] }>(GET_ALL_USERS, {
    variables: { orgId },
    skip: !open || !orgId,
    fetchPolicy: "cache-first",
  });

  const { createDm, createGroup } = useCreateConversation();
  const { blockedIds } = useBlockedUsers();

  // Only community members with a public profile can be messaged here —
  // matches the visibility toggle on the Profile page and how Community's
  // own member directory scopes who's listed. Users I've blocked are left
  // out too — messaging them would just fail server-side (messages_enforce_dm_block).
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    const deduped = new Map<string, CommunityUser>();
    for (const u of data?.getAllUsers ?? []) {
      if (u.id === currentUserId) continue;
      if (u.details?.isPublic === false) continue;
      if (blockedIds.has(u.id)) continue;
      deduped.set(u.id, u);
    }
    const all = Array.from(deduped.values());
    if (!q) return all;
    return all.filter((u) => u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [data, currentUserId, search, blockedIds]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const reset = () => {
    setSearch("");
    setSelectedIds([]);
    setGroupTitle("");
    setTempExpiryHours("24");
  };

  const handleStartDm = async (userId: string) => {
    setCreating(true);
    try {
      const id = await createDm(userId);
      onCreated(id);
      onOpenChange(false);
      reset();
    } catch {
      toast.error("Couldn't start conversation. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGroup = async (temp: boolean) => {
    if (selectedIds.length === 0) {
      toast.error("Pick at least one member");
      return;
    }
    if (!groupTitle.trim()) {
      toast.error("Give the group a name");
      return;
    }
    setCreating(true);
    try {
      const expiresAt = temp
        ? new Date(Date.now() + Number(tempExpiryHours || 24) * 60 * 60 * 1000)
        : undefined;
      const id = await createGroup(groupTitle.trim(), selectedIds, expiresAt);
      onCreated(id);
      onOpenChange(false);
      reset();
    } catch {
      toast.error("Couldn't create group. Try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="glow-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <MessageCirclePlus className="h-5 w-5 text-primary" />
            </span>
            New conversation
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dm">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dm">Direct message</TabsTrigger>
            <TabsTrigger value="group">Group</TabsTrigger>
          </TabsList>

          <TabsContent value="dm" className="space-y-3 pt-2">
            <Input
              placeholder="Search members by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ScrollArea className="h-72 rounded-xl border border-border bg-background/40">
              {loading ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Loading members...</p>
              ) : candidates.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No members found</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {candidates.map((u, index) => (
                    <button
                      key={u.id}
                      disabled={creating}
                      style={{ animationDelay: `${Math.min(index, 12) * 20}ms` }}
                      onClick={() => void handleStartDm(u.id)}
                      className="flex w-full animate-fade-slide-up items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary/70 disabled:opacity-50"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${colorFor(u.id)}`}
                      >
                        {initials(u.name, u.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{u.name || u.email}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="group" className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                placeholder="e.g. Sprint 12 squad"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
              />
            </div>
            <Input
              placeholder="Search members to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ScrollArea className="h-52 rounded-xl border border-border bg-background/40">
              {candidates.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No members found</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {candidates.map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-secondary/70"
                    >
                      <Checkbox
                        checked={selectedIds.includes(u.id)}
                        onCheckedChange={() => toggle(u.id)}
                      />
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${colorFor(u.id)}`}
                      >
                        {initials(u.name, u.email)}
                      </div>
                      <span className="truncate text-sm text-foreground">{u.name || u.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-2.5">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-xs text-muted-foreground">Auto-delete after</span>
              <Input
                type="number"
                min={1}
                className="h-7 w-16 border-border bg-background text-xs"
                value={tempExpiryHours}
                onChange={(e) => setTempExpiryHours(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">hours (optional)</span>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <LoadingButton
                variant="outline"
                loading={creating}
                onClick={() => void handleCreateGroup(true)}
                className="gap-1.5"
              >
                <Clock className="h-4 w-4" />
                Create temp group
              </LoadingButton>
              <LoadingButton
                loading={creating}
                onClick={() => void handleCreateGroup(false)}
                className="gap-1.5 gold-gradient text-primary-foreground"
              >
                <Users className="h-4 w-4" />
                Create group
              </LoadingButton>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
