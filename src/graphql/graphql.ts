/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: Record<string, any>; output: Record<string, any>; }
};

export type AcceptInviteInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

/** Represents the type of activity a user performed. */
export enum ActivityType {
  Login = 'LOGIN',
  MeetingAttended = 'MEETING_ATTENDED',
  ProjectContribution = 'PROJECT_CONTRIBUTION',
  TaskUpdate = 'TASK_UPDATE'
}

export type AddProjectMemberInput = {
  projectId: Scalars['String']['input'];
  /** Defaults to CONTRIBUTOR when omitted. */
  role?: InputMaybe<ProjectRole>;
  userId: Scalars['String']['input'];
};

export type AnalyticsOverview = {
  __typename?: 'AnalyticsOverview';
  activeServices: Scalars['Int']['output'];
  perService: Array<ServiceAnalyticsRow>;
  timeseries: Array<AnalyticsTimePoint>;
  totalPageviews: Scalars['Int']['output'];
  totalSessions: Scalars['Int']['output'];
  totalUniqueVisitors: Scalars['Int']['output'];
};

export enum AnalyticsRange {
  AllTime = 'ALL_TIME',
  Last_7Days = 'LAST_7_DAYS',
  Last_30Days = 'LAST_30_DAYS',
  Today = 'TODAY'
}

export type AnalyticsTimePoint = {
  __typename?: 'AnalyticsTimePoint';
  date: Scalars['String']['output'];
  pageviews: Scalars['Int']['output'];
  uniqueVisitors: Scalars['Int']['output'];
};

export type AssignTeamToProjectInput = {
  /** Pass null to detach the team from its current project. */
  projectId?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['String']['input'];
};

