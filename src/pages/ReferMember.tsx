import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { CREATE_INVITE_LINK } from "@/graphql/mutations/invites";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Copy, Check, Mail } from "lucide-react";

type InviteLinkResponse = {
  inviteId: string;
  inviteLink: string;
  email: string;
  expiresAt: string;
};

/**
 * Lightweight "invite someone" form for regular members — every org member
 * can refer people in, but only SUPER_ADMIN gets the full tracking/manage
 * dashboard at /invites (list, resend, delete). This page only creates a
 * link and shows it back; it doesn't query or expose other members' invites.
 */
const ReferMember = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const [email, setEmail] = useState("");
  const [lastLink, setLastLink] = useState<{ email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [createInviteLink, { loading: creating }] =
    useMutation<{ createInviteLink: InviteLinkResponse }>(CREATE_INVITE_LINK);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter an email to invite.");
      return;
    }
    try {
      const result = await createInviteLink({
        variables: { input: { email: trimmed, organizationId: orgId } },
      });
      const link = result.data?.createInviteLink;
      if (link) {
        toast.success("Invite link created!");
        setLastLink({ email: link.email, link: link.inviteLink });
        setEmail("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create invite.");
    }
  };

  const copyLink = () => {
    if (!lastLink) return;
    navigator.clipboard.writeText(lastLink.link);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <UserPlus className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Referral</h2>
            <p className="text-muted-foreground">
              Know someone who'd be a great fit? Refer them with an invite link.
            </p>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Refer by email</CardTitle>
            <CardDescription>We'll generate a link you can share directly.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Their email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  required
                />
              </div>
              <LoadingButton
                type="submit"
                className="w-full gold-gradient text-primary-foreground"
                loading={creating}
                loadingText="Generating..."
              >
                <Mail className="mr-2 h-4 w-4" />
                Generate referral link
              </LoadingButton>
            </form>
          </CardContent>
        </Card>

        {lastLink && (
          <Card className="premium-card border-0">
            <CardContent className="space-y-3 p-5">
              <p className="text-sm text-muted-foreground">
                Referral link for <span className="font-medium text-foreground">{lastLink.email}</span>
              </p>
              <div className="flex items-center gap-2">
                <Input value={lastLink.link} readOnly className="sm:text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copyLink} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReferMember;
