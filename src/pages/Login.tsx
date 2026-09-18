import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, ExternalLink, Mail, KeyRound, ArrowLeft } from "lucide-react";
import { RedirectLoader } from "@/components/RedirectLoader";

type LoginMode = "password" | "otp-request" | "otp-verify";

const Login = () => {
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTo = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/dashboard";

  const { login, sendLoginOtp, loginWithOtp, isAuthenticated, loading: sessionLoading } = useAuthStore();

  // Wait for the silent session-restore (hydrate()) to settle before ever
  // showing the login form — otherwise a refresh while already logged in
  // flashes the login screen for a moment before bouncing back once the
  // refresh token resolves.
  if (sessionLoading) {
    return <RedirectLoader message="Restoring session..." />;
  }

  if (isAuthenticated) {
    return (
      <>
        <RedirectLoader message="Taking you to your dashboard..." />
        <Navigate to={redirectTo} replace />
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid email or password";
      setError(message);
      setSubmitting(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email first");
      return;
    }
    setSendingOtp(true);
    setError(null);
    try {
      await sendLoginOtp(email.trim());
      toast.success("Code sent — check your inbox.");
      setMode("otp-verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't send a login code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await loginWithOtp(email.trim(), otp);
      toast.success("Welcome back!");
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "That code didn't work — it may have expired.");
      setSubmitting(false);
    }
  };

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setError(null);
    setOtp("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gold-gradient shadow-lg">
            <span className="text-2xl font-bold text-primary-foreground">G</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Godevelopers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organization by developers for developers
          </p>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-foreground">Sign In</CardTitle>
            <CardDescription>
              {mode === "password" && "Enter your credentials to access the dashboard"}
              {mode === "otp-request" && "We'll email you a one-time code — no password needed"}
              {mode === "otp-verify" && (
                <>
                  Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>
                </>
              )}
            </CardDescription>
          </CardHeader>

          {mode === "password" && (
            <form onSubmit={handleSubmit}>
              <fieldset disabled={submitting} className="contents">
                <CardContent className="space-y-4">
                  {error && (
                    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                  <Button
                    type="submit"
                    className="w-full gold-gradient text-primary-foreground hover:opacity-90"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </span>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => switchMode("otp-request")}
                    className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email me a login code instead
                  </button>
                  <div className="w-full rounded-xl border border-border bg-card/50 p-4 text-left">
                    <p className="text-sm font-semibold text-foreground">
                      New to Hustlers2Developers?
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      We're an invite-based community. Apply for membership and we'll review your application.
                    </p>
                    <a
                      href="https://apply.godevelopers.space"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
                    >
                      Apply to join
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </CardFooter>
              </fieldset>
            </form>
          )}

          {mode === "otp-request" && (
            <form onSubmit={handleSendOtp}>
              <fieldset disabled={sendingOtp} className="contents">
                <CardContent className="space-y-4">
                  {error && (
                    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="otp-email">Email</Label>
                    <Input
                      id="otp-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Limited to 2 codes per day per account.
                  </p>
                </CardContent>
                <CardFooter className="flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full gold-gradient text-primary-foreground hover:opacity-90"
                    disabled={sendingOtp}
                  >
                    {sendingOtp ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Sending code...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Send login code
                      </span>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => switchMode("password")}
                    className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to password sign-in
                  </button>
                </CardFooter>
              </fieldset>
            </form>
          )}

          {mode === "otp-verify" && (
            <form onSubmit={handleVerifyOtp}>
              <fieldset disabled={submitting} className="contents">
                <CardContent className="space-y-4">
                  {error && (
                    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <div className="flex justify-center py-2">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSendOtp({ preventDefault: () => {} } as React.FormEvent)}
                    disabled={sendingOtp}
                    className="w-full text-center text-xs font-medium text-accent hover:underline disabled:opacity-50"
                  >
                    Didn't get it? Resend code
                  </button>
                </CardContent>
                <CardFooter className="flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full gold-gradient text-primary-foreground hover:opacity-90"
                    disabled={submitting || otp.length !== 6}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Verifying...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        Verify & sign in
                      </span>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => switchMode("password")}
                    className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to password sign-in
                  </button>
                </CardFooter>
              </fieldset>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login;
