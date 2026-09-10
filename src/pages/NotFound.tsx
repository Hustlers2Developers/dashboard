import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionLoading = useAuthStore((s) => s.loading);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/20 blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-xl text-center animate-fade-in">
        <div className="mb-6 inline-flex items-center justify-center rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          <Compass className="mr-2 h-3.5 w-3.5" />
          Lost in space
        </div>

        <h1 className="mb-4 select-none bg-gradient-to-br from-primary via-foreground to-primary/60 bg-clip-text text-[8rem] font-black leading-none tracking-tighter text-transparent sm:text-[10rem]">
          404
        </h1>

        <h2 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Page not found
        </h2>
        <p className="mb-2 text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        {location.pathname && (
          <p className="mb-8 break-all font-mono text-xs text-muted-foreground/70">
            {location.pathname}
          </p>
        )}

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
          <Button asChild className="w-full sm:w-auto" disabled={sessionLoading}>
            <Link to={sessionLoading ? "#" : isAuthenticated ? "/dashboard" : "/login"}>
              <Home className="mr-2 h-4 w-4" />
              {sessionLoading ? "Loading..." : isAuthenticated ? "Back to dashboard" : "Go to login"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
