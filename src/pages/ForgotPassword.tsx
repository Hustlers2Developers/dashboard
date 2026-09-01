import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { REQUEST_PASSWORD_RESET } from "@/graphql/mutations/auth";
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
import { ArrowLeft, CheckCircle, KeyRound } from "lucide-react";

const ForgotPassword = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const [requestPasswordReset] = useMutation(REQUEST_PASSWORD_RESET);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email address.");
      return;
    }
    setSubmitting(true);
    try {
      await requestPasswordReset({ variables: { input: { email: email.trim() } } });
      // Always show success regardless of whether the email exists, to
      // avoid leaking which emails are registered.
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email.");
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

        <Card className="border-border shadow-xl">
          {sent ? (
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500" />
              <p className="font-medium text-foreground">Check your email</p>
              <p className="text-sm text-muted-foreground">
                If an account exists for <span className="font-medium text-foreground">{email}</span>, we've sent a link to reset your password.
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-foreground">Reset your password</CardTitle>
                <CardDescription>
                  Enter your email and we'll send you a reset link.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <fieldset disabled={submitting} className="contents">
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-3">
                    <LoadingButton
                      type="submit"
                      className="w-full gold-gradient text-primary-foreground hover:opacity-90"
                      loading={submitting}
                      loadingText="Sending..."
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      Send reset link
                    </LoadingButton>
                    <Link
                      to="/login"
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to sign in
                    </Link>
                  </CardFooter>
                </fieldset>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
