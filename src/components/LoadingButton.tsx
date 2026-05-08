import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

/**
 * Standard submit/action button with built-in spinner.
 * - Disables itself while `loading` is true (in addition to any explicit `disabled`)
 * - Shows a spinner + optional `loadingText` while loading
 * - Falls back to children when not loading
 */
export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, loadingText, disabled, children, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={loading || disabled}
        aria-busy={loading || undefined}
        className={cn(className)}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {loadingText ?? children}
          </span>
        ) : (
          children
        )}
      </Button>
    );
  }
);
LoadingButton.displayName = "LoadingButton";
