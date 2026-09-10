# Backend change needed: automatic attendance (no manual check-in)

Manual `checkIn`/`checkOut` (self-service buttons) has been removed from the
dashboard UI. Replace it with automatic presence detection: a user is
marked PRESENT for a day once they've been active for a cumulative 15+
minutes on **any** ecosystem service that day — no button click required.

**Currently impossible from existing mutations.** Verified against
`schema.graphql`:

- `checkIn(organizationId: String!): Attendance!` / `checkOut: Attendance!`
  — manual, single-shot, no duration tracking.
- `recordDailyVisit` — idempotent once-per-day streak ping (used for the
  Streak feature), also no duration.
- The only thing in this ecosystem that already tracks time-on-service is
  the analytics pipeline (`POST /analytics/collect`, per-service `pageview`/
  `event` payloads with `ts`) — described in the Frontend Integration Guide
  (section 13) and `BACKEND_ANALYTICS.md`. That pipeline exists but isn't
  wired to attendance at all today.

## What's needed

1. **Session-duration aggregation.** For each `(userId, date)`, sum active
   time across all services' analytics events (first pageview/event to last
   in a session, or heartbeat-style pings — whichever the analytics
   pipeline already supports) into a running daily total.
2. **Auto-mark PRESENT** once that daily total crosses 15 minutes — either
   via a scheduled job (e.g. every few minutes, check totals crossing the
   threshold and upsert an `Attendance` row with `status: PRESENT`), or
   inline the moment the threshold is crossed by whichever event source
   updates last.
3. Keep the existing `Attendance` type/table as the source of truth
   (`attendanceByOrganization`, `myAttendanceSummary`, `bulkMarkAttendance`
   all keep working unchanged) — this only changes *how* a PRESENT row gets
   created, not the shape consumed by the frontend.
4. `checkIn`/`checkOut` mutations can be deprecated or left as an admin-only
   manual override once auto-tracking exists — the frontend no longer calls
   them from the self-service button.

## Not affected / already fine as-is

- `bulkMarkAttendance` and `attendanceByOrganization` (admin manual
  override + org-wide table) are independent of check-in/out and keep
  working exactly as they do today — no changes needed there.
- `myStreak` / `recordDailyVisit` (the Streak page) are unrelated to
  attendance and are unaffected.

## Frontend follow-up once this ships

Small: re-add a "Present today" indicator sourced from `myAttendanceSummary`
(already queried) — no new query needed, since the row it reads just starts
getting created automatically instead of via the old button.
