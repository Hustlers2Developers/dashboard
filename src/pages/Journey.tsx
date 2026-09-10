import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Compass,
  ArrowUpRight,
  Lock,
  Unlock,
  Flame,
  Trophy,
  Sparkles,
} from "lucide-react";

const JOURNEY_URL = "https://journey.godevelopers.space";

// Mirrors GET /api/tracks from the Journey engine docs — this is a static
// preview list (icon/title/unlock rule), not a live sync. Actual progress,
// XP, and unlock status only exist once this dashboard authenticates
// against the Journey engine's API, which isn't wired up yet.
const TRACKS = [
  { id: "html", title: "HTML Fundamentals", icon: "🌐", unlocked: true, note: "Free to start" },
  { id: "css", title: "CSS Fundamentals", icon: "🎨", unlocked: true, note: "Free to start" },
  { id: "git", title: "Git & Version Control", icon: "🔀", unlocked: true, note: "Free to start" },
  { id: "javascript", title: "JavaScript", icon: "⚡", unlocked: false, note: "Unlocks with XP" },
  { id: "react", title: "React", icon: "⚛️", unlocked: false, note: "Unlocks with XP" },
  { id: "nextjs", title: "Next.js", icon: "▲", unlocked: false, note: "Unlocks with XP" },
  { id: "backend", title: "Backend Engineering", icon: "🛠️", unlocked: false, note: "Unlocks with XP" },
  { id: "database", title: "Databases", icon: "🗄️", unlocked: false, note: "Unlocks with XP" },
  { id: "devops", title: "DevOps", icon: "🚀", unlocked: false, note: "Unlocks with XP" },
  { id: "dsa", title: "Data Structures & Algorithms", icon: "🧩", unlocked: false, note: "Unlocks with XP" },
];

const Journey = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Compass className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Journey</h2>
              <p className="text-muted-foreground">
                Your learning path — tracks, XP, streaks, and achievements.
              </p>
            </div>
          </div>

          <a
            href={JOURNEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg gold-gradient px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open Journey
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        {/* Hero */}
        <div className="premium-card">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              background:
                "radial-gradient(circle at 15% 20%, hsl(var(--primary)) 0%, transparent 45%), radial-gradient(circle at 85% 80%, hsl(var(--saffron)) 0%, transparent 45%)",
            }}
          />
          <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="glow-primary flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Track your progress across every track</p>
                <p className="text-sm text-muted-foreground">
                  XP, streaks, and achievements earned on Journey and its ecosystem services all live in one place.
                </p>
              </div>
            </div>
            <a
              href={JOURNEY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              View my dashboard
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Tracks */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Tracks</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TRACKS.map((track) => (
              <a
                key={track.id}
                href={JOURNEY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <div className={`premium-card h-full ${track.unlocked ? "" : "opacity-70"}`}>
                  <div className="flex items-start gap-3 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                      {track.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-medium text-foreground">{track.title}</p>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        {track.unlocked ? (
                          <Unlock className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        {track.note}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Streak / Leaderboard teaser */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="premium-card flex items-center gap-3 p-5">
            <Flame className="h-8 w-8 shrink-0 text-orange-500" />
            <div>
              <p className="font-medium text-foreground">Daily streaks</p>
              <p className="text-sm text-muted-foreground">
                Complete a concept or task on Journey to keep your streak alive.
              </p>
            </div>
          </div>
          <div className="premium-card flex items-center gap-3 p-5">
            <Trophy className="h-8 w-8 shrink-0 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">Leaderboard & badges</p>
              <p className="text-sm text-muted-foreground">
                Earn XP and achievements as you complete tracks, days, and projects.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          This is a preview — live progress, XP, and unlock status sync from{" "}
          <a
            href={JOURNEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            journey.godevelopers.space
          </a>
          .
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Journey;
