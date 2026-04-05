import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_TASKS_BY_PROJECT,
  CREATE_TASK,
  UPDATE_TASK,
  DELETE_TASK,
} from "@/graphql/mutations/projects";
import { Task } from "@/graphql/graphql";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ListTodo } from "lucide-react";

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

const ProjectDetail = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data, loading, refetch } = useQuery<
    { tasksByProject: Task[] },
    { projectId: string }
  >(GET_TASKS_BY_PROJECT, {
    variables: { projectId },
    skip: !projectId,
  });

  const [createTask, { loading: creating }] = useMutation(CREATE_TASK);
  const [updateTask] = useMutation(UPDATE_TASK);
  const [deleteTask] = useMutation(DELETE_TASK);

  const tasks = data?.tasksByProject || [];

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createTask({
        variables: { input: { title, description, projectId, status: "TODO" } },
      });
      toast.success("Task created!");
      setTitle("");
      setDescription("");
      setOpen(false);
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create task";
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

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask({ variables: { id: taskId } });
      toast.success("Task deleted");
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete task";
      toast.error(message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Project Tasks
            </h2>
            <p className="text-muted-foreground">
              Kanban view of your project tasks
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gold-gradient text-primary-foreground hover:opacity-90">
                <Plus className="mr-2 h-4 w-4" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
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
                  {creating ? "Creating..." : "Create Task"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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
                      columnTasks.map((task: Task) => (
                        <Card key={task.id} className="group border-border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <h4 className="text-sm font-medium text-foreground">
                                {task.title}
                              </h4>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            {task.description && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                            <div className="mt-3">
                              <Select
                                value={task.status}
                                onValueChange={(val) =>
                                  handleStatusChange(task.id, val)
                                }
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
                      ))
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
    </DashboardLayout>
  );
};

export default ProjectDetail;
