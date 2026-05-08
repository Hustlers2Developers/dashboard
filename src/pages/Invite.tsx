import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { CREATE_INVITE_LINK, GET_INVITES } from "@/graphql/mutations/invites";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Copy, Check, Clock, CheckCircle2, XCircle } from "lucide-react";

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

const Invite = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const [email, setEmail] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InviteStatus>("all");

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
  const { data, loading: loadingInvites, refetch } = useQuery<{ invites: InviteRecord[] }>(GET_INVITES, {
    variables: {
      organizationId: orgId,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    skip: !orgId,
  });

  type CreateInviteLinkResult = {
    createInviteLink: {
      inviteId: string;
      inviteLink: string;
      email: string;
      roleId?: string | null;
      expiresAt: string;
      invitedById: string;
      organizationId: string;
    };
  };
  const [createInviteLink, { loading: creating }] =
    useMutation<CreateInviteLinkResult>(CREATE_INVITE_LINK);

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
        setEmail("");
        refetch();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create invite.");
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
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Loading invites...
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

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
        </div>
      </div>
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
