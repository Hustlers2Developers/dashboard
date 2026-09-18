import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { useIsOrgAdmin } from "@/hooks/use-org-admin";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Mail,
  Building2,
  Briefcase,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  CalendarCheck,
  UserCog,
  UserSquare2,
  UserCircle,
  Server,
  ClipboardList,
  BarChart3,
  ChevronDown,
  Users2,
  Compass,
  Flame,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";

// Admin/Super Admin manage the organization's structure and membership
// pipeline — Departments, Positions, Organizations, Invites, Applications,
// Attendance, and Analytics are all admin-facing tools that a regular member
// has no real use for and shouldn't see cluttering their nav. Members get a
// simpler, personal-progress-focused sidebar instead (Streak in place of
// the admin-only Attendance report).
const getNavItems = (userRole?: string, isOrgAdmin?: boolean) => {
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  // Users/Departments/Positions allow org-role "Admin" alongside
  // SUPER_ADMIN (see useIsOrgAdmin); Attendance/Invites/Applications/
  // Organizations/Services/Analytics stay SUPER_ADMIN-only both here and at
  // the route level (ProtectedRoute adminOnly) — don't show a nav link a
  // user would immediately bounce off of.
  const canManageOrgStructure = isSuperAdmin || isOrgAdmin;

  return [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects", label: "Projects", icon: FolderKanban },
    { to: "/teams", label: "Teams", icon: Users },
    { to: "/memberships", label: "Members", icon: UserCog },
    ...(canManageOrgStructure
      ? [
          { to: "/users", label: "Users", icon: UserSquare2 },
          { to: "/departments", label: "Departments", icon: Building2 },
          { to: "/positions", label: "Positions", icon: Briefcase },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          { to: "/attendance", label: "Attendance", icon: CalendarCheck },
          { to: "/invites", label: "Invites", icon: Mail },
        ]
      : []),
    ...(!isSuperAdmin ? [{ to: "/streak", label: "Streak", icon: Flame }] : []),
    { to: "/journey", label: "Journey", icon: Compass },
    { to: "/community", label: "Community", icon: Users2 },
    { to: "/referral", label: "Referral", icon: UserPlus },
    { to: "/profile", label: "My Profile", icon: UserCircle },
    ...(isSuperAdmin
      ? [
          { to: "/applications", label: "Applications", icon: ClipboardList },
          { to: "/organizations", label: "Organizations", icon: Shield },
          { to: "/services", label: "Services", icon: Server },
          { to: "/analytics", label: "Analytics", icon: BarChart3 },
          { to: "/system-status", label: "System Status", icon: ShieldCheck },
        ]
      : []),
  ];
};

export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  // cache-first under the hood (see useIsOrgAdmin), so this only ever hits
  // the network once per session despite DashboardLayout rendering on every
  // page — not a per-navigation cost.
  const { isOrgAdmin } = useIsOrgAdmin(user?.orgId);
  const navItems = getNavItems(user?.systemRole, isOrgAdmin);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Email initials for avatar — shown as soon as isAuthenticated, even before user loads
  const initials = isAuthenticated
    ? (user?.email ?? "?").slice(0, 2).toUpperCase()
    : null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gold-gradient">
            <span className="text-sm font-bold text-primary-foreground">G</span>
          </div>
          <span className="truncate text-lg font-bold text-foreground">
            Godevelopers
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto shrink-0 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav — scrolls independently so a long item list (SUPER_ADMIN sees
            up to 16 links) never pushes the Logout section below the
            viewport; the aside itself doesn't scroll. */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
                {isActive && <ChevronRight className="ml-auto h-4 w-4 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout — shrink-0 so it always stays pinned to the
            bottom of the sidebar and is never squeezed out or clipped. */}
        <div className="shrink-0 border-t border-border p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="truncate text-sm text-muted-foreground">{user?.email}</span>
            {user?.systemRole && (
              <Badge
                variant={user.systemRole === "SUPER_ADMIN" ? "default" : "secondary"}
                className="shrink-0 text-[10px]"
              >
                {user.systemRole === "SUPER_ADMIN" ? "Super Admin" : "Member"}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">
            {navItems.find((n) =>
              location.pathname.startsWith(n.to),
            )?.label || "Dashboard"}
          </h1>

          {/* User profile — right side */}
          {isAuthenticated && (
            <div className="ml-auto flex items-center gap-1">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full gold-gradient text-xs font-bold text-primary-foreground">
                      {initials}
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <span className="truncate text-sm font-medium">{user?.email ?? "Loading..."}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <UserCircle className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
};
