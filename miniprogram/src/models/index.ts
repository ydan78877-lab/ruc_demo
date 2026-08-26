export type CaseRecord = {
  id: string
  applicationSeason: string
  studentName: string
  tags: string[]
  school: string
  program: string
  region: string
  undergradCollege: string
  undergradMajor: string
  gpa: string
  englishScore: string
  greGmat: string
  internships: string
  research: string
  applicationAt: string
  admissionAt: string
  showStudentCard: boolean
  studentCardIntro: string
  isFinalDestination: boolean
  sortWeight: number
  logoPath: string
  searchText: string
}

export type SchoolRecord = {
  name: string
  logoPath: string
}

export type InterviewRecord = {
  id: string
  subject: string
  summary: string
  imagePath: string
  url: string
  weight: number
  uploadTime: string
  tags: string[]
}

export type StudentProfile = {
  name: string
  school: string
  college: string
  major: string
  cohort: string
  gpa: string
  rank: string
  skills: string
  interests: string
}

export type AccountStatus = 'active' | 'disabled'

export type StudentAccount = {
  id: string
  name: string
  cohort: string
  major: string
  status: AccountStatus
  onboardingComplete: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string
}

export type ExperienceCategory = 'academic' | 'competition' | 'internship' | 'organization' | 'arts' | 'language' | 'other'
export type BaseSection = 'ideology' | 'service' | 'sports' | 'award'
export type ResearchSection = 'academic' | 'competition' | 'conference' | 'practice' | 'innovation'
export type JournalClass = '' | 'A' | 'B' | 'C'

export type ExperienceRecord = {
  id: string
  /** 旧版中文类型，保留用于兼容已经写入的本地档案。 */
  type: string
  name: string
  result: string
  startMonth: string
  endMonth: string
  details: string
  resumeSection: string
  score: number
  createdAt: number
  year?: string
  category?: ExperienceCategory
  groupKey?: string
  presetId?: string
  projectTitle?: string
  journalName?: string
  journalClass?: JournalClass
  role?: string
  roleCode?: string
  resultCode?: string
  completionCode?: string
  languageScores?: Record<string, string>
  languageNote?: string
  competitivenessBranchId?: string
  countsForBase?: boolean
  baseSection?: BaseSection
  baseScore?: number
  countsForResearch?: boolean
  researchSection?: ResearchSection
  researchScore?: number
  countsForVolunteer?: boolean
  volunteerHours?: number
}

export type GraduationMode = 'automatic' | 'manual' | 'volunteer'
export type GraduationCreditMode = 'fixed' | 'minimum'
export type GraduationModule = {
  id: string
  title: string
}
export type GraduationRequirement = {
  id: string
  group: string
  title: string
  credits: number
  creditMode: GraduationCreditMode
  detail: string
  mode: GraduationMode
  volunteerMinCount?: number
  volunteerMinHours?: number
  visible: boolean
}

export type TemplateBranchKind = 'base' | 'research-score' | 'rank' | 'gpa' | 'research-count' | 'language' | 'internship' | 'campus' | 'skills' | 'custom'
export type TemplateBaseRule = {
  id: BaseSection
  title: string
  target: number
}
export type TemplateBranch = {
  id: string
  title: string
  kind: TemplateBranchKind
  target: number
  unit: string
  scoringNote: string
  visible: boolean
  baseRules?: TemplateBaseRule[]
  items?: GoalChecklistItem[]
}
export type TemplatePage = {
  id: string
  tabLabel: string
  title: string
  kind: 'graduation' | 'qualification' | 'resume' | 'custom'
  visible: boolean
  branches: TemplateBranch[]
  graduationModules?: GraduationModule[]
  checklist?: GraduationRequirement[]
}
export type StudentTemplateConfig = {
  id: string
  title: string
  primary: boolean
  pages: TemplatePage[]
  goalWorkspace?: StudentGoalWorkspace
}

export type GoalChecklistItem = {
  id: string
  title: string
  requirement: string
  description: string
  completed: boolean
}

export type StudentGoalKind = 'graduation' | 'system' | 'custom'

export type StudentGoal = StudentTemplateConfig & {
  kind: StudentGoalKind
  protected: boolean
  sourceKey: string
  sourceLabel: string
  matched: boolean
}

export type StudentGoalWorkspace = {
  schemaVersion: 2
  activeGoalId: string
  goals: StudentGoal[]
}

export type PersonalData = {
  profile: StudentProfile
  experiences: ExperienceRecord[]
  graduationChecks: Record<string, boolean>
  templateConfig: StudentTemplateConfig
  todoStates: Record<string, boolean | string>
  notes: string
  version: number
  updatedAt: string
}

export type AccountBootstrap = {
  user: StudentAccount
  data: PersonalData
}