export type AssignUserDepartmentInput = {
  departmentId: Scalars['String']['input'];
  /**
   * The position (within the department) to assign to the user.
   * Must belong to the specified department.
   */
  positionId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type Attendance = {
  __typename?: 'Attendance';
  checkInTime?: Maybe<Scalars['String']['output']>;
  checkOutTime?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  date: Scalars['String']['output'];
  id: Scalars['String']['output'];
  status: AttendanceStatus;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type AttendanceFilterInput = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  /** Max records to return. Default 50, server-capped at 200. */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Records to skip, for paging. Default 0. */
  offset?: InputMaybe<Scalars['Int']['input']>;
  organizationId: Scalars['String']['input'];
  startDate?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export enum AttendanceStatus {
  Absent = 'ABSENT',
  Present = 'PRESENT'
}

export type AttendanceSummary = {
  __typename?: 'AttendanceSummary';
  attendancePercentage: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['String']['output'];
  presentDays: Scalars['Int']['output'];
  totalDays: Scalars['Int']['output'];
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type AuthResponse = {
  __typename?: 'AuthResponse';
  accessToken: Scalars['String']['output'];
};

export type AuthUser = {
  __typename?: 'AuthUser';
  email: Scalars['String']['output'];
  orgId: Scalars['String']['output'];
  orgRole?: Maybe<Scalars['String']['output']>;
  sub: Scalars['String']['output'];
  systemRole: SystemRole;
};

/** Result of auto-assigning one TechStack category's team. */
export type AutoAssignedTeamResult = {
  __typename?: 'AutoAssignedTeamResult';
  /** Members newly added to this team by this run (0 if everyone eligible was already on it). */
  addedCount: Scalars['Int']['output'];
  team: Team;
};

export type BulkAttendanceResult = {
  __typename?: 'BulkAttendanceResult';
  errors: Array<Scalars['String']['output']>;
  failedCount: Scalars['Int']['output'];
  successCount: Scalars['Int']['output'];
};

export type BulkMarkAttendanceInput = {
  attendances: Array<SingleAttendanceEntry>;
  date: Scalars['String']['input'];
  organizationId: Scalars['String']['input'];
};

export type CreateDepartmentInput = {
  name: Scalars['String']['input'];
  /**
   * Required for SUPER_ADMIN when they want to create a department in a specific org.
   * Org admins leave this blank — their own org from the JWT is used automatically.
   */
  organizationId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateInviteInput = {
  /** Email of the person being invited (the invitee) */
  email: Scalars['String']['input'];
  /** Organization to invite the person to */
  organizationId: Scalars['String']['input'];
  /** Optional role to assign — defaults to VIEWER if omitted */
  roleId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateInviteLinkResponse = {
  __typename?: 'CreateInviteLinkResponse';
  email: Scalars['String']['output'];
  /**
   * Whether the invite email actually sent (e.g. false if Resend rejected it
   * due to bad/expired credentials). The invite record itself is always
   * created regardless — use resendInviteLink to retry once credentials are
   * fixed. Previously this failure was silent (logged only); this field
   * surfaces it to the caller.
   */
  emailSent: Scalars['Boolean']['output'];
  expiresAt: Scalars['String']['output'];
  inviteId: Scalars['ID']['output'];
  inviteLink: Scalars['String']['output'];
  invitedById: Scalars['String']['output'];
  organizationId: Scalars['String']['output'];
  roleId: Scalars['String']['output'];
};

export type CreateMembershipInput = {
  organizationId: Scalars['String']['input'];
  roleId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type CreateOrganizationInput = {
  name: Scalars['String']['input'];
};

export type CreatePositionInput = {
  departmentId: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  organizationId: Scalars['String']['input'];
};

export type CreateServiceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  domain: Scalars['String']['input'];
  githubUrl?: InputMaybe<Scalars['String']['input']>;
  goal?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  platformLinks?: InputMaybe<Array<Scalars['String']['input']>>;
  platforms?: InputMaybe<Array<Scalars['String']['input']>>;
  serviceType?: InputMaybe<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  uptime?: InputMaybe<Scalars['Float']['input']>;
  url: Scalars['String']['input'];
};

export type CreateSessionInput = {
  device?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['String']['input'];
};

export type CreateTaskInput = {
  assignedTeamId?: InputMaybe<Scalars['String']['input']>;
  assignedUserId?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  githubBranch?: InputMaybe<Scalars['String']['input']>;
  githubIssueUrl?: InputMaybe<Scalars['String']['input']>;
  githubRepo?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['String']['input'];
  status?: InputMaybe<TaskStatus>;
  title: Scalars['String']['input'];
};

export type CreateTeamInput = {
  name: Scalars['String']['input'];
  organizationId: Scalars['String']['input'];
  projectId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateTeamMemberInput = {
  role?: InputMaybe<TeamRole>;
  teamId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

/** Daily motivational quote — changes every UTC day, consistent within a day. */
export type DailyQuote = {
  __typename?: 'DailyQuote';
  author: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type Department = {
  __typename?: 'Department';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  organizationId: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

/**
 * One GitHub username's synced commit count from org-contribution-analyzer,
 * optionally linked to a platform user (matched by UserDetails.githubUsername
 * — null when this GitHub username has no linked platform account).
 * Deliberately NOT a tech-stack signal — see the backend's schema comment on
 * GithubContribution for why.
 */
export type GithubContributionEntry = {
  __typename?: 'GithubContributionEntry';
  commits: Scalars['Int']['output'];
  githubUsername: Scalars['String']['output'];
  /** The platform user this GitHub username belongs to, if any account has it set as their githubUsername. */
  linkedUserId?: Maybe<Scalars['String']['output']>;
  linkedUserName?: Maybe<Scalars['String']['output']>;
  syncedAt: Scalars['String']['output'];
};

export type GuestApplication = {
  __typename?: 'GuestApplication';
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  githubUsername?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  inviteId?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  phoneNumber?: Maybe<Scalars['String']['output']>;
  portfolioUrl?: Maybe<Scalars['String']['output']>;
  reason: Scalars['String']['output'];
  /**
   * Set when this application was submitted via an existing member's
   * "Member referral" — the referring member's User.id. Null for
   * applications from the plain public apply form.
   */
  referredByUserId?: Maybe<Scalars['String']['output']>;
  reviewedAt?: Maybe<Scalars['String']['output']>;
  reviewedBy?: Maybe<Scalars['String']['output']>;
  status: GuestApplicationStatus;
  updatedAt: Scalars['String']['output'];
};

/**
 * Pre-fill data returned on the accept-invite page.
 * Only name, github, portfolio — nothing sensitive.
 */
export type GuestApplicationPrefill = {
  __typename?: 'GuestApplicationPrefill';
  githubUsername?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  portfolioUrl?: Maybe<Scalars['String']['output']>;
};

export enum GuestApplicationStatus {
  Approved = 'APPROVED',
  Pending = 'PENDING',
  Rejected = 'REJECTED'
}

export type InternalService = {
  __typename?: 'InternalService';
  /**
   * API key used by this service to authenticate webhook calls.
   * Only returned to SUPER_ADMIN.
   */
  apiKey: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  deploymentPlatform: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  domain: Scalars['String']['output'];
  frontendFramework: Scalars['String']['output'];
  githubUrl?: Maybe<Scalars['String']['output']>;
  goal?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  platformLinks: Array<Scalars['String']['output']>;
  platforms: Array<Scalars['String']['output']>;
  proxyProvider: Scalars['String']['output'];
  serviceType: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  styling: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  uptime: Scalars['Float']['output'];
  url: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

/**
 * Represents an invitation sent to a user to join an organization.
 * - email:          The invitee's email — the person who is being invited
 * - invitedById:    User ID of the person who created/sent this invite
 * - organizationId: The organization the invitee is being invited to
 * - roleId:         The role assigned to the invitee upon acceptance
 * - acceptedAt:     Timestamp when the invitee accepted (null if pending)
 */
export type Invite = {
  __typename?: 'Invite';
  /** ISO timestamp — set when the invitee accepts (null if still pending) */
  acceptedAt?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  /** The invitee's email — person who is being invited */
  email: Scalars['String']['output'];
  /** ISO timestamp — invite expires after this date */
  expiresAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** User ID of the admin/owner who sent this invite */
  invitedById: Scalars['String']['output'];
  /** The organization this invite belongs to */
  organizationId: Scalars['String']['output'];
  /** The role assigned to the invitee upon acceptance */
  roleId: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type InviteValidationResult = {
  __typename?: 'InviteValidationResult';
  email: Scalars['String']['output'];
  expiresAt: Scalars['String']['output'];
  organizationId: Scalars['String']['output'];
  roleId: Scalars['String']['output'];
};

/** Cached daily leaderboard pull from the Journey engine. */
export type JourneyLeaderboardSnapshot = {
  __typename?: 'JourneyLeaderboardSnapshot';
  entries: Scalars['JSON']['output'];
  syncedAt: Scalars['String']['output'];
};

/**
 * Cached daily snapshot of a user's Journey engine (journey.godevelopers.space)
 * progress — synced once/day, not real-time. Check `syncedAt` before trusting freshness.
 */
export type JourneyProgressSnapshot = {
  __typename?: 'JourneyProgressSnapshot';
  /** Raw GET /api/activity/:userId response, if the last sync succeeded */
  activity?: Maybe<Scalars['JSON']['output']>;
  /** Set if the most recent sync attempt for this user failed — `progress` may be stale. */
  lastSyncError?: Maybe<Scalars['String']['output']>;
  /** Raw GET /api/services/progress/:userId response (totalXP, currentLevel, services[], badges[], ...) */
  progress: Scalars['JSON']['output'];
  /** Raw GET /api/streaks/:userId response, if the last sync succeeded */
  streak?: Maybe<Scalars['JSON']['output']>;
  syncedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

/** Result of a manually-triggered Journey sync run. */
export type JourneySyncResult = {
  __typename?: 'JourneySyncResult';
  failed: Scalars['Int']['output'];
  synced: Scalars['Int']['output'];
};

/** Current user's position in the org leaderboard. */
export type LeaderboardRank = {
  __typename?: 'LeaderboardRank';
  currentStreak: Scalars['Int']['output'];
  rank: Scalars['Int']['output'];
  totalParticipants: Scalars['Int']['output'];
};

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type MarkAttendanceInput = {
  date: Scalars['String']['input'];
  organizationId: Scalars['String']['input'];
  status: AttendanceStatus;
  userId: Scalars['String']['input'];
};

export type MeetingAttendanceFilterInput = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  organizationId: Scalars['String']['input'];
  startDate?: InputMaybe<Scalars['String']['input']>;
};

/** A single member's attendance record for one meeting. */
export type MeetingAttendanceRecord = {
  __typename?: 'MeetingAttendanceRecord';
  status: MeetingAttendanceStatus;
  userEmail: Scalars['String']['output'];
  userId: Scalars['String']['output'];
  userName: Scalars['String']['output'];
};

export enum MeetingAttendanceStatus {
  Attended = 'ATTENDED',
  Missed = 'MISSED'
}

/**
 * A meeting (ad-hoc Jitsi room, one per room-per-day) with its per-user
 * attendance, as recorded by the meeting-attendance ping endpoint.
 */
export type MeetingWithAttendance = {
  __typename?: 'MeetingWithAttendance';
  attendances: Array<MeetingAttendanceRecord>;
  attendedCount: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  missedCount: Scalars['Int']['output'];
  scheduledAt: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

/** Streak info for a single org member, returned by orgMembersStreaks. */
export type MemberStreakInfo = {
  __typename?: 'MemberStreakInfo';
  currentStreak: Scalars['Int']['output'];
  email: Scalars['String']['output'];
  freezesAvailable: Scalars['Int']['output'];
  lastActivityDate?: Maybe<Scalars['String']['output']>;
  longestStreak: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type Membership = {
  __typename?: 'Membership';
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  joinedAt: Scalars['String']['output'];
  organizationId: Scalars['String']['output'];
  roleId: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptInvite: AuthResponse;
  /**
   * Add a user directly to a project with a role (MANAGER, CONTRIBUTOR, VIEWER).
   * User must be an active member of the project's organization.
   * Requires org admin or super-admin.
   */
  addProjectMember: ProjectMember;
  /**
   * SUPER_ADMIN or org ADMIN — approve application.
   * Creates an invite for the provided organizationId and sends the invite email.
   * roleId is optional; defaults to VIEWER if omitted.
   */
  approveGuestApplication: GuestApplication;
  /**
   * Assign a team to a project. Both must belong to the same organization.
   * Pass projectId as null to detach the team from its current project.
   * Requires org admin or super-admin.
   */
  assignTeamToProject: Team;
  /**
   * Assign a user to a department with a specific position.
   * The position must belong to the given department.
   * User must be an active org member.
   * Requires org admin or super-admin.
   */
  assignUserToDepartment: UserDepartment;
  /**
   * Groups an org's active members into one team per TechStack category,
   * based on each member's own (self-reported, never auto-detected)
   * UserDetails.primaryTechStack. Members with no primaryTechStack set are
   * skipped. Idempotent — safe to run repeatedly; reuses existing
   * auto-assigned teams and only adds newly-eligible members, never removes
   * anyone. Requires org admin or super-admin.
   */
  autoAssignTeams: Array<AutoAssignedTeamResult>;
  bulkMarkAttendance: BulkAttendanceResult;
  checkIn: Attendance;
  checkOut: Attendance;
  createDepartment: Department;
  createInviteLink: CreateInviteLinkResponse;
  createMembership: Membership;
  createOrganization: Organization;
  createPosition: Position;
  createProject: Project;
  /** Register a new internal service. Auto-generates an API key. SUPER_ADMIN only. */
  createService: InternalService;
  createSession: Session;
  createTask: Task;
  createTeam: Team;
  createTeamMember: TeamMember;
  deleteDepartment: Scalars['Boolean']['output'];
  /** Revoke/delete a pending invite. Requires org ADMIN or SUPER_ADMIN. */
  deleteInvite: Scalars['Boolean']['output'];
  deleteOrganization: Scalars['Boolean']['output'];
  deletePosition: Scalars['Boolean']['output'];
  deleteProject: Scalars['Boolean']['output'];
  /** Delete an internal service. SUPER_ADMIN only. */
  deleteService: Scalars['Boolean']['output'];
  deleteTask: Scalars['Boolean']['output'];
  deleteTeam: Scalars['Boolean']['output'];
  deleteTeamMember: Scalars['Boolean']['output'];
  /**
   * Links the authenticated user's Telegram account, verified via the
   * Telegram Login Widget's signed payload. Once linked, this user's join
   * requests on the gated Telegram channel are auto-approved.
   */
  linkTelegramAccount: TelegramLinkResult;
  login: AuthResponse;
  logout: Scalars['Boolean']['output'];
  markAttendance: Attendance;
  /**
   * Records a daily visit (login activity) for the authenticated user and updates their streak.
   *
   * **Idempotent per UTC day** — calling this multiple times on the same day returns the
   * existing streak state without modifying it.
   *
   * ### Streak rules
   * 1. First ever call → streak starts at 1.
   * 2. Called on the next consecutive day → streak increments by 1.
   * 3. Exactly one day missed **and** a freeze token is available → freeze consumed, streak maintained.
   * 4. Gap > 1 day (or 1-day gap with no freezes left) → streak resets to 1.
   * 5. Every 7th consecutive day a freeze token is awarded (max 3 tokens).
   *
   * **Auth:** Requires a valid JWT.
   */
  recordDailyVisit: RecordVisitResponse;
  refreshTokens: AuthResponse;
  /** Rotate the API key for a service. Returns the service with the new key. SUPER_ADMIN only. */
  regenerateServiceApiKey: InternalService;
  register: AuthResponse;
  /** SUPER_ADMIN or org ADMIN — reject application. */
  rejectGuestApplication: GuestApplication;
  /**
   * Remove a member from an organization (soft-delete).
   * Requires org ADMIN or SUPER_ADMIN.
   */
  removeMember: Scalars['Boolean']['output'];
  /**
   * Remove a user from a project.
   * Requires org admin or super-admin.
   */
  removeProjectMember: Scalars['Boolean']['output'];
  /**
   * Remove a user's department assignment by its record ID.
   * Requires org admin or super-admin.
   */
  removeUserFromDepartment: Scalars['Boolean']['output'];
  requestPasswordReset: Scalars['Boolean']['output'];
  /**
   * Resend an existing invite — regenerates the token and expiry (useful once
   * an invite has expired) and re-sends the invite email.
   * Requires org ADMIN or SUPER_ADMIN.
   */
  resendInviteLink: CreateInviteLinkResponse;
  resetPassword: Scalars['Boolean']['output'];
  sendGlobalIdOtp: Scalars['Boolean']['output'];
  /**
   * SUPER_ADMIN only — deactivate or reactivate a user account platform-wide.
   * Deactivated users cannot log in; their memberships are left untouched
   * (reactivating restores prior access).
   */
  setUserActive: User;
  /**
   * Public — anyone can submit an application to join.
   * Sends a confirmation email to the applicant.
   */
  submitGuestApplication: GuestApplication;
  /**
   * Protected — Apply Service only. Requires valid x-api-key header.
   * Submits guest application from external Apply Service with idempotency support.
   * Same logic as submitGuestApplication but requires inter-service authentication.
   */
  submitGuestApplicationFromApplyService: GuestApplication;
  /**
   * Any logged-in member — refer someone by email+name (see the "Member
   * referral" screen). Does NOT bypass admin review: creates a PENDING
   * GuestApplication linked to the submitting member, same as the public
   * apply form, only becoming an invite once an admin approves it via
   * approveGuestApplication.
   */
  submitReferralApplication: GuestApplication;
  /**
   * SUPER_ADMIN only — trigger a Journey engine sync immediately instead of
   * waiting for the daily 3 AM cron. Useful for testing or an on-demand refresh.
   */
  triggerJourneySync: JourneySyncResult;
  /**
   * Unlinks the authenticated user's Telegram account. Future join requests
   * from that Telegram account will be declined until re-linked.
   */
  unlinkTelegramAccount: TelegramLinkResult;
  updateDepartment: Department;
  /**
   * Update a member's role within an organization.
   * Requires org ADMIN or SUPER_ADMIN.
   */
  updateMemberRole: Membership;
  updateOrganization: Organization;
  updatePosition: Position;
  updateProfile: UserProfile;
  updateProject: Project;
  /**
   * Update the role of an existing project member.
   * Requires org admin or super-admin.
   */
  updateProjectMember: ProjectMember;
  /** Update an existing internal service. SUPER_ADMIN only. */
  updateService: InternalService;
  updateTask: Task;
  updateTeam: Team;
  updateTeamMember: TeamMember;
  /** SUPER_ADMIN only — promote/demote a user's platform-level systemRole. */
  updateUserSystemRole: User;
  verifyGlobalIdOtp: Scalars['String']['output'];
};


export type MutationAcceptInviteArgs = {
  input: AcceptInviteInput;
};


export type MutationAddProjectMemberArgs = {
  input: AddProjectMemberInput;
};


export type MutationApproveGuestApplicationArgs = {
  id: Scalars['ID']['input'];
  organizationId: Scalars['String']['input'];
  roleId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationAssignTeamToProjectArgs = {
  input: AssignTeamToProjectInput;
};


export type MutationAssignUserToDepartmentArgs = {
  input: AssignUserDepartmentInput;
};


export type MutationAutoAssignTeamsArgs = {
  organizationId: Scalars['String']['input'];
};


export type MutationBulkMarkAttendanceArgs = {
  input: BulkMarkAttendanceInput;
};


export type MutationCheckInArgs = {
  organizationId: Scalars['String']['input'];
};


export type MutationCreateDepartmentArgs = {
  input: CreateDepartmentInput;
};


export type MutationCreateInviteLinkArgs = {
  input: CreateInviteInput;
};


export type MutationCreateMembershipArgs = {
  input: CreateMembershipInput;
};


export type MutationCreateOrganizationArgs = {
  input: CreateOrganizationInput;
};


export type MutationCreatePositionArgs = {
  input: CreatePositionInput;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationCreateServiceArgs = {
  input: CreateServiceInput;
};


export type MutationCreateSessionArgs = {
  input: CreateSessionInput;
};


export type MutationCreateTaskArgs = {
  input: CreateTaskInput;
};


export type MutationCreateTeamArgs = {
  input: CreateTeamInput;
};


export type MutationCreateTeamMemberArgs = {
  input: CreateTeamMemberInput;
};


export type MutationDeleteDepartmentArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteInviteArgs = {
  inviteId: Scalars['ID']['input'];
};


export type MutationDeleteOrganizationArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeletePositionArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteProjectArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteServiceArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTaskArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteTeamArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteTeamMemberArgs = {
  id: Scalars['String']['input'];
};


export type MutationLinkTelegramAccountArgs = {
  input: TelegramLoginWidgetInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationMarkAttendanceArgs = {
  input: MarkAttendanceInput;
};


export type MutationRegenerateServiceApiKeyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRegisterArgs = {
  input: RegisterInput;
};


export type MutationRejectGuestApplicationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveMemberArgs = {
  input: RemoveMemberInput;
};


export type MutationRemoveProjectMemberArgs = {
  id: Scalars['String']['input'];
};


export type MutationRemoveUserFromDepartmentArgs = {
  id: Scalars['String']['input'];
};


export type MutationRequestPasswordResetArgs = {
  input: RequestPasswordResetInput;
};


export type MutationResendInviteLinkArgs = {
  inviteId: Scalars['ID']['input'];
};


export type MutationResetPasswordArgs = {
  input: ResetPasswordInput;
};


export type MutationSendGlobalIdOtpArgs = {
  input: SendGlobalIdOtpInput;
};


export type MutationSetUserActiveArgs = {
  isActive: Scalars['Boolean']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationSubmitGuestApplicationArgs = {
  input: SubmitGuestApplicationInput;
};


export type MutationSubmitGuestApplicationFromApplyServiceArgs = {
  input: SubmitGuestApplicationInput;
};


export type MutationSubmitReferralApplicationArgs = {
  input: SubmitReferralApplicationInput;
};


export type MutationUpdateDepartmentArgs = {
  id: Scalars['String']['input'];
  input: UpdateDepartmentInput;
};


export type MutationUpdateMemberRoleArgs = {
  input: UpdateMemberRoleInput;
};


export type MutationUpdateOrganizationArgs = {
  id: Scalars['String']['input'];
  input: UpdateOrganizationInput;
};


export type MutationUpdatePositionArgs = {
  id: Scalars['String']['input'];
  input: UpdatePositionInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdateProjectArgs = {
  id: Scalars['String']['input'];
  input: UpdateProjectInput;
};


export type MutationUpdateProjectMemberArgs = {
  id: Scalars['String']['input'];
  input: UpdateProjectMemberInput;
};


export type MutationUpdateServiceArgs = {
  id: Scalars['ID']['input'];
  input: UpdateServiceInput;
};


export type MutationUpdateTaskArgs = {
  id: Scalars['String']['input'];
  input: UpdateTaskInput;
};


export type MutationUpdateTeamArgs = {
  id: Scalars['String']['input'];
  input: UpdateTeamInput;
};


export type MutationUpdateTeamMemberArgs = {
  id: Scalars['String']['input'];
  input: UpdateTeamMemberInput;
};


export type MutationUpdateUserSystemRoleArgs = {
  systemRole: SystemRole;
  userId: Scalars['ID']['input'];
};


export type MutationVerifyGlobalIdOtpArgs = {
  input: VerifyGlobalIdOtpInput;
};

export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
  invites?: Maybe<Array<Maybe<Invite>>>;
  memberships?: Maybe<Array<Maybe<Membership>>>;
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

/** Pagination metadata returned alongside paginated results. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** Whether a next page exists. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether a previous page exists. */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** Items per page used for this request. */
  limit: Scalars['Int']['output'];
  /** Current page number (1-indexed). */
  page: Scalars['Int']['output'];
  /** Total number of matching records. */
  total: Scalars['Int']['output'];
  /** Total number of pages. */
  totalPages: Scalars['Int']['output'];
};

/**
 * Paginated attendance results. When neither startDate nor endDate is
 * provided, the query defaults to the last 7 days rather than returning
 * full history — pass an explicit startDate to look further back.
 */
export type PaginatedAttendance = {
  __typename?: 'PaginatedAttendance';
  /** True if there are more records beyond this page (offset + items.length < total). */
  hasMore: Scalars['Boolean']['output'];
  items: Array<Attendance>;
  /** Total records matching the filter (ignoring limit/offset) — use for building pagination UI. */
  total: Scalars['Int']['output'];
};

export type PaginatedDepartments = {
  __typename?: 'PaginatedDepartments';
  data: Array<Department>;
  pageInfo: PageInfo;
};

export type PaginatedProjectMembers = {
  __typename?: 'PaginatedProjectMembers';
  data: Array<ProjectMember>;
  pageInfo: PageInfo;
};

export type PaginatedProjects = {
  __typename?: 'PaginatedProjects';
  data: Array<Project>;
  pageInfo: PageInfo;
};

export type PaginatedTeamMembers = {
  __typename?: 'PaginatedTeamMembers';
  data: Array<TeamMember>;
  pageInfo: PageInfo;
};

export type PaginatedTeams = {
  __typename?: 'PaginatedTeams';
  data: Array<Team>;
  pageInfo: PageInfo;
};

export type PaginatedUserDepartments = {
  __typename?: 'PaginatedUserDepartments';
  data: Array<UserDepartment>;
  pageInfo: PageInfo;
};

/** Offset-based pagination input. Page is 1-indexed. */
export type PaginationInput = {
  /** Number of items per page. Defaults to 20, max 100. */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Page number (1-indexed). Defaults to 1. */
  page?: InputMaybe<Scalars['Int']['input']>;
};

export type Position = {
  __typename?: 'Position';
  createdAt: Scalars['String']['output'];
  departmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type Project = {
  __typename?: 'Project';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  organizationId: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type ProjectMember = {
  __typename?: 'ProjectMember';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  projectId: Scalars['String']['output'];
  role: ProjectRole;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export enum ProjectRole {
  Contributor = 'CONTRIBUTOR',
  Manager = 'MANAGER',
  Viewer = 'VIEWER'
}

export type Query = {
  __typename?: 'Query';
  /**
   * Returns the active weekly streak challenge with the authenticated user's progress.
   * Resets every Monday UTC; ends Sunday 23:59 UTC.
   *
   * **Auth:** Requires a valid JWT.
   */
  activeWeeklyChallenge: WeeklyChallenge;
  allDepartments: Array<Department>;
  /**
   * Returns ALL registered users on the platform.
   * For use by SUPER_ADMIN or org ADMIN when selecting users to add to an org.
   * Optional search filters by name or email (case-insensitive).
   */
  allPlatformUsers: Array<User>;
  allPositions: Array<Position>;
  allProjects: Array<Project>;
  allTasks: Array<Task>;
  allTeams: Array<Team>;
  /** Platform-wide analytics overview. SUPER_ADMIN only. */
  analyticsOverview: AnalyticsOverview;
  attendanceByOrganization: PaginatedAttendance;
  attendanceSummaryByUser?: Maybe<AttendanceSummary>;
  currentUser: AuthUser;
  /**
   * Returns the motivational quote for today (UTC). Consistent within a UTC day.
   *
   * **Auth:** Requires a valid JWT.
   */
  dailyQuote: DailyQuote;
  department?: Maybe<Department>;
  /** List all users assigned to a department. Requires org membership. */
  departmentUsers: Array<UserDepartment>;
  departmentsByOrganization: Array<Department>;
  /** Paginated departments in an organization. Defaults to page 1, limit 20. */
  departmentsByOrganizationPaginated: PaginatedDepartments;
  /**
   * Returns all users in an organization.
   * SUPER_ADMIN: pass orgId to query any org (falls back to token orgId).
   * Others: always uses their own org from the JWT token.
   */
  getAllUsers: Array<User>;
  /**
   * Returns a single user by ID within an organization.
   * SUPER_ADMIN: pass orgId to query any org (falls back to token orgId).
   * Others: always uses their own org from the JWT token.
   */
  getUserById?: Maybe<User>;
  /**
   * Org-wide GitHub contribution leaderboard, most commits first. Synced
   * daily from org-contribution-analyzer — this is a read of already-computed
   * data, not a live GitHub API call.
   */
  githubContributions: Array<GithubContributionEntry>;
  /** Get a single guest application by ID. SUPER_ADMIN or org ADMIN. */
  guestApplication?: Maybe<GuestApplication>;
  /**
   * Public — returns name, github, portfolio for pre-filling the accept-invite form.
   * Uses the invite token as the lookup key.
   * Returns null if no guest application is linked to this invite.
   */
  guestApplicationByInviteToken?: Maybe<GuestApplicationPrefill>;
  /**
   * List guest applications. SUPER_ADMIN or any org ADMIN.
   * Filter by status: PENDING | APPROVED | REJECTED
   */
  guestApplications: Array<GuestApplication>;
  /**
   * Fetch invites for an organization.
   * - organizationId: required for non-super-admins
   * - email: filter by invitee's email (the person who was invited)
   * - status: "pending" | "accepted" | "expired" | "all" (default: "all")
   */
  invites: Array<Invite>;
  /** Cached global Journey leaderboard (updated once/day). */
  journeyLeaderboard?: Maybe<JourneyLeaderboardSnapshot>;
  /**
   * This user's cached Journey engine progress snapshot (updated once/day).
   * Returns null if this user has never been synced yet.
   */
  journeyProgress?: Maybe<JourneyProgressSnapshot>;
  /**
   * Admin query: meetings held in an organization with per-user attendance,
   * most-recent first. Optional date range filters by scheduledAt.
   *
   * **Auth:** Caller must be ADMIN of the org or SUPER_ADMIN.
   */
  meetingAttendanceByOrganization: Array<MeetingWithAttendance>;
  memberships: Array<Membership>;
  /**
   * Returns the authenticated user's activity log, ordered most-recent-first.
   *
   * - `limit`: cap on records returned (max 100, default 50).
   *
   * **Auth:** Requires a valid JWT.
   */
  myActivities: Array<UserActivity>;
  /**
   * Defaults to the last 7 days when neither startDate nor endDate is
   * given — pass startDate explicitly to look further back. Paginated;
   * default limit 50, server-capped at 200.
   */
  myAttendance: PaginatedAttendance;
  myAttendanceSummary?: Maybe<AttendanceSummary>;
  /**
   * Returns the authenticated user's rank within the org leaderboard.
   *
   * **Auth:** Requires a valid JWT. Caller must be a member of the org or SUPER_ADMIN.
   */
  myLeaderboardRank: LeaderboardRank;
  /**
   * Returns the authenticated user's role in the given organization.
   * Returns null if the user is not a member.
   */
  myOrgRole?: Maybe<UserOrgRole>;
  myProfile: UserProfile;
  /**
   * Returns the authenticated user's current streak and freeze token state.
   *
   * **Auth:** Requires a valid JWT.
   */
  myStreak: UserStreakInfo;
  /**
   * Returns streak info for all active members of an organization.
   * Sorted by currentStreak descending (leaderboard order).
   *
   * **Auth:** Requires a valid JWT. Caller must be ADMIN of the org or SUPER_ADMIN.
   */
  orgMembersStreaks: Array<MemberStreakInfo>;
  /**
   * Returns all roles available in an organization.
   * Requires org ADMIN or SUPER_ADMIN.
   */
  orgRoles: Array<Role>;
  organization?: Maybe<Organization>;
  organizations?: Maybe<Array<Maybe<Organization>>>;
  position?: Maybe<Position>;
  positionsByDepartment: Array<Position>;
  positionsByOrganization: Array<Position>;
  project?: Maybe<Project>;
  /** List all members of a project. Requires org membership. */
  projectMembers: Array<ProjectMember>;
  /** List all projects a user is a direct member of within an organization. */
  projectMembersByUser: Array<ProjectMember>;
  projectsByOrganization: Array<Project>;
  /** Paginated projects in an organization. Defaults to page 1, limit 20. */
  projectsByOrganizationPaginated: PaginatedProjects;
  /** Get a single internal service by ID. SUPER_ADMIN only. */
  service?: Maybe<InternalService>;
  /** Analytics for a single InternalService. SUPER_ADMIN only. */
  serviceAnalytics: ServiceAnalytics;
  /** List all registered internal services. SUPER_ADMIN only. */
  services: Array<InternalService>;
  sessions: Array<Session>;
  task?: Maybe<Task>;
  tasksByAssignedTeam: Array<Task>;
  tasksByAssignedUser: Array<Task>;
  tasksByOrganization: Array<Task>;
  tasksByProject: Array<Task>;
  team?: Maybe<Team>;
  teamMember?: Maybe<TeamMember>;
  teamMembersByTeam: Array<TeamMember>;
  /** Paginated members of a team. Defaults to page 1, limit 20. */
  teamMembersByTeamPaginated: PaginatedTeamMembers;
  teamMembersByUser: Array<TeamMember>;
  teamsByOrganization: Array<Team>;
  /** Paginated teams in an organization. Defaults to page 1, limit 20. */
  teamsByOrganizationPaginated: PaginatedTeams;
  teamsByProject: Array<Team>;
  /**
   * Returns the top N streakers in an organization, ranked by currentStreak desc.
   * limit: max results (1–50, default 10).
   *
   * **Auth:** Requires a valid JWT. Caller must be a member of the org or SUPER_ADMIN.
   */
  topStreakers: Array<StreakLeaderEntry>;
  /**
   * Returns the activity log for any user by ID, ordered most-recent-first.
   *
   * - `input.limit`: cap on records returned (max 100, default 50).
   *
   * **Auth:** Requires a valid JWT with super-admin role.
   */
  userActivities: Array<UserActivity>;
  /** List all department assignments for a user. Requires org membership. */
  userDepartments: Array<UserDepartment>;
  /**
   * Returns any user's role in a given organization.
   * Requires org admin or super-admin.
   * Returns null if the user is not a member.
   */
  userOrgRole?: Maybe<UserOrgRole>;
  /**
   * Returns the streak info for any user by ID.
   *
   * **Auth:** Requires a valid JWT with super-admin role.
   *
   * Returns `null` if the user has no streak record yet.
   */
  userStreak?: Maybe<UserStreakInfo>;
  validateInvite: InviteValidationResult;
};


export type QueryAllPlatformUsersArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAnalyticsOverviewArgs = {
  range?: InputMaybe<AnalyticsRange>;
};


export type QueryAttendanceByOrganizationArgs = {
  input: AttendanceFilterInput;
};


export type QueryAttendanceSummaryByUserArgs = {
  userId: Scalars['String']['input'];
};


export type QueryDepartmentArgs = {
  id: Scalars['String']['input'];
};


export type QueryDepartmentUsersArgs = {
  departmentId: Scalars['String']['input'];
};


export type QueryDepartmentsByOrganizationArgs = {
  organizationId: Scalars['String']['input'];
};


export type QueryDepartmentsByOrganizationPaginatedArgs = {
  organizationId: Scalars['String']['input'];
  pagination?: InputMaybe<PaginationInput>;
};


export type QueryGetAllUsersArgs = {
  orgId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetUserByIdArgs = {
  id: Scalars['ID']['input'];
  orgId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGuestApplicationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGuestApplicationByInviteTokenArgs = {
  token: Scalars['String']['input'];
};


export type QueryGuestApplicationsArgs = {
  status?: InputMaybe<GuestApplicationStatus>;
};


export type QueryInvitesArgs = {
  email?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryJourneyProgressArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryMeetingAttendanceByOrganizationArgs = {
  input: MeetingAttendanceFilterInput;
};


export type QueryMembershipsArgs = {
  organizationId?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyActivitiesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyAttendanceArgs = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyLeaderboardRankArgs = {
  organizationId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyOrgRoleArgs = {
  organizationId: Scalars['String']['input'];
};


export type QueryOrgMembersStreaksArgs = {
  organizationId: Scalars['String']['input'];
};


export type QueryOrgRolesArgs = {
  organizationId: Scalars['String']['input'];
};


export type QueryOrganizationArgs = {
  id: Scalars['String']['input'];
};


export type QueryPositionArgs = {
  id: Scalars['String']['input'];
};


export type QueryPositionsByDepartmentArgs = {
  departmentId: Scalars['String']['input'];
};


export type QueryPositionsByOrganizationArgs = {
  organizationId: Scalars['String']['input'];
};


export type QueryProjectArgs = {
  id: Scalars['String']['input'];
};


export type QueryProjectMembersArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryProjectMembersByUserArgs = {
  organizationId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type QueryProjectsByOrganizationArgs = {
  organizationId: Scalars['String']['input'];
};


export type QueryProjectsByOrganizationPaginatedArgs = {
  organizationId: Scalars['String']['input'];
  pagination?: InputMaybe<PaginationInput>;
};


export type QueryServiceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryServiceAnalyticsArgs = {
  range?: InputMaybe<AnalyticsRange>;
  serviceId: Scalars['ID']['input'];
};


export type QuerySessionsArgs = {
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTaskArgs = {
  id: Scalars['String']['input'];
};


export type QueryTasksByAssignedTeamArgs = {
  teamId: Scalars['String']['input'];
};


export type QueryTasksByAssignedUserArgs = {
  organizationId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type QueryTasksByOrganizationArgs = {
  organizationId: Scalars['String']['input'];
};


export type QueryTasksByProjectArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryTeamArgs = {
  id: Scalars['String']['input'];
};


export type QueryTeamMemberArgs = {
  id: Scalars['String']['input'];
};


export type QueryTeamMembersByTeamArgs = {
  teamId: Scalars['String']['input'];
};


export type QueryTeamMembersByTeamPaginatedArgs = {
  pagination: PaginationInput;
  teamId: Scalars['String']['input'];
};


export type QueryTeamMembersByUserArgs = {
  organizationId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type QueryTeamsByOrganizationArgs = {
  organizationId: Scalars['String']['input'];
};


export type QueryTeamsByOrganizationPaginatedArgs = {
  organizationId: Scalars['String']['input'];
  pagination?: InputMaybe<PaginationInput>;
};


export type QueryTeamsByProjectArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryTopStreakersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUserActivitiesArgs = {
  input: UserActivitiesInput;
};


export type QueryUserDepartmentsArgs = {
  userId: Scalars['String']['input'];
};


export type QueryUserOrgRoleArgs = {
  organizationId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type QueryUserStreakArgs = {
  userId: Scalars['String']['input'];
};


export type QueryValidateInviteArgs = {
  token: Scalars['String']['input'];
};

/** Response returned by the recordDailyVisit mutation. */
export type RecordVisitResponse = {
  __typename?: 'RecordVisitResponse';
  /** True when the streak milestone (every 7 days) was reached and a new freeze was awarded. */
  freezeEarned: Scalars['Boolean']['output'];
  /** True when a freeze token was consumed to bridge a single missed day. */
  freezeUsed: Scalars['Boolean']['output'];
  /**
   * True when this call represents a new calendar day (UTC) compared to the last visit.
   * False when the user already visited today (idempotent call).
   */
  isNewDay: Scalars['Boolean']['output'];
  /** The user's updated streak information after the visit is recorded. */
  streak: UserStreakInfo;
};

export type RegisterInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type RemoveMemberInput = {
  organizationId: Scalars['String']['input'];
  /** The member to remove from the organization */
  userId: Scalars['String']['input'];
};

export type RequestPasswordResetInput = {
  email: Scalars['String']['input'];
};

export type ResetPasswordInput = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type Role = {
  __typename?: 'Role';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isSystemRole: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  organizationId?: Maybe<Scalars['String']['output']>;
};

export type SendGlobalIdOtpInput = {
  email: Scalars['String']['input'];
};

export type ServiceAnalytics = {
  __typename?: 'ServiceAnalytics';
  pageviews: Scalars['Int']['output'];
  serviceId: Scalars['ID']['output'];
  serviceName: Scalars['String']['output'];
  sessions: Scalars['Int']['output'];
  timeseries: Array<AnalyticsTimePoint>;
  topPages: Array<TopPage>;
  topReferrers: Array<TopReferrer>;
  uniqueVisitors: Scalars['Int']['output'];
};

export type ServiceAnalyticsRow = {
  __typename?: 'ServiceAnalyticsRow';
  lastSeenAt?: Maybe<Scalars['String']['output']>;
  pageviews: Scalars['Int']['output'];
  serviceId: Scalars['ID']['output'];
  serviceName: Scalars['String']['output'];
  sessions: Scalars['Int']['output'];
  uniqueVisitors: Scalars['Int']['output'];
};

export type Session = {
  __typename?: 'Session';
  createdAt: Scalars['String']['output'];
  device?: Maybe<Scalars['String']['output']>;
  expiresAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  sessionId: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type SingleAttendanceEntry = {
  status: AttendanceStatus;
  userId: Scalars['String']['input'];
};

/**
 * Single entry in the streak leaderboard.
 * rankChange: "up" | "down" | "same" — based on whether user is at their personal best.
 */
export type StreakLeaderEntry = {
  __typename?: 'StreakLeaderEntry';
  currentStreak: Scalars['Int']['output'];
  rank: Scalars['Int']['output'];
  rankChange: Scalars['String']['output'];
  userAvatarUrl?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
  userName: Scalars['String']['output'];
};

export type SubmitGuestApplicationInput = {
  email: Scalars['String']['input'];
  githubUsername?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  portfolioUrl?: InputMaybe<Scalars['String']['input']>;
  reason: Scalars['String']['input'];
};

export type SubmitReferralApplicationInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export enum SystemRole {
  SuperAdmin = 'SUPER_ADMIN',
  User = 'USER'
}

export type Task = {
  __typename?: 'Task';
  assignedTeamId?: Maybe<Scalars['String']['output']>;
  assignedUserId?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  githubBranch?: Maybe<Scalars['String']['output']>;
  githubIssueUrl?: Maybe<Scalars['String']['output']>;
  githubRepo?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  projectId: Scalars['String']['output'];
  status: TaskStatus;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export enum TaskStatus {
  Done = 'DONE',
  InProgress = 'IN_PROGRESS',
  Review = 'REVIEW',
  Todo = 'TODO'
}

export type Team = {
  __typename?: 'Team';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** True if this team was created by autoAssignTeams rather than manually. */
  isAutoAssigned: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  organizationId: Scalars['String']['output'];
  projectId?: Maybe<Scalars['String']['output']>;
  /** Which TechStack category this team groups, if auto-assigned. Null for manually-created teams. */
  techStack?: Maybe<TechStack>;
  updatedAt: Scalars['String']['output'];
};

export type TeamMember = {
  __typename?: 'TeamMember';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  role: TeamRole;
  teamId: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export enum TeamRole {
  Lead = 'LEAD',
  Member = 'MEMBER'
}

/**
 * User-selected (never auto-detected) primary tech-stack. Set via
 * updateProfile — purely the user's own choice, not derived from GitHub
 * activity/commits (a user can contribute to repos outside their stated
 * stack). Drives autoAssignTeams' grouping.
 */
export enum TechStack {
  Backend = 'BACKEND',
  Data = 'DATA',
  Frontend = 'FRONTEND',
  Fullstack = 'FULLSTACK',
  Mobile = 'MOBILE'
}

export type TelegramLinkResult = {
  __typename?: 'TelegramLinkResult';
  id: Scalars['String']['output'];
  telegramLinkedAt?: Maybe<Scalars['String']['output']>;
  telegramUserId?: Maybe<Scalars['String']['output']>;
  telegramUsername?: Maybe<Scalars['String']['output']>;
};

/**
 * Raw payload from the Telegram Login Widget — forward it to this mutation
 * exactly as Telegram's widget callback receives it, field names included.
 * https://core.telegram.org/widgets/login#receiving-authorization-data
 */
export type TelegramLoginWidgetInput = {
  auth_date: Scalars['Float']['input'];
  first_name: Scalars['String']['input'];
  hash: Scalars['String']['input'];
  id: Scalars['Float']['input'];
  last_name?: InputMaybe<Scalars['String']['input']>;
  photo_url?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type TopPage = {
  __typename?: 'TopPage';
  pageviews: Scalars['Int']['output'];
  path: Scalars['String']['output'];
  uniqueVisitors: Scalars['Int']['output'];
};

export type TopReferrer = {
  __typename?: 'TopReferrer';
  count: Scalars['Int']['output'];
  referrer: Scalars['String']['output'];
};

export type UpdateDepartmentInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMemberRoleInput = {
  organizationId: Scalars['String']['input'];
  /** The new role to assign */
  roleId: Scalars['String']['input'];
  /** The member whose role should be changed */
  userId: Scalars['String']['input'];
};

export type UpdateOrganizationInput = {
  name: Scalars['String']['input'];
};

export type UpdatePositionInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

/**
 * All fields are optional — only provided fields are updated.
 * name updates the User record; everything else updates UserDetails.
 * dob: ISO date string e.g. "1995-01-15"
 */
export type UpdateProfileInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  dob?: InputMaybe<Scalars['String']['input']>;
  gfgUsername?: InputMaybe<Scalars['String']['input']>;
  githubUsername?: InputMaybe<Scalars['String']['input']>;
  instagramUrl?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  leetcodeUsername?: InputMaybe<Scalars['String']['input']>;
  linkedInUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  portfolioUrl?: InputMaybe<Scalars['String']['input']>;
  primaryTechStack?: InputMaybe<TechStack>;
  profilePicUrl?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectMemberInput = {
  role: ProjectRole;
};

export type UpdateServiceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  githubUrl?: InputMaybe<Scalars['String']['input']>;
  goal?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  platformLinks?: InputMaybe<Array<Scalars['String']['input']>>;
  platforms?: InputMaybe<Array<Scalars['String']['input']>>;
  uptime?: InputMaybe<Scalars['Float']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTaskInput = {
  assignedTeamId?: InputMaybe<Scalars['String']['input']>;
  assignedUserId?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  githubBranch?: InputMaybe<Scalars['String']['input']>;
  githubIssueUrl?: InputMaybe<Scalars['String']['input']>;
  githubRepo?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<TaskStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTeamInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTeamMemberInput = {
  role: TeamRole;
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['String']['output'];
  /**
   * Directory-facing profile details. When the user's UserDetails.isPublic is
   * false, this still resolves (so name/email consumers aren't affected) but
   * the directory fields inside it (avatar/title/bio/GitHub/LinkedIn etc.) are
   * server-side nulled — never sent to the client for a private user.
   */
  details?: Maybe<UserDetails>;
  email: Scalars['String']['output'];
  hashedRefreshToken?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  systemRole: SystemRole;
  updatedAt: Scalars['String']['output'];
};

/** Input for querying another user's activity log (super-admin only). */
export type UserActivitiesInput = {
  /** Maximum number of records to return. Capped at 100; defaults to 50. */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** UUID of the user whose activity log is being requested. */
  userId: Scalars['String']['input'];
};

/** A single activity event recorded for a user. */
export type UserActivity = {
  __typename?: 'UserActivity';
  /** The type of action the user performed (e.g. LOGIN, TASK_UPDATE). */
  activityType: ActivityType;
  /** ISO-8601 timestamp of when the activity was recorded (UTC). */
  createdAt: Scalars['String']['output'];
  id: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

/** Junction record linking a user to a department and position within that department. */
export type UserDepartment = {
  __typename?: 'UserDepartment';
  createdAt: Scalars['String']['output'];
  departmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  positionId: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type UserDetails = {
  __typename?: 'UserDetails';
  address?: Maybe<Scalars['String']['output']>;
  avatarUrl?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  dob?: Maybe<Scalars['String']['output']>;
  gfgUsername?: Maybe<Scalars['String']['output']>;
  githubUsername?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  instagramUrl?: Maybe<Scalars['String']['output']>;
  /**
   * Whether this user's directory fields (above) are visible to other org
   * members in getAllUsers/allPlatformUsers. Defaults true. Does not affect
   * myProfile — a user always sees their own full details regardless.
   */
  isPublic: Scalars['Boolean']['output'];
  leetcodeUsername?: Maybe<Scalars['String']['output']>;
  linkedInUrl?: Maybe<Scalars['String']['output']>;
  phoneNumber?: Maybe<Scalars['String']['output']>;
  portfolioUrl?: Maybe<Scalars['String']['output']>;
  /** User's own choice — see the TechStack enum doc comment. */
  primaryTechStack?: Maybe<TechStack>;
  profilePicUrl?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

/** A user's role details within a specific organization. */
export type UserOrgRole = {
  __typename?: 'UserOrgRole';
  isSystemRole: Scalars['Boolean']['output'];
  joinedAt: Scalars['String']['output'];
  membershipId: Scalars['ID']['output'];
  organizationId: Scalars['String']['output'];
  roleDescription?: Maybe<Scalars['String']['output']>;
  roleId: Scalars['String']['output'];
  /** Human-readable name of the role (e.g. ADMIN, VIEWER, MEMBER). */
  roleName: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type UserProfile = {
  __typename?: 'UserProfile';
  createdAt: Scalars['String']['output'];
  details?: Maybe<UserDetails>;
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  systemRole: SystemRole;
  /** Telegram numeric user ID, set once the account is linked via linkTelegramAccount. Null if never linked. */
  telegramUserId?: Maybe<Scalars['String']['output']>;
  telegramUsername?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

/** Streak and freeze token state for a user. */
export type UserStreakInfo = {
  __typename?: 'UserStreakInfo';
  /** ISO-8601 timestamp of when this streak record was first created. */
  createdAt: Scalars['String']['output'];
  /** Number of consecutive days the user has been active (including freeze-saved days). */
  currentStreak: Scalars['Int']['output'];
  /** ISO-8601 date a freeze was last consumed. Null if no freeze has been used. */
  freezeUsedDate?: Maybe<Scalars['String']['output']>;
  /** Number of streak-freeze tokens available. Max 3; earned every 7 consecutive days. */
  freezesAvailable: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  /** ISO-8601 date of the user's most recent activity day (UTC midnight). Null if never active. */
  lastActivityDate?: Maybe<Scalars['String']['output']>;
  /** The highest streak the user has ever achieved. */
  longestStreak: Scalars['Int']['output'];
  /** ISO-8601 timestamp of the last update to this streak record. */
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type VerifyGlobalIdOtpInput = {
  email: Scalars['String']['input'];
  otp: Scalars['String']['input'];
};

/**
 * Active weekly challenge. endsAt is always end-of-week (Sunday 23:59 UTC).
 * myProgress reflects the authenticated user's current streak capped at targetDays.
 */
export type WeeklyChallenge = {
  __typename?: 'WeeklyChallenge';
  badgeName: Scalars['String']['output'];
  description: Scalars['String']['output'];
  endsAt: Scalars['String']['output'];
  id: Scalars['String']['output'];
  myProgress: Scalars['Int']['output'];
  targetDays: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthResponse', accessToken: string } };

export type RefreshTokensMutationVariables = Exact<{ [key: string]: never; }>;


export type RefreshTokensMutation = { __typename?: 'Mutation', refreshTokens: { __typename?: 'AuthResponse', accessToken: string } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

export type CurrentUserQueryVariables = Exact<{ [key: string]: never; }>;


export type CurrentUserQuery = { __typename?: 'Query', currentUser: { __typename?: 'AuthUser', sub: string, email: string, systemRole: SystemRole, orgId: string } };


export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const RefreshTokensDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RefreshTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refreshTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}}]}}]}}]} as unknown as DocumentNode<RefreshTokensMutation, RefreshTokensMutationVariables>;
export const LogoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"}}]}}]} as unknown as DocumentNode<LogoutMutation, LogoutMutationVariables>;
export const CurrentUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CurrentUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sub"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"systemRole"}},{"kind":"Field","name":{"kind":"Name","value":"orgId"}}]}}]}}]} as unknown as DocumentNode<CurrentUserQuery, CurrentUserQueryVariables>;