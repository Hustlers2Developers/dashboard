import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import {
  GET_TEAMS_BY_ORG,
  CREATE_TEAM,
  DELETE_TEAM,
  GET_TEAM_MEMBERS,
} from "@/graphql/mutations/teams";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { Team, TeamMember } from "@/graphql/graphql";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  Mail,
} from "lucide-react";

type AppUser = { id: string; name?: string | null; email: string };

const TeamMembersList = ({
  teamId,
  usersMap,
}: {
  teamId: string;
  usersMap: Map<string, AppUser>;
}) => {
  const { data, loading } = useQuery<
    { teamMembersByTeam: TeamMember[] },
    { teamId: string }
  >(GET_TEAM_MEMBERS, { variables: { teamId } });

  const members = data?.teamMembersByTeam || [];

  if (loading) return <Skeleton className="h-8 w-full" />;
  if (members.length === 0)
    return <p className="text-sm text-muted-foreground">No members yet</p>;

  return (
    <div className="space-y-2">
      {members.map((m: TeamMember) => {
        const user = usersMap.get(m.userId);
        const display = user?.name || user?.email || m.userId;
        const initials = display
          .split(/[\s@.]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p: string) => p[0]?.toUpperCase())
          .join("");
        return (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-md bg-background p-2"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{display}</p>
                {user?.name && user.email && (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {m.role}
            </Badge>
          </div>
        );
      })}
    </div>
  );
};

const Teams = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);

  const { data, loading, refetch } = useQuery<
    { teamsByOrganization: Team[] },
    { organizationId: string }
  >(GET_TEAMS_BY_ORG, {
    variables: { organizationId: orgId },
    skip: !orgId,
  });

  const { data: usersData } = useQuery<{ getAllUsers: AppUser[] }>(
    GET_ALL_USERS,
    { skip: !orgId, fetchPolicy: "cache-and-network" },
  );

  const usersMap = useMemo(() => {
    const map = new Map<string, AppUser>();
    (usersData?.getAllUsers ?? []).forEach((u) => map.set(u.id, u));
    return map;
  }, [usersData]);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTeam({ variables: { id: deleteTarget.id } });
      toast.success("Team deleted");
      setDeleteTarget(null);
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
                  <LoadingButton
                    type="submit"
                    className="w-full gold-gradient text-primary-foreground"
                    loading={creating}
                    loadingText="Creating..."
                  >
                    Create Team
                  </LoadingButton>
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
                      onClick={() => setDeleteTarget(team)}
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
                    <TeamMembersList teamId={team.id} usersMap={usersMap} />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> aur uske saare members remove ho jayenge. Yeh action undo nahi ho sakta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Teams;
