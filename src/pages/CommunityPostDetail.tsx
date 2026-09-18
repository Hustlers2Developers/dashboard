import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { useIsOrgAdmin } from "@/hooks/use-org-admin";
import {
  COMMUNITY_POST,
  COMMUNITY_REPLIES,
  CREATE_COMMUNITY_REPLY,
  UPDATE_COMMUNITY_REPLY,
  DELETE_COMMUNITY_REPLY,
  UPDATE_COMMUNITY_POST,
  DELETE_COMMUNITY_POST,
} from "@/graphql/mutations/community";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { AuthorTag, CommunityUser } from "@/components/AuthorTag";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ArrowLeft, MessageSquare, Pencil, Trash2, X, Check } from "lucide-react";
import { timeAgo } from "@/lib/time-ago";
import { RichText } from "@/components/RichText";

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

type CommunityReply = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const CommunityPostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.sub);
  const orgId = useAuthStore((s) => s.user?.orgId) || "";
  const { isOrgAdmin } = useIsOrgAdmin(orgId);

  const { data: postData, loading: postLoading, error: postError } = useQuery<{
    communityPost: CommunityPost | null;
  }>(COMMUNITY_POST, { variables: { id }, skip: !id });

  const {
    data: repliesData,
    loading: repliesLoading,
    refetch: refetchReplies,
  } = useQuery<{ communityReplies: { data: CommunityReply[] } }>(COMMUNITY_REPLIES, {
    variables: { postId: id, pagination: { page: 1, limit: 100 } },
    skip: !id,
  });

  // Resolve authorId -> member display info from the org directory, same as
  // the Posts feed — the backend doesn't join author name onto posts/replies.
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

  const [replyContent, setReplyContent] = useState("");
  const [createReply, { loading: submittingReply }] = useMutation(CREATE_COMMUNITY_REPLY);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const [updateReply, { loading: updatingReply }] = useMutation(UPDATE_COMMUNITY_REPLY);
  const [deleteReplyTarget, setDeleteReplyTarget] = useState<CommunityReply | null>(null);
  const [deleteReply, { loading: deletingReply }] = useMutation(DELETE_COMMUNITY_REPLY);

  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [updatePost, { loading: updatingPost }] = useMutation(UPDATE_COMMUNITY_POST);
  const [deletePostOpen, setDeletePostOpen] = useState(false);
  const [deletePost, { loading: deletingPost }] = useMutation(DELETE_COMMUNITY_POST);

  const post = postData?.communityPost;
  const replies = repliesData?.communityReplies.data ?? [];
  const isPostAuthor = post?.authorId === currentUserId;
  const canDeletePost = isPostAuthor || isOrgAdmin;

  const handleReply = async () => {
    if (!replyContent.trim() || !id) return;
    try {
      await createReply({ variables: { input: { postId: id, content: replyContent.trim() } } });
      setReplyContent("");
      await refetchReplies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to post reply.");
    }
  };

  const startEditReply = (reply: CommunityReply) => {
    setEditingReplyId(reply.id);
    setEditReplyContent(reply.content);
  };

  const saveEditReply = async () => {
    if (!editingReplyId || !editReplyContent.trim()) return;
    try {
      await updateReply({
        variables: { id: editingReplyId, input: { content: editReplyContent.trim() } },
      });
      setEditingReplyId(null);
      await refetchReplies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update reply.");
    }
  };

  const confirmDeleteReply = async () => {
    if (!deleteReplyTarget) return;
    try {
      await deleteReply({ variables: { id: deleteReplyTarget.id } });
      toast.success("Reply deleted.");
      setDeleteReplyTarget(null);
      await refetchReplies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete reply.");
    }
  };

  const startEditPost = () => {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditingPost(true);
  };

  const saveEditPost = async () => {
    if (!id || !editTitle.trim() || !editContent.trim()) return;
    try {
      await updatePost({
        variables: { id, input: { title: editTitle.trim(), content: editContent.trim() } },
      });
      setEditingPost(false);
      toast.success("Post updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update post.");
    }
  };

  const confirmDeletePost = async () => {
    if (!id) return;
    try {
      await deletePost({ variables: { id } });
      toast.success("Post deleted.");
      navigate("/community");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete post.");
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5" onClick={() => navigate("/community")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Community
        </Button>

        {postLoading ? (
          <Card className="border-border">
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ) : postError || !post ? (
          <Card className="border-border">
            <CardContent className="p-6 text-sm text-destructive">
              {postError ? `Couldn't load this post. ${postError.message}` : "Post not found."}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardContent className="space-y-3 p-6">
              {editingPost ? (
                <div className="space-y-3">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={5}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingPost(false)}>
                      Cancel
                    </Button>
                    <LoadingButton
                      size="sm"
                      loading={updatingPost}
                      disabled={!editTitle.trim() || !editContent.trim()}
                      onClick={saveEditPost}
                    >
                      Save
                    </LoadingButton>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground">{post.title}</h1>
                    {(isPostAuthor || canDeletePost) && (
                      <div className="flex shrink-0 gap-1">
                        {isPostAuthor && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={startEditPost}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDeletePost && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletePostOpen(true)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
                    <AuthorTag author={authorsById.get(post.authorId)} authorId={post.authorId} />
                    <span aria-hidden className="text-muted-foreground/40">·</span>
                    <span>
                      {timeAgo(post.createdAt)}
                      {post.updatedAt !== post.createdAt && " · edited"}
                    </span>
                  </div>
                  <RichText text={post.content} className="text-[15px] leading-relaxed text-foreground" />
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Replies */}
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquare className="h-4 w-4" />
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </h2>

          {repliesLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : replies.length === 0 ? (
            <Card className="border-dashed border-border bg-transparent">
              <CardContent className="p-5 text-center text-sm text-muted-foreground">
                No replies yet — be the first to weigh in.
              </CardContent>
            </Card>
          ) : (
            replies.map((reply, idx) => {
              const isReplyAuthor = reply.authorId === currentUserId;
              const canDeleteReply = isReplyAuthor || isOrgAdmin;
              return (
                <Card
                  key={reply.id}
                  className="animate-fade-slide-up border-border"
                  style={{ animationDelay: `${Math.min(idx, 10) * 40}ms` }}
                >
                  <CardContent className="space-y-2 p-4">
                    {editingReplyId === reply.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editReplyContent}
                          onChange={(e) => setEditReplyContent(e.target.value)}
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingReplyId(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={updatingReply || !editReplyContent.trim()}
                            onClick={saveEditReply}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
                              <AuthorTag author={authorsById.get(reply.authorId)} authorId={reply.authorId} />
                              <span aria-hidden className="text-muted-foreground/40">·</span>
                              <span>
                                {timeAgo(reply.createdAt)}
                                {reply.updatedAt !== reply.createdAt && " · edited"}
                              </span>
                            </div>
                            <RichText text={reply.content} className="text-sm leading-relaxed text-foreground" />
                          </div>
                          {(isReplyAuthor || canDeleteReply) && (
                            <div className="flex shrink-0 gap-0.5">
                              {isReplyAuthor && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => startEditReply(reply)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                              {canDeleteReply && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteReplyTarget(reply)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Reply composer */}
          <Card className="premium-card border-0">
            <CardContent className="space-y-2 p-4">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={replies.length === 0 ? "Share the first reply…" : "Add to the discussion…"}
                rows={3}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold">**bold**</span>, <em>*italic*</em>,{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">`code`</code>, and{" "}
                  <span className="font-mono">- </span>bullets
                </p>
                <LoadingButton
                  size="sm"
                  loading={submittingReply}
                  disabled={!replyContent.trim()}
                  onClick={handleReply}
                >
                  Post reply
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deletePostOpen} onOpenChange={setDeletePostOpen}>
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
              disabled={deletingPost}
              onClick={confirmDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteReplyTarget} onOpenChange={(open) => !open && setDeleteReplyTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reply?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingReply}
              onClick={confirmDeleteReply}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default CommunityPostDetail;
