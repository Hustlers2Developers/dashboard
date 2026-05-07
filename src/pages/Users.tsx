import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { GET_ALL_ORGANIZATIONS } from "@/graphql/mutations/organizations";
import {
  CREATE_MEMBERSHIP,
  GET_MEMBERSHIPS,
  GET_ORG_ROLES,
} from "@/graphql/mutations/memberships";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  AlertCircle,
  Search,
  ShieldCheck,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";

type AppUser = {
  id: string;
  email: string;
  name?: string | null;
  systemRole: "SUPER_ADMIN" | "USER";
  createdAt: string;
  updatedAt: string;
};

type Membership = {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  joinedAt: string;
  isActive: boolean;
};

type Organization = { id: string; name: string; slug?: string };

type OrgRole = {
  id: string;
  name: string;
  description?: string | null;
  isSystemRole: boolean;
};

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = /^\d+$/.test(value) ? new Date(parseInt(value, 10)) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value?: string | null) => {
  const d = parseDate(value);
  return d
    ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—";
};

const initials = (user: AppUser) => {
  const base = user.name?.trim() || user.email;
  return base
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";
};

const Users = () => {
  const me = useAuthStore((s) => s.user);
  const isSuperAdmin = me?.systemRole === "SUPER_ADMIN";

  const [search, setSearch] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);
  const [assignOrgId, setAssignOrgId] = useState<string>(me?.orgId || "");
  const [assignRoleId, setAssignRoleId] = useState<string>("");

  const {
    data: usersData,
    loading: loadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery<{ getAllUsers: AppUser[] }>(GET_ALL_USERS, {
    fetchPolicy: "cache-and-network",
  });

  const { data: orgsData, loading: loadingOrgs } = useQuery<{
    organizations?: Organization[];
  }>(GET_ALL_ORGANIZATIONS, { skip: !isSuperAdmin });

  const {
    data: membershipsData,
    loading: loadingMemberships,
    refetch: refetchMemberships,
  } = useQuery<{ memberships: Membership[] }>(GET_MEMBERSHIPS, {
    variables: { organizationId: me?.orgId },
    skip: !me?.orgId,
    fetchPolicy: "cache-and-network",
  });

  const { data: rolesData, loading: loadingRoles, error: rolesError } = useQuery<{
    orgRoles: OrgRole[];
  }>(GET_ORG_ROLES, {
    variables: { organizationId: assignOrgId },
    skip: !assignOpen || !assignOrgId,
  });

  const [createMembership, { loading: creatingMembership }] =
    useMutation(CREATE_MEMBERSHIP);

  const users = useMemo(() => usersData?.getAllUsers ?? [], [usersData]);
  const organizations = useMemo(
    () => (orgsData?.organizations ?? []).filter(Boolean) as Organization[],
    [orgsData],
  );
  const memberships = useMemo(
    () => membershipsData?.memberships ?? [],
    [membershipsData],
  );
  const roles = useMemo(() => rolesData?.orgRoles ?? [], [rolesData]);

  const membershipsByUser = useMemo(() => {
    const map = new Map<string, Membership[]>();
    memberships.forEach((m) => {
      const list = map.get(m.userId) ?? [];
      list.push(m);
      map.set(m.userId, list);
    });
    return map;
  }, [memberships]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.id, u.systemRole]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [users, search]);

  useEffect(() => {
    if (assignOpen && !assignOrgId && me?.orgId) setAssignOrgId(me.orgId);
  }, [assignOpen, assignOrgId, me?.orgId]);

  const openAssign = (user: AppUser) => {
    setActiveUser(user);
    setAssignOrgId(me?.orgId || "");
    setAssignRoleId("");
    setAssignOpen(true);
  };

  const closeAssign = () => {
    setAssignOpen(false);
    setActiveUser(null);
    setAssignRoleId("");
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || !assignOrgId || !assignRoleId) {
      toast.error("Pick an organization and role to continue.");
      return;
    }

    const alreadyMember = (membershipsByUser.get(activeUser.id) ?? []).some(
      (m) => m.organizationId === assignOrgId,
    );
    if (alreadyMember) {
      toast.error("This user is already a member of the selected organization.");
      return;
    }

    try {
      await createMembership({
        variables: {
          input: {
            userId: activeUser.id,
            organizationId: assignOrgId,
            roleId: assignRoleId,
          },
        },
      });
      toast.success(`${activeUser.name || activeUser.email} added to organization.`);
      closeAssign();
      await refetchMemberships();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add member.";
      toast.error(message);
    }
  };

  const totalSuperAdmins = users.filter((u) => u.systemRole === "SUPER_ADMIN").length;
  const orphanUsers = users.filter(
    (u) => (membershipsByUser.get(u.id) ?? []).length === 0,
  ).length;

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <Card className="border-border">
          <CardContent className="flex items-start gap-3 p-6">
            <AlertCircle className="mt-1 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-foreground">Restricted area</p>
              <p className="text-sm text-muted-foreground">
                Only SUPER_ADMIN accounts can view the platform user directory.
              </p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <UsersIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Users</h2>
              <p className="text-muted-foreground">
                Every account registered on the platform — including new signups.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetchUsers()} disabled={loadingUsers}>
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <UsersIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total users</p>
                <p className="text-2xl font-semibold text-foreground">{users.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Super admins</p>
                <p className="text-2xl font-semibold text-foreground">{totalSuperAdmins}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                <UserPlus className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Awaiting org assignment</p>
                <p className="text-2xl font-semibold text-foreground">{orphanUsers}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle>All registered users</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or role"
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : usersError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                <p className="font-medium text-foreground">Couldn&apos;t load users</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {usersError.message}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => refetchUsers()}>
                  Retry
                </Button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <UsersIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium text-foreground">No users match</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>System role</TableHead>
                    <TableHead>Memberships in your org</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const userMemberships = membershipsByUser.get(user.id) ?? [];
                    const inMyOrg = userMemberships.some(
                      (m) => m.organizationId === me?.orgId,
                    );
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {initials(user)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {user.name || "Unnamed user"}
                              </p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.systemRole === "SUPER_ADMIN" ? "default" : "secondary"}
                          >
                            {user.systemRole}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {loadingMemberships ? (
                            <Skeleton className="h-5 w-24" />
                          ) : inMyOrg ? (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">
                              Member
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                              Not a member
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openAssign(user)}
                                  disabled={user.id === me?.sub}
                                >
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Add to org
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {user.id === me?.sub ? (
                              <TooltipContent>You can&apos;t reassign yourself.</TooltipContent>
                            ) : null}
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={assignOpen} onOpenChange={(o) => (o ? setAssignOpen(true) : closeAssign())}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add user to an organization</DialogTitle>
              <DialogDescription>
                {activeUser
                  ? `Grant ${activeUser.name || activeUser.email} access by assigning a role.`
                  : ""}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAssign} className="space-y-4">
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select value={assignOrgId} onValueChange={setAssignOrgId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingOrgs ? "Loading..." : "Select organization"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={assignRoleId}
                  onValueChange={setAssignRoleId}
                  disabled={!assignOrgId || loadingRoles}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !assignOrgId
                          ? "Pick an organization first"
                          : loadingRoles
                            ? "Loading roles..."
                            : "Select role"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rolesError ? (
                  <p className="text-xs text-destructive">{rolesError.message}</p>
                ) : null}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeAssign}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="gold-gradient text-primary-foreground"
                  disabled={creatingMembership || !assignOrgId || !assignRoleId}
                >
                  {creatingMembership ? "Adding..." : "Add member"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Users;
