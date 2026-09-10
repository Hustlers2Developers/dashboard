import { useQuery } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { MY_STREAK, TOP_STREAKERS, MY_ACTIVITIES } from "@/graphql/mutations/attendance";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flame,
  Snowflake,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertCircle,
  Zap,
  Activity as ActivityIcon,
} from "lucide-react";

type ActivityRecord = { id: string; activityType: string; createdAt: string };

const activityLabels: Record<string, string> = {
  LOGIN: "Logged in",
  TASK_UPDATE: "Updated a task",
  MEETING_ATTENDED: "Attended a meeting",
  PROJECT_CONTRIBUTION: "Contributed to a project",
};

// Backend returns timestamps as epoch-ms strings; guard against
// null/malformed values rather than rendering "Invalid Date".
function formatActivityDate(raw?: string | null) {
  if (!raw) return "—";
  const d = /^\d+$/.test(raw) ? new Date(parseInt(raw, 10)) : new Date(raw);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

type StreakInfo = {
  currentStreak: number;
  longestStreak: number;
  freezesAvailable: number;
  lastActivityDate?: string | null;
};

type StreakLeaderEntry = {
  rank: number;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  currentStreak: number;
  rankChange: string;
};

// The backend returns rankChange as a plain string, not a documented enum,
// so this matches loosely (case-insensitive, common synonyms) rather than
// assuming one exact literal value.
const RankChangeIcon = ({ value }: { value: string }) => {
  const v = value?.toLowerCase() ?? "";
  if (v.includes("up") || v.startsWith("+"))
    return <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (v.includes("down") || v.startsWith("-"))
    return <ArrowDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

const Streak = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";

  const {
    data: streakData,
    loading: streakLoading,
    error: streakError,
    refetch: refetchStreak,
  } = useQuery<{ myStreak: StreakInfo }>(MY_STREAK);
  const {
    data: leaderboardData,
    loading: leaderboardLoading,
    error: leaderboardError,
    refetch: refetchLeaderboard,
  } = useQuery<{
    topStreakers: StreakLeaderEntry[];
  }>(TOP_STREAKERS, {
    variables: { organizationId: orgId, limit: 10 },
    skip: !orgId,
  });
  const {
    data: activitiesData,
    loading: activitiesLoading,
    error: activitiesError,
    refetch: refetchActivities,
  } = useQuery<{ myActivities: ActivityRecord[] }>(MY_ACTIVITIES, {
    variables: { limit: 20 },
  });

  const myStreak = streakData?.myStreak;
  const topStreakers = leaderboardData?.topStreakers ?? [];
  const activities = activitiesData?.myActivities ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Streak</h2>
            <p className="text-muted-foreground">
              Keep showing up — track your daily streak and see how you rank.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="premium-card border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your streak
              </CardTitle>
              <Flame className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              {streakLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : streakError ? (
                <div className="flex flex-col items-start gap-2">
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    Couldn't load your streak.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => void refetchStreak()}>
                    Retry
                  </Button>
                </div>
              ) : myStreak ? (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      {myStreak.currentStreak}
                    </span>
                    <span className="text-sm text-muted-foreground">day streak</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Best: {myStreak.longestStreak}</span>
                    <span className="flex items-center gap-1">
                      <Snowflake className="h-3 w-3 text-sky-500" />
                      {myStreak.freezesAvailable} freeze{myStreak.freezesAvailable === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="premium-card border-0 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top streakers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboardLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
                </div>
              ) : leaderboardError ? (
                <div className="flex flex-col items-start gap-2">
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    Couldn't load the leaderboard.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => void refetchLeaderboard()}>
                    Retry
                  </Button>
                </div>
              ) : topStreakers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No streak data yet.</p>
              ) : (
                <div className="space-y-2">
                  {topStreakers.map((entry) => (
                    <div
                      key={entry.userId}
                      className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <Badge variant="secondary" className="w-7 justify-center text-xs">
                          #{entry.rank}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {entry.userName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RankChangeIcon value={entry.rankChange} />
                        <span className="flex items-center gap-1 text-sm text-foreground">
                          <Flame className="h-3.5 w-3.5 text-orange-500" />
                          {entry.currentStreak}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity feed — personal, everyone can see their own */}
        <Card className="premium-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : activitiesError ? (
              <div className="flex flex-col items-start gap-2">
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  Couldn't load your activity.
                </p>
                <Button variant="outline" size="sm" onClick={() => void refetchActivities()}>
                  Retry
                </Button>
              </div>
            ) : activities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <ActivityIcon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground">
                        {activityLabels[act.activityType] ?? act.activityType}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatActivityDate(act.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Streak;
