import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import {
  GET_PROJECT,
  GET_TASKS_BY_PROJECT,
  CREATE_TASK,
  UPDATE_TASK,
  DELETE_TASK,
  GET_PROJECT_MEMBERS,
  ADD_PROJECT_MEMBER,
  UPDATE_PROJECT_MEMBER,
  REMOVE_PROJECT_MEMBER,
} from "@/graphql/mutations/projects";
import { GET_TEAMS_BY_PROJECT } from "@/graphql/mutations/teams";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { Task } from "@/graphql/graphql";
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
import { Plus, Trash2, ListTodo, Github, UserPlus, Pencil, Users } from "lucide-react";

const STATUS_COLUMNS = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-secondary text-secondary-foreground",
  IN_PROGRESS: "bg-primary/20 text-primary",
  REVIEW: "bg-accent/20 text-accent",
  DONE: "bg-primary text-primary-foreground",
};

const UNASSIGNED = "__unassigned__";

type AppUser = { id: string; name?: string | null; email: string };
type TeamOption = { id: string; name: string };

type TaskFormState = {
  title: string;
  description: string;
  githubRepo: string;
  githubBranch: string;
  githubIssueUrl: string;
  assignedUserId: string;
  assignedTeamId: string;
};

const emptyTaskForm: TaskFormState = {
  title: "",
  description: "",
  githubRepo: "",
  githubBranch: "",
  githubIssueUrl: "",
  assignedUserId: "",
  assignedTeamId: "",
};

const ROLE_RANK: Record<string, number> = { VIEWER: 0, CONTRIBUTOR: 1, MANAGER: 2 };

