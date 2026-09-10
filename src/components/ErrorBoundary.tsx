import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional label shown in the fallback, e.g. "Dashboard" — helps identify
   * which part of the app crashed when multiple boundaries are nested. */
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level safety net — catches render-time JS errors anywhere in the tree
 * below it (a null field crashing a component, a malformed API response,
 * etc.) and shows a recoverable fallback instead of a blank white screen.
 * Does NOT catch errors in event handlers, async code, or GraphQL
 * network/query errors (those are handled per-page via Apollo's `error`
 * result) — only uncaught render-phase exceptions, per React's error
 * boundary contract.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? `:${this.props.section}` : ""}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {this.props.section ? `${this.props.section} hit a problem` : "Something went wrong"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              This part of the page failed to render. Try again, or reload if it keeps happening.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.handleReset}>
              <RotateCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button className="gold-gradient text-primary-foreground" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
