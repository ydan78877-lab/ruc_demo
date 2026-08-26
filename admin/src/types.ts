export type AccountStatus = "active" | "disabled";

export type StudentAccount = {
  id: string;
  name: string;
  cohort: string;
  major: string;
  status: AccountStatus;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
};

export type StudentProfile = {
  name: string;
  school: string;
  college: string;
  major: string;
  cohort: string;
  gpa: string;
  rank: string;
  skills: string;
  interests: string;
};

export type ExperienceRecord = {
  id: string;
  type: string;
  name: string;
  result: string;
  startMonth: string;
  endMonth: string;
  details: string;
  resumeSection: string;
  [key: string]: unknown;
};

export type PersonalData = {
  profile: StudentProfile;
  experiences: ExperienceRecord[];
  graduationChecks: Record<string, boolean>;
  templateConfig: Record<string, unknown> | null;
  todoStates: Record<string, boolean | string>;
  notes: string;
  version: number;
  updatedAt: string;
};

export type UserRecord = { user: StudentAccount; data: PersonalData };

export type AuditLog = {
  _id: string;
  actor: string;
  action: string;
  targetUserId: string;
  detail?: Record<string, unknown>;
  createdAt: string;
};

export type AdminCampusMember = {
  id: string;
  userId: string;
  name: string;
  cohort: string;
  major: string;
  role: string;
  joinedAt: string;
};

export type AdminCampusSpace = {
  id: string;
  name: string;
  type: string;
  status: string;
  approvalRequired: boolean;
  code: string;
  ownerId: string;
  ownerName: string;
  memberCount: number;
  matterCount: number;
  pendingCount: number;
  createdAt: string;
  updatedAt: string;
  members: AdminCampusMember[];
};

export type AdminReminder = {
  id: string;
  matterId: string;
  scope: "space" | "personal";
  userId: string;
  userName: string;
  userCohort: string;
  userMajor: string;
  spaceId: string;
  spaceName: string;
  title: string;
  type: string;
  status: string;
  sourceStatus: string;
  action: string;
  date: string;
  clock: string;
  time: string;
  priority: string;
  updatedAt: string;
};

export type AdminCampusOverview = {
  spaces: AdminCampusSpace[];
  reminders: AdminReminder[];
  syncedAt: string;
};
