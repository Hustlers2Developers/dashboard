import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import {
  GET_DEPARTMENTS_BY_ORG,
  CREATE_DEPARTMENT,
  DELETE_DEPARTMENT,
  UPDATE_DEPARTMENT,
} from "@/graphql/mutations/departments";
import { Department } from "@/graphql/graphql";
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
import { Plus, Trash2, Building2, Pencil } from "lucide-react";

const Departments = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

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

  const [createDepartment, { loading: creating }] =
    useMutation(CREATE_DEPARTMENT);
  const [updateDepartment, { loading: updating }] =
    useMutation(UPDATE_DEPARTMENT);
  const [deleteDepartment] = useMutation(DELETE_DEPARTMENT);

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
          variables: { input: { name } },
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Departments</h2>
            <p className="text-muted-foreground">
              Manage organization departments
            </p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) { setEditingId(null); setName(""); } }}>
            <DialogTrigger asChild>
              <Button className="gold-gradient text-primary-foreground hover:opacity-90">
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

        {loading ? (
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
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                      onClick={() => openEditDialog(dept)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(dept)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> permanently delete ho jayega. Agar is department mein positions hain toh pehle unhe delete karna hoga.
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

export default Departments;
