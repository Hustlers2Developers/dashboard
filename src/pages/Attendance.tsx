import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import {
  MY_ATTENDANCE,
  MY_ATTENDANCE_SUMMARY,
  MY_ACTIVITIES,
  MY_STREAK,
  ATTENDANCE_BY_ORGANIZATION,
  CHECK_IN,
  CHECK_OUT,
  BULK_MARK_ATTENDANCE,
} from "@/graphql/mutations/attendance";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CalendarCheck,
  LogIn,
  LogOut,
  Flame,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  BarChart3,
  Zap,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function firstDayOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// Backend returns timestamps as epoch-ms strings (e.g. "1712345678000")
// and date-only fields as ISO strings (e.g. "2026-04-14").
// Parse accordingly so dates are never "Invalid Date".
function parseDate(ts: string | null | undefined): Date | null {
  if (!ts) return null;
  // Purely numeric → epoch milliseconds
  if (/^\d+$/.test(ts)) return new Date(parseInt(ts, 10));
  return new Date(ts);
}

function formatTime(ts: string | null | undefined) {
  const d = parseDate(ts);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string | null | undefined) {
  const d = parseDate(ts);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "PRESENT")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
        <CheckCircle2 className="h-3 w-3" /> Present
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
      <XCircle className="h-3 w-3" /> Absent
    </span>
  );
}

// ─── Activity type label ──────────────────────────────────────────────────────

const activityLabels: Record<string, string> = {
  LOGIN: "Logged in",
  TASK_UPDATE: "Updated a task",
  MEETING_ATTENDED: "Attended a meeting",
  PROJECT_CONTRIBUTION: "Contributed to a project",
};

