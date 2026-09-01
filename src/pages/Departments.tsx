import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import {
  GET_DEPARTMENTS_BY_ORG,
  CREATE_DEPARTMENT,
  DELETE_DEPARTMENT,
  UPDATE_DEPARTMENT,
  GET_DEPARTMENT_USERS,
  ASSIGN_USER_TO_DEPARTMENT,
  REMOVE_USER_FROM_DEPARTMENT,
} from "@/graphql/mutations/departments";
import { GET_POSITIONS_BY_DEPARTMENT } from "@/graphql/mutations/positions";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { GET_ALL_ORGANIZATIONS } from "@/graphql/mutations/organizations";
import { Department, Organization, Position } from "@/graphql/graphql";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Building2,
  Pencil,
  ChevronDown,
  ChevronUp,
  UserPlus,
} from "lucide-react";

type AppUser = { id: string; name?: string | null; email: string };
type UserDepartment = {
  id: string;
  userId: string;
  departmentId: string;
  positionId: string;
  createdAt: string;
};

const DepartmentUsersList = ({
  departmentId,
  usersMap,
  onRemoved,
}: {
  departmentId: string;
  usersMap: Map<string, AppUser>;
  onRemoved: () => void;
}) => {
  const { data, loading, refetch } = useQuery<{ departmentUsers: UserDepartment[] }>(
    GET_DEPARTMENT_USERS,
    { variables: { departmentId } },
  );
  const { data: positionsData } = useQuery<{ positionsByDepartment: Position[] }>(
    GET_POSITIONS_BY_DEPARTMENT,
    { variables: { departmentId } },
  );
  const [removeUserFromDepartment, { loading: removing }] = useMutation(
    REMOVE_USER_FROM_DEPARTMENT,
  );

  const assignments = data?.departmentUsers ?? [];
  const positionsMap = useMemo(() => {
    const map = new Map<string, Position>();
    (positionsData?.positionsByDepartment ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [positionsData]);

  const handleRemove = async (id: string) => {
    try {
      await removeUserFromDepartment({ variables: { id } });
      toast.success("User removed from department.");
      await refetch();
      onRemoved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to remove user.");
    }
  };

  if (loading) return <Skeleton className="h-8 w-full" />;
  if (assignments.length === 0)
    return <p className="text-sm text-muted-foreground">No one assigned yet</p>;

  return (
    <div className="space-y-2">
      {assignments.map((a) => {
        const person = usersMap.get(a.userId);
        const position = positionsMap.get(a.positionId);
        return (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-md bg-background p-2"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {person?.name || person?.email || "Unknown user"}
              </p>
              <p className="text-xs text-muted-foreground">
                {position?.name || "Unknown position"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={removing}
              onClick={() => handleRemove(a.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
};

const Departments = () => {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.systemRole === "SUPER_ADMIN";
  const defaultOrgId = user?.orgId || "";
  const [selectedOrgId, setSelectedOrgId] = useState(defaultOrgId);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [assignDept, setAssignDept] = useState<Department | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignPositionId, setAssignPositionId] = useState("");

  useEffect(() => {
    if (!selectedOrgId && defaultOrgId) setSelectedOrgId(defaultOrgId);
  }, [defaultOrgId, selectedOrgId]);

  const { data: organizationsData, loading: loadingOrganizations } = useQuery<{
    organizations?: Organization[];
  }>(GET_ALL_ORGANIZATIONS, { skip: !isSuperAdmin });
  const organizations = useMemo(
    () => (organizationsData?.organizations ?? []).filter(Boolean) as Organization[],
    [organizationsData],
  );

  useEffect(() => {
    if (isSuperAdmin && !selectedOrgId && organizations.length > 0) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [isSuperAdmin, organizations, selectedOrgId]);

  // orgId is what every query/mutation below actually targets — for a
  // regular org admin it's always their own org; for a SUPER_ADMIN it
  // follows whichever org is selected in the picker.
  const orgId = isSuperAdmin ? selectedOrgId : defaultOrgId;

  const { data, loading, refetch } = useQuery<
    { departmentsByOrganization: Department[] },
    { organizationId: string }
  >(GET_DEPARTMENTS_BY_ORG, {
    variables: { organizationId: orgId },
    skip: !orgId,
    notifyOnNetworkStatusChange: true,
  });
  const isInitialLoading = loading && !data;
  const isRefetching = loading && !!data;

  const { data: usersData } = useQuery<{ getAllUsers: AppUser[] }>(GET_ALL_USERS, {
    variables: isSuperAdmin ? { orgId } : undefined,
    skip: !orgId,
    fetchPolicy: "cache-first",
  });
  const usersMap = useMemo(() => {
    const map = new Map<string, AppUser>();
    (usersData?.getAllUsers ?? []).forEach((u) => map.set(u.id, u));
    return map;
  }, [usersData]);

  const { data: assignPositionsData, loading: loadingAssignPositions } = useQuery<{
    positionsByDepartment: Position[];
  }>(GET_POSITIONS_BY_DEPARTMENT, {
    variables: { departmentId: assignDept?.id },
    skip: !assignDept,
  });
  const assignPositions = assignPositionsData?.positionsByDepartment ?? [];

  const [createDepartment, { loading: creating }] =
    useMutation(CREATE_DEPARTMENT);
  const [updateDepartment, { loading: updating }] =
    useMutation(UPDATE_DEPARTMENT);
  const [deleteDepartment] = useMutation(DELETE_DEPARTMENT);
  const [assignUserToDepartment, { loading: assigning }] = useMutation(
    ASSIGN_USER_TO_DEPARTMENT,
  );

  const departments = data?.departmentsByOrganization || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingId) {
        await updateDepartment({
          variables: { id: editingId, input: { name } },
        });
        toast.success("Department updated!");
      } else {
        await createDepartment({
          // organizationId is optional (defaults to the caller's own org on
          // the backend) — pass it explicitly for SUPER_ADMIN so creation
          // targets whichever org is selected, not always their own.
          variables: { input: { name, organizationId: isSuperAdmin ? orgId : undefined } },
        });
        toast.success("Department created!");
      }
      setName("");
      setEditingId(null);
      setOpen(false);
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save department";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDepartment({ variables: { id: deleteTarget.id } });
      toast.success("Department deleted");
      setDeleteTarget(null);
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete department";
      toast.error(message);
    }
  };

  const openEditDialog = (dept: Department) => {
    setEditingId(dept.id);
    setName(dept.name);
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setName("");
  };

  const openAssignDialog = (dept: Department) => {
    setAssignDept(dept);
    setAssignUserId("");
    setAssignPositionId("");
  };

  const closeAssignDialog = () => {
    setAssignDept(null);
    setAssignUserId("");
    setAssignPositionId("");
  };

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignDept || !assignUserId || !assignPositionId) {
      toast.error("Pick a user and a position.");
      return;
    }
    try {
      await assignUserToDepartment({
        variables: {
          input: {
            userId: assignUserId,
            departmentId: assignDept.id,
            positionId: assignPositionId,
          },
        },
      });
      toast.success("User assigned to department.");
      closeAssignDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to assign user.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Departments</h2>
              <p className="text-muted-foreground">
                Manage organization departments
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {isSuperAdmin && (
              <div className="min-w-[220px] space-y-2">
                <Label>Organization</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingOrganizations ? "Loading..." : "Select organization"} />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) { setEditingId(null); setName(""); } }}>
            <DialogTrigger asChild>
              <Button className="gold-gradient text-primary-foreground hover:opacity-90" disabled={!orgId}>
                <Plus className="mr-2 h-4 w-4" /> New Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Department" : "Create Department"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Department Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Engineering"
                    required
                  />
                </div>
                <LoadingButton
                  type="submit"
                  className="w-full gold-gradient text-primary-foreground"
                  loading={creating || updating}
                  loadingText="Saving..."
                >
                  {editingId ? "Update Department" : "Create Department"}
                </LoadingButton>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {isInitialLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">
                No departments yet
              </h3>
              <p className="text-muted-foreground">
                Create your first department to organize your organization
              </p>
            </CardContent>
          </Card>
        ) : (
          <RefetchOverlay active={isRefetching}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((dept: Department) => (
                <Card
                  key={dept.id}
                  className="group border-border transition-shadow hover:shadow-lg"
                >
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-foreground">
                          {dept.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Created{" "}
                          {new Date(parseInt(dept.createdAt)).toLocaleDateString(
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
                          setExpandedDept(expandedDept === dept.id ? null : dept.id)
                        }
                      >
                        {expandedDept === dept.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                        onClick={() => openEditDialog(dept)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(dept)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {expandedDept === dept.id && (
                    <CardContent className="border-t border-border pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-foreground">
                          Assigned people
                        </h5>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAssignDialog(dept)}
                        >
                          <UserPlus className="mr-2 h-3.5 w-3.5" />
                          Assign
                        </Button>
                      </div>
                      <DepartmentUsersList
                        departmentId={dept.id}
                        usersMap={usersMap}
                        onRemoved={() => {}}
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
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently deleted. Please delete all positions in this department first.
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

      <Dialog open={!!assignDept} onOpenChange={(o) => { if (!o) closeAssignDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign user to {assignDept?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignUser} className="space-y-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {[...usersMap.values()].map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Select
                value={assignPositionId}
                onValueChange={setAssignPositionId}
                disabled={loadingAssignPositions}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingAssignPositions ? "Loading..." : "Select position"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {assignPositions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No positions in this department yet.
                    </div>
                  ) : (
                    assignPositions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <LoadingButton
              type="submit"
              className="w-full gold-gradient text-primary-foreground"
              loading={assigning}
              loadingText="Assigning..."
              disabled={!assignUserId || !assignPositionId}
            >
              Assign
            </LoadingButton>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Departments;
