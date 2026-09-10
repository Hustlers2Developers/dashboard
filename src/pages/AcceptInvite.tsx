import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { ACCEPT_INVITE, VALIDATE_INVITE } from "@/graphql/mutations/invites";
import { GUEST_APPLICATION_BY_INVITE_TOKEN } from "@/graphql/mutations/guest-applications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingButton } from "@/components/LoadingButton";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, XCircle } from "lucide-react";
import { RedirectLoader } from "@/components/RedirectLoader";

type InviteValidation = {
  email: string;
  organizationId: string;
  roleId: string;
  expiresAt: string;
};

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionLoading = useAuthStore((s) => s.loading);
  const setTokens = useAuthStore((s) => s.setTokens);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, error } = useQuery<{ validateInvite: InviteValidation }>(
    VALIDATE_INVITE,
    { variables: { token }, skip: !token },
  );

  // If this invite was generated from an approved guest application, prefill
  // the name from what they originally submitted.
  const { data: prefillData } = useQuery<{
    guestApplicationByInviteToken: { name: string; githubUsername?: string | null; portfolioUrl?: string | null } | null;
  }>(GUEST_APPLICATION_BY_INVITE_TOKEN, { variables: { token }, skip: !token });

  useEffect(() => {
    const prefillName = prefillData?.guestApplicationByInviteToken?.name;
    if (prefillName) setName((current) => current || prefillName);
  }, [prefillData]);

  const [acceptInvite] = useMutation<{ acceptInvite: { accessToken: string } }>(
    ACCEPT_INVITE,
  );

  if (sessionLoading) {
    return <RedirectLoader message="Restoring session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const invite = data?.validateInvite;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter your name.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await acceptInvite({
        variables: {
          input: {
            token,
            email: invite?.email || "",
            password,
            name: name.trim(),
          },
        },
      });
      const accessToken = result.data?.acceptInvite.accessToken;
      if (!accessToken) throw new Error("No access token returned.");
      setTokens(accessToken);
      toast.success("Welcome aboard!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept invite.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gold-gradient shadow-lg">
            <span className="text-2xl font-bold text-primary-foreground">G</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Godevelopers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accept your invitation to join the organization
          </p>
        </div>

        {!token ? (
          <Card className="border-border shadow-xl">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="font-medium text-foreground">Missing invite token</p>
              <p className="text-sm text-muted-foreground">
                This link is missing its invite token. Please use the link from your invite email.
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <RedirectLoader message="Checking your invite..." />
        ) : error || !invite ? (
          <Card className="border-border shadow-xl">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="font-medium text-foreground">Invalid or expired invite</p>
              <p className="text-sm text-muted-foreground">
                {error?.message || "This invite link is no longer valid. Ask an admin to resend it."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-foreground">Create your account</CardTitle>
              <CardDescription>
                You're invited as <span className="font-medium text-foreground">{invite.email}</span>
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <fieldset disabled={submitting} className="contents">
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full hover:bg-transparent"
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <LoadingButton
                    type="submit"
                    className="w-full gold-gradient text-primary-foreground hover:opacity-90"
                    loading={submitting}
                    loadingText="Creating account..."
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Join organization
                  </LoadingButton>
                </CardFooter>
              </fieldset>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
