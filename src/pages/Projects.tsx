import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import {
  GET_PROJECTS_BY_ORG,
  CREATE_PROJECT,
  DELETE_PROJECT,
} from "@/graphql/mutations/projects";
import { Project } from "@/graphql/graphql";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { Plus, Trash2, FolderKanban } from "lucide-react";
import { Link } from "react-router-dom";

const Projects = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data, loading, refetch } = useQuery<
    { projectsByOrganization: Project[] },
    { organizationId: string }
  >(GET_PROJECTS_BY_ORG, {
    variables: { organizationId: orgId },
    skip: !orgId,
  });

  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT);
  const [deleteProject] = useMutation(DELETE_PROJECT);

  const projects = data?.projectsByOrganization || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createProject({
        variables: { input: { name, description, organizationId: orgId } },
      });
      toast.success("Project created!");
      setName("");
      setDescription("");
      setOpen(false);
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create project";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project? This will also delete all its tasks."))
      return;
    try {
      await deleteProject({ variables: { id } });
      toast.success("Project deleted");
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
                <Button
                  type="submit"
                  className="w-full gold-gradient text-primary-foreground"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Project"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground"
                    onClick={() => handleDelete(project.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <span className="text-xs text-muted-foreground">
                    Created{" "}
                    {new Date(parseInt(project.createdAt)).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "short", day: "numeric" },
                    )}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Projects;
