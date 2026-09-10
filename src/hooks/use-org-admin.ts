import { useQuery } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { MY_ORG_ROLE } from "@/graphql/mutations/memberships";

type MyOrgRoleData = {
  myOrgRole?: { roleId: string; roleName: string; isSystemRole: boolean } | null;
};

/**
 * Org-management pages (Departments, Positions) are open to SUPER_ADMIN and
 * to a user whose own membership role in the org is literally named "Admin"
 * (case-insensitive — role names are free-text per-organization data, see
 * schema `Role.name` / `UserOrgRole.roleName`, not a platform-wide enum like
 * systemRole). Falls back to SUPER_ADMIN-only while the org role is loading
 * or unavailable, rather than briefly granting access.
 */
export function useIsOrgAdmin(organizationId?: string | null) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.systemRole === "SUPER_ADMIN";

  const { data, loading } = useQuery<MyOrgRoleData>(MY_ORG_ROLE, {
    variables: { organizationId },
    skip: !organizationId || isSuperAdmin,
    fetchPolicy: "cache-first",
  });

  const isOrgAdmin = isSuperAdmin || data?.myOrgRole?.roleName?.toLowerCase() === "admin";

  return { isOrgAdmin, isSuperAdmin, loading: !isSuperAdmin && loading };
}
