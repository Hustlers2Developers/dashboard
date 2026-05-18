import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GET_ANALYTICS_OVERVIEW } from "@/graphql/mutations/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Eye,
  Server,
  Users,
} from "lucide-react";

type Range = "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "ALL_TIME";

type PerService = {
  serviceId: string;
  serviceName: string;
  pageviews: number;
  uniqueVisitors: number;
  sessions: number;
  lastSeenAt: string | null;
};

type Overview = {
  totalPageviews: number;
  totalUniqueVisitors: number;
  totalSessions: number;
  activeServices: number;
  perService: PerService[];
};

const RANGES: { label: string; value: Range }[] = [
  { label: "Today", value: "TODAY" },
  { label: "7 days", value: "LAST_7_DAYS" },
  { label: "30 days", value: "LAST_30_DAYS" },
  { label: "All time", value: "ALL_TIME" },
];

const fmt = (n: number) => new Intl.NumberFormat().format(n);

const Analytics = () => {
  const [range, setRange] = useState<Range>("LAST_7_DAYS");
  const { data, loading, error, refetch } = useQuery<{
    analyticsOverview: Overview;
  }>(GET_ANALYTICS_OVERVIEW, {
    variables: { range },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const overview = data?.analyticsOverview;

  const stats = [
    {
      label: "Unique Visitors",
      value: overview ? fmt(overview.totalUniqueVisitors) : "—",
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Pageviews",
      value: overview ? fmt(overview.totalPageviews) : "—",
      icon: Eye,
      color: "text-accent",
    },
    {
      label: "Sessions",
      value: overview ? fmt(overview.totalSessions) : "—",
      icon: Activity,
      color: "text-saffron",
    },
    {
      label: "Active Services",
      value: overview ? fmt(overview.activeServices) : "—",
      icon: Server,
      color: "text-primary",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
            <p className="text-muted-foreground">
              Unique visitors and pageviews across all internal services.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGES.map((r) => (
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
        </div>

        {error && !overview && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-foreground">
                  Couldn't load analytics
                </p>
                <p className="text-muted-foreground">
                  {error.message}. Make sure the{" "}
                  <code className="rounded bg-muted px-1">analyticsOverview</code>{" "}
                  query is implemented on your GraphQL server.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </CardHeader>
              <CardContent>
                {loading && !overview ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {s.value}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="h-5 w-5 text-primary" />
              Per Service Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !overview ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !overview?.perService?.length ? (
              <p className="py-8 text-center text-muted-foreground">
                No analytics data yet. Embed the tracking script in your
                services to start collecting data.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Unique Visitors</TableHead>
                    <TableHead className="text-right">Pageviews</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.perService.map((row) => (
                    <TableRow key={row.serviceId}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-muted-foreground" />
                          {row.serviceName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(row.uniqueVisitors)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(row.pageviews)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(row.sessions)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.lastSeenAt ? (
                          new Date(row.lastSeenAt).toLocaleString()
                        ) : (
                          <Badge variant="outline">never</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              Tracking Script Snippet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Paste this in the <code className="rounded bg-muted px-1">&lt;head&gt;</code> of
              any internal service. Replace{" "}
              <code className="rounded bg-muted px-1">YOUR_SERVICE_API_KEY</code>{" "}
              with the key from the Services page.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
{`<script
  src="${window.location.origin}/track.js"
  data-api-key="YOUR_SERVICE_API_KEY"
  data-endpoint="https://api.godevelopers.online/analytics/collect"
  defer></script>`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
