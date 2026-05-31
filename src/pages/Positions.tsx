import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import {
  GET_POSITIONS_BY_ORG,
  CREATE_POSITION,
  DELETE_POSITION,
  UPDATE_POSITION,
} from "@/graphql/mutations/positions";
import { GET_DEPARTMENTS_BY_ORG } from "@/graphql/mutations/departments";
import { Department, Position } from "@/graphql/graphql";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Briefcase, Pencil } from "lucide-react";

const Positions = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);

  const { data: deptData, loading: deptLoading } = useQuery<
    { departmentsByOrganization: Department[] },
    { organizationId: string }
  >(GET_DEPARTMENTS_BY_ORG, {
    variables: { organizationId: orgId },
    skip: !orgId,
  });

  const {
    data: posData,
    loading: posLoading,
    refetch,
  } = useQuery<
    { positionsByOrganization: Position[] },
    { organizationId: string }
  >(GET_POSITIONS_BY_ORG, {
    variables: { organizationId: orgId },
    skip: !orgId,
  });

  const [createPosition, { loading: creating }] = useMutation(CREATE_POSITION);
  const [updatePosition, { loading: updating }] = useMutation(UPDATE_POSITION);
  const [deletePosition] = useMutation(DELETE_POSITION);

  const departments = deptData?.departmentsByOrganization || [];
  const positions = posData?.positionsByOrganization || [];

  const getDeptName = (deptId: string) => {
    return (
      departments.find((d: Department) => d.id === deptId)?.name || "Unknown"
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedDeptId) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      if (editingId) {
        await updatePosition({ variables: { id: editingId, input: { name } } });
        toast.success("Position updated!");
      } else {
        await createPosition({
          variables: { input: { name, departmentId: selectedDeptId } },
        });
        toast.success("Position created!");
      }
      setName("");
      setSelectedDeptId("");
      setEditingId(null);
      setOpen(false);
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save position";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePosition({ variables: { id: deleteTarget.id } });
      toast.success("Position deleted");
      setDeleteTarget(null);
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete position";
      toast.error(message);
    }
  };

  const openEditDialog = (pos: Position) => {
    setEditingId(pos.id);
    setName(pos.name);
    setSelectedDeptId(pos.departmentId);
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setName("");
    setSelectedDeptId("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Positions</h2>
            <p className="text-muted-foreground">
              Manage job positions in your departments
            </p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) { setEditingId(null); setName(""); setSelectedDeptId(""); } }}>
            <DialogTrigger asChild>
              <Button className="gold-gradient text-primary-foreground hover:opacity-90">
                <Plus className="mr-2 h-4 w-4" /> New Position
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Position" : "Create Position"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    required
                    disabled={editingId !== null}
                  >
                    <option value="">Select department...</option>
                    {departments.map((dept: Department) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Position Title</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Senior Engineer"
                    required
                  />
                </div>
                <LoadingButton
                  type="submit"
                  className="w-full gold-gradient text-primary-foreground"
                  loading={creating || updating}
                  loadingText="Saving..."
                  disabled={deptLoading}
                >
                  {editingId ? "Update Position" : "Create Position"}
                </LoadingButton>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {posLoading || deptLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : positions.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Briefcase className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">
                No positions yet
              </h3>
              <p className="text-muted-foreground">
                Create positions to define job roles in your departments
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {positions.map((pos: Position) => (
              <Card
                key={pos.id}
                className="group border-border transition-shadow hover:shadow-lg"
              >
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Briefcase className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-foreground">
                        {pos.name}
                      </CardTitle>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {getDeptName(pos.departmentId)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                      onClick={() => openEditDialog(pos)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(pos)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Created{" "}
                    {new Date(parseInt(pos.createdAt)).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "short", day: "numeric" },
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete position?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently deleted.
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

export default Positions;
