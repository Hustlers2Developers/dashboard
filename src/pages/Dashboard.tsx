import { useQuery } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { useIsOrgAdmin } from "@/hooks/use-org-admin";
import { GET_PROJECTS_BY_ORG } from "@/graphql/mutations/projects";
import { GET_TEAMS_BY_ORG } from "@/graphql/mutations/teams";
import {
  MY_STREAK,
  MY_ATTENDANCE_SUMMARY,
  MY_LEADERBOARD_RANK,
  ACTIVE_WEEKLY_CHALLENGE,
  DAILY_QUOTE,
  ORG_MEMBERS_STREAKS,
} from "@/graphql/mutations/attendance";
import { getTodaysTip } from "@/lib/dev-tips";
import { Project, Team } from "@/graphql/graphql";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  Users,
  Lightbulb,
  AlertCircle,
  Flame,
  Snowflake,
  Trophy,
  Target,
  Quote,
  CalendarCheck,
  ArrowUpRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

type StreakInfo = {
  currentStreak: number;
  longestStreak: number;
  freezesAvailable: number;
};

type AttendanceSummary = {
  totalDays: number;
  presentDays: number;
  attendancePercentage: number;
};

type LeaderboardRank = {
  rank: number;
  currentStreak: number;
  totalParticipants: number;
};

type WeeklyChallenge = {
  id: string;
  title: string;
  description: string;
  targetDays: number;
  badgeName: string;
  myProgress: number;
};

type DailyQuote = { text: string; author: string };

type MemberStreak = {
  userId: string;
  name: string;
  email: string;
  currentStreak: number;
  longestStreak: number;
};

