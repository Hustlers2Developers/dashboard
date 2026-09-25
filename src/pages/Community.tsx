import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { useIsOrgAdmin } from "@/hooks/use-org-admin";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { COMMUNITY_POSTS, CREATE_COMMUNITY_POST, DELETE_COMMUNITY_POST } from "@/graphql/mutations/community";
import { timeAgo } from "@/lib/time-ago";
import { AuthorTag, CommunityUser } from "@/components/AuthorTag";
import { useSeenPosts } from "@/hooks/use-seen-posts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Users2, Plus, MessageSquare, Trash2, Sparkles, MessagesSquare } from "lucide-react";

type CommunityPost = {
  id: string;
  organizationId: string;
  authorId: string;
  title: string;
  content: string;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
};

const Community = () => {
  const orgId = useAuthStore((s) => s.user?.orgId) || "";
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.sub);
  const { isOrgAdmin } = useIsOrgAdmin(orgId);

  const { data, loading, error, refetch } = useQuery<{
    communityPosts: { data: CommunityPost[] };
  }>(COMMUNITY_POSTS, {
    variables: { organizationId: orgId, pagination: { page: 1, limit: 50 } },
    skip: !orgId,
  });

  // CommunityPost only carries authorId (a UUID) — the backend doesn't join
  // author name/email onto posts/replies, so we resolve display names
  // client-side against the org member directory (cache-first, so this is
  // free once the Community Members page has loaded it this session).
  const { data: membersData } = useQuery<{ getAllUsers: CommunityUser[] }>(GET_ALL_USERS, {
    variables: { orgId },
    skip: !orgId,
    fetchPolicy: "cache-first",
  });
  const authorsById = useMemo(() => {
    const map = new Map<string, CommunityUser>();
    for (const m of membersData?.getAllUsers ?? []) map.set(m.id, m);
    return map;
  }, [membersData]);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [createPost, { loading: creating }] = useMutation(CREATE_COMMUNITY_POST);

  const [deleteTarget, setDeleteTarget] = useState<CommunityPost | null>(null);
  const [deletePost, { loading: deleting }] = useMutation(DELETE_COMMUNITY_POST);

  const { isNew } = useSeenPosts();

  const posts = data?.communityPosts.data ?? [];

  const handleCreate = async () => {
    if (!title.trim() || !content.trim() || !orgId) return;
    try {
      await createPost({
        variables: { input: { organizationId: orgId, title: title.trim(), content: content.trim() } },
      });
      toast.success("Post published.");
      setCreateOpen(false);
      setTitle("");
      setContent("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create post.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePost({ variables: { id: deleteTarget.id } });
      toast.success("Post deleted.");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete post.");
    }
  };

  const totalReplies = posts.reduce((sum, p) => sum + p.replyCount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              background:
                "radial-gradient(circle at 15% 20%, hsl(var(--primary)) 0%, transparent 45%), radial-gradient(circle at 85% 80%, hsl(var(--saffron)) 0%, transparent 45%)",
            }}
          />
          <div className="relative flex min-w-0 items-center gap-3.5">
            <div className="glow-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gold-gradient shadow-sm">
              <Users2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">Community</h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Connect and discuss with developers building alongside you.
              </p>
            </div>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="relative w-full cursor-pointer gap-1.5 sm:w-auto">
                <Plus className="h-4 w-4" />
                New post
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a discussion</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give it a clear, specific title"
                  autoFocus
                />
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ask a question, share something you built, or start a conversation…"
                  rows={5}
                />
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    Supports <span className="font-semibold">**bold**</span>, <em>*italic*</em>,{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono">`code`</code>, bullets
                  </p>
                  <LoadingButton
                    loading={creating}
                    disabled={!title.trim() || !content.trim()}
                    onClick={handleCreate}
                    className="w-full cursor-pointer sm:w-auto"
                  >
                    Publish post
                  </LoadingButton>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {posts.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MessagesSquare className="h-3.5 w-3.5" />
              {posts.length} {posts.length === 1 ? "discussion" : "discussions"}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              {totalReplies} {totalReplies === 1 ? "reply" : "replies"} total
            </span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <p className="text-sm text-destructive">Couldn't load posts. {error.message}</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()} className="cursor-pointer">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : posts.length === 0 ? (
          <Card className="premium-card border-0">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <MessagesSquare className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No discussions yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Ask a question, share what you're building, or just say hi — someone in the org will see it.
                </p>
              </div>
              <Button size="sm" className="mt-1 cursor-pointer gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Start the first discussion
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((post, idx) => {
              const canDelete = post.authorId === currentUserId || isOrgAdmin;
              const showNewBadge = post.authorId !== currentUserId && isNew(post.createdAt);
              return (
                <Card
                  key={post.id}
                  className="premium-card group animate-fade-slide-up cursor-pointer p-0"
                  style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                  onClick={() => navigate(`/community/posts/${post.id}`)}
                >
                  <CardContent className="space-y-2.5 p-4 sm:p-5">
                    <h3 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
                      {post.title}
                      {showNewBadge && (
                        <span className="inline-flex shrink-0 animate-pop-in items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                          <Sparkles className="h-2.5 w-2.5" />
                          New
                        </span>
                      )}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.content}</p>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                        <AuthorTag author={authorsById.get(post.authorId)} authorId={post.authorId} />
                        <span aria-hidden className="text-muted-foreground/40">
                          ·
                        </span>
                        <span>{timeAgo(post.createdAt)}</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}
                        </span>
                      </div>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 cursor-pointer text-muted-foreground/50 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 sm:opacity-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(post);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this post?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the post and all its replies. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={confirmDelete}
                className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Community;
