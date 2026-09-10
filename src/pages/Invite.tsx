import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import {
  CREATE_INVITE_LINK,
  DELETE_INVITE,
  GET_INVITES,
  RESEND_INVITE_LINK,
} from "@/graphql/mutations/invites";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Mail,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCw,
  Trash2,
} from "lucide-react";

type InviteStatus = "all" | "pending" | "accepted" | "expired";

const statusLabel: Record<InviteStatus, string> = {
  all: "All",
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
};

function parseDate(ts: string | null | undefined): Date | null {
  if (!ts) return null;
  if (/^\d+$/.test(ts)) return new Date(parseInt(ts, 10));
  return new Date(ts);
}

function formatDate(ts: string | null | undefined) {
  const d = parseDate(ts);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function getInviteStatus(invite: {
  acceptedAt?: string | null;
  expiresAt: string;
}): "accepted" | "expired" | "pending" {
  if (invite.acceptedAt) return "accepted";
  const expires = parseDate(invite.expiresAt);
  if (expires && expires < new Date()) return "expired";
  return "pending";
}

type InviteRecord = {
  id: string;
  email: string;
  organizationId: string;
  roleId?: string | null;
  invitedById: string;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
};

const Invite = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const [email, setEmail] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InviteStatus>("all");
  const [lastLink, setLastLink] = useState<{ email: string; link: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InviteRecord | null>(null);

  const { data, loading: loadingInvites, refetch } = useQuery<{ invites: InviteRecord[] }>(GET_INVITES, {
    variables: {
      organizationId: orgId,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    skip: !orgId,
  });

  type InviteLinkResponse = {
    inviteId: string;
    inviteLink: string;
    email: string;
    roleId?: string | null;
    expiresAt: string;
    invitedById: string;
    organizationId: string;
  };
  const [createInviteLink, { loading: creating }] =
    useMutation<{ createInviteLink: InviteLinkResponse }>(CREATE_INVITE_LINK);
  const [resendInviteLink, { loading: resending }] =
    useMutation<{ resendInviteLink: InviteLinkResponse }>(RESEND_INVITE_LINK);
  const [deleteInvite, { loading: deleting }] = useMutation(DELETE_INVITE);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Enter an email to invite.");
      return;
    }

    try {
      const result = await createInviteLink({
        variables: {
          input: {
            email,
            organizationId: orgId,
          },
        },
      });

      const newLink = result.data?.createInviteLink;
      if (newLink) {
        toast.success("Invite link created successfully.");
        setLastLink({ email: newLink.email, link: newLink.inviteLink });
        setEmail("");
        refetch();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create invite.");
    }
  };

  const handleResend = async (invite: InviteRecord) => {
    try {
      const result = await resendInviteLink({ variables: { inviteId: invite.id } });
      const refreshed = result.data?.resendInviteLink;
      if (refreshed) {
        toast.success("Invite resent — a new link was generated.");
        setLastLink({ email: refreshed.email, link: refreshed.inviteLink });
        refetch();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to resend invite.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInvite({ variables: { inviteId: deleteTarget.id } });
      toast.success("Invite deleted.");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete invite.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const invites: InviteRecord[] = data?.invites ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Invitations</h2>
            <p className="text-muted-foreground">
              Generate invite links for team members to join your organization.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* All invites list */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle>Invites</CardTitle>
              <div className="flex gap-1">
                {(
                  ["all", "pending", "accepted", "expired"] as InviteStatus[]
                ).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      statusFilter === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {loadingInvites ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : invites.length === 0 ? (
                <div className="space-y-3 py-10 text-center text-sm text-muted-foreground">
                  <Mail className="mx-auto h-7 w-7 text-muted-foreground" />
                  No invites found.
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {invites.map((invite) => {
                    const status = getInviteStatus(invite);
                    return (
                      <div
                        key={invite.id}
                        className="rounded-xl border border-border bg-background p-4"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {invite.email}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Invited:{" "}
                              {formatDate(invite.createdAt)}
                            </p>
                          </div>
                          <StatusBadge status={status} />
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Expires:{" "}
                            {formatDate(invite.expiresAt)}
                          </div>
                          <button
                            onClick={() => copyToClipboard(invite.email)}
                            className="ml-auto p-1.5 hover:bg-muted rounded transition-colors"
                            title="Copy email"
                          >
                            {copiedLink === invite.email ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                          {status !== "accepted" && (
                            <button
                              onClick={() => handleResend(invite)}
                              disabled={resending}
                              className="p-1.5 hover:bg-muted rounded transition-colors disabled:opacity-50"
                              title="Resend invite (generates a new link)"
                            >
                              <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          )}
                          {status !== "accepted" && (
                            <button
                              onClick={() => setDeleteTarget(invite)}
                              className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                              title="Delete invite"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Create invite form */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Create invite link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email address</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="invite@example.com"
                      required
                    />
                  </div>
                  <LoadingButton
                    type="submit"
                    className="w-full gold-gradient text-primary-foreground"
                    loading={creating}
                    loadingText="Creating link..."
                  >
                    Generate invite link
                  </LoadingButton>
                </form>
              </CardContent>
            </Card>

            {/* Most recently generated link */}
            {lastLink && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Latest invite link</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    For <span className="font-medium text-foreground">{lastLink.email}</span> — share this link with them.
                  </p>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
                    <a
                      href={lastLink.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-xs text-accent hover:underline"
                      title={lastLink.link}
                    >
                      {lastLink.link}
                    </a>
                    <button
                      onClick={() => copyToClipboard(lastLink.link)}
                      className="shrink-0 p-1.5 hover:bg-muted rounded transition-colors"
                      title="Copy link"
                    >
                      {copiedLink === lastLink.link ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invite?</AlertDialogTitle>
            <AlertDialogDescription>
              The invite for <strong>{deleteTarget?.email}</strong> will be revoked. They won't be able to use this link to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

function StatusBadge({
  status,
}: {
  status: "pending" | "accepted" | "expired";
}) {
  if (status === "accepted")
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
      </span>
    );
  if (status === "expired")
    return (
      <span className="flex items-center gap-1 text-xs text-destructive font-medium">
        <XCircle className="h-3.5 w-3.5" /> Expired
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
      <Clock className="h-3.5 w-3.5" /> Pending
    </span>
  );
}

export default Invite;
