import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import {
  GET_PROJECTS_BY_ORG,
  CREATE_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
} from "@/graphql/mutations/projects";
import { Project } from "@/graphql/graphql";
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
import { Plus, Trash2, FolderKanban, Github, Pencil } from "lucide-react";
import { Link } from "react-router-dom";

const Projects = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGithubRepoUrl, setEditGithubRepoUrl] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const { data, loading, refetch } = useQuery<
    { projectsByOrganization: Project[] },
    { organizationId: string }
  >(GET_PROJECTS_BY_ORG, {
    variables: { organizationId: orgId },
    skip: !orgId,
    notifyOnNetworkStatusChange: true,
  });
  const isInitialLoading = loading && !data;
  const isRefetching = loading && !!data;

  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT);
  const [updateProject, { loading: updating }] = useMutation(UPDATE_PROJECT);
  const [deleteProject] = useMutation(DELETE_PROJECT);

  const projects = data?.projectsByOrganization || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createProject({
        variables: {
          input: {
            name,
            description,
            organizationId: orgId,
            githubRepoUrl: githubRepoUrl.trim() || undefined,
          },
        },
      });
      toast.success("Project created!");
      setName("");
      setDescription("");
      setGithubRepoUrl("");
      setOpen(false);
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create project";
      toast.error(message);
    }
  };

  const openEdit = (project: Project) => {
    setEditTarget(project);
    setEditName(project.name);
    setEditDescription(project.description || "");
    setEditGithubRepoUrl(project.githubRepoUrl || "");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editName.trim()) return;
    try {
      await updateProject({
        variables: {
          id: editTarget.id,
          input: {
            name: editName,
            description: editDescription,
            githubRepoUrl: editGithubRepoUrl.trim() || null,
          },
        },
      });
      toast.success("Project updated");
      setEditTarget(null);
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update project";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject({ variables: { id: deleteTarget.id } });
      toast.success("Project deleted");
      setDeleteTarget(null);
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete project";
      toast.error(message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Projects</h2>
            <p className="text-muted-foreground">
              Manage your organization's projects
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gold-gradient text-primary-foreground hover:opacity-90">
                <Plus className="mr-2 h-4 w-4" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mobile App v2"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>GitHub repo URL (optional)</Label>
                  <Input
                    value={githubRepoUrl}
                    onChange={(e) => setGithubRepoUrl(e.target.value)}
                    placeholder="https://github.com/org/repo"
                  />
                </div>
                <LoadingButton
                  type="submit"
                  className="w-full gold-gradient text-primary-foreground"
                  loading={creating}
                  loadingText="Creating..."
                >
                  Create Project
                </LoadingButton>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isInitialLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">
                No projects yet
              </h3>
              <p className="text-muted-foreground">
                Create your first project to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <RefetchOverlay active={isRefetching}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: Project) => (
              <Card
                key={project.id}
                className="group border-border transition-shadow hover:shadow-lg"
              >
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex-1">
                    <Link to={`/projects/${project.id}`}>
                      <CardTitle className="text-foreground hover:text-primary transition-colors cursor-pointer">
                        {project.name}
                      </CardTitle>
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {project.description || "No description"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground/50 hover:bg-accent hover:text-foreground"
                      onClick={() => openEdit(project)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(project)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <span className="text-xs text-muted-foreground">
                    Created{" "}
                    {new Date(parseInt(project.createdAt)).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "short", day: "numeric" },
                    )}
                  </span>
                  {project.githubRepoUrl && (
                    <a
                      href={project.githubRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                    >
                      <Github className="h-3.5 w-3.5" />
                      <span className="truncate">
                        {project.githubRepoUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, "")}
                      </span>
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          </RefetchOverlay>
        )}
      </div>
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Mobile App v2"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <Label>GitHub repo URL (optional)</Label>
              <Input
                value={editGithubRepoUrl}
                onChange={(e) => setEditGithubRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
              />
            </div>
            <LoadingButton
              type="submit"
              className="w-full gold-gradient text-primary-foreground"
              loading={updating}
              loadingText="Saving..."
            >
              Save Changes
            </LoadingButton>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> and all its tasks will be permanently deleted.
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

export default Projects;
