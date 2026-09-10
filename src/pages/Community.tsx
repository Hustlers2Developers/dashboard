import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users2, Search, Mail, MessageCircle, ArrowUpRight } from "lucide-react";

type CommunityUser = {
  id: string;
  email: string;
  name?: string | null;
  systemRole: string;
  createdAt: string;
};

const SLACK_INVITE_URL =
  "https://join.slack.com/t/teamhustlersworld/shared_invite/zt-3lihulkj7-2gCwffDBf5tGc1Zpus_NZw";

const initials = (name?: string | null, email?: string) => {
  const base = name?.trim() || email || "";
  return (
    base
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
};

// Deterministic accent color per person, purely cosmetic — keeps avatar
// initials from looking identical across the whole grid.
const AVATAR_COLORS = [
  "bg-primary/10 text-primary",
  "bg-accent/15 text-accent",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
];
const colorFor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const Community = () => {
  const orgId = useAuthStore((s) => s.user?.orgId) || "";
  const [search, setSearch] = useState("");

  const { data, loading, error } = useQuery<{ getAllUsers: CommunityUser[] }>(GET_ALL_USERS, {
    variables: { orgId },
    skip: !orgId,
    fetchPolicy: "cache-first",
  });

  const members = useMemo(() => {
    const all = data?.getAllUsers ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (m) => m.name?.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Users2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Community</h2>
              <p className="text-muted-foreground">
                Meet the developers building alongside you.
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Slack CTA */}
        <a
          href={SLACK_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group premium-card block bg-gradient-to-br from-[#4A154B]/10 via-card to-card p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#4A154B]/10 transition-transform group-hover:scale-105">
                <MessageCircle className="h-6 w-6 text-[#4A154B] dark:text-[#ECB22E]" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Join us on Slack</p>
                <p className="text-sm text-muted-foreground">
                  Team Hustlers World — the real-time home for questions, updates, and community chatter.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#4A154B] px-4 py-2 text-sm font-medium text-white transition-transform group-hover:translate-x-0.5">
              Join workspace
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </a>

        {/* Directory */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-border">
                <CardContent className="flex items-center gap-3 p-5">
                  <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                  <div className="w-full space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-border">
            <CardContent className="p-6 text-sm text-destructive">{error.message}</CardContent>
          </Card>
        ) : members.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {search ? "No developers match your search." : "No community members yet."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <div key={member.id} className="premium-card flex items-center gap-3 p-5">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colorFor(member.id)}`}
                >
                  {initials(member.name, member.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {member.name || "Unnamed developer"}
                  </p>
                  <a
                    href={`mailto:${member.email}`}
                    className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-accent hover:underline"
                  >
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Showing name and email for every member.{" "}
          <a
            href="/profile"
            className="text-accent hover:underline"
          >
            Add your LinkedIn or GitHub to your profile
          </a>{" "}
          — a public directory view is on the way.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Community;
