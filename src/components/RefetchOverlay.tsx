import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefetchOverlayProps {
  active: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a list/section and shows a subtle overlay + top progress bar
 * while a background refetch is in flight. Keeps existing data visible
 * (no layout shift) so the UI stays stable during pagination/refetch.
 */
export function RefetchOverlay({ active, children, className }: RefetchOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {active && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden rounded-full bg-primary/10"
        >
          <div className="h-full w-1/3 animate-[refetch-bar_1.2s_ease-in-out_infinite] bg-primary" />
        </div>
      )}
      <div
        className={cn(
          "transition-opacity duration-200",
          active && "opacity-60 pointer-events-none select-none",
        )}
        aria-busy={active}
      >
        {children}
      </div>
      {active && (
        <div className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          Updating…
        </div>
      )}
    </div>
  );
}
