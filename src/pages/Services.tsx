import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  GET_SERVICES,
  CREATE_SERVICE,
  UPDATE_SERVICE,
  DELETE_SERVICE,
  REGENERATE_API_KEY,
} from "@/graphql/mutations/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { AlertCircle, Copy, Eye, EyeOff, KeyRound, Pencil, Plus, RefreshCw, Server, Trash2 } from "lucide-react";

type Service = {
  id: string;
  name: string;
  description?: string | null;
  url: string;
  githubUrl?: string | null;
  platforms?: string[] | null;
  platformLinks?: string[] | null;
  uptime?: number | null;
  goal?: string | null;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const emptyForm = {
  name: "",
  description: "",
  url: "",
  githubUrl: "",
  platforms: "",
  platformLinks: "",
  uptime: "",
  goal: "",
};

const Services = () => {
  const me = useAuthStore((s) => s.user);
  const isSuperAdmin = me?.systemRole === "SUPER_ADMIN";

  const [createOpen, setCreateOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteService, setDeleteService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const { data, loading, error, refetch } = useQuery<{ services: Service[] }>(GET_SERVICES, {
    fetchPolicy: "cache-and-network",
    skip: !isSuperAdmin,
  });

  const [createService, { loading: creating }] = useMutation(CREATE_SERVICE);
  const [updateService, { loading: updating }] = useMutation(UPDATE_SERVICE);
  const [deleteSvc, { loading: deleting }] = useMutation(DELETE_SERVICE);
  const [regenerateKey, { loading: regenerating }] = useMutation(REGENERATE_API_KEY);

  const services = data?.services ?? [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const openCreate = () => {
    setForm(emptyForm);
    setCreateOpen(true);
  };

  const openEdit = (svc: Service) => {
    setForm({
      name: svc.name,
      description: svc.description || "",
      url: svc.url,
      githubUrl: svc.githubUrl || "",
      platforms: (svc.platforms ?? []).join(", "),
      platformLinks: (svc.platformLinks ?? []).join(", "),
      uptime: svc.uptime != null ? String(svc.uptime) : "",
      goal: svc.goal || "",
    });
    setEditService(svc);
  };

  const buildInput = () => ({
    name: form.name,
    description: form.description || undefined,
    url: form.url,
    githubUrl: form.githubUrl || undefined,
    platforms: form.platforms ? form.platforms.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    platformLinks: form.platformLinks ? form.platformLinks.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    uptime: form.uptime ? parseFloat(form.uptime) : undefined,
    goal: form.goal || undefined,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.url) { toast.error("Name and URL are required."); return; }
    try {
      await createService({ variables: { input: buildInput() } });
      toast.success("Service created.");
      setCreateOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create service.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editService) return;
    try {
      await updateService({
        variables: {
          id: editService.id,
          input: {
            name: form.name || undefined,
            description: form.description || undefined,
            url: form.url || undefined,
            githubUrl: form.githubUrl || undefined,
            platforms: form.platforms ? form.platforms.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
            platformLinks: form.platformLinks ? form.platformLinks.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
            uptime: form.uptime ? parseFloat(form.uptime) : undefined,
            goal: form.goal || undefined,
          },
        },
      });
      toast.success("Service updated.");
      setEditService(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update service.");
    }
  };

  const handleDelete = async () => {
    if (!deleteService) return;
    try {
      await deleteSvc({ variables: { id: deleteService.id } });
      toast.success("Service deleted.");
      setDeleteService(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete service.");
    }
  };

  const handleRegenerate = async (svc: Service) => {
    try {
      const res = await regenerateKey({ variables: { id: svc.id } }) as { data: { regenerateServiceApiKey: { apiKey: string } } };
      const newKey = res.data?.regenerateServiceApiKey?.apiKey;
      if (newKey) {
        toast.success("API key regenerated.");
        await refetch();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not regenerate key.");
    }
  };

  const copyKey = (key: string) => {
    void navigator.clipboard.writeText(key);
    toast.success("API key copied.");
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <Card className="border-border">
          <CardContent className="flex items-start gap-3 p-6">
            <AlertCircle className="mt-1 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-foreground">Restricted area</p>
              <p className="text-sm text-muted-foreground">Only SUPER_ADMIN accounts can manage internal services.</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const renderServiceForm = (onSubmit: (e: React.FormEvent) => Promise<void>, submitting: boolean) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Hustlers Blog" required />
        </div>
        <div className="space-y-2">
          <Label>URL *</Label>
          <Input name="url" value={form.url} onChange={handleChange} placeholder="https://blog.example.com" required />
        </div>
        <div className="space-y-2">
          <Label>GitHub URL</Label>
          <Input name="githubUrl" value={form.githubUrl} onChange={handleChange} placeholder="https://github.com/org/repo" />
        </div>
        <div className="space-y-2">
          <Label>Uptime %</Label>
          <Input name="uptime" type="number" min="0" max="100" step="0.1" value={form.uptime} onChange={handleChange} placeholder="99.9" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Description</Label>
          <Input name="description" value={form.description} onChange={handleChange} placeholder="Short description" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Goal</Label>
          <Input name="goal" value={form.goal} onChange={handleChange} placeholder="One-line goal/purpose" />
        </div>
        <div className="space-y-2">
          <Label>Platforms (comma-separated)</Label>
          <Input name="platforms" value={form.platforms} onChange={handleChange} placeholder="Vercel, Railway" />
        </div>
        <div className="space-y-2">
          <Label>Platform Links (comma-separated)</Label>
          <Input name="platformLinks" value={form.platformLinks} onChange={handleChange} placeholder="https://..., https://..." />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" className="gold-gradient text-primary-foreground" disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Internal Services</h2>
              <p className="text-muted-foreground">Manage services connected to this platform.</p>
            </div>
          </div>
          <Button className="gold-gradient text-primary-foreground" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />New Service
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
          </div>
        ) : error ? (
          <Card className="border-border">
            <CardContent className="p-6">
              <p className="text-destructive">{error.message}</p>
              <Button variant="outline" className="mt-3" onClick={() => void refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : services.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-10 text-center">
              <Server className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-foreground">No services yet</p>
              <p className="text-sm text-muted-foreground">Create your first internal service to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((svc) => {
              const keyVisible = visibleKeys.has(svc.id);
              return (
                <Card key={svc.id} className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{svc.name}</CardTitle>
                        {svc.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{svc.description}</p>
                        )}
                      </div>
                      <Badge variant={svc.isActive ? "default" : "secondary"}>
                        {svc.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <a href={svc.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
                        {svc.url}
                      </a>
                      {svc.uptime != null && <span>• Uptime: {svc.uptime}%</span>}
                      {svc.goal && <span>• {svc.goal}</span>}
                    </div>

                    {(svc.platforms ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(svc.platforms ?? []).map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">API Key</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate text-xs font-mono text-foreground">
                          {keyVisible ? svc.apiKey : "•".repeat(Math.min(svc.apiKey.length, 32))}
                        </code>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleKeyVisibility(svc.id)}>
                          {keyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyKey(svc.apiKey)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(svc)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleRegenerate(svc)}
                        disabled={regenerating}
                      >
                        <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                        {regenerating ? "..." : "Regen Key"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteService(svc)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Internal Service</DialogTitle>
              <DialogDescription>Register a service that connects to this platform.</DialogDescription>
            </DialogHeader>
            {renderServiceForm(handleCreate, creating)}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editService} onOpenChange={(o) => { if (!o) setEditService(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
              <DialogDescription>Update details for {editService?.name}.</DialogDescription>
            </DialogHeader>
            {renderServiceForm(handleUpdate, updating)}
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteService} onOpenChange={(o) => { if (!o) setDeleteService(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete service?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{deleteService?.name}</strong> will be permanently deleted. Its API key will stop working immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Services;
