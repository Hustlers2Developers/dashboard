import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { useIsOrgAdmin } from "@/hooks/use-org-admin";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { COMMUNITY_POSTS, CREATE_COMMUNITY_POST, DELETE_COMMUNITY_POST } from "@/graphql/mutations/community";
import { timeAgo } from "@/lib/time-ago";
import { AuthorTag, CommunityUser, initials, colorFor } from "@/components/AuthorTag";
import { useSeenPosts } from "@/hooks/use-seen-posts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Users2,
  Search,
  Mail,
  MessageCircle,
  ArrowUpRight,
  Github,
  Linkedin,
  Plus,
  MessageSquare,
  Trash2,
  Sparkles,
  MessagesSquare,
} from "lucide-react";

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

const withProtocol = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

const SLACK_INVITE_URL =
  "https://join.slack.com/t/teamhustlersworld/shared_invite/zt-3lihulkj7-2gCwffDBf5tGc1Zpus_NZw";

const MemberAvatar = ({ member }: { member: CommunityUser }) => {
  const [errored, setErrored] = useState(false);
  const picUrl = member.details?.profilePicUrl;
  if (picUrl && !errored) {
    return (
      <img
        src={picUrl}
        alt={member.name || member.email}
        onError={() => setErrored(true)}
        referrerPolicy="no-referrer"
        className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colorFor(member.id)}`}
    >
      {initials(member.name, member.email)}
    </div>
  );
};

const PostsFeed = ({ orgId }: { orgId: string }) => {
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
  // client-side against the org member directory we already fetch for the
  // Members tab (cache-first, so this is free once that tab has loaded).
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
          {posts.length > 0 && (
            <>
              <span className="flex items-center gap-1.5">
                <MessagesSquare className="h-3.5 w-3.5" />
                {posts.length} {posts.length === 1 ? "discussion" : "discussions"}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                {totalReplies} {totalReplies === 1 ? "reply" : "replies"} total
              </span>
            </>
          )}
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  Supports <span className="font-semibold">**bold**</span>, <em>*italic*</em>,{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">`code`</code>, bullets
                </p>
                <LoadingButton
                  loading={creating}
                  disabled={!title.trim() || !content.trim()}
                  onClick={handleCreate}
                >
                  Publish post
                </LoadingButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : posts.length === 0 ? (
        <Card className="premium-card border-0">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <MessagesSquare className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No discussions yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Ask a question, share what you're building, or just say hi — someone in the org will see it.
              </p>
            </div>
            <Button size="sm" className="mt-1 gap-1.5" onClick={() => setCreateOpen(true)}>
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
                <CardContent className="space-y-2.5 p-5">
                  <h3 className="flex items-center gap-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {post.title}
                    {showNewBadge && (
                      <span className="inline-flex shrink-0 animate-pop-in items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        <Sparkles className="h-2.5 w-2.5" />
                        New
                      </span>
                    )}
                  </h3>
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.content}</p>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                      <AuthorTag author={authorsById.get(post.authorId)} authorId={post.authorId} />
                      <span aria-hidden className="text-muted-foreground/40">·</span>
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
                        className="h-6 w-6 shrink-0 text-muted-foreground/50 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const MemberDirectory = ({ orgId }: { orgId: string }) => {
  const [search, setSearch] = useState("");

  const { data, loading, error, refetch } = useQuery<{ getAllUsers: CommunityUser[] }>(GET_ALL_USERS, {
    variables: { orgId },
    skip: !orgId,
    fetchPolicy: "cache-first",
  });

  const members = useMemo(() => {
    const all = data?.getAllUsers ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (m) => m.name?.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="pl-9"
        />
      </div>

      {/* Slack CTA */}
      <a
        href={SLACK_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group premium-card block bg-gradient-to-br from-[#4A154B]/10 via-card to-card p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#4A154B]/10 transition-transform group-hover:scale-105">
              <MessageCircle className="h-6 w-6 text-[#4A154B] dark:text-[#ECB22E]" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Join us on Slack</p>
              <p className="text-sm text-muted-foreground">
                Team Hustlers World — the real-time home for questions, updates, and community chatter.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#4A154B] px-4 py-2 text-sm font-medium text-white transition-transform group-hover:translate-x-0.5">
            Join workspace
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </a>

      {/* Directory */}
      {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-border">
                <CardContent className="flex items-center gap-3 p-5">
                  <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                  <div className="w-full space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <p className="text-sm text-destructive">Couldn't load the community list. {error.message}</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : members.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {search ? "No developers match your search." : "No community members yet."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => {
              const details = member.details;
              return (
                <div key={member.id} className="premium-card flex flex-col gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <MemberAvatar member={member} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {member.name || "Unnamed developer"}
                      </p>
                      {details?.title && (
                        <p className="truncate text-xs text-muted-foreground">{details.title}</p>
                      )}
                      <a
                        href={`mailto:${member.email}`}
                        className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-accent hover:underline"
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </a>
                    </div>
                  </div>

                  {details?.bio && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{details.bio}</p>
                  )}

                  {(details?.githubUsername || details?.linkedInUrl) && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {details?.githubUsername && (
                        <a
                          href={`https://github.com/${details.githubUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        >
                          <Github className="h-3 w-3" />
                          GitHub
                        </a>
                      )}
                      {details?.linkedInUrl && (
                        <a
                          href={withProtocol(details.linkedInUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        >
                          <Linkedin className="h-3 w-3" />
                          LinkedIn
                        </a>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      <p className="text-center text-xs text-muted-foreground">
        Members choose what to share beyond name and email.{" "}
        <Link
          to="/profile"
          className="text-accent hover:underline"
        >
          Add your bio, title, GitHub, or LinkedIn
        </Link>{" "}
        to show up here.
      </p>
    </div>
  );
};

const Community = () => {
  const orgId = useAuthStore((s) => s.user?.orgId) || "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Users2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Community</h2>
            <p className="text-muted-foreground">Connect, discuss, and meet the developers building alongside you.</p>
          </div>
        </div>

        <Tabs defaultValue="posts">
          <TabsList>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>
          <TabsContent value="posts">
            <PostsFeed orgId={orgId} />
          </TabsContent>
          <TabsContent value="members">
            <MemberDirectory orgId={orgId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Community;
