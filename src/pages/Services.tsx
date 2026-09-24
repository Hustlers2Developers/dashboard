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
import { GET_SERVICE_ANALYTICS } from "@/graphql/mutations/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefetchOverlay } from "@/components/RefetchOverlay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AlertCircle, BarChart3, Copy, Eye, EyeOff, KeyRound, Loader2, Pencil, Plus, RefreshCw, Server, Trash2, Users, Activity, Link2 } from "lucide-react";

type Service = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  serviceType?: string | null;
  description?: string | null;
  url: string;
  githubUrl?: string | null;
  platforms?: string[] | null;
  platformLinks?: string[] | null;
  uptime?: number | null;
  goal?: string | null;
  frontendFramework?: string | null;
  styling?: string | null;
  deploymentPlatform?: string | null;
  proxyProvider?: string | null;
  version?: string | null;
  tags?: string[] | null;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const SERVICE_TYPES = [
  "CORE_PLATFORM",
  "LEARNING_SERVICE",
  "PLATFORM_SERVICE",
  "COMMUNITY_SERVICE",
  "KNOWLEDGE_SERVICE",
];

type AnalyticsRange = "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "ALL_TIME";

const ANALYTICS_RANGES: { label: string; value: AnalyticsRange }[] = [
  { label: "Today", value: "TODAY" },
  { label: "7 days", value: "LAST_7_DAYS" },
  { label: "30 days", value: "LAST_30_DAYS" },
  { label: "All time", value: "ALL_TIME" },
];

type ServiceAnalyticsData = {
  serviceId: string;
  serviceName: string;
  pageviews: number;
  uniqueVisitors: number;
  sessions: number;
  topPages: { path: string; pageviews: number; uniqueVisitors: number }[];
  topReferrers: { referrer: string; count: number }[];
};

const fmtNum = (n: number) => new Intl.NumberFormat().format(n);

