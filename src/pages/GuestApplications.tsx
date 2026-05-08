import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  GET_GUEST_APPLICATIONS,
  APPROVE_GUEST_APPLICATION,
  REJECT_GUEST_APPLICATION,
} from "@/graphql/mutations/guest-applications";
import { GET_ALL_ORGANIZATIONS } from "@/graphql/mutations/organizations";
import { GET_ORG_ROLES } from "@/graphql/mutations/memberships";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle,
  ClipboardList,
  ExternalLink,
  Github,
  Globe,
  Phone,
  XCircle,
} from "lucide-react";

type GuestApplication = {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  githubUsername?: string | null;
  portfolioUrl?: string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  inviteId?: string | null;
  createdAt: string;
};

type Organization = { id: string; name: string };
type OrgRole = { id: string; name: string };

const statusConfig = {
  PENDING: { label: "Pending", variant: "secondary" as const, icon: ClipboardList },
  APPROVED: { label: "Approved", variant: "default" as const, icon: CheckCircle },
  REJECTED: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
};

const formatDate = (val?: string | null) => {
  if (!val) return "—";
  const d = new Date(/^\d+$/.test(val) ? parseInt(val, 10) : val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const GuestApplications = () => {
  const me = useAuthStore((s) => s.user);
  const isSuperAdmin = me?.systemRole === "SUPER_ADMIN";

  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [approveApp, setApproveApp] = useState<GuestApplication | null>(null);
  const [rejectApp, setRejectApp] = useState<GuestApplication | null>(null);
  const [detailApp, setDetailApp] = useState<GuestApplication | null>(null);
  const [approveOrgId, setApproveOrgId] = useState<string>(me?.orgId || "");
  const [approveRoleId, setApproveRoleId] = useState<string>("");

  const { data, loading, error, refetch } = useQuery<{ guestApplications: GuestApplication[] }>(
    GET_GUEST_APPLICATIONS,
    {
      variables: { status: statusFilter === "ALL" ? undefined : statusFilter },
      fetchPolicy: "cache-and-network",
    },
  );

  const { data: orgsData } = useQuery<{ organizations?: Organization[] }>(
    GET_ALL_ORGANIZATIONS,
    { skip: !isSuperAdmin },
  );

  const { data: rolesData, loading: loadingRoles } = useQuery<{ orgRoles: OrgRole[] }>(
    GET_ORG_ROLES,
    { variables: { organizationId: approveOrgId }, skip: !approveApp || !approveOrgId },
  );

  const [approveApplication, { loading: approving }] = useMutation(APPROVE_GUEST_APPLICATION);
  const [rejectApplication, { loading: rejecting }] = useMutation(REJECT_GUEST_APPLICATION);

  const applications = data?.guestApplications ?? [];
  const organizations = orgsData?.organizations ?? [];
  const roles = rolesData?.orgRoles ?? [];

  const openApprove = (app: GuestApplication) => {
    setApproveOrgId(me?.orgId || "");
    setApproveRoleId("");
    setApproveApp(app);
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveApp || !approveOrgId) { toast.error("Select an organization."); return; }
    try {
      await approveApplication({
        variables: {
          id: approveApp.id,
          organizationId: approveOrgId,
          roleId: approveRoleId || undefined,
        },
      });
      toast.success(`Application approved. Invite sent to ${approveApp.email}.`);
      setApproveApp(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve application.");
    }
  };

  const handleReject = async () => {
    if (!rejectApp) return;
    try {
      await rejectApplication({ variables: { id: rejectApp.id } });
      toast.success("Application rejected.");
      setRejectApp(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reject application.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Guest Applications</h2>
              <p className="text-muted-foreground">Review and approve join requests.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void refetch()} disabled={loading}>
            Refresh
          </Button>
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>

          {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
              ) : error ? (
                <Card className="border-border">
                  <CardContent className="flex items-start gap-3 p-6">
                    <AlertCircle className="mt-1 h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-foreground">Could not load applications</p>
                      <p className="text-sm text-muted-foreground">{error.message}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : applications.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="p-10 text-center">
                    <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="font-medium text-foreground">No applications</p>
                    <p className="text-sm text-muted-foreground">
                      {tab === "PENDING" ? "No pending applications at the moment." : `No ${tab.toLowerCase()} applications.`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => {
                    const cfg = statusConfig[app.status];
                    return (
                      <Card key={app.id} className="border-border">
                        <CardContent className="p-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-foreground">{app.name}</p>
                                <Badge variant={cfg.variant}>{cfg.label}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{app.email}</p>
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                {app.phoneNumber && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />{app.phoneNumber}
                                  </span>
                                )}
                                {app.githubUsername && (
                                  <span className="flex items-center gap-1">
                                    <Github className="h-3 w-3" />{app.githubUsername}
                                  </span>
                                )}
                                {app.portfolioUrl && (
                                  <a href={app.portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline hover:text-foreground">
                                    <Globe className="h-3 w-3" />Portfolio
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">Applied {formatDate(app.createdAt)}</p>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => setDetailApp(app)}>
                                View
                              </Button>
                              {app.status === "PENDING" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="gold-gradient text-primary-foreground"
                                    onClick={() => openApprove(app)}
                                  >
                                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => setRejectApp(app)}
                                  >
                                    <XCircle className="mr-1.5 h-3.5 w-3.5" />Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={!!detailApp} onOpenChange={(o) => { if (!o) setDetailApp(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{detailApp?.name}</DialogTitle>
              <DialogDescription>{detailApp?.email}</DialogDescription>
            </DialogHeader>
            {detailApp && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  {detailApp.phoneNumber && (
                    <div><p className="font-medium text-muted-foreground">Phone</p><p>{detailApp.phoneNumber}</p></div>
                  )}
                  {detailApp.githubUsername && (
                    <div><p className="font-medium text-muted-foreground">GitHub</p><p>{detailApp.githubUsername}</p></div>
                  )}
                  {detailApp.portfolioUrl && (
                    <div className="sm:col-span-2">
                      <p className="font-medium text-muted-foreground">Portfolio</p>
                      <a href={detailApp.portfolioUrl} target="_blank" rel="noreferrer" className="underline text-primary">{detailApp.portfolioUrl}</a>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <p className="font-medium text-muted-foreground">Why they want to join</p>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{detailApp.reason}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Status</p>
                    <Badge variant={statusConfig[detailApp.status].variant}>{statusConfig[detailApp.status].label}</Badge>
                  </div>
                  {detailApp.reviewedAt && (
                    <div>
                      <p className="font-medium text-muted-foreground">Reviewed at</p>
                      <p>{formatDate(detailApp.reviewedAt)}</p>
                    </div>
                  )}
                </div>
                {detailApp.status === "PENDING" && (
                  <DialogFooter className="gap-2">
                    <Button
                      className="gold-gradient text-primary-foreground"
                      onClick={() => { setDetailApp(null); openApprove(detailApp); }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive"
                      onClick={() => { setDetailApp(null); setRejectApp(detailApp); }}
                    >
                      Reject
                    </Button>
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve Dialog */}
        <Dialog open={!!approveApp} onOpenChange={(o) => { if (!o) setApproveApp(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Application</DialogTitle>
              <DialogDescription>
                An invite will be sent to <strong>{approveApp?.email}</strong>. Pick the organization and role.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApprove} className="space-y-4">
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select value={approveOrgId} onValueChange={setApproveOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                    {!isSuperAdmin && me?.orgId && (
                      <SelectItem value={me.orgId}>My Organization</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role <span className="text-muted-foreground">(optional — defaults to Viewer)</span></Label>
                <Select value={approveRoleId} onValueChange={setApproveRoleId} disabled={!approveOrgId || loadingRoles}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingRoles ? "Loading..." : "Default role"} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setApproveApp(null)}>Cancel</Button>
                <Button type="submit" className="gold-gradient text-primary-foreground" disabled={approving || !approveOrgId}>
                  {approving ? "Approving..." : "Approve & Send Invite"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Reject Confirm */}
        <AlertDialog open={!!rejectApp} onOpenChange={(o) => { if (!o) setRejectApp(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject application?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{rejectApp?.name}</strong> ({rejectApp?.email}) will be notified that their application was not approved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void handleReject()}
                disabled={rejecting}
              >
                {rejecting ? "Rejecting..." : "Reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default GuestApplications;
