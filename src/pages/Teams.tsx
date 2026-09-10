import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import {
  GET_TEAMS_BY_ORG,
  CREATE_TEAM,
  UPDATE_TEAM,
  DELETE_TEAM,
  GET_TEAM_MEMBERS,
  CREATE_TEAM_MEMBER,
  UPDATE_TEAM_MEMBER,
  DELETE_TEAM_MEMBER,
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
import { RefetchOverlay } from "@/components/RefetchOverlay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Pencil,
  UserPlus,
} from "lucide-react";

type AppUser = { id: string; name?: string | null; email: string };

const TeamMembersList = ({
  teamId,
  usersMap,
  availableUsers,
  isSuperAdmin,
  currentUserId,
}: {
  teamId: string;
  usersMap: Map<string, AppUser>;
  availableUsers: AppUser[];
  isSuperAdmin: boolean;
  currentUserId?: string;
}) => {
  const { data, loading, refetch } = useQuery<
    { teamMembersByTeam: TeamMember[] },
    { teamId: string }
  >(GET_TEAM_MEMBERS, { variables: { teamId } });

  // Real, backend-enforced gate: SUPER_ADMIN always can; otherwise only this
  // specific team's own LEAD can manage its membership (TeamRole has no
  // separate viewer/admin concept — LEAD is the only elevated tier).
  const canManage =
    isSuperAdmin ||
    (data?.teamMembersByTeam ?? []).some((m) => m.userId === currentUserId && m.role === "LEAD");

  const [addOpen, setAddOpen] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<"MEMBER" | "LEAD">("MEMBER");
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);

  const [createTeamMember, { loading: adding }] = useMutation(CREATE_TEAM_MEMBER);
  const [updateTeamMember] = useMutation(UPDATE_TEAM_MEMBER);
  const [deleteTeamMember, { loading: removing }] = useMutation(DELETE_TEAM_MEMBER);

  const members = useMemo(() => data?.teamMembersByTeam || [], [data]);
  const memberUserIds = useMemo(() => new Set(members.map((m) => m.userId)), [members]);
  const pickableUsers = useMemo(
    () => availableUsers.filter((u) => !memberUserIds.has(u.id)),
    [availableUsers, memberUserIds],
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserId) {
      toast.error("Pick a user to add.");
      return;
    }
    try {
      await createTeamMember({
        variables: { input: { teamId, userId: addUserId, role: addRole } },
      });
      toast.success("Member added to team.");
      setAddOpen(false);
      setAddUserId("");
      setAddRole("MEMBER");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to add member.");
    }
  };

  const handleRoleToggle = async (member: TeamMember) => {
    const nextRole = member.role === "LEAD" ? "MEMBER" : "LEAD";
    try {
      await updateTeamMember({ variables: { id: member.id, input: { role: nextRole } } });
      toast.success(`Role updated to ${nextRole}.`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update role.");
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await deleteTeamMember({ variables: { id: removeTarget.id } });
      toast.success("Member removed from team.");
      setRemoveTarget(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to remove member.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"}
        </p>
        <Dialog open={canManage && addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={!canManage}
              title={canManage ? undefined : "Only the team lead can manage members"}
            >
              <UserPlus className="mr-2 h-3.5 w-3.5" />
              Add member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add team member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={addUserId} onValueChange={setAddUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {pickableUsers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Everyone in the org is already on this team.
                      </div>
                    ) : (
                      pickableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name ? `${u.name} (${u.email})` : u.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={addRole} onValueChange={(v) => setAddRole(v as "MEMBER" | "LEAD")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="LEAD">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <LoadingButton
                type="submit"
                className="w-full gold-gradient text-primary-foreground"
                loading={adding}
                loadingText="Adding..."
                disabled={!addUserId}
              >
                Add member
              </LoadingButton>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Skeleton className="h-8 w-full" />
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members yet</p>
      ) : (
        <div className="space-y-2">
          {members.map((m: TeamMember) => {
            const user = usersMap.get(m.userId);
            const display = user?.name || user?.email || "Unknown User";
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => canManage && handleRoleToggle(m)}
                    title={canManage ? "Toggle role" : undefined}
                    disabled={!canManage}
                    className="rounded disabled:cursor-not-allowed"
                  >
                    <Badge
                      variant="secondary"
                      className={canManage ? "text-xs hover:bg-secondary/70" : "text-xs"}
                    >
                      {m.role}
                    </Badge>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setRemoveTarget(m)}
                    disabled={!canManage}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {usersMap.get(removeTarget?.userId || "")?.name ||
                usersMap.get(removeTarget?.userId || "")?.email ||
                "This member"}{" "}
              will be removed from the team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removing}
              onClick={() => void handleRemove()}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Teams = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const isSuperAdmin = user?.systemRole === "SUPER_ADMIN";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [editTarget, setEditTarget] = useState<Team | null>(null);
  const [editName, setEditName] = useState("");

  const { data, loading, refetch } = useQuery<
    { teamsByOrganization: Team[] },
    { organizationId: string }
  >(GET_TEAMS_BY_ORG, {
    variables: { organizationId: orgId },
    skip: !orgId,
    notifyOnNetworkStatusChange: true,
  });
  const isInitialLoading = loading && !data;
  const isRefetching = loading && !!data;

  const { data: usersData } = useQuery<{ getAllUsers: AppUser[] }>(
    GET_ALL_USERS,
    { skip: !orgId, fetchPolicy: "cache-first" },
  );

  const usersMap = useMemo(() => {
    const map = new Map<string, AppUser>();
    (usersData?.getAllUsers ?? []).forEach((u) => map.set(u.id, u));
    return map;
  }, [usersData]);

  const availableUsers = useMemo(() => [...usersMap.values()], [usersMap]);

  const [createTeam, { loading: creating }] = useMutation(CREATE_TEAM);
  const [updateTeam, { loading: savingEdit }] = useMutation(UPDATE_TEAM);
  const [deleteTeam] = useMutation(DELETE_TEAM);

  const teams = data?.teamsByOrganization || [];

  const openEditDialog = (team: Team) => {
    setEditTarget(team);
    setEditName(team.name);
  };

  const closeEditDialog = () => {
    setEditTarget(null);
    setEditName("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editName.trim()) return;
    try {
      await updateTeam({ variables: { id: editTarget.id, input: { name: editName } } });
      toast.success("Team updated.");
      closeEditDialog();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update team.");
    }
  };

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
            <Dialog open={isSuperAdmin && open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gold-gradient text-primary-foreground hover:opacity-90"
                  disabled={!isSuperAdmin}
                  title={isSuperAdmin ? undefined : "Only Super Admins can create teams"}
                >
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

        {isInitialLoading ? (
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
          <RefetchOverlay active={isRefetching}>
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
                    {isSuperAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                          onClick={() => openEditDialog(team)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(team)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                {expandedTeam === team.id && (
                  <CardContent className="border-t border-border pt-4">
                    <h5 className="mb-2 text-sm font-medium text-foreground">
                      Members
                    </h5>
                    <TeamMembersList
                      teamId={team.id}
                      usersMap={usersMap}
                      availableUsers={availableUsers}
                      isSuperAdmin={isSuperAdmin}
                      currentUserId={user?.sub}
                    />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
          </RefetchOverlay>
        )}
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> and all its members will be removed. This action cannot be undone.
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

      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) closeEditDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Team Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Frontend Team"
                required
              />
            </div>
            <LoadingButton
              type="submit"
              className="w-full gold-gradient text-primary-foreground"
              loading={savingEdit}
              loadingText="Saving..."
            >
              Save changes
            </LoadingButton>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Teams;
