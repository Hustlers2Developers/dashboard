import { Loader2 } from "lucide-react";

interface RedirectLoaderProps {
  message?: string;
}

export const RedirectLoader = ({ message = "Redirecting..." }: RedirectLoaderProps) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl gold-gradient shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
          </div>
        </div>
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};
