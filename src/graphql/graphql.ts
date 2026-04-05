/* eslint-disable */
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
  DateTime: { input: string; output: string; }
};

export type AcceptInviteInput = {
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export enum ActivityType {
  Login = 'LOGIN',
  MeetingAttended = 'MEETING_ATTENDED',
  ProjectContribution = 'PROJECT_CONTRIBUTION',
  TaskUpdate = 'TASK_UPDATE'
}

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
  refreshToken: Scalars['String']['output'];
};

export type AuthUser = {
  __typename?: 'AuthUser';
  email: Scalars['String']['output'];
  orgId: Scalars['String']['output'];
  sub: Scalars['String']['output'];
  systemRole: SystemRole;
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

export type Coupon = {
  __typename?: 'Coupon';
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  discountType: Scalars['String']['output'];
  discountValue: Scalars['Float']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  maxDiscountAmount?: Maybe<Scalars['Float']['output']>;
  maxUsageCount: Scalars['Int']['output'];
  minOrderAmount: Scalars['Float']['output'];
  status: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  usageCount: Scalars['Int']['output'];
  usagePerUser: Scalars['Int']['output'];
};

export type CouponStats = {
  __typename?: 'CouponStats';
  coupon: Coupon;
  remainingUsage: Scalars['Int']['output'];
  totalDiscount: Scalars['Float']['output'];
  totalOrders: Scalars['Int']['output'];
  totalUsed: Scalars['Int']['output'];
};

export enum CouponStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Inactive = 'INACTIVE',
  Used = 'USED'
}

export type CouponValidation = {
  __typename?: 'CouponValidation';
  discount: Scalars['Float']['output'];
  isValid: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
};

export type CreateCouponInput = {
  code: Scalars['String']['input'];
  discountType: DiscountType;
  discountValue: Scalars['Float']['input'];
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  maxDiscountAmount?: InputMaybe<Scalars['Float']['input']>;
  maxUsageCount?: InputMaybe<Scalars['Int']['input']>;
  minOrderAmount?: InputMaybe<Scalars['Float']['input']>;
  usagePerUser?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateDepartmentInput = {
  name: Scalars['String']['input'];
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

export type CreatePricingPlanInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  durationMonths?: InputMaybe<Scalars['Int']['input']>;
  features?: InputMaybe<Array<Scalars['String']['input']>>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isFeatured?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  price: Scalars['Float']['input'];
};

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  organizationId: Scalars['String']['input'];
};

export type CreateSaleDiscountInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  discountType: DiscountType;
  discountValue: Scalars['Float']['input'];
  endDate: Scalars['DateTime']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isAutoApply?: InputMaybe<Scalars['Boolean']['input']>;
  maxDiscountAmount?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  planId?: InputMaybe<Scalars['String']['input']>;
  startDate: Scalars['DateTime']['input'];
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