// Per-service analytics drill-down — lazily queried only while its dialog is
// open, per service, rather than fetched eagerly for every service on page
// load.
const ServiceAnalyticsDialog = ({
  service,
  onOpenChange,
}: {
  service: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
}) => {
  const [range, setRange] = useState<AnalyticsRange>("LAST_7_DAYS");

  const { data, loading, error } = useQuery<{ serviceAnalytics: ServiceAnalyticsData }>(
    GET_SERVICE_ANALYTICS,
    {
      variables: { serviceId: service?.id, range },
      skip: !service,
      fetchPolicy: "cache-first",
      errorPolicy: "all",
    },
  );

  const analytics = data?.serviceAnalytics;

  return (
    <Dialog open={!!service} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {service?.name} analytics
          </DialogTitle>
          <DialogDescription>Pageviews and traffic for this service.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {ANALYTICS_RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={range === r.value ? "default" : "outline"}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>

        {loading && !analytics ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : error && !analytics ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : !analytics ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No analytics data yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="premium-card p-3 text-center">
                <Eye className="mx-auto mb-1 h-4 w-4 text-accent" />
                <p className="text-lg font-bold text-foreground">{fmtNum(analytics.pageviews)}</p>
                <p className="text-[11px] text-muted-foreground">Pageviews</p>
              </div>
              <div className="premium-card p-3 text-center">
                <Users className="mx-auto mb-1 h-4 w-4 text-primary" />
                <p className="text-lg font-bold text-foreground">{fmtNum(analytics.uniqueVisitors)}</p>
                <p className="text-[11px] text-muted-foreground">Visitors</p>
              </div>
              <div className="premium-card p-3 text-center">
                <Activity className="mx-auto mb-1 h-4 w-4 text-saffron" />
                <p className="text-lg font-bold text-foreground">{fmtNum(analytics.sessions)}</p>
                <p className="text-[11px] text-muted-foreground">Sessions</p>
              </div>
            </div>

            {analytics.topPages.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Top pages</p>
                <div className="space-y-1.5">
                  {analytics.topPages.slice(0, 5).map((p) => (
                    <div key={p.path} className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
                      <span className="truncate text-foreground">{p.path}</span>
                      <span className="shrink-0 text-muted-foreground">{fmtNum(p.pageviews)} views</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics.topReferrers.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Link2 className="h-3 w-3" /> Top referrers
                </p>
                <div className="space-y-1.5">
                  {analytics.topReferrers.slice(0, 5).map((r) => (
                    <div key={r.referrer} className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
                      <span className="truncate text-foreground">{r.referrer || "Direct"}</span>
                      <span className="shrink-0 text-muted-foreground">{fmtNum(r.count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const emptyForm = {
  name: "",
  slug: "",
  domain: "",
  serviceType: "",
  description: "",
  url: "",
  githubUrl: "",
  platforms: "",
  platformLinks: "",
  uptime: "",
  goal: "",
  tags: "",
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const Services = () => {
  const me = useAuthStore((s) => s.user);
  const isSuperAdmin = me?.systemRole === "SUPER_ADMIN";

  const [createOpen, setCreateOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteService, setDeleteService] = useState<Service | null>(null);
  const [analyticsService, setAnalyticsService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const { data, loading, error, refetch } = useQuery<{ services: Service[] }>(GET_SERVICES, {
    fetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: true,
    skip: !isSuperAdmin,
  });
  const isInitialLoading = loading && !data;
  const isRefetching = loading && !!data;

  const [createService, { loading: creating }] = useMutation(CREATE_SERVICE);
  const [updateService, { loading: updating }] = useMutation(UPDATE_SERVICE);
  const [deleteSvc, { loading: deleting }] = useMutation(DELETE_SERVICE);
  const [regenerateKey, { loading: regenerating }] = useMutation(REGENERATE_API_KEY);

  const services = data?.services ?? [];

  // Once the user has touched slug/domain directly, stop auto-deriving them
  // from the name so we don't clobber a manual edit.
  const [slugTouched, setSlugTouched] = useState(false);
  const [domainTouched, setDomainTouched] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "slug") setSlugTouched(true);
    if (name === "domain") setDomainTouched(true);
    setForm((p) => {
      const next = { ...p, [name]: value };
      if (name === "name" && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const openCreate = () => {
    setForm(emptyForm);
    setSlugTouched(false);
    setDomainTouched(false);
    setCreateOpen(true);
  };

  const openEdit = (svc: Service) => {
    setForm({
      name: svc.name,
      slug: svc.slug,
      domain: svc.domain,
      serviceType: svc.serviceType || "",
      description: svc.description || "",
      url: svc.url,
      githubUrl: svc.githubUrl || "",
      platforms: (svc.platforms ?? []).join(", "),
      platformLinks: (svc.platformLinks ?? []).join(", "),
      uptime: svc.uptime != null ? String(svc.uptime) : "",
      goal: svc.goal || "",
      tags: (svc.tags ?? []).join(", "),
    });
    setSlugTouched(true);
    setDomainTouched(true);
    setEditService(svc);
  };

  const buildCreateInput = () => ({
    name: form.name,
    slug: form.slug,
    domain: form.domain,
    serviceType: form.serviceType || undefined,
    description: form.description || undefined,
    url: form.url,
    githubUrl: form.githubUrl || undefined,
    platforms: form.platforms ? form.platforms.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    platformLinks: form.platformLinks ? form.platformLinks.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    uptime: form.uptime ? parseFloat(form.uptime) : undefined,
    goal: form.goal || undefined,
    tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.url) { toast.error("Name and URL are required."); return; }
    if (!form.slug || !form.domain) { toast.error("Slug and domain are required."); return; }
    try {
      await createService({ variables: { input: buildCreateInput() } });
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

  const renderServiceForm = (
    onSubmit: (e: React.FormEvent) => Promise<void>,
    submitting: boolean,
    isEdit: boolean,
  ) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Hustlers Blog" required />
        </div>
        <div className="space-y-2">
          <Label>Service Type</Label>
          <Select
            value={form.serviceType || undefined}
            onValueChange={(v) => setForm((p) => ({ ...p, serviceType: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Slug * {isEdit && <span className="text-xs text-muted-foreground">(can't be changed)</span>}</Label>
          <Input
            name="slug"
            value={form.slug}
            onChange={handleChange}
            placeholder="hustlers-blog"
            required
            disabled={isEdit}
          />
        </div>
        <div className="space-y-2">
          <Label>Domain * {isEdit && <span className="text-xs text-muted-foreground">(can't be changed)</span>}</Label>
          <Input
            name="domain"
            value={form.domain}
            onChange={handleChange}
            placeholder="blog.godevelopers.space"
            required
            disabled={isEdit}
          />
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
        <div className="space-y-2">
          <Label>Tags (comma-separated)</Label>
          <Input name="tags" value={form.tags} onChange={handleChange} placeholder="javascript, learning" disabled={isEdit} />
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
      {isEdit && (
        <p className="text-xs text-muted-foreground">
          Slug, domain, service type, and tags can only be set when creating a service.
        </p>
      )}
      <DialogFooter>
        <Button type="submit" className="gold-gradient text-primary-foreground" disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            "Save"
          )}
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

        {isInitialLoading ? (
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
          <RefetchOverlay active={isRefetching}>
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((svc) => {
              const keyVisible = visibleKeys.has(svc.id);
              return (
                <Card key={svc.id} className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <CardTitle className="truncate text-base">{svc.name}</CardTitle>
                          {svc.serviceType && (
                            <Badge variant="outline" className="text-[10px]">{svc.serviceType}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{svc.domain}</p>
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

                    {(svc.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(svc.tags ?? []).map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
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
                      <Button size="sm" variant="outline" onClick={() => setAnalyticsService(svc)}>
                        <BarChart3 className="mr-1.5 h-3.5 w-3.5" />Analytics
                      </Button>
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
          </RefetchOverlay>
        )}

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Internal Service</DialogTitle>
              <DialogDescription>Register a service that connects to this platform.</DialogDescription>
            </DialogHeader>
            {renderServiceForm(handleCreate, creating, false)}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editService} onOpenChange={(o) => { if (!o) setEditService(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
              <DialogDescription>Update details for {editService?.name}.</DialogDescription>
            </DialogHeader>
            {renderServiceForm(handleUpdate, updating, true)}
          </DialogContent>
        </Dialog>

        {/* Per-service Analytics */}
        <ServiceAnalyticsDialog
          service={analyticsService}
          onOpenChange={(o) => { if (!o) setAnalyticsService(null); }}
        />

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
                {deleting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Services;
