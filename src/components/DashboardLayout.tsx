import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { useMutation } from "@apollo/client/react";
import { LOGOUT_MUTATION } from "@/graphql/mutations/auth";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const getNavItems = (userRole?: string) => [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/memberships", label: "Members", icon: UserCog },
  ...(userRole === "SUPER_ADMIN"
    ? [{ to: "/users", label: "Users", icon: UserSquare2 }]
    : []),
  { to: "/departments", label: "Departments", icon: Building2 },
  { to: "/positions", label: "Positions", icon: Briefcase },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/invites", label: "Invites", icon: Mail },
  { to: "/profile", label: "My Profile", icon: UserCircle },
  { to: "/applications", label: "Applications", icon: ClipboardList },
  ...(userRole === "SUPER_ADMIN"
    ? [
        { to: "/organizations", label: "Organizations", icon: Shield },
        { to: "/services", label: "Services", icon: Server },
        { to: "/analytics", label: "Analytics", icon: BarChart3 },
      ]
    : []),
];

export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout: clearAuth } = useAuthStore();
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  const handleLogout = async () => {
    try {
      await logoutMutation();
    } catch {
      // proceed even if server logout fails
    }
    clearAuth();
    navigate("/login");
  };

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
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gold-gradient">
            <span className="text-sm font-bold text-primary-foreground">G</span>
          </div>
          <span className="text-lg font-bold text-foreground">
            Godevelopers
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-4">
          {getNavItems(user?.systemRole).map((item) => {
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
                <item.icon className="h-5 w-5" />
                {item.label}
                {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="border-t border-border p-4">
          <div className="mb-3 truncate text-sm text-muted-foreground">
            {user?.email}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
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
            {getNavItems(user?.systemRole).find((n) =>
              location.pathname.startsWith(n.to),
            )?.label || "Dashboard"}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
};