export type Department = {
  __typename?: 'Department';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  organizationId: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type DiscountStats = {
  __typename?: 'DiscountStats';
  averageDiscount: Scalars['Float']['output'];
  daysRemaining: Scalars['Int']['output'];
  discount: SaleDiscount;
  isActive: Scalars['Boolean']['output'];
  totalDiscountGiven: Scalars['Float']['output'];
  totalOrders: Scalars['Int']['output'];
};

export enum DiscountType {
  FixedAmount = 'FIXED_AMOUNT',
  Percentage = 'PERCENTAGE'
}

export type InitiateOrderInput = {
  couponCode?: InputMaybe<Scalars['String']['input']>;
  planId: Scalars['String']['input'];
  redirectUrl?: InputMaybe<Scalars['String']['input']>;
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
  bulkMarkAttendance: BulkAttendanceResult;
  checkIn: Attendance;
  checkOut: Attendance;
  createCoupon: Coupon;
  createDepartment: Department;
  createInviteLink: CreateInviteLinkResponse;
  createMembership: Membership;
  createOrganization: Organization;
  createPosition: Position;
  createPricingPlan: PricingPlan;
  createProject: Project;
  createSaleDiscount: SaleDiscount;
  createSession: Session;
  createTask: Task;
  createTeam: Team;
  createTeamMember: TeamMember;
  deactivateCoupon: Coupon;
  deactivateSaleDiscount: SaleDiscount;
  deleteDepartment: Scalars['Boolean']['output'];
  deleteOrganization: Scalars['Boolean']['output'];
  deletePosition: Scalars['Boolean']['output'];
  deletePricingPlan: PricingPlan;
  deleteProject: Scalars['Boolean']['output'];
  deleteTask: Scalars['Boolean']['output'];
  deleteTeam: Scalars['Boolean']['output'];
  deleteTeamMember: Scalars['Boolean']['output'];
  initiateOrder: OrderResponse;
  login: AuthResponse;
  logout: Scalars['Boolean']['output'];
  markAttendance: Attendance;
  recordDailyVisit: RecordVisitResponse;
  refreshTokens: AuthResponse;
  register: AuthResponse;
  updateCoupon: Coupon;
  updateDepartment: Department;
  updateOrganization: Organization;
  updatePosition: Position;
  updatePricingPlan: PricingPlan;
  updateProject: Project;
  updateSaleDiscount: SaleDiscount;
  updateTask: Task;
  updateTeam: Team;
  updateTeamMember: TeamMember;
};


export type MutationAcceptInviteArgs = {
  input: AcceptInviteInput;
};


export type MutationBulkMarkAttendanceArgs = {
  input: BulkMarkAttendanceInput;
};


export type MutationCheckInArgs = {
  organizationId: Scalars['String']['input'];
};


export type MutationCreateCouponArgs = {
  input: CreateCouponInput;
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


export type MutationCreatePricingPlanArgs = {
  input: CreatePricingPlanInput;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationCreateSaleDiscountArgs = {
  input: CreateSaleDiscountInput;
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


export type MutationDeactivateCouponArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeactivateSaleDiscountArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteDepartmentArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteOrganizationArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeletePositionArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeletePricingPlanArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteProjectArgs = {
  id: Scalars['String']['input'];
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


export type MutationInitiateOrderArgs = {
  input: InitiateOrderInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationMarkAttendanceArgs = {
  input: MarkAttendanceInput;
};


export type MutationRegisterArgs = {
  input: RegisterInput;
};


export type MutationUpdateCouponArgs = {
  id: Scalars['String']['input'];
  input: UpdateCouponInput;
};


export type MutationUpdateDepartmentArgs = {
  id: Scalars['String']['input'];
  input: UpdateDepartmentInput;
};


export type MutationUpdateOrganizationArgs = {
  id: Scalars['String']['input'];
  input: UpdateOrganizationInput;
};


export type MutationUpdatePositionArgs = {
  id: Scalars['String']['input'];
  input: UpdatePositionInput;
};


export type MutationUpdatePricingPlanArgs = {
  id: Scalars['String']['input'];
  input: UpdatePricingPlanInput;
};


export type MutationUpdateProjectArgs = {
  id: Scalars['String']['input'];
  input: UpdateProjectInput;
};


export type MutationUpdateSaleDiscountArgs = {
  id: Scalars['String']['input'];
  input: UpdateSaleDiscountInput;
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

export type Order = {
  __typename?: 'Order';
  amount: Scalars['Float']['output'];
  checkoutUrl?: Maybe<Scalars['String']['output']>;
  coupon?: Maybe<Coupon>;
  couponId?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  discountAmount: Scalars['Float']['output'];
  finalAmount: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  merchantOrderId: Scalars['String']['output'];
  metadata?: Maybe<Scalars['String']['output']>;
  paymentGatewayOrderId?: Maybe<Scalars['String']['output']>;
  plan: PricingPlan;
  planId: Scalars['String']['output'];
  saleDiscountId?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  transactionId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type OrderResponse = {
  __typename?: 'OrderResponse';
  amount: Scalars['Float']['output'];
  checkoutUrl: Scalars['String']['output'];
  order: Order;
};

export enum OrderStatus {
  Cancelled = 'CANCELLED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Success = 'SUCCESS'
}

export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
  invites?: Maybe<Array<Maybe<Invite>>>;
  memberships?: Maybe<Array<Maybe<Membership>>>;
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type Position = {
  __typename?: 'Position';
  createdAt: Scalars['String']['output'];
  departmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type PricingPlan = {
  __typename?: 'PricingPlan';
  createdAt: Scalars['DateTime']['output'];
  currency: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  durationMonths: Scalars['Int']['output'];
  features: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isFeatured: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type PricingPlanStats = {
  __typename?: 'PricingPlanStats';
  activeSubscriptions: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  currency: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  durationMonths: Scalars['Int']['output'];
  features: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isFeatured: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  totalRevenue: Scalars['Float']['output'];
  totalSubscriptions: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
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

export type Query = {
  __typename?: 'Query';
  activeCoupons: Array<Coupon>;
  activeDiscounts: Array<SaleDiscount>;
  allDepartments: Array<Department>;
  allPositions: Array<Position>;
  allProjects: Array<Project>;
  allTasks: Array<Task>;
  allTeams: Array<Team>;
  attendanceByOrganization: Array<Attendance>;
  attendanceSummaryByUser?: Maybe<AttendanceSummary>;
  coupon: Coupon;
  couponStats: CouponStats;
  coupons: Array<Coupon>;
  currentUser: AuthUser;
  department?: Maybe<Department>;
  departmentsByOrganization: Array<Department>;
  discountStats: DiscountStats;
  discounts: Array<SaleDiscount>;
  featuredPricingPlans: Array<PricingPlan>;
  getAllUsers: Array<User>;
  getUserById?: Maybe<User>;
  hasActiveSubscription: Scalars['Boolean']['output'];
  /**
   * Fetch invites for an organization.
   * - organizationId: required for non-super-admins
   * - email: filter by invitee's email (the person who was invited)
   * - status: "pending" | "accepted" | "expired" | "all" (default: "all")
   */
  invites: Array<Invite>;
  memberships: Array<Membership>;
  myActivities: Array<UserActivity>;
  myAttendance: Array<Attendance>;
  myAttendanceSummary?: Maybe<AttendanceSummary>;
  myStreak: UserStreakInfo;
  mySubscription?: Maybe<Subscription>;
  order: Order;
  organization?: Maybe<Organization>;
  organizations?: Maybe<Array<Maybe<Organization>>>;
  planDiscount?: Maybe<SaleDiscount>;
  position?: Maybe<Position>;
  positionsByDepartment: Array<Position>;
  positionsByOrganization: Array<Position>;
  pricingPlan: PricingPlan;
  pricingPlanStats: PricingPlanStats;
  pricingPlans: Array<PricingPlan>;
  project?: Maybe<Project>;
  projectsByOrganization: Array<Project>;
  sessions: Array<Session>;
  task?: Maybe<Task>;
  tasksByAssignedTeam: Array<Task>;
  tasksByAssignedUser: Array<Task>;
  tasksByOrganization: Array<Task>;
  tasksByProject: Array<Task>;
  team?: Maybe<Team>;
  teamMember?: Maybe<TeamMember>;
  teamMembersByTeam: Array<TeamMember>;
  teamMembersByUser: Array<TeamMember>;
  teamsByOrganization: Array<Team>;
  teamsByProject: Array<Team>;
  userActivities: Array<UserActivity>;
  userOrders: Array<Order>;
  userStreak?: Maybe<UserStreakInfo>;
  validateCoupon: CouponValidation;
  validateInvite: InviteValidationResult;
};


export type QueryAttendanceByOrganizationArgs = {
  input: AttendanceFilterInput;
};


export type QueryAttendanceSummaryByUserArgs = {
  userId: Scalars['String']['input'];
};


export type QueryCouponArgs = {
  code: Scalars['String']['input'];
};


export type QueryCouponStatsArgs = {
  id: Scalars['String']['input'];
};


export type QueryDepartmentArgs = {
  id: Scalars['String']['input'];
};


export type QueryDepartmentsByOrganizationArgs = {
  organizationId: Scalars['String']['input'];
};


export type QueryDiscountStatsArgs = {
  id: Scalars['String']['input'];
};


export type QueryGetUserByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryInvitesArgs = {
  email?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
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
  startDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryOrderArgs = {
  id: Scalars['String']['input'];
};


export type QueryOrganizationArgs = {
  id: Scalars['String']['input'];
};


export type QueryPlanDiscountArgs = {
  planId: Scalars['String']['input'];
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


export type QueryPricingPlanArgs = {
  id: Scalars['String']['input'];
};


export type QueryPricingPlanStatsArgs = {
  id: Scalars['String']['input'];
};


export type QueryProjectArgs = {
  id: Scalars['String']['input'];
};


export type QueryProjectsByOrganizationArgs = {
  organizationId: Scalars['String']['input'];
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


export type QueryTeamMembersByUserArgs = {
  organizationId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type QueryTeamsByOrganizationArgs = {
  organizationId: Scalars['String']['input'];
};


export type QueryTeamsByProjectArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryUserActivitiesArgs = {
  input: UserActivitiesInput;
};


export type QueryUserOrdersArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUserStreakArgs = {
  userId: Scalars['String']['input'];
};


export type QueryValidateCouponArgs = {
  input: ValidateCouponInput;
};


export type QueryValidateInviteArgs = {
  token: Scalars['String']['input'];
};

export type RecordVisitResponse = {
  __typename?: 'RecordVisitResponse';
  freezeEarned: Scalars['Boolean']['output'];
  freezeUsed: Scalars['Boolean']['output'];
  isNewDay: Scalars['Boolean']['output'];
  streak: UserStreakInfo;
};

export type Refund = {
  __typename?: 'Refund';
  amount: Scalars['Float']['output'];
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  initiatedAt: Scalars['DateTime']['output'];
  order: Order;
  orderId: Scalars['String']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  refundId: Scalars['String']['output'];
  status: Scalars['String']['output'];
  transactionId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type RefundOrderInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
};

export enum RefundStatus {
  Failed = 'FAILED',
  Initiated = 'INITIATED',
  Pending = 'PENDING',
  Success = 'SUCCESS'
}

export type RegisterInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type SaleDiscount = {
  __typename?: 'SaleDiscount';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  discountType: Scalars['String']['output'];
  discountValue: Scalars['Float']['output'];
  endDate: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isAutoApply: Scalars['Boolean']['output'];
  maxDiscountAmount?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  planId?: Maybe<Scalars['String']['output']>;
  startDate: Scalars['DateTime']['output'];
  updatedAt: Scalars['DateTime']['output'];
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

export type Subscription = {
  __typename?: 'Subscription';
  autoRenew: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  endDate?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  lastOrderId?: Maybe<Scalars['String']['output']>;
  plan: PricingPlan;
  planId: Scalars['String']['output'];
  startDate: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export enum SubscriptionStatus {
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
  Expired = 'EXPIRED',
  Inactive = 'INACTIVE'
}

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
  name: Scalars['String']['output'];
  organizationId: Scalars['String']['output'];
  projectId?: Maybe<Scalars['String']['output']>;
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

export type UpdateCouponInput = {
  discountValue?: InputMaybe<Scalars['Float']['input']>;
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  maxDiscountAmount?: InputMaybe<Scalars['Float']['input']>;
  maxUsageCount?: InputMaybe<Scalars['Int']['input']>;
  minOrderAmount?: InputMaybe<Scalars['Float']['input']>;
  usagePerUser?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateDepartmentInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationInput = {
  name: Scalars['String']['input'];
};

export type UpdatePositionInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePricingPlanInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  durationMonths?: InputMaybe<Scalars['Int']['input']>;
  features?: InputMaybe<Array<Scalars['String']['input']>>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isFeatured?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSaleDiscountInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  discountValue?: InputMaybe<Scalars['Float']['input']>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isAutoApply?: InputMaybe<Scalars['Boolean']['input']>;
  maxDiscountAmount?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
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
  email: Scalars['String']['output'];
  hashedRefreshToken?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  systemRole: SystemRole;
  updatedAt: Scalars['String']['output'];
};

export type UserActivitiesInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['String']['input'];
};

export type UserActivity = {
  __typename?: 'UserActivity';
  activityType: ActivityType;
  createdAt: Scalars['String']['output'];
  id: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type UserStreakInfo = {
  __typename?: 'UserStreakInfo';
  createdAt: Scalars['String']['output'];
  currentStreak: Scalars['Int']['output'];
  freezeUsedDate?: Maybe<Scalars['String']['output']>;
  freezesAvailable: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  lastActivityDate?: Maybe<Scalars['String']['output']>;
  longestStreak: Scalars['Int']['output'];
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type ValidateCouponInput = {
  code: Scalars['String']['input'];
  orderAmount: Scalars['Float']['input'];
};
