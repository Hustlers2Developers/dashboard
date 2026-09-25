import { useQuery } from "@apollo/client/react";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { useAuthStore } from "@/stores/auth-store";
import { useMessageRequests, useCreateConversation, MessageRequestRow } from "@/hooks/use-chat";
import { initials, colorFor, CommunityUser } from "@/components/AuthorTag";
import { timeAgo } from "@/lib/time-ago";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Inbox } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface MessageRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccepted: (conversationId: string) => void;
}

/** Incoming message requests from private-profile members — accept opens a normal DM, decline just closes the request. */
export function MessageRequestsDialog({ open, onOpenChange, onAccepted }: MessageRequestsDialogProps) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  const { incoming, respondToRequest } = useMessageRequests();
  const { createDm } = useCreateConversation();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const { data } = useQuery<{ getAllUsers: CommunityUser[] }>(GET_ALL_USERS, {
    variables: { orgId },
    skip: !open || !orgId,
    fetchPolicy: "cache-first",
  });
  const directory = new Map((data?.getAllUsers ?? []).map((u) => [u.id, u]));

  const pending = incoming.filter((r) => r.status === "pending");

  const handleAccept = async (request: MessageRequestRow) => {
    setRespondingId(request.id);
    try {
      await respondToRequest(request.id, true);
      const conversationId = await createDm(request.from_app_user_id);
      toast.success("Request accepted");
      onAccepted(conversationId);
      onOpenChange(false);
    } catch {
      toast.error("Couldn't accept this request");
    } finally {
      setRespondingId(null);
    }
  };

  const handleDecline = async (request: MessageRequestRow) => {
    setRespondingId(request.id);
    try {
      await respondToRequest(request.id, false);
      toast.success("Request declined");
    } catch {
      toast.error("Couldn't decline this request");
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="glow-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Inbox className="h-5 w-5 text-primary" />
            </span>
            Message requests
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          {pending.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {pending.map((request) => {
                const sender = directory.get(request.from_app_user_id);
                const busy = respondingId === request.id;
                return (
                  <div key={request.id} className="flex items-center gap-3 px-1 py-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colorFor(request.from_app_user_id)}`}
                    >
                      {initials(sender?.name, sender?.email ?? undefined)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {sender?.name || sender?.email || "Unknown member"}
                      </p>
                      <p className="text-xs text-muted-foreground">wants to message you · {timeAgo(request.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={busy}
                        className="h-8 w-8 cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => void handleDecline(request)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        disabled={busy}
                        className="h-8 w-8 cursor-pointer gold-gradient text-primary-foreground"
                        onClick={() => void handleAccept(request)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