type AttendanceRow = {
  id: string;
  userId: string;
  date: string;
  status: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Attendance = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const isAdmin = user?.systemRole === "SUPER_ADMIN";

  const [tab, setTab] = useState<"my" | "team">("my");

  // Date range for my attendance
  const [startDate, setStartDate] = useState(firstDayOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());

  // ── My Attendance Queries ──
  type AttendanceSummary = { totalDays: number; presentDays: number; attendancePercentage: number };
  type MyAttendanceRecord = { id: string; date: string; status: string; checkInTime?: string | null; checkOutTime?: string | null };
  type Streak = { currentStreak: number; longestStreak: number; freezesAvailable: number; lastActivityDate?: string | null };
  type ActivityRecord = { id: string; activityType: string; createdAt: string };

  const { data: summaryData, loading: summaryLoading, refetch: refetchSummary } = useQuery<{ myAttendanceSummary: AttendanceSummary }>(
    MY_ATTENDANCE_SUMMARY,
    { skip: !orgId }
  );

  const { data: attendanceData, loading: attendanceLoading, refetch: refetchAttendance } = useQuery<{ myAttendance: MyAttendanceRecord[] }>(
    MY_ATTENDANCE,
    { variables: { startDate, endDate }, skip: !orgId }
  );

  const { data: streakData, loading: streakLoading } = useQuery<{ myStreak: Streak }>(MY_STREAK, {
    skip: !orgId,
  });

  const { data: activitiesData, loading: activitiesLoading } = useQuery<{ myActivities: ActivityRecord[] }>(
    MY_ACTIVITIES,
    { variables: { limit: 20 }, skip: !orgId }
  );

  // ── Admin: Org Attendance ──
  const [orgStartDate, setOrgStartDate] = useState(firstDayOfMonthISO());
  const [orgEndDate, setOrgEndDate] = useState(todayISO());

  const { data: orgAttendanceData, loading: orgAttendanceLoading, refetch: refetchOrgAttendance } =
    useQuery<{ attendanceByOrganization: AttendanceRow[] }>(ATTENDANCE_BY_ORGANIZATION, {
      variables: {
        input: { organizationId: orgId, startDate: orgStartDate, endDate: orgEndDate },
      },
      skip: !orgId || !isAdmin,
    });

  // ── Check-in / Check-out ──
  const [checkIn, { loading: checkingIn }] = useMutation(CHECK_IN);
  const [checkOut, { loading: checkingOut }] = useMutation(CHECK_OUT);

  // ── Bulk mark attendance ──
  const [bulkDate, setBulkDate] = useState(todayISO());
  // userId -> status map for bulk form
  const [bulkStatus, setBulkStatus] = useState<Record<string, "PRESENT" | "ABSENT">>({});
  type BulkMarkResult = { successCount: number; failedCount: number; errors: string[] };
  const [bulkMarkAttendance, { loading: bulkLoading }] = useMutation<{ bulkMarkAttendance: BulkMarkResult }>(BULK_MARK_ATTENDANCE);

  const handleCheckIn = async () => {
    try {
      await checkIn({ variables: { organizationId: orgId } });
      toast.success("Checked in successfully!");
      refetchSummary();
      refetchAttendance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed.");
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut();
      toast.success("Checked out successfully!");
      refetchSummary();
      refetchAttendance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-out failed.");
    }
  };

  // Build bulk attendances array from unique userIds in org attendance
  const orgAttendanceRows: AttendanceRow[] = orgAttendanceData?.attendanceByOrganization ?? [];

  // Unique users from org attendance for the bulk form
  const uniqueUserIds = [...new Set(orgAttendanceRows.map((r) => r.userId))] as string[];

  const handleBulkSubmit = async () => {
    if (uniqueUserIds.length === 0) {
      toast.error("No users to mark attendance for.");
      return;
    }
    const attendances = uniqueUserIds.map((uid) => ({
      userId: uid,
      status: bulkStatus[uid] ?? "ABSENT",
    }));
    try {
      const result = await bulkMarkAttendance({
        variables: {
          input: { organizationId: orgId, date: bulkDate, attendances },
        },
      });
      const res = result.data?.bulkMarkAttendance;
      toast.success(
        `Marked ${res?.successCount ?? 0} records. Failed: ${res?.failedCount ?? 0}.`
      );
      refetchOrgAttendance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk mark failed.");
    }
  };

  const summary = summaryData?.myAttendanceSummary;
  const streak = streakData?.myStreak;
  const myAttendances: MyAttendanceRecord[] = attendanceData?.myAttendance ?? [];
  const activities: ActivityRecord[] = activitiesData?.myActivities ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CalendarCheck className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">Attendance</h2>
              <p className="text-muted-foreground">
                Track your attendance and activity.
              </p>
            </div>
          </div>

          {/* Check-in / Check-out buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="gold-gradient text-primary-foreground gap-2"
            >
              <LogIn className="h-4 w-4" />
              {checkingIn ? "Checking in..." : "Check In"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCheckOut}
              disabled={checkingOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {checkingOut ? "Checking out..." : "Check Out"}
            </Button>
          </div>
        </div>

        {/* Summary + Streak row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Days */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Days
              </CardTitle>
              <BarChart3 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {summary?.totalDays ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Present Days */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Present Days
              </CardTitle>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {summary?.presentDays ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance % */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Attendance %
              </CardTitle>
              <Activity className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {summary?.attendancePercentage?.toFixed(1) ?? 0}%
                </div>
              )}
            </CardContent>
          </Card>

          {/* Streak */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Streak
              </CardTitle>
              <Flame className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              {streakLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {streak?.currentStreak ?? 0} days
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Best: {streak?.longestStreak ?? 0} &nbsp;·&nbsp; Freezes:{" "}
                    {streak?.freezesAvailable ?? 0}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs: My Attendance | Team (Admin only) */}
        {isAdmin && (
          <div className="flex gap-1 border-b border-border pb-0">
            {(["my", "team"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "my" ? "My Attendance" : "Team Attendance"}
              </button>
            ))}
          </div>
        )}

        {/* ── MY ATTENDANCE TAB ── */}
        {tab === "my" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Attendance Table */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle>My Attendance</CardTitle>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-8 w-36 text-xs"
                    />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-8 w-36 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => refetchAttendance()}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {attendanceLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : myAttendances.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No attendance records found for the selected range.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">Date</th>
                          <th className="pb-2 pr-4 font-medium">Status</th>
                          <th className="pb-2 pr-4 font-medium">Check In</th>
                          <th className="pb-2 font-medium">Check Out</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {myAttendances.map((row) => (
                          <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 pr-4 text-foreground">
                              {formatDate(row.date)}
                            </td>
                            <td className="py-3 pr-4">
                              <StatusBadge status={row.status} />
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(row.checkInTime)}
                              </span>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(row.checkOutTime)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No recent activity.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {activities.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-start gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Activity className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-foreground">
                            {activityLabels[act.activityType] ?? act.activityType}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(act.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TEAM ATTENDANCE TAB (Admin only) ── */}
        {tab === "team" && isAdmin && (
          <div className="space-y-6">
            {/* Org Attendance Table */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Team Attendance
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      type="date"
                      value={orgStartDate}
                      onChange={(e) => setOrgStartDate(e.target.value)}
                      className="h-8 w-36 text-xs"
                    />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input
                      type="date"
                      value={orgEndDate}
                      onChange={(e) => setOrgEndDate(e.target.value)}
                      className="h-8 w-36 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => refetchOrgAttendance()}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {orgAttendanceLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : orgAttendanceRows.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No attendance records found.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">User ID</th>
                          <th className="pb-2 pr-4 font-medium">Date</th>
                          <th className="pb-2 pr-4 font-medium">Status</th>
                          <th className="pb-2 pr-4 font-medium">Check In</th>
                          <th className="pb-2 font-medium">Check Out</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {orgAttendanceRows.map((row) => (
                          <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 pr-4 text-xs text-muted-foreground font-mono">
                              {row.userId.slice(0, 8)}…
                            </td>
                            <td className="py-3 pr-4 text-foreground">
                              {formatDate(row.date)}
                            </td>
                            <td className="py-3 pr-4">
                              <StatusBadge status={row.status} />
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">
                              {formatTime(row.checkInTime)}
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {formatTime(row.checkOutTime)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bulk Mark Attendance */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Bulk Mark Attendance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <Input
                      type="date"
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                      className="h-8 w-40 text-xs"
                    />
                  </div>
                </div>

                {uniqueUserIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Load team attendance above to bulk mark attendance.
                  </p>
                ) : (
                  <>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {uniqueUserIds.map((uid) => (
                        <div
                          key={uid}
                          className="flex items-center justify-between rounded-lg border border-border p-3"
                        >
                          <span className="text-xs font-mono text-muted-foreground">
                            {uid.slice(0, 12)}…
                          </span>
                          <div className="flex gap-2">
                            {(["PRESENT", "ABSENT"] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() =>
                                  setBulkStatus((prev) => ({ ...prev, [uid]: s }))
                                }
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                  (bulkStatus[uid] ?? "ABSENT") === s
                                    ? s === "PRESENT"
                                      ? "bg-emerald-500 text-white"
                                      : "bg-destructive text-destructive-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                {s === "PRESENT" ? "Present" : "Absent"}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleBulkSubmit}
                      disabled={bulkLoading}
                      className="gold-gradient text-primary-foreground w-full"
                    >
                      {bulkLoading ? "Marking..." : "Submit Bulk Attendance"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
