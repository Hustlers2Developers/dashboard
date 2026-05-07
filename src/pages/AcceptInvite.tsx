import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { apolloClient } from "@/lib/graphql-client";
import { VALIDATE_INVITE, ACCEPT_INVITE } from "@/graphql/mutations/invites";
import { GUEST_APPLICATION_BY_INVITE_TOKEN } from "@/graphql/mutations/guest-applications";
import { CURRENT_USER_QUERY } from "@/graphql/mutations/auth";
import { startTokenRefreshTimer } from "@/lib/graphql-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

type InviteInfo = {
  email: string;
  organizationId: string;
  roleId: string;
  expiresAt: string;
};

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();

  const [form, setForm] = useState({ name: "", password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, error } = useQuery<{ validateInvite: InviteInfo }>(VALIDATE_INVITE, {
    variables: { token },
    skip: !token,
    fetchPolicy: "network-only",
  });

  const { data: prefillData } = useQuery<{
    guestApplicationByInviteToken?: { name?: string; githubUsername?: string; portfolioUrl?: string } | null;
  }>(GUEST_APPLICATION_BY_INVITE_TOKEN, {
    variables: { token },
    skip: !token,
    fetchPolicy: "network-only",
  });

  const [acceptInvite] = useMutation(ACCEPT_INVITE);

  const invite = data?.validateInvite;

  useEffect(() => {
    if (invite?.email || prefillData?.guestApplicationByInviteToken) {
      const prefill = prefillData?.guestApplicationByInviteToken;
      setForm((p) => ({
        ...p,
        name: prefill?.name || p.name,
      }));
    }
  }, [invite, prefillData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required."); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirm) { toast.error("Passwords do not match."); return; }

    setSubmitting(true);
    try {
      const res = await acceptInvite({
        variables: {
          input: {
            token,
            email: invite?.email,
            password: form.password,
            name: form.name,
          },
        },
      }) as { data: { acceptInvite: { accessToken: string; refreshToken: string } } };

      const { accessToken, refreshToken } = res.data.acceptInvite;
      setTokens(accessToken, refreshToken);
      startTokenRefreshTimer();

      const userRes = await apolloClient.query({ query: CURRENT_USER_QUERY, fetchPolicy: "network-only" });
      if (userRes.data?.currentUser) setUser(userRes.data.currentUser);

      toast.success("Account created! Welcome.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept invite.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="font-semibold text-foreground">Invalid invite link</p>
            <p className="text-sm text-muted-foreground">The link is missing a token. Please use the original invite email link.</p>
            <Button variant="outline" onClick={() => navigate("/login")}>Go to login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl gold-gradient">
            <span className="text-lg font-bold text-primary-foreground">G</span>
          </div>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>Create your account to join the organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="font-medium text-foreground">Invite not found or expired</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
              <Button variant="outline" onClick={() => navigate("/login")}>Go to login</Button>
            </div>
          ) : invite ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-medium text-foreground">Valid invite for</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{invite.email}</p>
                <p className="text-xs text-muted-foreground">
                  Expires {new Date(invite.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={invite.email} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 8 characters"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  name="confirm"
                  type="password"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full gold-gradient text-primary-foreground"
                disabled={submitting}
              >
                {submitting ? "Creating account..." : "Create account & join"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button type="button" className="underline hover:text-foreground" onClick={() => navigate("/login")}>
                  Log in
                </button>
              </p>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
