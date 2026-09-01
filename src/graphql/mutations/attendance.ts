import { gql } from '@apollo/client';

// ─── User Queries ────────────────────────────────────────────────────────────

export const MY_ATTENDANCE = gql`
  query MyAttendance($startDate: String, $endDate: String) {
    myAttendance(startDate: $startDate, endDate: $endDate) {
      id
      date
      status
      checkInTime
      checkOutTime
    }
  }
`;

export const MY_ATTENDANCE_SUMMARY = gql`
  query MyAttendanceSummary {
    myAttendanceSummary {
      totalDays
      presentDays
      attendancePercentage
    }
  }
`;

export const MY_ACTIVITIES = gql`
  query MyActivities($limit: Int) {
    myActivities(limit: $limit) {
      id
      activityType
      createdAt
    }
  }
`;

export const MY_STREAK = gql`
  query MyStreak {
    myStreak {
      currentStreak
      longestStreak
      freezesAvailable
      lastActivityDate
    }
  }
`;

// ─── Admin Queries ────────────────────────────────────────────────────────────

export const ATTENDANCE_BY_ORGANIZATION = gql`
  query AttendanceByOrganization($input: AttendanceFilterInput!) {
    attendanceByOrganization(input: $input) {
      id
      userId
      date
      status
      checkInTime
      checkOutTime
    }
  }
`;

export const ATTENDANCE_SUMMARY_BY_USER = gql`
  query AttendanceSummaryByUser($userId: String!) {
    attendanceSummaryByUser(userId: $userId) {
      totalDays
      presentDays
      attendancePercentage
    }
  }
`;

export const USER_ACTIVITIES = gql`
  query UserActivities($input: UserActivitiesInput!) {
    userActivities(input: $input) {
      id
      activityType
      createdAt
    }
  }
`;

export const USER_STREAK = gql`
  query UserStreak($userId: String!) {
    userStreak(userId: $userId) {
      currentStreak
      longestStreak
      freezesAvailable
    }
  }
`;

// ─── Mutations ────────────────────────────────────────────────────────────────

export const CHECK_IN = gql`
  mutation CheckIn($organizationId: String!) {
    checkIn(organizationId: $organizationId) {
      id
      checkInTime
      status
    }
  }
`;

export const CHECK_OUT = gql`
  mutation CheckOut {
    checkOut {
      id
      checkOutTime
    }
  }
`;

export const BULK_MARK_ATTENDANCE = gql`
  mutation BulkMarkAttendance($input: BulkMarkAttendanceInput!) {
    bulkMarkAttendance(input: $input) {
      successCount
      failedCount
      errors
    }
  }
`;

export const ORG_MEMBERS_STREAKS = gql`
  query OrgMembersStreaks($organizationId: String!) {
    orgMembersStreaks(organizationId: $organizationId) {
      userId
      name
      email
      currentStreak
      longestStreak
      freezesAvailable
      lastActivityDate
    }
  }
`;

export const TOP_STREAKERS = gql`
  query TopStreakers($organizationId: String, $limit: Int) {
    topStreakers(organizationId: $organizationId, limit: $limit) {
      rank
      userId
      userName
      userAvatarUrl
      currentStreak
      rankChange
    }
  }
`;

export const MY_LEADERBOARD_RANK = gql`
  query MyLeaderboardRank($organizationId: String) {
    myLeaderboardRank(organizationId: $organizationId) {
      rank
      currentStreak
      totalParticipants
    }
  }
`;

export const RECORD_DAILY_VISIT = gql`
  mutation RecordDailyVisit {
    recordDailyVisit {
      streak {
        currentStreak
        longestStreak
        freezesAvailable
      }
      isNewDay
      freezeUsed
      freezeEarned
    }
  }
`;
