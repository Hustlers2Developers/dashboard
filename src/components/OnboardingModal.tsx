import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { MY_PROFILE, UPDATE_PROFILE } from "@/graphql/mutations/users";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const DISMISSED_KEY = "gd_onboarding_dismissed";

const PREFERRED_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full-Stack Developer",
  "Mobile Developer",
  "DevOps Engineer",
  "Data / ML Engineer",
  "Designer",
  "Other",
];

type ProfileData = {
  name: string;
  systemRole: string;
  details?: { title?: string | null } | null;
};

/**
 * One-time "welcome" prompt shown the first time a user reaches the
 * dashboard without a preferred role set yet.
 *
 * Preferred role is saved for real via updateProfile → UserDetails.title
 * (an existing, persisted field — safe to reuse since it's a free-text
 * "role/title" slot the schema already exposes).
 *
 * Tech stack / tools is NOT persisted anywhere yet — UserDetails has no
 * dedicated field for it, and stuffing structured data into an unrelated
 * field (e.g. bio) would corrupt it. This step is shown for the product
 * requirement, but intentionally does not save until the backend adds a
 * real field (e.g. UserDetails.techStack). See TECH_STACK_TODO below.
 */
export const TECH_STACK_TODO =
  "UserDetails has no techStack/tools field yet — add one on the backend, then wire it here.";

export const OnboardingModal = () => {
  const [dismissedLocally, setDismissedLocally] = useState(true);
  const [role, setRole] = useState("");
  const [stack, setStack] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, loading } = useQuery<{ myProfile: ProfileData }>(MY_PROFILE, {
    fetchPolicy: "cache-first",
  });
  const [updateProfile] = useMutation(UPDATE_PROFILE);

  useEffect(() => {
    try {
      setDismissedLocally(localStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      setDismissedLocally(false);
    }
  }, []);

  const profile = data?.myProfile;
  const needsOnboarding = !loading && !!profile && !profile.details?.title;
  const open = needsOnboarding && !dismissedLocally;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* best-effort — ignore storage failures (private mode, quota, etc.) */
    }
    setDismissedLocally(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim()) {
      dismiss();
      return;
    }
    setSaving(true);
    try {
      // Only `title` (preferred role) is actually persisted right now — see
      // TECH_STACK_TODO. `stack` is intentionally not sent to the backend.
      await updateProfile({
        variables: { input: { title: role.trim() } },
      });
      if (stack.trim()) {
        console.warn(`Tech stack not saved (${TECH_STACK_TODO})`, stack.trim());
      }
      toast.success("Thanks! Your profile is set up.");
      dismiss();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your answer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="mt-3">Welcome to Godevelopers!</DialogTitle>
          <DialogDescription>
            A couple of quick details help us personalize your dashboard. You can always change these later from your profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Preferred role</Label>
            <div className="flex flex-wrap gap-2">
              {PREFERRED_ROLES.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    role === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Current tech stack / tools <span className="text-muted-foreground">(coming soon)</span>
            </Label>
            <Input
              value={stack}
              onChange={(e) => setStack(e.target.value)}
              placeholder="e.g. React, Node.js, PostgreSQL, Docker"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              We're adding a dedicated field for this — it isn't saved yet.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={dismiss} disabled={saving}>
              Skip for now
            </Button>
            <LoadingButton
              type="submit"
              className="gold-gradient text-primary-foreground"
              loading={saving}
              loadingText="Saving..."
              disabled={!role.trim()}
            >
              Save
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
