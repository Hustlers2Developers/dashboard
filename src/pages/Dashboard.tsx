import { useQuery } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { GET_PROJECTS_BY_ORG } from "@/graphql/mutations/projects";
import { GET_TEAMS_BY_ORG } from "@/graphql/mutations/teams";
import { getTodaysTip } from "@/lib/dev-tips";
import { Project, Team } from "@/graphql/graphql";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  Users,
  Activity,
  TrendingUp,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

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

  // Frontend-only, rotates once per UTC day — no backend "tips" API exists.
  const todaysTip = getTodaysTip();

  const projects = projectsData?.projectsByOrganization || [];
  const teams = teamsData?.teamsByOrganization || [];

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

        {/* Daily dev tip — fresh once per day, consistent for everyone that day */}
        <div className="premium-card flex items-start gap-3 p-5">
          <div className="glow-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Tip of the day</p>
            <p className="mt-0.5 text-sm text-foreground">{todaysTip}</p>
          </div>
        </div>

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
                    {(projectsError && (stat.label === "Total Projects" || stat.label === "Recent Activity")) ||
                    (teamsError && (stat.label === "Active Teams" || stat.label === "Recent Activity"))
                      ? "—"
                      : stat.value}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
            ) : projectsError ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <p className="text-sm text-muted-foreground">Couldn't load projects. {projectsError.message}</p>
                <Button variant="outline" size="sm" onClick={() => void refetchProjects()}>
                  Retry
                </Button>
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
                    {formatCreatedAt(project.createdAt) && (
                      <span className="text-xs text-muted-foreground">
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
            ) : teamsError ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <p className="text-sm text-muted-foreground">Couldn't load teams. {teamsError.message}</p>
                <Button variant="outline" size="sm" onClick={() => void refetchTeams()}>
                  Retry
                </Button>
              </div>
            ) : teams.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No teams yet.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {teams.slice(0, 6).map((team: Team) => {
                  const createdLabel = formatCreatedAt(team.createdAt);
                  return (
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
                          {createdLabel && (
                            <p className="text-xs text-muted-foreground">Created {createdLabel}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