const ProjectDetail = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const isSuperAdmin = user?.systemRole === "SUPER_ADMIN";

  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyTaskForm);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [addMemberRole, setAddMemberRole] = useState<"MANAGER" | "CONTRIBUTOR" | "VIEWER">("CONTRIBUTOR");

  const { data: projectData } = useQuery<{ project: { id: string; name: string; description?: string | null } | null }>(
    GET_PROJECT,
    { variables: { id: projectId }, skip: !projectId },
  );
  const project = projectData?.project;

  const { data, loading, refetch } = useQuery<
    { tasksByProject: Task[] },
    { projectId: string }
  >(GET_TASKS_BY_PROJECT, {
    variables: { projectId },
    skip: !projectId,
  });

  const { data: usersData } = useQuery<{ getAllUsers: AppUser[] }>(GET_ALL_USERS, {
    skip: !orgId,
    fetchPolicy: "cache-first",
  });
  const usersMap = useMemo(() => {
    const map = new Map<string, AppUser>();
    (usersData?.getAllUsers ?? []).forEach((u) => map.set(u.id, u));
    return map;
  }, [usersData]);
  const users = useMemo(() => [...usersMap.values()], [usersMap]);

  const { data: teamsData } = useQuery<{ teamsByProject: TeamOption[] }>(GET_TEAMS_BY_PROJECT, {
    variables: { projectId },
    skip: !projectId,
  });
  const teams = useMemo(() => teamsData?.teamsByProject ?? [], [teamsData]);
  const teamsMap = useMemo(() => {
    const map = new Map<string, TeamOption>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  const { data: membersData, loading: loadingMembers, refetch: refetchMembers } = useQuery<{
    projectMembers: { id: string; userId: string; role: string; createdAt: string }[];
  }>(GET_PROJECT_MEMBERS, { variables: { projectId }, skip: !projectId });
  const members = useMemo(() => membersData?.projectMembers ?? [], [membersData]);
  const memberUserIds = useMemo(() => new Set(members.map((m) => m.userId)), [members]);
  const pickableMemberUsers = useMemo(
    () => users.filter((u) => !memberUserIds.has(u.id)),
    [users, memberUserIds],
  );

  // A user's real, backend-enforced permission on this project is their
  // ProjectMember.role — VIEWER is read-only, CONTRIBUTOR can manage tasks,
  // MANAGER can also manage membership. SUPER_ADMIN always has full access.
  // Falls back to VIEWER (most restrictive) if the user isn't a project
  // member at all (e.g. org-wide visibility without explicit membership).
  const myRole = useMemo(
    () => members.find((m) => m.userId === user?.sub)?.role,
    [members, user?.sub],
  );
  const canManageTasks = isSuperAdmin || (!!myRole && ROLE_RANK[myRole] >= ROLE_RANK.CONTRIBUTOR);
  const canManageMembers = isSuperAdmin || myRole === "MANAGER";

  const [createTask, { loading: creating }] = useMutation(CREATE_TASK);
  const [updateTask, { loading: savingEdit }] = useMutation(UPDATE_TASK);
  const [deleteTask] = useMutation(DELETE_TASK);
  const [addProjectMember, { loading: addingMember }] = useMutation(ADD_PROJECT_MEMBER);
  const [updateProjectMember] = useMutation(UPDATE_PROJECT_MEMBER);
  const [removeProjectMember] = useMutation(REMOVE_PROJECT_MEMBER);

  const tasks = data?.tasksByProject || [];

  const openCreateDialog = () => {
    setEditingTask(null);
    setForm(emptyTaskForm);
    setOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      githubRepo: task.githubRepo || "",
      githubBranch: task.githubBranch || "",
      githubIssueUrl: task.githubIssueUrl || "",
      assignedUserId: task.assignedUserId || "",
      assignedTeamId: task.assignedTeamId || "",
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditingTask(null);
    setForm(emptyTaskForm);
  };

  const buildAssignmentInput = () => ({
    assignedUserId: form.assignedUserId && form.assignedUserId !== UNASSIGNED ? form.assignedUserId : null,
    assignedTeamId: form.assignedTeamId && form.assignedTeamId !== UNASSIGNED ? form.assignedTeamId : null,
  });

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const { assignedUserId, assignedTeamId } = buildAssignmentInput();
    try {
      if (editingTask) {
        await updateTask({
          variables: {
            id: editingTask.id,
            input: {
              title: form.title,
              description: form.description || undefined,
              githubRepo: form.githubRepo || undefined,
              githubBranch: form.githubBranch || undefined,
              githubIssueUrl: form.githubIssueUrl || undefined,
              assignedUserId,
              assignedTeamId,
            },
          },
        });
        toast.success("Task updated!");
      } else {
        await createTask({
          variables: {
            input: {
              title: form.title,
              description: form.description || undefined,
              projectId,
              status: "TODO",
              githubRepo: form.githubRepo || undefined,
              githubBranch: form.githubBranch || undefined,
              githubIssueUrl: form.githubIssueUrl || undefined,
              assignedUserId,
              assignedTeamId,
            },
          },
        });
        toast.success("Task created!");
      }
      closeDialog();
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save task";
      toast.error(message);
    }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await updateTask({ variables: { id: taskId, input: { status } } });
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      toast.error(message);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTask({ variables: { id: deleteTarget.id } });
      toast.success("Task deleted");
      setDeleteTarget(null);
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete task";
      toast.error(message);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberUserId || !projectId) return;
    try {
      await addProjectMember({
        variables: { input: { projectId, userId: addMemberUserId, role: addMemberRole } },
      });
      toast.success("Member added to project.");
      setAddMemberUserId("");
      setAddMemberRole("CONTRIBUTOR");
      await refetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to add member.");
    }
  };

  const handleMemberRoleChange = async (memberId: string, role: string) => {
    try {
      await updateProjectMember({ variables: { id: memberId, input: { role } } });
      toast.success("Role updated.");
      await refetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update role.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeProjectMember({ variables: { id: memberId } });
      toast.success("Member removed.");
      await refetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to remove member.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {project?.name || "Project Tasks"}
            </h2>
            <p className="text-muted-foreground">
              {project?.description || "Kanban view of your project tasks"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="mr-2 h-4 w-4" /> Members
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Project members</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!canManageMembers && (
                    <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      You have read-only access to this project's membership.
                    </p>
                  )}
                  <form onSubmit={handleAddMember} className="flex items-end gap-2">
                    <div className="flex-1 space-y-2">
                      <Label>User</Label>
                      <Select value={addMemberUserId} onValueChange={setAddMemberUserId} disabled={!canManageMembers}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {pickableMemberUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name ? `${u.name} (${u.email})` : u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-36 space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={addMemberRole}
                        onValueChange={(v) => setAddMemberRole(v as typeof addMemberRole)}
                        disabled={!canManageMembers}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <LoadingButton
                      type="submit"
                      className="gold-gradient text-primary-foreground"
                      loading={addingMember}
                      loadingText="Adding..."
                      disabled={!addMemberUserId || !canManageMembers}
                    >
                      <UserPlus className="h-4 w-4" />
                    </LoadingButton>
                  </form>

                  {loadingMembers ? (
                    <Skeleton className="h-20 w-full" />
                  ) : members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members added yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {members.map((m) => {
                        const person = usersMap.get(m.userId);
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-md border border-border p-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {person?.name || person?.email || "Unknown user"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={m.role}
                                onValueChange={(v) => handleMemberRoleChange(m.id, v)}
                                disabled={!canManageMembers}
                              >
                                <SelectTrigger className="h-8 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MANAGER">Manager</SelectItem>
                                  <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                                  <SelectItem value="VIEWER">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveMember(m.id)}
                                disabled={!canManageMembers}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={canManageTasks && open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
              <DialogTrigger asChild>
                <Button
                  className="gold-gradient text-primary-foreground hover:opacity-90"
                  onClick={openCreateDialog}
                  disabled={!canManageTasks}
                  title={canManageTasks ? undefined : "You have view-only access to this project"}
                >
                  <Plus className="mr-2 h-4 w-4" /> New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Task title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description..."
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Assign to user</Label>
                      <Select
                        value={form.assignedUserId || UNASSIGNED}
                        onValueChange={(v) => setForm((f) => ({ ...f, assignedUserId: v === UNASSIGNED ? "" : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name ? `${u.name} (${u.email})` : u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign to team</Label>
                      <Select
                        value={form.assignedTeamId || UNASSIGNED}
                        onValueChange={(v) => setForm((f) => ({ ...f, assignedTeamId: v === UNASSIGNED ? "" : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Github className="h-3.5 w-3.5" /> GitHub (optional)
                    </p>
                    <Input
                      value={form.githubRepo}
                      onChange={(e) => setForm((f) => ({ ...f, githubRepo: e.target.value }))}
                      placeholder="org/repo"
                    />
                    <Input
                      value={form.githubBranch}
                      onChange={(e) => setForm((f) => ({ ...f, githubBranch: e.target.value }))}
                      placeholder="feature/branch-name"
                    />
                    <Input
                      value={form.githubIssueUrl}
                      onChange={(e) => setForm((f) => ({ ...f, githubIssueUrl: e.target.value }))}
                      placeholder="https://github.com/org/repo/issues/123"
                    />
                  </div>

                  <LoadingButton
                    type="submit"
                    className="w-full gold-gradient text-primary-foreground"
                    loading={editingTask ? savingEdit : creating}
                    loadingText="Saving..."
                  >
                    {editingTask ? "Save changes" : "Create Task"}
                  </LoadingButton>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            {STATUS_COLUMNS.map((status) => {
              const columnTasks = tasks.filter(
                (t: Task) => t.status === status,
              );
              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[status]}>
                      {STATUS_LABELS[status]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({columnTasks.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {columnTasks.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          No tasks
                        </p>
                      </div>
                    ) : (
                      columnTasks.map((task: Task) => {
                        const assignedUser = task.assignedUserId ? usersMap.get(task.assignedUserId) : null;
                        const assignedTeam = task.assignedTeamId ? teamsMap.get(task.assignedTeamId) : null;
                        return (
                          <Card key={task.id} className="group border-border">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <h4 className="text-sm font-medium text-foreground">
                                  {task.title}
                                </h4>
                                {canManageTasks && (
                                  <div className="flex opacity-0 group-hover:opacity-100">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                                      onClick={() => openEditDialog(task)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setDeleteTarget(task)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              {task.description && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {task.description}
                                </p>
                              )}
                              {(assignedUser || assignedTeam) && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {assignedUser && (
                                    <Badge variant="outline" className="text-xs">
                                      {assignedUser.name || assignedUser.email}
                                    </Badge>
                                  )}
                                  {assignedTeam && (
                                    <Badge variant="outline" className="text-xs">
                                      {assignedTeam.name}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {task.githubRepo && (
                                <a
                                  href={task.githubIssueUrl || undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                                >
                                  <Github className="h-3 w-3" />
                                  {task.githubRepo}
                                  {task.githubBranch ? `@${task.githubBranch}` : ""}
                                </a>
                              )}
                              <div className="mt-3">
                                <Select
                                  value={task.status}
                                  onValueChange={(val) =>
                                    handleStatusChange(task.id, val)
                                  }
                                  disabled={!canManageTasks}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STATUS_COLUMNS.map((s) => (
                                      <SelectItem key={s} value={s}>
                                        {STATUS_LABELS[s]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && tasks.length === 0 && (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ListTodo className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">
                No tasks yet
              </h3>
              <p className="text-muted-foreground">
                Create your first task to start tracking work
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title}</strong> will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDeleteTask()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ProjectDetail;
