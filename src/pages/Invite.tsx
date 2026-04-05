import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { CREATE_INVITE_LINK } from "@/graphql/mutations/invites";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Copy, Check } from "lucide-react";

const Invite = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const [email, setEmail] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<any[]>([]);

  const [createInviteLink, { loading: creating }] =
    useMutation(CREATE_INVITE_LINK);

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
        setGeneratedLinks([newLink, ...generatedLinks]);
        toast.success("Invite link created successfully.");
        setEmail("");
      }
    } catch (err: any) {
      toast.error(err.message || "Unable to create invite.");
    }
  };

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Invitations
              </h2>
              <p className="text-muted-foreground">
                Generate invite links for team members to join your
                organization.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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

                <Button
                  type="submit"
                  className="w-full gold-gradient text-primary-foreground"
                  disabled={creating}
                >
                  {creating ? "Creating link..." : "Generate invite link"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Generated links</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedLinks.length === 0 ? (
                <div className="space-y-3 py-10 text-center text-sm text-muted-foreground">
                  <Mail className="mx-auto h-7 w-7 text-muted-foreground" />
                  No links generated yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {generatedLinks.map((link) => (
                    <div
                      key={link.inviteId}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <div className="mb-3">
                        <p className="font-medium text-foreground text-sm">
                          {link.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires:{" "}
                          {new Date(link.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={link.inviteLink}
                          readOnly
                          className="flex-1 bg-muted rounded px-2 py-1 text-xs text-muted-foreground truncate"
                        />
                        <button
                          onClick={() => copyToClipboard(link.inviteLink)}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                        >
                          {copiedLink === link.inviteLink ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Invite;