// createdAt timestamps come across as epoch-ms strings, but treat a
// missing/malformed value as absent rather than rendering "Invalid Date".
const formatCreatedAt = (raw?: string | null) => {
  if (!raw) return null;
  const ms = parseInt(raw, 10);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const Dashboard = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const { isOrgAdmin } = useIsOrgAdmin(orgId);
  const isAdminView = isOrgAdmin; // covers SUPER_ADMIN too (see useIsOrgAdmin)

  const {
    data: projectsData,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useQuery<
    { projectsByOrganization: Project[] },
    { organizationId: string }
  >(GET_PROJECTS_BY_ORG, {
    variables: { organizationId: orgId },
    skip: !orgId,
  });

  const {
    data: teamsData,
    loading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams,
  } = useQuery<
    { teamsByOrganization: Team[] },
    { organizationId: string }
  >(GET_TEAMS_BY_ORG, {
    variables: { organizationId: orgId },
    skip: !orgId,
  });

  // ── Streak / attendance / motivation (everyone) ──
  const { data: streakData, loading: streakLoading } = useQuery<{ myStreak: StreakInfo }>(MY_STREAK);
  const { data: attendanceSummaryData, loading: attendanceSummaryLoading } = useQuery<{
    myAttendanceSummary: AttendanceSummary | null;
  }>(MY_ATTENDANCE_SUMMARY, { skip: !orgId });
  const { data: rankData, loading: rankLoading } = useQuery<{ myLeaderboardRank: LeaderboardRank }>(
    MY_LEADERBOARD_RANK,
    { variables: { organizationId: orgId }, skip: !orgId }
  );
  const { data: challengeData, loading: challengeLoading } = useQuery<{
    activeWeeklyChallenge: WeeklyChallenge;
  }>(ACTIVE_WEEKLY_CHALLENGE);
  const { data: quoteData } = useQuery<{ dailyQuote: DailyQuote }>(DAILY_QUOTE);

  // ── Org-wide streak snapshot (admins only) ──
  const { data: orgStreaksData, loading: orgStreaksLoading } = useQuery<{
    orgMembersStreaks: MemberStreak[];
  }>(ORG_MEMBERS_STREAKS, {
    variables: { organizationId: orgId },
    skip: !orgId || !isAdminView,
  });

  // Frontend-only, rotates once per UTC day — no backend "tips" API exists.
  const todaysTip = getTodaysTip();

  const projects = projectsData?.projectsByOrganization || [];
  const teams = teamsData?.teamsByOrganization || [];
  const myStreak = streakData?.myStreak;
  const attendanceSummary = attendanceSummaryData?.myAttendanceSummary;
  const myRank = rankData?.myLeaderboardRank;
  const challenge = challengeData?.activeWeeklyChallenge;
  const quote = quoteData?.dailyQuote;
  const topOrgStreaks = [...(orgStreaksData?.orgMembersStreaks ?? [])]
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 5);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = user?.email ? user.email.split("@")[0] : "";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* ── Hero: greeting + daily quote in one warm, unified strip ── */}
        <div className="premium-card relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              background:
                "radial-gradient(circle at 10% 10%, hsl(var(--primary)) 0%, transparent 45%), radial-gradient(circle at 90% 90%, hsl(var(--saffron)) 0%, transparent 45%)",
            }}
          />
          <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {greeting}{firstName ? `, ${firstName}` : ""} 👋
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Here's where things stand today.
              </p>
            </div>
            {quote && (
              <div className="flex max-w-md items-start gap-2.5 rounded-xl border border-border bg-background/60 p-3.5 sm:shrink-0">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div>
                  <p className="text-sm italic leading-snug text-foreground">"{quote.text}"</p>
                  <p className="mt-1 text-xs text-muted-foreground">— {quote.author}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Your progress: streak, attendance, rank & weekly challenge ── */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Your progress</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Streak + freezes */}
            <Card className="premium-card border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Your streak</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                  <Flame className="h-4 w-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                {streakLoading ? (
                  <Skeleton className="h-14 w-full" />
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold text-foreground">{myStreak?.currentStreak ?? 0}</span>
                      <span className="text-xs text-muted-foreground">day streak</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Best: {myStreak?.longestStreak ?? 0}</span>
                      <span className="flex items-center gap-1">
                        <Snowflake className="h-3 w-3 text-sky-500" />
                        {myStreak?.freezesAvailable ?? 0} freeze{(myStreak?.freezesAvailable ?? 0) === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance % */}
            <Card className="premium-card border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <CalendarCheck className="h-4 w-4 text-emerald-500" />
                </div>
              </CardHeader>
              <CardContent>
                {attendanceSummaryLoading ? (
                  <Skeleton className="h-14 w-full" />
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold text-foreground">
                        {attendanceSummary?.attendancePercentage?.toFixed(0) ?? 0}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {attendanceSummary?.presentDays ?? 0} of {attendanceSummary?.totalDays ?? 0} days present
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leaderboard rank */}
            <Card className="premium-card border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Your rank</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                {rankLoading ? (
                  <Skeleton className="h-14 w-full" />
                ) : myRank ? (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold text-foreground">#{myRank.rank}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">of {myRank.totalParticipants} in your org</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No ranking yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Weekly challenge */}
            <Card className="premium-card border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Weekly challenge</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {challengeLoading ? (
                  <Skeleton className="h-14 w-full" />
                ) : challenge ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-foreground">{challenge.myProgress}/{challenge.targetDays} days</span>
                      <Link to="/streak" className="text-xs text-accent hover:underline">Details</Link>
                    </div>
                    <Progress value={(challenge.myProgress / challenge.targetDays) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">Earn the {challenge.badgeName} badge</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active challenge.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Org snapshot — admins only ── */}
        {isAdminView && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Org snapshot</h3>
              <Link to="/attendance" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                View attendance <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <Card className="premium-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Top streaks in your organization
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orgStreaksLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
                  </div>
                ) : topOrgStreaks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No streak data yet for this organization.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {topOrgStreaks.map((member, idx) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {idx + 1}
                          </span>
                          <span className="truncate text-sm font-medium text-foreground">{member.name || member.email}</span>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-sm text-foreground">
                          <Flame className="h-3.5 w-3.5 text-orange-500" />
                          {member.currentStreak}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Your work: projects & teams ── */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Recent Projects */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FolderKanban className="h-4 w-4 text-primary" />
                Recent Projects
              </CardTitle>
              <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : projectsError ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                  <p className="text-sm text-muted-foreground">Couldn't load projects. {projectsError.message}</p>
                  <Button variant="outline" size="sm" onClick={() => void refetchProjects()}>
                    Retry
                  </Button>
                </div>
              ) : projects.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No projects yet. Create your first project!
                </p>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project: Project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-4"
                    >
                      <div className="min-w-0">
                        <h4 className="truncate font-medium text-foreground">
                          {project.name}
                        </h4>
                        <p className="truncate text-sm text-muted-foreground">
                          {project.description || "No description"}
                        </p>
                      </div>
                      {formatCreatedAt(project.createdAt) && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatCreatedAt(project.createdAt)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Teams */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Users className="h-4 w-4 text-accent" />
                Your Teams
              </CardTitle>
              <Link to="/teams" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : teamsError ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                  <p className="text-sm text-muted-foreground">Couldn't load teams. {teamsError.message}</p>
                  <Button variant="outline" size="sm" onClick={() => void refetchTeams()}>
                    Retry
                  </Button>
                </div>
              ) : teams.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No teams yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {teams.slice(0, 5).map((team: Team) => {
                    const createdLabel = formatCreatedAt(team.createdAt);
                    return (
                      <div
                        key={team.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-background p-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate font-medium text-foreground">
                            {team.name}
                          </h4>
                          {createdLabel && (
                            <p className="text-xs text-muted-foreground">Created {createdLabel}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Frontend-only dev tip, tucked at the bottom — a nice-to-have, not competing with real data above */}
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-4">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">Tip of the day</p>
            <p className="text-sm text-foreground">{todaysTip}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
