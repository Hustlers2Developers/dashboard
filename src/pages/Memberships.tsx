import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GET_ALL_ORGANIZATIONS } from "@/graphql/mutations/organizations";
import {
  CREATE_MEMBERSHIP,
  GET_ALL_USERS,
  GET_MEMBERSHIPS,
  GET_ORG_ROLES,
  REMOVE_MEMBER,
  UPDATE_MEMBER_ROLE,
} from "@/graphql/mutations/memberships";
import { Organization } from "@/graphql/graphql";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
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
import { toast } from "sonner";
import {
  BadgeCheck,
  Building2,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

type MembershipRecord = {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  joinedAt: string;
  isActive: boolean;
};

type OrgRole = {
  id: string;
  name: string;
  description?: string | null;
  isSystemRole: boolean;
  createdAt: string;
};

type AppUser = {
  id: string;
  name?: string | null;
  email: string;
  systemRole: string;
  createdAt: string;
  updatedAt: string;
};

function parseDate(value?: string | null) {
  if (!value) return null;
  if (/^\d+$/.test(value)) return new Date(parseInt(value, 10));
  return new Date(value);
}

function formatDate(value?: string | null) {
  const date = parseDate(value);
  if (!date || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const Memberships = () => {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.systemRole === "SUPER_ADMIN";
  const defaultOrgId = user?.orgId || "";

  const [selectedOrgId, setSelectedOrgId] = useState(defaultOrgId);
  const [userFilter, setUserFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [editingMembership, setEditingMembership] = useState<MembershipRecord | null>(null);
  const [editingRoleId, setEditingRoleId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<MembershipRecord | null>(null);

  useEffect(() => {
    if (!selectedOrgId && defaultOrgId) {
      setSelectedOrgId(defaultOrgId);
    }
  }, [defaultOrgId, selectedOrgId]);

  const {
    data: organizationsData,
    loading: loadingOrganizations,
  } = useQuery<{ organizations?: Organization[] }>(GET_ALL_ORGANIZATIONS, {
    skip: !isSuperAdmin,
  });

  const organizations = useMemo(
    () => (organizationsData?.organizations ?? []).filter(Boolean) as Organization[],
    [organizationsData],
  );

  useEffect(() => {
    if (isSuperAdmin && !selectedOrgId && organizations.length > 0) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [isSuperAdmin, organizations, selectedOrgId]);

  const {
    data: membershipsData,
    loading: loadingMemberships,
    error: membershipsError,
    refetch: refetchMemberships,
  } = useQuery<{ memberships: MembershipRecord[] }>(GET_MEMBERSHIPS, {
    variables: {
      organizationId: selectedOrgId || undefined,
      userId: undefined,
    },
    skip: !selectedOrgId,
    fetchPolicy: "network-only",
  });

  const {
    data: rolesData,
    loading: loadingRoles,
    error: rolesError,
    refetch: refetchRoles,
  } = useQuery<{ orgRoles: OrgRole[] }>(GET_ORG_ROLES, {
    variables: { organizationId: selectedOrgId },
    skip: !selectedOrgId,
  });

  const { data: usersData, loading: loadingUsers } = useQuery<{ getAllUsers: AppUser[] }>(
    GET_ALL_USERS,
    {
      skip: !isSuperAdmin,
    },
  );

  const [createMembership, { loading: creatingMembership }] = useMutation(CREATE_MEMBERSHIP);
  const [updateMemberRole, { loading: updatingRole }] = useMutation(UPDATE_MEMBER_ROLE);
  const [removeMember, { loading: removingMember }] = useMutation(REMOVE_MEMBER);

  const memberships = useMemo(
    () => membershipsData?.memberships ?? [],
    [membershipsData],
  );
  const roles = useMemo(() => rolesData?.orgRoles ?? [], [rolesData]);
  const users = useMemo(() => usersData?.getAllUsers ?? [], [usersData]);

  const alreadyMemberIds = useMemo(
    () => new Set(memberships.filter((m) => m.isActive).map((m) => m.userId)),
    [memberships],
  );

  const availableUsers = useMemo(
    () => users.filter((u) => !alreadyMemberIds.has(u.id)),
    [users, alreadyMemberIds],
  );

  const usersById = useMemo(
    () =>
      users.reduce<Record<string, AppUser>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [users],
  );

  const rolesById = useMemo(
    () =>
      roles.reduce<Record<string, OrgRole>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [roles],
  );

  const filteredMemberships = useMemo(() => {
    const query = userFilter.trim().toLowerCase();
    if (!query) return memberships;

    return memberships.filter((membership) => {
      const member = usersById[membership.userId];
      const role = rolesById[membership.roleId];
      const haystack = [
        membership.userId,
        member?.name,
        member?.email,
        role?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [memberships, rolesById, userFilter, usersById]);

  const activeMembersCount = memberships.filter((membership) => membership.isActive).length;
  const inactiveMembersCount = memberships.length - activeMembersCount;

  const resetCreateForm = () => {
    setSelectedUserId("");
    setSelectedRoleId("");
    setCreateOpen(false);
  };

  const handleCreateMembership = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedOrgId || !selectedUserId || !selectedRoleId) {
      toast.error("Select an organization, user, and role before saving.");
      return;
    }

    try {
      await createMembership({
        variables: {
          input: {
            userId: selectedUserId,
            organizationId: selectedOrgId,
            roleId: selectedRoleId,
          },
        },
      });

      toast.success("Member added successfully.");
      resetCreateForm();
      refetchMemberships();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add member.");
    }
  };

  const openRoleDialog = (membership: MembershipRecord) => {
    setEditingMembership(membership);
    setEditingRoleId(membership.roleId);
    setRoleDialogOpen(true);
  };

  const closeRoleDialog = () => {
    setEditingMembership(null);
    setEditingRoleId("");
    setRoleDialogOpen(false);
  };

  const handleUpdateRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingMembership || !editingRoleId) return;

    try {
      await updateMemberRole({
        variables: {
          input: {
            userId: editingMembership.userId,
            organizationId: editingMembership.organizationId,
            roleId: editingRoleId,
          },
        },
      });

      toast.success("Member role updated.");
      closeRoleDialog();
      refetchMemberships();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update member role.");
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    try {
      await removeMember({
        variables: {
          input: {
            userId: removeTarget.userId,
            organizationId: removeTarget.organizationId,
          },
        },
      });

      toast.success("Member removed successfully.");
      setRemoveTarget(null);
      refetchMemberships();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove member.");
    }
  };

  const selectedOrganizationName =
    organizations.find((organization) => organization.id === selectedOrgId)?.name || "your organization";

  const canCreateMembership = isSuperAdmin;
  const showDataAccessError = membershipsError || rolesError;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Members</h2>
                <p className="text-muted-foreground">
                  Manage organization membership, roles, and access from one place.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {isSuperAdmin ? (
              <div className="min-w-[240px] space-y-2">
                <Label>Organization</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingOrganizations ? "Loading organizations..." : "Select organization"} />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((organization) => (
                      <SelectItem key={organization.id} value={organization.id}>
                        {organization.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {canCreateMembership ? (
              <Dialog
                open={createOpen}
                onOpenChange={(open) => {
                  setCreateOpen(open);
                  if (!open) {
                    setSelectedUserId("");
                    setSelectedRoleId("");
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button className="mt-auto gold-gradient text-primary-foreground hover:opacity-90">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add member to {selectedOrganizationName}</DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleCreateMembership} className="space-y-4">
                    <div className="space-y-2">
                      <Label>User</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select user"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              All platform users are already members.
                            </div>
                          ) : (
                            availableUsers.map((appUser) => (
                              <SelectItem key={appUser.id} value={appUser.id}>
                                {appUser.name ? `${appUser.name} (${appUser.email})` : appUser.email}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select role"} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <LoadingButton
                      type="submit"
                      className="w-full gold-gradient text-primary-foreground"
                      loading={creatingMembership}
                      loadingText="Adding member..."
                      disabled={!selectedOrgId || loadingRoles || loadingUsers}
                    >
                      Add Member
                    </LoadingButton>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total members</p>
                <p className="text-2xl font-semibold text-foreground">{memberships.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active memberships</p>
                <p className="text-2xl font-semibold text-foreground">{activeMembersCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available roles</p>
                <p className="text-2xl font-semibold text-foreground">{roles.length}</p>
                <p className="text-xs text-muted-foreground">{inactiveMembersCount} inactive membership(s)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card className="border-border">
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Organization members</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Review assigned roles, joined dates, and current access state.
                  </p>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={userFilter}
                    onChange={(event) => setUserFilter(event.target.value)}
                    placeholder="Search by user, email, or role"
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {!selectedOrgId ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center">
                  <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="font-medium text-foreground">Choose an organization to continue</p>
                  <p className="text-sm text-muted-foreground">
                    Select an organization to load its members and available roles.
                  </p>
                </div>
              ) : loadingMemberships || loadingRoles ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : showDataAccessError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                  <p className="font-medium text-foreground">We couldn&apos;t load membership data.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {membershipsError?.message || rolesError?.message || "Please verify your permissions and try again."}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      refetchMemberships();
                      refetchRoles();
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : filteredMemberships.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="font-medium text-foreground">No members found</p>
                  <p className="text-sm text-muted-foreground">
                    {memberships.length === 0
                      ? "This organization does not have any memberships yet."
                      : "No members match your current search."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMemberships.map((membership) => {
                      const member = usersById[membership.userId];
                      const role = rolesById[membership.roleId];

                      return (
                        <TableRow key={membership.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {member?.name || "Unnamed user"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {member?.email || membership.userId}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{role?.name || membership.roleId}</p>
                              <p className="text-xs text-muted-foreground">
                                {role?.description || "Role description unavailable"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={membership.isActive ? "default" : "secondary"}>
                              {membership.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(membership.joinedAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRoleDialog(membership)}
                                disabled={loadingRoles}
                              >
                                Change role
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setRemoveTarget(membership)}
                                disabled={removingMember}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Role catalog</CardTitle>
              <p className="text-sm text-muted-foreground">
                Roles available in {selectedOrganizationName} for invites and member assignment.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedOrgId ? (
                <p className="text-sm text-muted-foreground">
                  Select an organization to load its role catalog.
                </p>
              ) : loadingRoles ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : roles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No roles were returned for this organization.
                </div>
              ) : (
                roles.map((role) => (
                  <div key={role.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{role.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {role.description || "No description provided for this role."}
                        </p>
                      </div>
                      {role.isSystemRole ? <Badge variant="secondary">System</Badge> : null}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Created {formatDate(role.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={roleDialogOpen} onOpenChange={(open) => (open ? setRoleDialogOpen(true) : closeRoleDialog())}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update member role</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div className="space-y-2">
                <Label>Member</Label>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                  {editingMembership
                    ? usersById[editingMembership.userId]?.name ||
                      usersById[editingMembership.userId]?.email ||
                      editingMembership.userId
                    : "No member selected"}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editingRoleId} onValueChange={setEditingRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <LoadingButton
                type="submit"
                className="w-full gold-gradient text-primary-foreground"
                loading={updatingRole}
                loadingText="Updating role..."
                disabled={!editingMembership || !editingRoleId}
              >
                Save Role
              </LoadingButton>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removeTarget ? (usersById[removeTarget.userId]?.name || usersById[removeTarget.userId]?.email || removeTarget.userId) : ""}</strong> ko is organization se remove kar diya jayega.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleRemoveMember()}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Memberships;
