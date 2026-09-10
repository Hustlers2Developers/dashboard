import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { RESET_PASSWORD } from "@/graphql/mutations/auth";
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
import { RedirectLoader } from "@/components/RedirectLoader";
import { toast } from "sonner";
import { CheckCircle, Eye, EyeOff, KeyRound, XCircle } from "lucide-react";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionLoading = useAuthStore((s) => s.loading);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [resetPassword] = useMutation<{ resetPassword: boolean }>(RESET_PASSWORD);

  if (sessionLoading) {
    return <RedirectLoader message="Restoring session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const result = await resetPassword({
        variables: { input: { token, newPassword: password } },
      });
      if (!result.data?.resetPassword) throw new Error("Reset failed. Try requesting a new link.");
      setDone(true);
      toast.success("Password reset. You can now sign in.");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
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
        </div>

        {!token ? (
          <Card className="border-border shadow-xl">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="font-medium text-foreground">Missing reset token</p>
              <p className="text-sm text-muted-foreground">
                Use the link from your password reset email, or request a new one.
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
            </CardContent>
          </Card>
        ) : done ? (
          <Card className="border-border shadow-xl">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500" />
              <p className="font-medium text-foreground">Password reset</p>
              <p className="text-sm text-muted-foreground">Redirecting you to sign in...</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-foreground">Set a new password</CardTitle>
              <CardDescription>Choose a new password for your account.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <fieldset disabled={submitting} className="contents">
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
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
                    loadingText="Resetting..."
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset password
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

export default ResetPassword;
