import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import {
  MY_ATTENDANCE_SUMMARY,
  ATTENDANCE_BY_ORGANIZATION,
  BULK_MARK_ATTENDANCE,
  MEETING_ATTENDANCE_BY_ORGANIZATION,
} from "@/graphql/mutations/attendance";
import { GET_ALL_USERS } from "@/graphql/mutations/users";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Users,
  BarChart3,
  Activity,
  Info,
  Video,
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

// Normalizes a backend date value (epoch-ms string or ISO string) to a
// plain yyyy-mm-dd for comparing against a <input type="date"> value.
function formatDateISO(ts: string | null | undefined): string | null {
  const d = parseDate(ts);
  if (!d || isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
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

type AttendanceRow = {
  id: string;
  userId: string;
  date: string;
  status: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
};

type MeetingAttendanceRecord = {
  userId: string;
  userName: string;
  userEmail: string;
  status: "ATTENDED" | "MISSED";
};

type MeetingWithAttendance = {
  id: string;
  title: string;
  scheduledAt: string;
  attendedCount: number;
  missedCount: number;
  attendances: MeetingAttendanceRecord[];
};

// ─── Main Component ───────────────────────────────────────────────────────────
//
// Personal streak + activity feed live on the Streak page now (everyone's
// own progress, not an admin concern). Manual Check In/Check Out has been
// removed — presence will be detected automatically from cross-service
// activity once the backend supports it (see BACKEND_AUTO_ATTENDANCE.md).
// This page is admin-only: org-wide attendance visibility + manual
// bulk-mark override, which are independent of that rework and still work
// today.

const Attendance = () => {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId || "";
  const isAdmin = user?.systemRole === "SUPER_ADMIN";

  type AttendanceSummary = { totalDays: number; presentDays: number; attendancePercentage: number };

  const { data: summaryData, loading: summaryLoading, error: summaryError, refetch: refetchSummary } = useQuery<{ myAttendanceSummary: AttendanceSummary }>(
    MY_ATTENDANCE_SUMMARY,
    { skip: !orgId }
  );

  // ── Admin: Org Attendance ──
  const [orgStartDate, setOrgStartDate] = useState(firstDayOfMonthISO());
  const [orgEndDate, setOrgEndDate] = useState(todayISO());

  type PaginatedAttendance = { items: AttendanceRow[]; total: number; hasMore: boolean };

  const { data: orgAttendanceData, loading: orgAttendanceLoading, error: orgAttendanceError, refetch: refetchOrgAttendance } =
    useQuery<{ attendanceByOrganization: PaginatedAttendance }>(ATTENDANCE_BY_ORGANIZATION, {
      variables: {
        input: { organizationId: orgId, startDate: orgStartDate, endDate: orgEndDate, limit: 200 },
      },
      skip: !orgId || !isAdmin,
    });

  // Resolves each row's raw userId to a real name/email — without this the
  // table and bulk-mark list only ever show truncated UUIDs.
  type AppUser = { id: string; name?: string | null; email: string };
  const { data: usersData, loading: loadingUsers, error: usersError } = useQuery<{ getAllUsers: AppUser[] }>(GET_ALL_USERS, {
    variables: { orgId: orgId || undefined },
    skip: !orgId || !isAdmin,
    fetchPolicy: "cache-first",
  });
  const usersMap = useMemo(() => {
    const map = new Map<string, AppUser>();
    (usersData?.getAllUsers ?? []).forEach((u) => map.set(u.id, u));
    return map;
  }, [usersData]);
  const displayName = (userId: string) => {
    const u = usersMap.get(userId);
    return u?.name || u?.email || "Unknown member";
  };

  // ── Bulk mark attendance ──
  const [bulkDate, setBulkDate] = useState(todayISO());
  const [bulkStatus, setBulkStatus] = useState<Record<string, "PRESENT" | "ABSENT">>({});
  type BulkMarkResult = { successCount: number; failedCount: number; errors: string[] };
  const [bulkMarkAttendance, { loading: bulkLoading }] = useMutation<{ bulkMarkAttendance: BulkMarkResult }>(BULK_MARK_ATTENDANCE);

  const orgAttendanceRows: AttendanceRow[] = useMemo(
    () => orgAttendanceData?.attendanceByOrganization?.items ?? [],
    [orgAttendanceData],
  );
  const orgAttendanceTotal = orgAttendanceData?.attendanceByOrganization?.total ?? 0;
  const orgAttendanceHasMore = orgAttendanceData?.attendanceByOrganization?.hasMore ?? false;

  // The bulk-mark list must be every active org member (from getAllUsers) —
  // not just the userIds that happen to already have an Attendance row in
  // the selected date range. Sourcing it from orgAttendanceRows meant a
  // member with zero attendance history (nothing manually marked, nothing
  // auto-marked yet) never showed up here at all, so bulk mark effectively
  // only ever listed whoever already had records (e.g. a single user who'd
  // triggered auto-attendance).
  const allOrgUserIds = (usersData?.getAllUsers ?? []).map((u) => u.id);

  // Pre-fill each member's toggle with their actual status for the
  // selected bulk date when we already have it, defaulting to ABSENT only
  // when there's no record for that day yet.
  const statusByUserIdForBulkDate = useMemo(() => {
    const map = new Map<string, "PRESENT" | "ABSENT">();
    orgAttendanceRows.forEach((row) => {
      if (formatDateISO(row.date) === bulkDate) {
        map.set(row.userId, row.status === "PRESENT" ? "PRESENT" : "ABSENT");
      }
    });
    return map;
  }, [orgAttendanceRows, bulkDate]);

  const handleBulkSubmit = async () => {
    if (allOrgUserIds.length === 0) {
      toast.error("No users to mark attendance for.");
      return;
    }
    const attendances = allOrgUserIds.map((uid) => ({
      userId: uid,
      status: bulkStatus[uid] ?? statusByUserIdForBulkDate.get(uid) ?? "ABSENT",
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

  // ── Meeting attendance (admin) ──
  const { data: meetingAttendanceData, loading: meetingAttendanceLoading, error: meetingAttendanceError, refetch: refetchMeetingAttendance } =
    useQuery<{ meetingAttendanceByOrganization: MeetingWithAttendance[] }>(MEETING_ATTENDANCE_BY_ORGANIZATION, {
      variables: {
        input: { organizationId: orgId, startDate: orgStartDate, endDate: orgEndDate },
      },
      skip: !orgId || !isAdmin,
    });
  const meetings = meetingAttendanceData?.meetingAttendanceByOrganization ?? [];

  const summary = summaryData?.myAttendanceSummary;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Attendance</h2>
            <p className="text-muted-foreground">
              Organization-wide attendance overview.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Info className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Presence is being moved to automatic detection (active 15+ minutes on any service marks a day present) —
            manual check-in has been removed while that's built. Use Bulk Mark below for manual overrides in the meantime.
          </p>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="premium-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Total Days</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
            </div>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{summary?.totalDays ?? 0}</div>
            )}
          </div>

          <div className="premium-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Present Days</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{summary?.presentDays ?? 0}</div>
            )}
          </div>

          <div className="premium-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Attendance %</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10">
                <Activity className="h-4 w-4 text-accent" />
              </div>
            </div>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : summaryError ? (
              <p className="text-xs text-destructive">Couldn't load.{" "}
                <button className="underline" onClick={() => void refetchSummary()}>Retry</button>
              </p>
            ) : (
              <div className="text-2xl font-bold text-foreground">{summary?.attendancePercentage?.toFixed(1) ?? 0}%</div>
            )}
          </div>
        </div>

        {/* Org Attendance Table */}
        <div className="premium-card">
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
            {orgAttendanceLoading || loadingUsers ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : orgAttendanceError ? (
              <div className="flex flex-col items-start gap-2 py-6">
                <p className="text-sm text-destructive">Couldn't load team attendance. {orgAttendanceError.message}</p>
                <Button variant="outline" size="sm" onClick={() => void refetchOrgAttendance()}>
                  Retry
                </Button>
              </div>
            ) : orgAttendanceRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No attendance records found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                {usersError && (
                  <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
                    Couldn't load member names — showing "Unknown member" instead. {usersError.message}
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Member</th>
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Check In</th>
                      <th className="pb-2 font-medium">Check Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orgAttendanceRows.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4 font-medium text-foreground">
                          {displayName(row.userId)}
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
                {orgAttendanceHasMore && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Showing {orgAttendanceRows.length} of {orgAttendanceTotal} records — narrow the date range to see the rest.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </div>

        {/* Bulk Mark Attendance */}
        <div className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Bulk Mark Attendance
            </CardTitle>
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

            {loadingUsers ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : allOrgUserIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active members found in this organization.
              </p>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {allOrgUserIds.map((uid) => {
                    const selected = bulkStatus[uid] ?? statusByUserIdForBulkDate.get(uid) ?? "ABSENT";
                    return (
                      <div
                        key={uid}
                        className="flex items-center justify-between rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/30"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {displayName(uid)}
                        </span>
                        <div className="flex gap-2">
                          {(["PRESENT", "ABSENT"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() =>
                                setBulkStatus((prev) => ({ ...prev, [uid]: s }))
                              }
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                selected === s
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
                    );
                  })}
                </div>

                <LoadingButton
                  onClick={handleBulkSubmit}
                  loading={bulkLoading}
                  loadingText="Marking..."
                  className="gold-gradient text-primary-foreground w-full"
                >
                  Submit Bulk Attendance
                </LoadingButton>
              </>
            )}
          </CardContent>
        </div>

        {/* Meeting Attendance — Jitsi rooms, tracked separately from daily attendance */}
        <div className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              Meeting Attendance
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Same date range as Team Attendance above. Based on time spent in each meeting room.
            </p>
          </CardHeader>
          <CardContent>
            {meetingAttendanceLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : meetingAttendanceError ? (
              <div className="flex flex-col items-start gap-2 py-6">
                <p className="text-sm text-destructive">Couldn't load meeting attendance. {meetingAttendanceError.message}</p>
                <Button variant="outline" size="sm" onClick={() => void refetchMeetingAttendance()}>
                  Retry
                </Button>
              </div>
            ) : meetings.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No meetings recorded in this date range.
              </p>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-medium text-foreground">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(meeting.scheduledAt)}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-500">
                          <CheckCircle2 className="h-3 w-3" /> {meeting.attendedCount} attended
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                          <XCircle className="h-3 w-3" /> {meeting.missedCount} missed
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {meeting.attendances.map((a) => (
                        <span
                          key={a.userId}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            a.status === "ATTENDED"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {a.userName || a.userEmail}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
