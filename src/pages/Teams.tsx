import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import {
  GET_TEAMS_BY_ORG,
  CREATE_TEAM,
  DELETE_TEAM,
  GET_TEAM_MEMBERS,
} from "@/graphql/mutations/teams";
import { Team, TeamMember } from "@/graphql/graphql";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  Mail,
} from "lucide-react";

const TeamMembersList = ({ teamId }: { teamId: string }) => {
  const { data, loading } = useQuery<
    { teamMembersByTeam: TeamMember[] },
    { teamId: string }
  >(GET_TEAM_MEMBERS, {
    variables: { teamId },
  });
  const members = data?.teamMembersByTeam || [];

  if (loading) return <Skeleton className="h-8 w-full" />;
  if (members.length === 0)
    return <p className="text-sm text-muted-foreground">No members yet</p>;

  return (
    <div className="space-y-2">
      {members.map((m: TeamMember) => (
        <div
          key={m.id}
          className="flex items-center justify-between rounded-md bg-background p-2"
        >
          <span className="text-sm text-foreground">{m.userId}</span>
          <Badge variant="secondary" className="text-xs">
            {m.role}
          </Badge>
        </div>
      ))}
    </div>
  );
};

const Teams = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<
    { teamsByOrganization: Team[] },
    { organizationId: string }
  >(GET_TEAMS_BY_ORG, {
    variables: { organizationId: orgId },
    skip: !orgId,
  });

  const [createTeam, { loading: creating }] = useMutation(CREATE_TEAM);
  const [deleteTeam] = useMutation(DELETE_TEAM);

  const teams = data?.teamsByOrganization || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createTeam({
        variables: { input: { name, organizationId: orgId } },
      });
      toast.success("Team created!");
      setName("");
      setOpen(false);
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create team";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this team? This will remove all members.")) return;
    try {
      await deleteTeam({ variables: { id } });
      toast.success("Team deleted");
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete team";
      toast.error(message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Teams</h2>
            <p className="text-muted-foreground">
              Manage your organization's teams
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              asChild
              className="border border-border bg-background text-foreground hover:bg-secondary"
            >
              <Link to="/invites">
                <Mail className="mr-2 h-4 w-4" /> Invite Members
              </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gold-gradient text-primary-foreground hover:opacity-90">
                  <Plus className="mr-2 h-4 w-4" /> New Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Team</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Team Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Frontend Team"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full gold-gradient text-primary-foreground"
                    disabled={creating}
                  >
                    {creating ? "Creating..." : "Create Team"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">
                No teams yet
              </h3>
              <p className="text-muted-foreground">
                Create your first team to organize members
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team: Team) => (
              <Card
                key={team.id}
                className="group border-border transition-shadow hover:shadow-lg"
              >
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-foreground">
                        {team.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Created{" "}
                        {new Date(parseInt(team.createdAt)).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "short", day: "numeric" },
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={() =>
                        setExpandedTeam(
                          expandedTeam === team.id ? null : team.id,
                        )
                      }
                    >
                      {expandedTeam === team.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(team.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {expandedTeam === team.id && (
                  <CardContent className="border-t border-border pt-4">
                    <h5 className="mb-2 text-sm font-medium text-foreground">
                      Members
                    </h5>
                    <TeamMembersList teamId={team.id} />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Teams;
