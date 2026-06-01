import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
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
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, ExternalLink } from "lucide-react";
import { RedirectLoader } from "@/components/RedirectLoader";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTo = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/dashboard";

  const { login, isAuthenticated } = useAuthStore();

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
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
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
                  <Label htmlFor="password">Password</Label>
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
                <div className="w-full rounded-xl border border-border bg-card/50 p-4 text-left">
                  <p className="text-sm font-semibold text-foreground">
                    New to Hustlers2Developers?
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We're an invite-based community. Apply for membership and we'll review your application.
                  </p>
                  <a
                    href="https://apply.godevelopers.online"
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
        </Card>
      </div>
    </div>
  );
};

export default Login;
