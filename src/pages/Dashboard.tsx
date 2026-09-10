import { useQuery } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { GET_PROJECTS_BY_ORG } from "@/graphql/mutations/projects";
import { GET_TEAMS_BY_ORG } from "@/graphql/mutations/teams";
import { MY_STREAK, TOP_STREAKERS } from "@/graphql/mutations/attendance";
import { DAILY_QUOTE } from "@/graphql/mutations/auth";
import { Project, Team } from "@/graphql/graphql";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban,
  Users,
  Activity,
  TrendingUp,
  Flame,
  Snowflake,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  Quote,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

type DailyQuoteData = { text: string; author: string };

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

const Dashboard = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";

  const { data: projectsData, loading: projectsLoading } = useQuery<
    { projectsByOrganization: Project[] },
    { organizationId: string }
  >(GET_PROJECTS_BY_ORG, {
    variables: { organizationId: orgId },
    skip: !orgId,
  });

  const { data: teamsData, loading: teamsLoading } = useQuery<
    { teamsByOrganization: Team[] },
    { organizationId: string }
  >(GET_TEAMS_BY_ORG, {
    variables: { organizationId: orgId },
    skip: !orgId,
  });

  const { data: streakData, loading: streakLoading } = useQuery<{ myStreak: StreakInfo }>(
    MY_STREAK,
  );
  const { data: quoteData } = useQuery<{ dailyQuote: DailyQuoteData }>(DAILY_QUOTE, {
    // Stable for the whole UTC day server-side — no need to ever refetch
    // within a session.
    fetchPolicy: "cache-first",
  });
  const { data: leaderboardData, loading: leaderboardLoading } = useQuery<{
    topStreakers: StreakLeaderEntry[];
  }>(TOP_STREAKERS, {
    variables: { organizationId: orgId, limit: 5 },
    skip: !orgId,
  });

  const projects = projectsData?.projectsByOrganization || [];
  const teams = teamsData?.teamsByOrganization || [];
  const myStreak = streakData?.myStreak;
  const topStreakers = leaderboardData?.topStreakers ?? [];

  const stats = [
    {
      label: "Total Projects",
      value: projects.length,
      icon: FolderKanban,
      color: "text-primary",
    },
    {
      label: "Active Teams",
      value: teams.length,
      icon: Users,
      color: "text-accent",
    },
    {
      label: "Recent Activity",
      value: projects.length + teams.length,
      icon: Activity,
      color: "text-saffron",
    },
    { label: "Growth", value: "+12%", icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
          </h2>
          <p className="text-muted-foreground">
            Here's an overview of your organization.
          </p>
        </div>

        {/* Daily motivation — fresh on every visit, consistent for the day */}
        {quoteData?.dailyQuote && (
          <div className="premium-card flex items-start gap-3 p-5">
            <div className="glow-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Quote className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium italic text-foreground">
                "{quoteData.dailyQuote.text}"
              </p>
              <p className="mt-1 text-xs text-muted-foreground">— {quoteData.dailyQuote.author}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {projectsLoading || teamsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Streak + Leaderboard */}
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

        {/* Recent Projects */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No projects yet. Create your first project!
              </p>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project: Project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
                  >
                    <div>
                      <h4 className="font-medium text-foreground">
                        {project.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {project.description || "No description"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(parseInt(project.createdAt)).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "short", day: "numeric" },
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Teams */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Your Teams</CardTitle>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : teams.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No teams yet.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {teams.slice(0, 6).map((team: Team) => (
                  <div
                    key={team.id}
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">
                          {team.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Created{" "}
                          {new Date(
                            parseInt(team.createdAt),
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
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

export default Dashboard;
