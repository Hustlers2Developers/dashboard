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
 * Preferred role is saved via updateProfile → UserDetails.title (an
 * existing, persisted field — safe to reuse since it's a free-text
 * "role/title" slot the schema already exposes).
 */
export const OnboardingModal = () => {
  const [dismissedLocally, setDismissedLocally] = useState(true);
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  // Gives the dashboard a beat to render first — popping this open the
  // instant myProfile resolves (often before the page has even painted)
  // felt like the screen was hijacked before the user saw anything.
  const [readyToShow, setReadyToShow] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => setReadyToShow(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const profile = data?.myProfile;
  const needsOnboarding = !loading && !!profile && !profile.details?.title;
  const open = needsOnboarding && !dismissedLocally && readyToShow;

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
      await updateProfile({
        variables: { input: { title: role.trim() } },
      });
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
