import {
  ArrowDownIcon,
  ArrowUpIcon,
  BackpackIcon,
  BarChartIcon,
  CardStackIcon,
  CheckCircledIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClockIcon,
  CopyIcon,
  Cross1Icon,
  DashboardIcon,
  DownloadIcon,
  EyeNoneIcon,
  EyeOpenIcon,
  ExitIcon,
  FileTextIcon,
  GearIcon,
  GlobeIcon,
  LayersIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  OpenInNewWindowIcon,
  Pencil2Icon,
  PersonIcon,
  PlusIcon,
  ReaderIcon,
  ReloadIcon,
  RocketIcon,
  StarIcon,
  TrashIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BottomSheet,
  Carousel,
  KeyboardInput,
  KeyboardTextarea,
  MobileScroll,
  useKeyboard,
  useMobileDevice,
} from "./mobile";
import {
  articles as caseLibraryArticles,
  cases as caseLibraryCases,
  filterGroups as caseLibraryFilterGroups,
  pageConfig as caseLibraryPageConfig,
} from "./data/caseLibraryData.js";
import type { CaseLibraryCase } from "./data/caseLibraryData.js";

type IconName = "book" | "lab" | "rank" | "academic" | "language" | "internship" | "star";
type PageId = string;
type BranchKind = "base" | "research-score" | "rank" | "gpa" | "research-count" | "language" | "internship" | "campus" | "skills";
type BaseSection = "ideology" | "service" | "sports" | "award" | "negative";
type ResearchSection = "academic" | "competition" | "conference" | "practice" | "innovation";
type GraduationGroupId = string;
type ExperienceCategory = "academic" | "competition" | "internship" | "organization" | "arts" | "language" | "other";
type JournalClass = "" | "A" | "B" | "C";

type TemplateDemoState = {
  personalSaved: boolean;
  published: boolean;
};

type BaseRule = {
  id: BaseSection;
  title: string;
  target: number;
  mode: "minimum" | "informational" | "deduction";
};

type Experience = {
  id: string;
  year: string;
  startMonth?: string;
  endMonth?: string;
  name: string;
  result: string;
  details?: string;
  groupKey: string;
  presetId?: string;
  projectTitle?: string;
  journalName?: string;
  role?: string;
  resultCode?: string;
  completionCode?: string;
  languageScores?: Record<string, string>;
  languageNote?: string;
  competitivenessBranchId?: string;
  score?: number;
  countsForRecommendation?: boolean;
  countsForBase?: boolean;
  baseSection?: BaseSection;
  baseScore?: number;
  countsForResearch?: boolean;
  researchSection?: ResearchSection;
  researchScore?: number;
  countsForVolunteer?: boolean;
  volunteerHours?: number;
  category: ExperienceCategory;
};

type PresetResult = {
  id: string;
  label: string;
  score?: number;
};

type PresetChoice = {
  id: string;
  label: string;
};

type CommonExperiencePreset = {
  id: string;
  category: ExperienceCategory;
  name: string;
  resultLabel: string;
  results: PresetResult[];
  roles?: PresetChoice[];
  teamAward?: boolean;
  completionOptions?: PresetChoice[];
  requiresProjectTitle?: boolean;
  qualificationScored?: boolean;
  competitivenessBranchId?: string;
  researchSection: ResearchSection;
  defaultDetails: string;
};

type StudentProfile = {
  name: string;
  school?: string;
  college?: string;
  major: string;
  cohort: string;
  gpa: number;
  baseScore?: number;
  politicalTheoryQualified: boolean;
  coreRank: number;
  skills?: string;
  hobbies?: string;
  graduationChecks?: Record<string, boolean>;
  experiences: Experience[];
  dataVersion?: number;
};

type GraduationRequirement = {
  id: string;
  group: GraduationGroupId;
  title: string;
  credits: number;
  creditMode: "fixed" | "minimum";
  detail: string;
  mode: "manual" | "automatic" | "volunteer";
  volunteerMinCount?: number;
  volunteerMinHours?: number;
  visible: boolean;
};

type GraduationModule = {
  id: GraduationGroupId;
  title: string;
};

type BranchConfig = {
  id: string;
  title: string;
  kind: BranchKind;
  icon: IconName;
  target: number;
  unit: string;
  successText: string;
  pendingText: string;
  scoringNote: string;
  visible: boolean;
  subRules?: BaseRule[];
};

type PageConfig = {
  id: PageId;
  tabLabel: string;
  title: string;
  description: string;
  visible: boolean;
  branches: BranchConfig[];
  graduationModules?: GraduationModule[];
  checklist?: GraduationRequirement[];
  checklistVersion?: number;
};

type TemplateConfig = {
  id: string;
  title: string;
  primary: boolean;
  pages: PageConfig[];
};

type AccountRecord = {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string;
};

type AccountTemplateRecord = {
  id: string;
  ownerUserId: string;
  ownerName: string;
  title: string;
  description: string;
  visibility: "private" | "unlisted" | "library";
  shareCode: string | null;
  sourceTemplateId: string | null;
  primary: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  data: TemplateConfig;
};

type LibraryTemplateRecord = {
  id: string;
  ownerUserId: string;
  ownerName: string;
  title: string;
  description: string;
  shareCode: string | null;
  publishedAt: string | null;
};

type AuthenticatedAccountState = {
  mode: "authenticated";
  account: AccountRecord;
  profile: StudentProfile;
  templates: AccountTemplateRecord[];
  library: LibraryTemplateRecord[];
};

type AccountState =
  | { mode: "loading" }
  | { mode: "local" }
  | { mode: "anonymous" }
  | { mode: "error"; message: string }
  | AuthenticatedAccountState;

type WorkspacePage = "overview" | "goals" | "features" | "templates" | "agenda" | "spaces" | "space" | "reminder" | "reminder-editor" | "resource" | "cases" | "case-detail";
type WorkspaceTransitionDirection = "idle" | "forward" | "back";
type CampusSpaceKind = "class" | "course";
type CampusRole = "owner" | "admin" | "member";
type CampusJoinPolicy = "open" | "approval";
type ReminderType = "event" | "deadline" | "confirmation" | "info" | "resource";
type ReminderActionMode = "read" | "confirm" | "complete";
type ReminderStatus = "draft" | "published" | "updated" | "cancelled" | "archived";
type ResourceCategory = "课件" | "阅读材料" | "作业与练习" | "复习资料" | "其他";

type CampusSpace = {
  id: string;
  name: string;
  kind: CampusSpaceKind;
  code: string;
  role: CampusRole;
  memberCount: number;
  joinPolicy: CampusJoinPolicy;
  archived?: boolean;
  dissolvedAt?: string;
  color: "blue" | "teal" | "cyan" | "violet";
};

type CampusMember = {
  id: string;
  spaceId: string;
  name: string;
  role: CampusRole;
};

type CampusJoinRequest = {
  id: string;
  spaceId: string;
  applicantName: string;
  code: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
};

type ReminderDiff = { field: string; before: string; after: string };

type CampusReminder = {
  id: string;
  spaceId: string;
  type: ReminderType;
  title: string;
  startsAt?: string;
  endsAt?: string;
  dueAt?: string;
  allDay?: boolean;
  timezone: string;
  location?: string;
  attentionNotes?: string;
  body?: string;
  priority: "normal" | "important";
  actionMode: ReminderActionMode;
  status: ReminderStatus;
  version: number;
  publisherId: string;
  publishedAt: string;
  diff?: ReminderDiff[];
  readCount?: number;
  confirmedCount?: number;
  completedCount?: number;
  recipientCount?: number;
};

type ReminderRecipientState = {
  reminderId: string;
  userId: string;
  readAt?: string;
  confirmedAt?: string;
  completedAt?: string;
  personalRemindAt?: string;
  confirmedVersion?: number;
};

type ResourceVersion = {
  id: string;
  resourceId: string;
  version: number;
  label: string;
  url: string;
  fileName: string;
  publishedAt: string;
};

type CourseResource = {
  id: string;
  spaceId: string;
  title: string;
  category: ResourceCategory;
  lesson?: string;
  currentVersion: number;
  associatedReminderId?: string;
  status: "available" | "offline" | "failed";
  mimeType: "application/pdf" | "image/png";
  sizeLabel: string;
};

type CampusNotice = {
  id: string;
  title: string;
  createdAt: string;
  read: boolean;
};

type CampusDemoState = {
  version: 2;
  initializedAt: string;
  spaces: CampusSpace[];
  members: CampusMember[];
  joinRequests: CampusJoinRequest[];
  reminders: CampusReminder[];
  recipientStates: ReminderRecipientState[];
  resources: CourseResource[];
  resourceVersions: ResourceVersion[];
  notices: CampusNotice[];
};

const corePageIds = new Set(["graduation", "qualification", "competitiveness"]);

const defaultBaseRules: BaseRule[] = [
  { id: "ideology", title: "思想政治教育", target: 20, mode: "minimum" },
  { id: "service", title: "服务奉献、社会实践与对外交流", target: 20, mode: "minimum" },
  { id: "sports", title: "体育、文艺与劳动实践", target: 20, mode: "minimum" },
  { id: "award", title: "重大获奖", target: 0, mode: "informational" },
];

const baseSectionLabels: Record<BaseSection, string> = {
  ideology: "思想政治教育",
  service: "服务奉献、社会实践与对外交流",
  sports: "体育、文艺与劳动实践",
  award: "重大获奖",
  negative: "负面清单",
};
const researchSectionLabels: Record<ResearchSection, string> = {
  academic: "学术研究",
  competition: "学科竞赛",
  conference: "学术会议",
  practice: "实习实训",
  innovation: "创新项目",
};

const experienceCategoryLabels: Record<ExperienceCategory, string> = {
  academic: "学术研究与学术会议",
  competition: "竞赛",
  internship: "实习实训",
  organization: "学生组织／社团经历",
  arts: "文体活动",
  language: "外语与标化",
  other: "其他",
};

const directEntryCategories = new Set<ExperienceCategory>(["internship", "organization", "arts"]);
const noCompetitivenessBranchId = "none";

const projectRoles: PresetChoice[] = [
  { id: "leader", label: "负责人" },
  { id: "member", label: "参与人" },
];

const academicCompletionOptions: PresetChoice[] = [
  { id: "pending", label: "尚未结项" },
  { id: "completed", label: "已结项" },
  { id: "good", label: "良好结项" },
  { id: "excellent", label: "优秀结项" },
];

const journalAuthorRoles: PresetChoice[] = [
  { id: "independent", label: "独立作者" },
  { id: "first", label: "第一作者（含共同第一作者）" },
  { id: "corresponding-second", label: "通讯作者／第二作者（导师第一作者）" },
  { id: "third-plus", label: "第三及以后作者" },
];

const chineseJournalA2017 = [
  "中国法学", "法学研究", "管理世界", "南开管理评论", "公共管理学报", "管理科学学报", "中国行政管理", "中国环境科学",
  "教育研究", "经济研究", "世界经济", "中国工业经济", "金融研究", "会计研究", "中国农村经济", "文物", "历史研究",
  "马克思主义研究", "中共党史研究", "美术研究", "民族研究", "人口研究", "装饰", "社会学研究", "上海体育学院学报",
  "统计研究", "中国图书馆学报", "档案学通讯", "外国文学评论", "戏剧", "心理学报", "新闻与传播研究", "文艺研究",
  "中央音乐学院学报", "哲学研究", "世界经济与政治", "政治学研究", "文学评论", "地理学报", "世界宗教研究", "中国社会科学",
  "中国人民大学学报", "求是", "教学与研究", "北京大学学报(哲学社会科学版)", "新华文摘（全文转载）",
] as const;

const chineseJournalB2017 = [
  "中外法学", "法学家", "法商研究", "法学", "政法论坛", "现代法学", "清华法学", "法制与社会发展", "法律科学", "法学评论",
  "高等教育研究", "中国高教研究", "中国软科学", "科研管理", "科学学研究", "管理科学", "科学学与科学技术管理", "管理工程学报",
  "管理学报", "管理评论", "中国管理科学", "系统工程理论与实践", "系统工程", "系统管理学报", "营销科学学报", "自然资源学报",
  "中国人口·资源与环境", "资源科学", "安全与环境学报", "环境科学", "环境科学学报", "环境科学研究", "课程.教材.教法",
  "中国教育学刊", "北京大学教育评论", "清华大学教育研究", "比较教育研究", "复旦教育论坛", "经济学（季刊）",
  "数量经济技术经济研究", "世界经济文汇", "中国农村观察", "财贸经济", "国际经济评论", "国际金融研究", "农业经济问题",
  "经济理论与经济管理", "经济学家", "国际贸易问题", "审计研究", "农业技术经济", "经济学动态", "中国土地科学", "政治经济学评论",
  "中国经济史研究", "保险研究", "考古学报", "考古", "近代史研究", "中国史研究", "清史研究", "史学月刊", "史学集刊",
  "当代中国史研究", "史学理论研究", "史林", "中华文史论丛", "抗日战争研究", "文史", "史学史研究", "西域研究", "世界历史",
  "文献", "中央研究院近代史研究所集刊", "中央研究院历史语言研究所集刊", "马克思主义与现实", "国外理论动态", "当代世界与社会主义",
  "中国特色社会主义研究", "思想理论教育导刊", "马克思主义理论学科研究", "美术观察", "中国藏学", "中国人口科学", "人口学刊",
  "地理研究", "经济地理", "城市规划", "社会", "青年研究", "社会保障研究", "中国体育科技", "北京体育大学学报", "数理统计与管理",
  "图书情报工作", "情报学报", "图书情报知识", "情报理论与实践", "情报资料工作", "档案学研究", "外国文学", "外国文学研究",
  "国外文学", "心理科学进展", "心理发展与教育", "心理科学", "中国临床心理学杂志", "新闻大学", "国际新闻界",
  "现代传播(中国传媒大学学报)", "编辑之友", "当代传播", "新闻记者", "外语教学与研究", "中国外语", "中国翻译", "中国语文",
  "当代语言学", "语言研究", "语言科学", "中国卫生政策研究", "哲学动态", "道德与文明", "世界哲学", "现代哲学", "孔子研究",
  "中国哲学史", "自然辩证法研究", "逻辑学研究", "当代亚太", "外交评论(外交学院学报)", "现代国际关系", "江苏行政学院学报",
  "欧洲研究", "国家行政学院学报", "中共中央党校学报", "北京行政学院学报", "文学遗产", "文艺理论研究", "中国比较文学",
  "中国现代文学研究丛刊", "红楼梦学刊", "基督教文化学刊", "浙江大学学报(人文社会科学版)",
  "华中师范大学学报(人文社会科学版)", "北京师范大学学报(社会科学版)", "南京大学学报(哲学.人文科学.社会科学版)",
  "中山大学学报(社会科学版)", "清华大学学报(哲学社会科学版)", "吉林大学社会科学学报", "复旦学报(社会科学版)",
  "武汉大学学报（人文科学版）", "学术月刊", "社会科学", "江海学刊", "江苏社会科学", "浙江社会科学", "学术研究", "中国高校社会科学",
] as const;

function normalizeJournalName(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[《》〈〉\s·•.。:：,，;；'"“”‘’()（）\-—_]/g, "");
}

const journalClass2017 = new Map<string, JournalClass>([
  ...chineseJournalA2017.map((name) => [normalizeJournalName(name), "A"] as const),
  ...chineseJournalB2017.map((name) => [normalizeJournalName(name), "B"] as const),
  [normalizeJournalName("新华文摘"), "A"],
  [normalizeJournalName("现代传播"), "B"],
  [normalizeJournalName("外交评论"), "B"],
]);

function matchJournalClass(value: string): JournalClass {
  return journalClass2017.get(normalizeJournalName(value)) ?? "";
}

const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function defaultLanguageScores(presetId: string): Record<string, string> {
  if (presetId === "toefl") return { scale: "current", overall: "", reading: "", listening: "", speaking: "", writing: "", comparableTotal: "" };
  if (presetId === "gmat") return { version: "current", total: "", quantitative: "", verbal: "", dataInsights: "", integratedReasoning: "", analyticalWriting: "" };
  if (presetId === "delf" || presetId === "tcf" || presetId === "tef") return { level: "" };
  return {};
}

function languageResultSummary(presetId: string, scores: Record<string, string>) {
  if (presetId === "cet4" || presetId === "cet6") return `总分 ${scores.total || "待填写"}${scores.oralGrade ? ` · 口试${scores.oralGrade}` : ""}`;
  if (presetId === "ielts") return `总分 ${scores.overall || "待填写"}`;
  if (presetId === "toefl") return scores.scale === "legacy"
    ? `总分 ${scores.total || "待填写"}`
    : `综合等级 ${scores.overall || "待填写"}${scores.comparableTotal ? ` · 对照${scores.comparableTotal}分` : ""}`;
  if (presetId === "gre") {
    const verbal = Number(scores.verbal);
    const quantitative = Number(scores.quantitative);
    const total = scores.verbal && scores.quantitative ? verbal + quantitative : 0;
    return `V+Q ${total || "待填写"}`;
  }
  if (presetId === "gmat") return `总分 ${scores.total || "待填写"}`;
  if (presetId === "delf" || presetId === "tcf" || presetId === "tef") return `等级 ${scores.level || "待填写"}`;
  return "成绩待填写";
}

function languageScoreDetails(presetId: string, scores: Record<string, string>) {
  if (presetId === "cet4" || presetId === "cet6") return [
    `听力 ${scores.listening || "—"}`,
    `阅读 ${scores.reading || "—"}`,
    `写作和翻译 ${scores.writingTranslation || "—"}`,
    scores.oralGrade ? `口试 ${scores.oralGrade}` : "",
  ].filter(Boolean).join(" · ");
  if (presetId === "ielts") return `听力 ${scores.listening || "—"} · 阅读 ${scores.reading || "—"} · 写作 ${scores.writing || "—"} · 口语 ${scores.speaking || "—"}`;
  if (presetId === "toefl") return `阅读 ${scores.reading || "—"} · 听力 ${scores.listening || "—"} · 口语 ${scores.speaking || "—"} · 写作 ${scores.writing || "—"}`;
  if (presetId === "gre") return `语文 ${scores.verbal || "—"} · 数学 ${scores.quantitative || "—"} · 分析性写作 ${scores.analyticalWriting || "—"}`;
  if (presetId === "gmat") return scores.version === "legacy"
    ? `数学 ${scores.quantitative || "—"} · 语文 ${scores.verbal || "—"} · 综合推理 ${scores.integratedReasoning || "—"} · 分析性写作 ${scores.analyticalWriting || "—"}`
    : `数学 ${scores.quantitative || "—"} · 语文 ${scores.verbal || "—"} · 数据洞察 ${scores.dataInsights || "—"}`;
  return "";
}

function composeLanguageDetails(presetId: string, scores: Record<string, string>, note: string) {
  return [languageScoreDetails(presetId, scores), note.trim()].filter(Boolean).join("\n");
}

function validateLanguageScores(presetId: string, scores: Record<string, string>) {
  const required = presetId === "cet4" || presetId === "cet6"
    ? ["total", "listening", "reading", "writingTranslation"]
    : presetId === "ielts"
      ? ["overall", "listening", "reading", "writing", "speaking"]
      : presetId === "toefl"
        ? scores.scale === "legacy" ? ["total", "reading", "listening", "speaking", "writing"] : ["overall", "reading", "listening", "speaking", "writing"]
        : presetId === "gre"
          ? ["verbal", "quantitative", "analyticalWriting"]
          : presetId === "gmat"
            ? scores.version === "legacy" ? ["total", "quantitative", "verbal", "integratedReasoning", "analyticalWriting"] : ["total", "quantitative", "verbal", "dataInsights"]
            : ["level"];
  return required.every((key) => Boolean(scores[key]?.trim()));
}

const commonExperiencePresets: CommonExperiencePreset[] = [
  {
    id: "qiushi-academic",
    category: "academic",
    name: "求是学术品牌研究（大创）",
    resultLabel: "立项层级",
    results: [
      { id: "qiangguo", label: "强国" },
      { id: "shoushan", label: "首善" },
      { id: "qingmiao", label: "青苗" },
      { id: "dongliang", label: "栋梁" },
    ],
    roles: projectRoles,
    completionOptions: academicCompletionOptions,
    requiresProjectTitle: true,
    researchSection: "academic",
    defaultDetails: "参与项目立项、研究设计、资料收集与结项工作，主要负责研究设计和数据分析。",
  },
  {
    id: "read-jiangnan",
    category: "academic",
    name: "长读江南社会调查",
    resultLabel: "结项结果",
    results: [
      { id: "excellent", label: "优秀结项" },
      { id: "completed", label: "结项" },
    ],
    roles: projectRoles,
    requiresProjectTitle: true,
    researchSection: "academic",
    defaultDetails: "参与社会调查、访谈、资料整理与报告撰写，主要负责研究设计和实地调研。",
  },
  {
    id: "meet-civilization",
    category: "academic",
    name: "遇鉴文明中欧社会文化观察",
    resultLabel: "结项结果",
    results: [
      { id: "excellent", label: "优秀结项" },
      { id: "completed", label: "结项" },
    ],
    roles: projectRoles,
    requiresProjectTitle: true,
    researchSection: "academic",
    defaultDetails: "参与中欧社会文化观察、资料搜集与成果撰写，主要负责访谈整理和比较分析。",
  },
  {
    id: "urban-rural-china",
    category: "academic",
    name: "城乡中国基层社会调研",
    resultLabel: "结项结果",
    results: [
      { id: "excellent", label: "优秀结项", score: 2 },
      { id: "completed", label: "结项", score: 1 },
    ],
    requiresProjectTitle: true,
    researchSection: "academic",
    defaultDetails: "参与基层社会调研、访谈记录与调研报告撰写，主要负责资料整理和问题分析。",
  },
  {
    id: "journal-paper",
    category: "academic",
    name: "中文期刊学术论文",
    resultLabel: "期刊类别（选填）",
    results: [
      { id: "", label: "未匹配／暂不填写" },
      { id: "A", label: "A类期刊" },
      { id: "B", label: "B类期刊" },
      { id: "C", label: "C类期刊" },
    ],
    roles: journalAuthorRoles,
    requiresProjectTitle: true,
    researchSection: "academic",
    defaultDetails: "完成论文选题、研究、写作与修改，并在中文期刊发表或录用。",
  },
  {
    id: "china-innovation",
    category: "competition",
    name: "中国国际大学生创新大赛",
    resultLabel: "奖项 / 结果",
    results: [
      { id: "national-gold", label: "国赛金奖", score: 4 },
      { id: "national-silver", label: "国赛银奖", score: 3 },
      { id: "national-bronze", label: "国赛铜奖", score: 2 },
      { id: "other", label: "其他阶段奖项", score: 0 },
    ],
    roles: projectRoles,
    teamAward: true,
    researchSection: "competition",
    defaultDetails: "参与项目方案设计、材料准备与现场展示，主要负责项目论证和申报材料撰写。",
  },
  {
    id: "cumcm",
    category: "competition",
    name: "全国大学生数学建模竞赛",
    resultLabel: "奖项 / 结果",
    results: [
      { id: "national-first", label: "全国一等奖", score: 4 },
      { id: "national-second", label: "全国二等奖", score: 3 },
      { id: "provincial-first", label: "省级一等奖", score: 2 },
      { id: "provincial-second", label: "省级二等奖", score: 0 },
      { id: "provincial-third", label: "省级三等奖", score: 0 },
    ],
    roles: projectRoles,
    teamAward: true,
    researchSection: "competition",
    defaultDetails: "与队友完成赛题建模、数据分析和论文写作，主要负责模型构建与结果检验。",
  },
  {
    id: "national-math-competition",
    category: "competition",
    name: "全国大学生数学竞赛",
    resultLabel: "奖项 / 结果",
    results: [
      { id: "final-first", label: "决赛一等奖", score: 3 },
      { id: "final-second", label: "决赛二等奖", score: 2 },
      { id: "final-third", label: "决赛三等奖", score: 1 },
      { id: "preliminary-first", label: "初赛一等奖", score: 0 },
      { id: "preliminary-second", label: "初赛二等奖", score: 0 },
      { id: "preliminary-third", label: "初赛三等奖", score: 0 },
    ],
    researchSection: "competition",
    defaultDetails: "参加全国大学生数学竞赛，完成相应组别的竞赛考核。",
  },
  {
    id: "mcm",
    category: "competition",
    name: "美国大学生数学建模竞赛（MCM/ICM）",
    resultLabel: "奖项 / 结果",
    results: [
      { id: "o", label: "O奖", score: 3 },
      { id: "f", label: "F奖", score: 3 },
      { id: "m", label: "M奖", score: 2 },
      { id: "h", label: "H奖", score: 1 },
      { id: "s", label: "S奖", score: 0 },
    ],
    roles: projectRoles,
    teamAward: true,
    researchSection: "competition",
    defaultDetails: "与队友完成英文赛题建模、数据分析和论文写作，主要负责模型构建与结果验证。",
  },
  {
    id: "neccs",
    category: "competition",
    name: "全国大学生英语竞赛",
    resultLabel: "奖项 / 结果",
    results: [
      { id: "special", label: "特等奖", score: 2 },
      { id: "first", label: "一等奖", score: 1 },
      { id: "second", label: "二等奖", score: 0.5 },
      { id: "third", label: "三等奖", score: 0 },
    ],
    researchSection: "competition",
    defaultDetails: "参加全国大学生英语竞赛并完成相应类别的初赛或决赛。",
  },
  {
    id: "suzhou-paper",
    category: "competition",
    name: "苏州校区本科生学术论文大赛",
    resultLabel: "奖项 / 结果",
    results: [
      { id: "first", label: "一等奖", score: 2 },
      { id: "second", label: "二等奖", score: 1 },
      { id: "third", label: "三等奖", score: 0.5 },
    ],
    roles: projectRoles,
    teamAward: true,
    researchSection: "competition",
    defaultDetails: "独立或合作完成学术论文的选题、研究、写作与修改，并参加论文评审。",
  },
  {
    id: "innovation-cup",
    category: "competition",
    name: "“创新杯”中国人民大学学生课外学术科技作品竞赛（小创）",
    resultLabel: "奖项 / 结果",
    results: [
      { id: "special", label: "特等奖", score: 2 },
      { id: "first", label: "一等奖", score: 1 },
      { id: "second", label: "二等奖", score: 0.5 },
      { id: "third", label: "三等奖", score: 0 },
    ],
    roles: projectRoles,
    teamAward: true,
    researchSection: "competition",
    defaultDetails: "完成课外学术科技作品的研究、申报材料撰写与成果展示。",
  },
  ...[
    ["cet4", "大学英语四级（CET-4）"],
    ["cet6", "大学英语六级（CET-6）"],
    ["ielts", "雅思（IELTS）"],
    ["toefl", "托福（TOEFL iBT）"],
    ["gre", "GRE General Test"],
    ["gmat", "GMAT"],
    ["delf", "法语 DELF / DALF"],
    ["tcf", "法语 TCF"],
    ["tef", "法语 TEF"],
  ].map(([id, name]) => ({
    id,
    category: "language" as const,
    name,
    resultLabel: "成绩",
    results: [],
    qualificationScored: false,
    competitivenessBranchId: "language",
    researchSection: "academic" as const,
    defaultDetails: "",
  })),
];

function findExperiencePreset(id: string) {
  return commonExperiencePresets.find((preset) => preset.id === id);
}

function presetScore(preset: CommonExperiencePreset, resultId: string, roleId: string, completionId: string) {
  if (preset.id === "journal-paper") {
    const scores: Record<Exclude<JournalClass, "">, Record<string, number>> = {
      A: { independent: 4, first: 3, "corresponding-second": 2, "third-plus": 0.5 },
      B: { independent: 3, first: 2, "corresponding-second": 1.5, "third-plus": 0.5 },
      C: { independent: 2, first: 1.5, "corresponding-second": 1, "third-plus": 0.5 },
    };
    return scores[resultId as Exclude<JournalClass, "">]?.[roleId] ?? 0;
  }
  if (preset.id === "qiushi-academic") {
    const baseScores: Record<string, number> = { qiangguo: 2, shoushan: 1.5, qingmiao: 1, dongliang: 1 };
    const leaderBonus = roleId === "leader" && resultId !== "dongliang" ? 0.5 : 0;
    const completionBonus = completionId === "excellent" ? 1 : completionId === "good" ? 0.5 : 0;
    return (baseScores[resultId] ?? 0) + leaderBonus + completionBonus;
  }
  if (preset.id === "read-jiangnan" || preset.id === "meet-civilization") {
    if (resultId === "excellent") return roleId === "leader" ? 2.5 : 2;
    return roleId === "leader" ? 1.5 : 1;
  }
  const resultScore = preset.results.find((result) => result.id === resultId)?.score ?? 0;
  if (preset.teamAward && roleId === "member" && resultScore > 0) return Math.max(0.5, resultScore - 0.5);
  return resultScore;
}

function presetResultText(preset: CommonExperiencePreset, resultId: string, roleId: string, completionId: string) {
  const result = preset.results.find((item) => item.id === resultId)?.label ?? "待补充";
  const role = preset.roles?.find((item) => item.id === roleId)?.label;
  const completion = preset.completionOptions?.find((item) => item.id === completionId)?.label;
  if (preset.id === "journal-paper") return [`${resultId || "期刊类别未填写"}${resultId ? "类期刊" : ""}`, role].filter(Boolean).join(" · ");
  if (preset.id === "qiushi-academic") return [result + "立项", role, completion].filter(Boolean).join(" · ");
  return [result, role].filter(Boolean).join(" · ");
}

const defaultGraduationModules: GraduationModule[] = [
  { id: "foundation", title: "立本模块" },
  { id: "major", title: "专业模块" },
  { id: "excellence", title: "卓越模块" },
];

const graduationGroupIcons: Record<string, IconName> = {
  foundation: "book",
  major: "academic",
  excellence: "star",
};

const defaultGraduationRequirements: GraduationRequirement[] = [
  { id: "politics", group: "foundation", title: "思想政治理论课", credits: 21, creditMode: "fixed", detail: "模块课程全部完成", mode: "automatic", visible: true },
  { id: "foreign-language", group: "foundation", title: "公共外语课", credits: 46, creditMode: "fixed", detail: "模块课程全部完成", mode: "automatic", visible: true },
  { id: "mathematics", group: "foundation", title: "公共数学课", credits: 12, creditMode: "fixed", detail: "模块课程全部完成", mode: "automatic", visible: true },
  { id: "ai-data", group: "foundation", title: "人工智能与数据技术", credits: 2, creditMode: "minimum", detail: "", mode: "manual", visible: true },
  { id: "freshman-guidance", group: "foundation", title: "新生引导课", credits: 1, creditMode: "fixed", detail: "", mode: "automatic", visible: true },
  { id: "science-humanities", group: "foundation", title: "科学与人文素养课", credits: 2, creditMode: "fixed", detail: "讲座至少32学时并获学院认定", mode: "manual", visible: true },
  { id: "physical-education", group: "foundation", title: "公共体育课", credits: 4, creditMode: "fixed", detail: "前四学期每学期1学分", mode: "automatic", visible: true },
  { id: "aesthetic-education", group: "foundation", title: "美育课程", credits: 2, creditMode: "minimum", detail: "", mode: "manual", visible: true },
  { id: "labor-education", group: "foundation", title: "劳动教育", credits: 1, creditMode: "fixed", detail: "理论与实践均完成", mode: "automatic", visible: true },
  { id: "mental-health", group: "foundation", title: "心理健康教育", credits: 2, creditMode: "fixed", detail: "", mode: "automatic", visible: true },
  { id: "career-education", group: "foundation", title: "职业生涯教育", credits: 1, creditMode: "fixed", detail: "理论与实践均完成", mode: "automatic", visible: true },
  { id: "military-course", group: "foundation", title: "军事课", credits: 4, creditMode: "fixed", detail: "军事理论与军事技能", mode: "automatic", visible: true },
  { id: "volunteer-service", group: "foundation", title: "志愿服务", credits: 2, creditMode: "fixed", detail: "", mode: "volunteer", volunteerMinCount: 8, volunteerMinHours: 24, visible: true },
  { id: "major-foundation", group: "major", title: "专业基础课", credits: 24, creditMode: "fixed", detail: "全部完成", mode: "automatic", visible: true },
  { id: "major-core", group: "major", title: "专业核心课", credits: 19, creditMode: "fixed", detail: "按培养方案表格口径全部完成", mode: "automatic", visible: true },
  { id: "major-elective", group: "major", title: "专业选修课", credits: 20, creditMode: "minimum", detail: "", mode: "automatic", visible: true },
  { id: "research-training", group: "excellence", title: "研究训练", credits: 2, creditMode: "fixed", detail: "完成研究项目或调研报告", mode: "manual", visible: true },
  { id: "professional-internship", group: "excellence", title: "专业实习", credits: 4, creditMode: "fixed", detail: "4周并提交日记、总结和约3000字报告", mode: "manual", visible: true },
  { id: "graduation-thesis", group: "excellence", title: "毕业论文", credits: 4, creditMode: "fixed", detail: "第四学年完成约12000字论文", mode: "manual", visible: true },
  { id: "public-elective", group: "excellence", title: "公共选修课", credits: 2, creditMode: "minimum", detail: "", mode: "manual", visible: true },
];

const baseDemoExperiences: Experience[] = [
  ["base-ideology-1", "2025-10", "入党积极分子培训", "完成培训", "ideology"],
  ["base-ideology-2", "2025-11", "国家安全教育主题活动", "完成认证", "ideology"],
  ["base-ideology-3", "2026-03", "校史教育主题学习", "完成认证", "ideology"],
  ["base-ideology-4", "2026-04", "网络文明教育活动", "完成认证", "ideology"],
  ["base-service-1", "2025-09", "新生志愿服务", "服务时长24小时", "service"],
  ["base-service-2", "2025-12", "学生组织骨干工作", "考核合格", "service"],
  ["base-service-3", "2026-02", "先锋社会实践", "完成结项", "service"],
  ["base-service-4", "2026-05", "中法文化交流活动保障", "完成服务", "service"],
  ["base-sports-1", "2025-10", "校园跑活动", "完成认证", "sports"],
  ["base-sports-2", "2025-12", "中法文化节文艺活动", "参与演出", "sports"],
  ["base-sports-3", "2026-03", "劳动实践周", "完成认证", "sports"],
  ["base-sports-4", "2026-05", "校运动会", "完成志愿服务", "sports"],
].map(([id, startMonth, name, result, baseSection]) => ({
  id,
  year: startMonth.slice(0, 4),
  startMonth,
  endMonth: startMonth,
  name,
  result,
  details: `参加${name}，${result}。`,
  groupKey: id,
  countsForBase: true,
  baseSection: baseSection as BaseSection,
  baseScore: 5,
  countsForResearch: false,
  researchScore: 0,
  countsForVolunteer: id === "base-service-1",
  volunteerHours: id === "base-service-1" ? 24 : 0,
  category: "other" as const,
}));

baseDemoExperiences.push({
  id: "base-award-1",
  year: "2026",
  startMonth: "2026-06",
  endMonth: "2026-06",
  name: "中国人民大学先锋奖章",
  result: "获奖",
  details: "获评中国人民大学先锋奖章。",
  groupKey: "ruc-pioneer-medal",
  countsForBase: true,
  baseSection: "award",
  baseScore: 40,
  countsForResearch: false,
  researchScore: 0,
  category: "other",
});

const initialStudent: StudentProfile = {
  name: "林知夏",
  school: "中国人民大学",
  college: "中法学院",
  major: "金融学",
  cohort: "2025级",
  gpa: 3.81,
  politicalTheoryQualified: true,
  coreRank: 7,
  skills: "Excel、Python、Stata",
  hobbies: "摄影、羽毛球",
  graduationChecks: {},
  dataVersion: 5,
  experiences: [
    {
      id: "mcm-2027",
      year: "2027",
      startMonth: "2027-01",
      endMonth: "2027-02",
      name: "美国大学生数学建模竞赛（MCM/ICM）",
      result: "M奖",
      details: "与两名队友完成赛题建模、数据分析与英文论文写作，主要负责模型构建和结果验证。",
      groupKey: "mcm",
      presetId: "mcm",
      resultCode: "m",
      competitivenessBranchId: "research-count",
      score: 2,
      countsForRecommendation: true,
      countsForBase: false,
      baseScore: 0,
      countsForResearch: true,
      researchSection: "competition",
      researchScore: 2,
      category: "competition",
    },
    {
      id: "mcm-2026",
      year: "2026",
      startMonth: "2026-01",
      endMonth: "2026-02",
      name: "美国大学生数学建模竞赛（MCM/ICM）",
      result: "H奖",
      details: "首次参加美赛，完成数据清洗、可视化与论文排版工作。",
      groupKey: "mcm",
      presetId: "mcm",
      resultCode: "h",
      competitivenessBranchId: "research-count",
      score: 1,
      countsForRecommendation: true,
      countsForBase: false,
      baseScore: 0,
      countsForResearch: true,
      researchSection: "competition",
      researchScore: 1,
      category: "competition",
    },
    ...baseDemoExperiences,
  ],
};

const resumeBranchDefaults: BranchConfig[] = [
  { id: "academic", title: "教育背景", kind: "gpa", icon: "academic", target: 0, unit: "", successText: "已有记录", pendingText: "待补充", scoringNote: "", visible: true },
  { id: "internship", title: "实习经历", kind: "internship", icon: "internship", target: 0, unit: "", successText: "已有记录", pendingText: "待补充", scoringNote: "", visible: true },
  { id: "research-count", title: "科研与竞赛", kind: "research-count", icon: "lab", target: 0, unit: "", successText: "已有记录", pendingText: "待补充", scoringNote: "", visible: true },
  { id: "campus", title: "校园经历", kind: "campus", icon: "book", target: 0, unit: "", successText: "已有记录", pendingText: "待补充", scoringNote: "", visible: true },
  { id: "language", title: "语言与标化", kind: "language", icon: "language", target: 0, unit: "", successText: "已有记录", pendingText: "待补充", scoringNote: "", visible: true },
  { id: "skills", title: "技能与爱好", kind: "skills", icon: "star", target: 0, unit: "", successText: "已有记录", pendingText: "待补充", scoringNote: "", visible: true },
];

const initialTemplate: TemplateConfig = {
  id: "25-baoyan",
  title: "25中法保研",
  primary: true,
  pages: [
    {
      id: "graduation",
      tabLabel: "毕业条件",
      title: "毕业条件",
      description: "",
      visible: true,
      branches: [],
      graduationModules: defaultGraduationModules,
      checklist: defaultGraduationRequirements,
      checklistVersion: 4,
    },
    {
      id: "qualification",
      tabLabel: "推免资格获取",
      title: "推免资格获取",
      description: "",
      visible: true,
      branches: [
        {
          id: "base",
          title: "基础素养",
          kind: "base",
          icon: "book",
          target: 100,
          unit: "分",
          successText: "已达标",
          pendingText: "待达标",
          scoringNote: "累计达到目标分值",
          visible: true,
          subRules: defaultBaseRules,
        },
        {
          id: "research-score",
          title: "科研与创新",
          kind: "research-score",
          icon: "lab",
          target: 4,
          unit: "分",
          successText: "已达标",
          pendingText: "待达标",
          scoringNote: "同一活动重复参加只计最高结果，总分封顶4分",
          visible: true,
        },
        {
          id: "rank",
          title: "核心绩点排名",
          kind: "rank",
          icon: "rank",
          target: 10,
          unit: "名",
          successText: "已达标",
          pendingText: "待达标",
          scoringNote: "排名处于有效位次内即达标",
          visible: true,
        },
      ],
    },
    {
      id: "competitiveness",
      tabLabel: "我的简历",
      title: "我的简历",
      description: "",
      visible: true,
      branches: resumeBranchDefaults,
    },
  ],
};

const accountStarterStudent: StudentProfile = {
  ...initialStudent,
  name: "",
  major: "",
  cohort: "",
  gpa: 0,
  politicalTheoryQualified: false,
  coreRank: 999,
  graduationChecks: {},
  experiences: [],
  dataVersion: 5,
};

const iconMap: Record<IconName, typeof ReaderIcon> = {
  book: ReaderIcon,
  lab: RocketIcon,
  rank: BarChartIcon,
  academic: BackpackIcon,
  language: GlobeIcon,
  internship: CardStackIcon,
  star: StarIcon,
};

const campusSpaceLabels: Record<CampusSpaceKind, string> = { class: "班级", course: "课程" };
const campusRoleLabels: Record<CampusRole, string> = { owner: "空间负责人", admin: "管理员", member: "成员" };
const campusJoinPolicyLabels: Record<CampusJoinPolicy, string> = { open: "直接加入", approval: "加入需审核" };
const campusInviteDirectory: Array<CampusSpace> = [
  { id: "course-global", name: "国际经济学", kind: "course", code: "GLOBAL25", role: "member", memberCount: 29, joinPolicy: "open", color: "violet" },
  { id: "course-finance-cases", name: "金融案例研讨课", kind: "course", code: "REVIEW25", role: "member", memberCount: 24, joinPolicy: "approval", color: "blue" },
];
const reminderTypeLabels: Record<ReminderType, string> = {
  event: "到场事项",
  deadline: "截止事项",
  confirmation: "确认事项",
  info: "通知",
  resource: "资料",
};

function localDayStart(source = new Date()) {
  const value = new Date(source);
  value.setHours(0, 0, 0, 0);
  return value;
}

function campusDate(base: Date, dayOffset: number, hour: number, minute = 0) {
  const value = localDayStart(base);
  value.setDate(value.getDate() + dayOffset);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
}

function createCampusJoinCode(kind: CampusSpaceKind) {
  const prefix = kind === "course" ? "C" : "B";
  return `${prefix}${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

function createCampusDemoState(now = new Date()): CampusDemoState {
  const initializedAt = now.toISOString();
  const spaces: CampusSpace[] = [
    { id: "class-finance-25", name: "25中法金融1班", kind: "class", code: "CF2501", role: "admin", memberCount: 35, joinPolicy: "approval", color: "teal" },
    { id: "course-micro", name: "微观经济学", kind: "course", code: "MICRO25", role: "member", memberCount: 34, joinPolicy: "open", color: "blue" },
    { id: "course-econometrics", name: "计量经济学", kind: "course", code: "ECON25", role: "member", memberCount: 31, joinPolicy: "approval", color: "cyan" },
    { id: "course-french-b1", name: "法语 B1", kind: "course", code: "FRB125", role: "member", memberCount: 28, joinPolicy: "open", color: "violet" },
    { id: "course-corp-finance", name: "公司金融", kind: "course", code: "CORP25", role: "owner", memberCount: 35, joinPolicy: "approval", color: "blue" },
    { id: "course-archived", name: "新生研讨课", kind: "course", code: "OLD2025", role: "member", memberCount: 30, joinPolicy: "approval", archived: true, color: "cyan" },
  ];
  const studentNames = ["林知夏", "周予安", "陈嘉禾", "许言", "宋清和", "沈星遥", "顾南乔", "江屿", "何景行", "陆时安"];
  const members: CampusMember[] = spaces.flatMap((space) => {
    if (space.archived) return [];
    return Array.from({ length: Math.min(space.memberCount, 35) }, (_, index) => ({
      id: `${space.id}-member-${index + 1}`,
      spaceId: space.id,
      name: index === 0 ? "林知夏" : `${studentNames[(index + 1) % studentNames.length]}${index > 9 ? index : ""}`,
      role: index === 0
        ? space.role
        : space.role === "owner"
          ? index === 1 ? "admin" : "member"
          : index === 1
            ? "owner"
            : index === 2 && space.kind === "course" ? "admin" : "member",
    }));
  });
  const reminders: CampusReminder[] = [
    {
      id: "reminder-room-change",
      spaceId: "course-micro",
      type: "event",
      title: "微观经济学第 4 次课",
      startsAt: campusDate(now, 0, 14),
      endsAt: campusDate(now, 0, 15, 40),
      timezone: "Asia/Shanghai",
      location: "修远楼 203",
      attentionNotes: "教室已调整，请重新确认。",
      body: "携带教材与上周练习，提前 10 分钟到场。",
      priority: "important",
      actionMode: "confirm",
      status: "updated",
      version: 2,
      publisherId: "course-micro-member-2",
      publishedAt: campusDate(now, -1, 20),
      diff: [{ field: "地点", before: "修远楼 201", after: "修远楼 203" }],
      readCount: 32,
      confirmedCount: 28,
      recipientCount: 35,
    },
    {
      id: "reminder-corp-homework",
      spaceId: "course-corp-finance",
      type: "deadline",
      title: "资本预算练习提交",
      dueAt: campusDate(now, 0, 22),
      timezone: "Asia/Shanghai",
      body: "完成第 3 章练习第 1-6 题，以 PDF 格式提交。",
      priority: "important",
      actionMode: "complete",
      status: "published",
      version: 1,
      publisherId: "course-corp-finance-member-2",
      publishedAt: campusDate(now, -3, 9),
      completedCount: 21,
      recipientCount: 35,
    },
    {
      id: "reminder-class-confirm",
      spaceId: "class-finance-25",
      type: "confirmation",
      title: "确认本学期个人信息",
      dueAt: campusDate(now, 0, 18),
      timezone: "Asia/Shanghai",
      body: "核对姓名、联系电话和紧急联系人信息。",
      priority: "normal",
      actionMode: "confirm",
      status: "published",
      version: 1,
      publisherId: "class-finance-25-member-1",
      publishedAt: campusDate(now, -2, 10),
      readCount: 33,
      confirmedCount: 27,
      recipientCount: 35,
    },
    {
      id: "reminder-overdue-survey",
      spaceId: "class-finance-25",
      type: "deadline",
      title: "培养方案意见征集",
      dueAt: campusDate(now, -1, 17),
      timezone: "Asia/Shanghai",
      body: "填写课程体验与下学期选课意向。",
      priority: "normal",
      actionMode: "complete",
      status: "published",
      version: 1,
      publisherId: "class-finance-25-member-1",
      publishedAt: campusDate(now, -5, 8),
      completedCount: 26,
      recipientCount: 35,
    },
    {
      id: "reminder-french-quiz",
      spaceId: "course-french-b1",
      type: "event",
      title: "法语 B1 口语小测",
      startsAt: campusDate(now, 2, 9),
      endsAt: campusDate(now, 2, 10, 30),
      timezone: "Asia/Shanghai",
      location: "法语中心 105",
      body: "两人一组完成 3 分钟情景对话。",
      priority: "normal",
      actionMode: "read",
      status: "published",
      version: 1,
      publisherId: "course-french-b1-member-2",
      publishedAt: campusDate(now, -2, 14),
      readCount: 23,
      recipientCount: 28,
    },
    {
      id: "reminder-econometrics-data",
      spaceId: "course-econometrics",
      type: "resource",
      title: "下载回归分析数据集",
      dueAt: campusDate(now, 3, 20),
      timezone: "Asia/Shanghai",
      body: "下次课将使用数据集完成课堂练习。",
      priority: "normal",
      actionMode: "complete",
      status: "published",
      version: 1,
      publisherId: "course-econometrics-member-2",
      publishedAt: campusDate(now, -1, 11),
      completedCount: 15,
      recipientCount: 31,
    },
    {
      id: "reminder-class-meeting",
      spaceId: "class-finance-25",
      type: "event",
      title: "年级大会",
      startsAt: campusDate(now, 5, 18, 30),
      endsAt: campusDate(now, 5, 20),
      timezone: "Asia/Shanghai",
      location: "开太楼报告厅",
      body: "介绍本学期重要安排。",
      priority: "important",
      actionMode: "confirm",
      status: "published",
      version: 1,
      publisherId: "class-finance-25-member-1",
      publishedAt: campusDate(now, -1, 16),
      confirmedCount: 19,
      recipientCount: 35,
    },
    {
      id: "reminder-cancelled-seminar",
      spaceId: "course-corp-finance",
      type: "event",
      title: "公司金融行业讲座",
      startsAt: campusDate(now, 7, 15),
      timezone: "Asia/Shanghai",
      location: "修远楼 301",
      attentionNotes: "主讲人行程变化，本次讲座取消。",
      priority: "normal",
      actionMode: "read",
      status: "cancelled",
      version: 2,
      publisherId: "course-corp-finance-member-2",
      publishedAt: campusDate(now, -4, 13),
      diff: [{ field: "状态", before: "正常举行", after: "已取消" }],
      readCount: 30,
      recipientCount: 35,
    },
  ];
  const recipientStates: ReminderRecipientState[] = [
    { reminderId: "reminder-room-change", userId: "current-student", readAt: campusDate(now, -1, 20, 30), confirmedAt: campusDate(now, -1, 20, 31), confirmedVersion: 1 },
    { reminderId: "reminder-french-quiz", userId: "current-student", readAt: campusDate(now, -1, 15) },
  ];
  const resources: CourseResource[] = [
    { id: "resource-cf-capital", spaceId: "course-corp-finance", title: "第 3 章 资本预算", category: "课件", lesson: "第 3 次课", currentVersion: 2, associatedReminderId: "reminder-corp-homework", status: "available", mimeType: "application/pdf", sizeLabel: "1.8 MB" },
    { id: "resource-cf-practice", spaceId: "course-corp-finance", title: "资本预算练习", category: "作业与练习", lesson: "第 3 次课", currentVersion: 1, associatedReminderId: "reminder-corp-homework", status: "offline", mimeType: "application/pdf", sizeLabel: "640 KB" },
    { id: "resource-cf-review", spaceId: "course-corp-finance", title: "期中复习提纲", category: "复习资料", currentVersion: 1, status: "available", mimeType: "application/pdf", sizeLabel: "920 KB" },
    { id: "resource-cf-case", spaceId: "course-corp-finance", title: "案例：项目现金流", category: "阅读材料", lesson: "第 4 次课", currentVersion: 1, status: "failed", mimeType: "application/pdf", sizeLabel: "2.1 MB" },
    { id: "resource-micro-slides", spaceId: "course-micro", title: "消费者选择理论", category: "课件", lesson: "第 4 次课", currentVersion: 1, status: "available", mimeType: "application/pdf", sizeLabel: "2.4 MB" },
    { id: "resource-micro-reading", spaceId: "course-micro", title: "阅读：显示偏好", category: "阅读材料", currentVersion: 1, status: "available", mimeType: "application/pdf", sizeLabel: "1.1 MB" },
    { id: "resource-econometrics-data", spaceId: "course-econometrics", title: "回归分析数据说明", category: "作业与练习", lesson: "第 2 次课", currentVersion: 1, associatedReminderId: "reminder-econometrics-data", status: "available", mimeType: "application/pdf", sizeLabel: "480 KB" },
    { id: "resource-econometrics-review", spaceId: "course-econometrics", title: "OLS 公式卡片", category: "复习资料", currentVersion: 1, status: "available", mimeType: "image/png", sizeLabel: "760 KB" },
    { id: "resource-french-oral", spaceId: "course-french-b1", title: "口语小测话题卡", category: "作业与练习", lesson: "第 5 次课", currentVersion: 1, status: "available", mimeType: "image/png", sizeLabel: "820 KB" },
    { id: "resource-french-verbs", spaceId: "course-french-b1", title: "虚拟式动词表", category: "其他", currentVersion: 1, status: "available", mimeType: "image/png", sizeLabel: "540 KB" },
  ];
  const resourceVersions: ResourceVersion[] = resources.flatMap((resource) => {
    const url = resource.mimeType === "image/png" ? "/demo-resources/course-reference.png" : "/demo-resources/course-handout.pdf";
    if (resource.id === "resource-cf-capital") return [
      { id: `${resource.id}-v1`, resourceId: resource.id, version: 1, label: "初版", url, fileName: "公司金融-资本预算-v1.pdf", publishedAt: campusDate(now, -7, 10) },
      { id: `${resource.id}-v2`, resourceId: resource.id, version: 2, label: "补充例题", url, fileName: "公司金融-资本预算-v2.pdf", publishedAt: campusDate(now, -2, 10) },
    ];
    return [{ id: `${resource.id}-v1`, resourceId: resource.id, version: 1, label: "当前版本", url, fileName: `${resource.title}.${resource.mimeType === "image/png" ? "png" : "pdf"}`, publishedAt: campusDate(now, -3, 10) }];
  });
  return {
    version: 2,
    initializedAt,
    spaces,
    members,
    joinRequests: [{ id: "join-request-corp-1", spaceId: "course-corp-finance", applicantName: "叶之航", code: "CORP25", status: "pending", requestedAt: campusDate(now, 0, 9) }],
    reminders,
    recipientStates,
    resources,
    resourceVersions,
    notices: [
      { id: "notice-room-change", title: "微观经济学教室已调整", createdAt: campusDate(now, -1, 20), read: false },
      { id: "notice-resource", title: "公司金融发布了新资料", createdAt: campusDate(now, -2, 10), read: true },
    ],
  };
}

function normalizeCampusRole(role: unknown): CampusRole {
  if (role === "owner" || role === "admin" || role === "member") return role;
  if (role === "publisher") return "owner";
  return "member";
}

function normalizeCampusDemoState(source: CampusDemoState): CampusDemoState {
  if (!source || !Array.isArray(source.spaces) || !Array.isArray(source.members)) return createCampusDemoState();
  const spaces = source.spaces.map((space) => ({ ...space, role: normalizeCampusRole(space.role) }));
  let members = source.members.map((member) => ({ ...member, role: normalizeCampusRole(member.role) }));

  spaces.forEach((space) => {
    if (space.archived || space.dissolvedAt) return;
    const spaceMembers = members.filter((member) => member.spaceId === space.id);
    if (!spaceMembers.length) {
      members = [
        ...members,
        { id: `${space.id}-member-current`, spaceId: space.id, name: "林知夏", role: space.role },
        ...(space.role === "owner" ? [] : [{ id: `${space.id}-member-owner`, spaceId: space.id, name: "空间负责人", role: "owner" as CampusRole }]),
      ];
      return;
    }
    const owners = spaceMembers.filter((member) => member.role === "owner");
    const preferredOwner = owners[0]
      ?? (space.role === "owner" ? spaceMembers.find((member) => member.name === "林知夏") : undefined)
      ?? spaceMembers.find((member) => member.name !== "林知夏")
      ?? spaceMembers[0];
    members = members.map((member) => member.spaceId !== space.id
      ? member
      : member.id === preferredOwner.id
        ? { ...member, role: "owner" }
        : member.role === "owner" ? { ...member, role: "member" } : member);
  });

  const alignedSpaces = spaces.map((space) => {
    const currentMember = members.find((member) => member.spaceId === space.id && member.name === "林知夏");
    return currentMember ? { ...space, role: currentMember.role } : space;
  });
  return { ...source, version: 2, spaces: alignedSpaces, members };
}

function reminderMoment(reminder: CampusReminder) {
  return new Date(reminder.startsAt ?? reminder.dueAt ?? reminder.publishedAt).getTime();
}

function recipientFor(state: CampusDemoState, reminderId: string) {
  return state.recipientStates.find((item) => item.reminderId === reminderId && item.userId === "current-student");
}

function reminderNeedsAction(reminder: CampusReminder, recipient?: ReminderRecipientState) {
  if (reminder.status === "cancelled" || reminder.status === "archived") return false;
  if (reminder.actionMode === "read") return !recipient?.readAt;
  if (reminder.actionMode === "complete") return !recipient?.completedAt;
  return !recipient?.confirmedAt || recipient.confirmedVersion !== reminder.version;
}

function campusReminderRank(reminder: CampusReminder, state: CampusDemoState, now = new Date()) {
  const today = localDayStart(now).getTime();
  const tomorrow = today + 86400000;
  const moment = reminderMoment(reminder);
  const recipient = recipientFor(state, reminder.id);
  const incomplete = reminderNeedsAction(reminder, recipient);
  if (reminder.status === "updated" && reminder.priority === "important" && incomplete) return 0;
  if (moment < now.getTime() && incomplete && reminder.status !== "cancelled") return 1;
  if (moment >= today && moment < tomorrow && reminder.startsAt) return 2;
  if (moment >= today && moment < tomorrow && reminder.dueAt) return 3;
  if (moment >= tomorrow && moment <= today + 7 * 86400000) return 4;
  if (reminder.status === "cancelled") return 6;
  return 5;
}

function sortCampusReminders(reminders: CampusReminder[], state: CampusDemoState, now = new Date()) {
  return [...reminders].sort((a, b) => {
    const rank = campusReminderRank(a, state, now) - campusReminderRank(b, state, now);
    if (rank) return rank;
    const moment = reminderMoment(a) - reminderMoment(b);
    if (moment) return moment;
    if (a.priority !== b.priority) return a.priority === "important" ? -1 : 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

function formatCampusDay(iso: string, now = new Date()) {
  const value = new Date(iso);
  const delta = Math.round((localDayStart(value).getTime() - localDayStart(now).getTime()) / 86400000);
  if (delta === -1) return "昨天";
  if (delta === 0) return "今天";
  if (delta === 1) return "明天";
  return `${value.getMonth() + 1}月${value.getDate()}日`;
}

function formatCampusTime(iso?: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

function reminderTimeLabel(reminder: CampusReminder) {
  const iso = reminder.startsAt ?? reminder.dueAt ?? reminder.publishedAt;
  const prefix = reminder.dueAt && !reminder.startsAt ? "截止 " : "";
  return `${formatCampusDay(iso)} ${prefix}${formatCampusTime(iso)}`.trim();
}

function updateRecipientState(
  states: ReminderRecipientState[],
  reminderId: string,
  updater: (recipient: ReminderRecipientState) => ReminderRecipientState,
) {
  const index = states.findIndex((item) => item.reminderId === reminderId && item.userId === "current-student");
  const current = index >= 0 ? states[index] : { reminderId, userId: "current-student" };
  const next = updater(current);
  if (index < 0) return [...states, next];
  return states.map((item, itemIndex) => itemIndex === index ? next : item);
}

function reminderDiff(previous: CampusReminder, next: CampusReminder): ReminderDiff[] {
  const fields: Array<[string, string, string]> = [
    ["时间", previous.startsAt ? reminderTimeLabel(previous) : "未设置", next.startsAt ? reminderTimeLabel(next) : "未设置"],
    ["地点", previous.location || "未设置", next.location || "未设置"],
    ["截止时间", previous.dueAt ? reminderTimeLabel({ ...previous, startsAt: undefined }) : "未设置", next.dueAt ? reminderTimeLabel({ ...next, startsAt: undefined }) : "未设置"],
    ["行动要求", previous.actionMode, next.actionMode],
  ];
  return fields.filter(([, before, after]) => before !== after).map(([field, before, after]) => ({ field, before, after }));
}

function useStoredState<T>(key: string, fallback: T, normalize?: (value: T) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      const parsed = stored ? (JSON.parse(stored) as T) : fallback;
      return normalize ? normalize(parsed) : parsed;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error("LOCAL_PREVIEW");
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `REQUEST_${response.status}`);
  return data;
}

function useAccountWorkspace(seedProfile: StudentProfile, seedTemplate: TemplateConfig) {
  const seedRef = useRef({ profile: seedProfile, template: seedTemplate });
  const [state, setState] = useState<AccountState>({ mode: "loading" });

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setState({ mode: "loading" });
    try {
      const response = await fetch("/api/bootstrap", { headers: { accept: "application/json" } });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setState({ mode: "local" });
        return;
      }
      if (response.status === 401) {
        setState({ mode: "anonymous" });
        return;
      }
      let data = await parseApiResponse<AuthenticatedAccountState>(response);
      if (!data.profile || data.templates.length === 0) {
        const starterProfile = {
          ...seedRef.current.profile,
          name: seedRef.current.profile.name || data.account.displayName || "",
        };
        data = await parseApiResponse<AuthenticatedAccountState>(await fetch("/api/bootstrap/import", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            profile: starterProfile,
            template: seedRef.current.template,
            description: "人大中法学生升学准备路径",
          }),
        }));
      }
      setState({ ...data, mode: "authenticated" });
    } catch (error) {
      if (error instanceof Error && error.message === "LOCAL_PREVIEW") {
        setState({ mode: "local" });
        return;
      }
      setState({ mode: "error", message: error instanceof Error ? error.message : "暂时无法连接账号" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, setState, reload: () => load(true) };
}

type ResearchScoreStatus = {
  counted: number;
  label: string;
};

function qualificationScoring(experiences: Experience[]) {
  const candidates = experiences.filter((item) => item.countsForResearch);
  const winners = new Map<string, Experience>();
  const statuses = new Map<string, ResearchScoreStatus>();

  candidates.forEach((item) => {
    const winner = winners.get(item.groupKey);
    if (!winner || (item.researchScore ?? 0) > (winner.researchScore ?? 0)) winners.set(item.groupKey, item);
  });

  candidates.forEach((item) => {
    const score = Math.max(0, item.researchScore ?? 0);
    if (score <= 0) statuses.set(item.id, { counted: 0, label: "已记录 · 不计分" });
    else if (winners.get(item.groupKey)?.id !== item.id) statuses.set(item.id, { counted: 0, label: "已记录 · 同类经历取最高" });
  });

  const uniqueWinners = Array.from(winners.values()).filter((item) => (item.researchScore ?? 0) > 0);
  const limitedAcademic = uniqueWinners
    .filter((item) => item.researchSection === "academic" && (item.researchScore ?? 0) <= 1.5)
    .sort((a, b) => (b.researchScore ?? 0) - (a.researchScore ?? 0) || experienceStart(b).localeCompare(experienceStart(a)));
  const limitedAcademicIds = new Set(limitedAcademic.slice(0, 2).map((item) => item.id));

  limitedAcademic.slice(2).forEach((item) => {
    statuses.set(item.id, { counted: 0, label: "已记录 · 未计入当前得分" });
  });

  const eligible = uniqueWinners
    .filter((item) => item.researchSection !== "academic" || (item.researchScore ?? 0) > 1.5 || limitedAcademicIds.has(item.id))
    .sort((a, b) => (b.researchScore ?? 0) - (a.researchScore ?? 0) || experienceStart(b).localeCompare(experienceStart(a)));

  let total = 0;
  eligible.forEach((item) => {
    const score = Math.max(0, item.researchScore ?? 0);
    const counted = Math.min(score, Math.max(0, 4 - total));
    total += counted;
    statuses.set(item.id, {
      counted,
      label: counted <= 0
        ? "已记录 · 已达到4分上限"
        : counted < score
          ? `+${counted}分 · 达到4分上限`
          : `+${counted}分 · 已计分`,
    });
  });

  return { total, statuses };
}

function qualificationScore(experiences: Experience[]) {
  return qualificationScoring(experiences).total;
}

function baseRulesFor(branch?: BranchConfig) {
  const rules = branch?.subRules?.length ? branch.subRules : defaultBaseRules;
  return rules.filter((rule) => rule.id !== "negative");
}

function baseSectionScore(experiences: Experience[], section: BaseSection) {
  return experiences
    .filter((item) => item.countsForBase && item.baseSection === section)
    .reduce((sum, item) => sum + (item.baseScore ?? 0), 0);
}

function baseTotal(experiences: Experience[]) {
  return experiences
    .filter((item) => item.countsForBase && item.baseSection !== "negative")
    .reduce((sum, item) => sum + (item.baseScore ?? 0), 0);
}

function baseProgress(branch: BranchConfig, student: StudentProfile) {
  const rules = baseRulesFor(branch);
  const sectionScores = Object.fromEntries(rules.map((rule) => [rule.id, baseSectionScore(student.experiences, rule.id)])) as Record<BaseSection, number>;
  const required = rules.filter((rule) => rule.mode === "minimum");
  const requiredMet = required.filter((rule) => sectionScores[rule.id] >= rule.target).length;
  const total = baseTotal(student.experiences);
  return {
    rules,
    sectionScores,
    requiredMet,
    requiredCount: required.length,
    total,
    met: student.politicalTheoryQualified && requiredMet === required.length && total >= branch.target,
  };
}

function experienceStart(experience: Experience) {
  return experience.startMonth || `${experience.year}-01`;
}

function experienceEnd(experience: Experience) {
  return experience.endMonth || experience.startMonth || `${experience.year}-12`;
}

function experiencePeriod(experience: Experience) {
  const start = experienceStart(experience);
  const end = experienceEnd(experience);
  return start === end ? start : `${start} — ${end}`;
}

function resumeExperienceSort(a: Experience, b: Experience) {
  const aOngoing = !a.endMonth || a.endMonth === "至今";
  const bOngoing = !b.endMonth || b.endMonth === "至今";
  if (aOngoing !== bOngoing) return aOngoing ? -1 : 1;
  const endCompare = experienceEnd(b).localeCompare(experienceEnd(a));
  return endCompare || experienceStart(b).localeCompare(experienceStart(a));
}

function resumeTextItems(value?: string) {
  return (value ?? "").split(/[\n,，、;；]+/).map((item) => item.trim()).filter(Boolean);
}

function normalizeStudent(student: StudentProfile): StudentProfile {
  const migrated = (student.experiences || []).map((experience) => {
    const demoFallback = initialStudent.experiences.find((item) => item.id === experience.id);
    const legacyResearch = experience.countsForRecommendation ?? (experience.score ?? 0) > 0;
    const legacyCategory = (experience as unknown as { category: ExperienceCategory | "research" }).category;
    const category: ExperienceCategory = legacyCategory === "research"
      ? (experience.researchSection === "academic" ? "academic" : "competition")
      : legacyCategory;
    const competitivenessBranchId = experience.competitivenessBranchId
      ?? (category === "academic" || category === "competition"
        ? "research-count"
        : category === "language"
          ? "language"
          : category === "internship"
            ? "internship"
            : undefined);
    return {
      ...experience,
      category,
      startMonth: experience.startMonth || demoFallback?.startMonth || `${experience.year}-01`,
      endMonth: experience.endMonth || demoFallback?.endMonth || `${experience.year}-12`,
      details: experience.details || demoFallback?.details || "",
      countsForResearch: experience.countsForResearch ?? legacyResearch,
      researchSection: experience.researchSection ?? (category === "academic" ? "academic" : category === "competition" ? "competition" : undefined),
      researchScore: experience.researchScore ?? experience.score ?? 0,
      competitivenessBranchId,
      countsForBase: experience.countsForBase ?? false,
      baseScore: experience.baseScore ?? 0,
      countsForVolunteer: experience.countsForVolunteer ?? demoFallback?.countsForVolunteer ?? false,
      volunteerHours: experience.volunteerHours ?? demoFallback?.volunteerHours ?? 0,
    };
  });
  const needsBaseDemo = (student.dataVersion ?? 1) < 2 && !migrated.some((experience) => experience.countsForBase);
  return {
    ...student,
    school: student.school ?? "中国人民大学",
    college: student.college ?? "中法学院",
    skills: student.skills ?? "",
    hobbies: student.hobbies ?? "",
    politicalTheoryQualified: student.politicalTheoryQualified ?? true,
    graduationChecks: student.graduationChecks ?? {},
    dataVersion: 5,
    experiences: needsBaseDemo ? [...migrated, ...baseDemoExperiences] : migrated,
  };
}

function normalizeTemplate(template: TemplateConfig): TemplateConfig {
  const graduationPage: PageConfig = {
    id: "graduation",
    tabLabel: "毕业条件",
    title: "毕业条件",
    description: "",
    visible: true,
    branches: [],
    graduationModules: defaultGraduationModules,
    checklist: defaultGraduationRequirements,
    checklistVersion: 4,
  };
  const pages = template.pages.some((page) => page.id === "graduation")
    ? template.pages.map((page) => {
        if (page.id !== "graduation") return page;
        if ((page.checklistVersion ?? 1) >= 4 && page.checklist) return page;
        const legacyById = new Map((page.checklist ?? []).map((item) => [item.id, item]));
        return {
          ...page,
          checklistVersion: 4,
          checklist: defaultGraduationRequirements.map((item) => {
            const legacy = legacyById.get(item.id);
            return legacy ? {
              ...item,
              title: legacy.title,
              detail: (page.checklistVersion ?? 1) >= 3
                ? legacy.detail
                : legacy.detail.replace(/^(?:至少)?\d+(?:\.\d+)?学分\s*(?:·\s*)?/, ""),
              visible: legacy.visible,
              mode: legacy.mode ?? item.mode,
              credits: legacy.credits ?? item.credits,
              creditMode: legacy.creditMode ?? item.creditMode,
              volunteerMinCount: legacy.volunteerMinCount ?? item.volunteerMinCount,
              volunteerMinHours: legacy.volunteerMinHours ?? item.volunteerMinHours,
            } : item;
          }),
        };
      })
    : [graduationPage, ...template.pages];
  const normalizedPages = pages.map((page) => {
    if (page.id === "graduation") {
      return {
        ...page,
        graduationModules: page.graduationModules?.length ? page.graduationModules : defaultGraduationModules,
      };
    }
    if (page.id === "competitiveness") {
      const legacyById = new Map(page.branches.map((branch) => [branch.id, branch]));
      return {
        ...page,
        tabLabel: "我的简历",
        title: "我的简历",
        description: "",
        branches: resumeBranchDefaults.map((branch) => ({
          ...branch,
          visible: legacyById.get(branch.id)?.visible ?? branch.visible,
        })),
      };
    }
    return page;
  });
  return { ...template, pages: normalizedPages };
}

function graduationCreditLabel(requirement: GraduationRequirement) {
  const credits = Number.isInteger(requirement.credits) ? requirement.credits.toFixed(0) : requirement.credits.toFixed(1);
  return `${requirement.creditMode === "minimum" ? "至少" : ""}${credits}学分`;
}

function graduationRequirementDetail(requirement: GraduationRequirement) {
  const detail = requirement.mode === "volunteer"
    ? `不少于${volunteerThresholds(requirement).hours}小时且不少于${volunteerThresholds(requirement).count}次`
    : requirement.detail;
  return [graduationCreditLabel(requirement), detail].filter(Boolean).join(" · ");
}

function graduationGroupCredits(items: GraduationRequirement[]) {
  return items.reduce((sum, item) => sum + Math.max(0, item.credits || 0), 0);
}

function formatGraduationCredits(credits: number) {
  return Number.isInteger(credits) ? credits.toFixed(0) : credits.toFixed(1);
}

function volunteerThresholds(requirement: GraduationRequirement) {
  return {
    count: Math.max(0, requirement.volunteerMinCount ?? 8),
    hours: Math.max(0, requirement.volunteerMinHours ?? 24),
  };
}

function formatVolunteerHours(hours: number) {
  return Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1);
}

function volunteerProgress(experiences: Experience[], requirement: GraduationRequirement) {
  const records = experiences
    .filter((experience) => experience.countsForVolunteer)
    .sort((a, b) => experienceStart(b).localeCompare(experienceStart(a)));
  const hours = records.reduce((sum, experience) => sum + Math.max(0, experience.volunteerHours ?? 0), 0);
  const thresholds = volunteerThresholds(requirement);
  return {
    records,
    count: records.length,
    hours,
    thresholds,
    met: records.length >= thresholds.count && hours >= thresholds.hours,
  };
}

function graduationRequirementMet(requirement: GraduationRequirement, student: StudentProfile) {
  if (requirement.mode === "automatic") return true;
  if (requirement.mode === "volunteer") return volunteerProgress(student.experiences, requirement).met;
  return Boolean(student.graduationChecks?.[requirement.id]);
}

function branchSnapshot(branch: BranchConfig, student: StudentProfile) {
  const branchExperiences = student.experiences.filter((item) => {
    if (item.competitivenessBranchId) return item.competitivenessBranchId === branch.id;
    if (branch.id === "research-count") return item.category === "academic" || item.category === "competition";
    if (branch.id === "language") return item.category === "language";
    if (branch.id === "internship") return item.category === "internship";
    if (branch.id === "campus") return item.category === "organization" || item.category === "arts";
    return false;
  });
  const recommendationResearch = student.experiences.filter((item) => item.countsForResearch);

  switch (branch.kind) {
    case "base":
      const base = baseProgress(branch, student);
      return {
        value: `${base.total} / ${branch.target}${branch.unit}`,
        met: base.met,
        note: `${base.requiredMet}/${base.requiredCount}个必达板块达标`,
        experiences: student.experiences.filter((item) => item.countsForBase),
      };
    case "research-score": {
      const score = Math.min(branch.target, qualificationScore(student.experiences));
      return {
        value: `${score.toFixed(1)} / ${branch.target.toFixed(1)}${branch.unit}`,
        met: score >= branch.target,
        note: score < branch.target ? `还差 ${(branch.target - score).toFixed(1)}${branch.unit}` : "已达到目标分值",
        experiences: recommendationResearch,
      };
    }
    case "rank":
      return {
        value: `${student.coreRank} / ${branch.target}`,
        met: student.coreRank <= branch.target,
        note: student.coreRank <= branch.target ? "有效位次内" : "暂未进入有效位次",
        experiences: [] as Experience[],
      };
    case "gpa":
      return {
        value: `平均学分绩点 ${student.gpa.toFixed(2)}`,
        met: student.gpa > 0,
        note: "",
        experiences: [] as Experience[],
      };
    case "research-count":
    case "language":
    case "internship":
    case "campus":
      return {
        value: branchExperiences.length ? `${branchExperiences.length}项记录` : "暂无记录",
        met: branchExperiences.length > 0,
        note: "",
        experiences: branchExperiences,
      };
    case "skills": {
      const itemCount = resumeTextItems(student.skills).length + resumeTextItems(student.hobbies).length;
      return {
        value: itemCount ? `${itemCount}项内容` : "暂无记录",
        met: itemCount > 0,
        note: "",
        experiences: [] as Experience[],
      };
    }
  }
}

type CaseLibraryTab = "cases" | "articles";
type CaseLibraryFilterId = "season" | "program" | "region";

const visibleCaseLibraryCases = caseLibraryCases.filter((item) => item.offerSchool && item.offerProgram);

function caseLibraryAssetUrl(value: string | null) {
  if (!value) return "";
  return value.startsWith("public/") ? `/assets/case-library/${value.slice("public/".length)}` : value;
}

export default function Prototype() {
  const { device } = useMobileDevice();
  const keyboard = useKeyboard();
  const hadLegacyData = useRef(Boolean(
    window.localStorage.getItem("baoyan-demo.student.v1")
    || window.localStorage.getItem("baoyan-demo.template.v1"),
  )).current;
  const [storedStudent, setStoredStudent] = useStoredState("baoyan-demo.student.v1", initialStudent);
  const student = useMemo(() => normalizeStudent(storedStudent), [storedStudent]);
  const setStudent = setStoredStudent;
  const [storedTemplate, setStoredTemplate] = useStoredState("baoyan-demo.template.v1", initialTemplate);
  const template = useMemo(() => normalizeTemplate(storedTemplate), [storedTemplate]);
  const setTemplate = setStoredTemplate;
  const accountWorkspace = useAccountWorkspace(
    hadLegacyData ? student : accountStarterStudent,
    hadLegacyData ? template : initialTemplate,
  );
  const accountState = accountWorkspace.state;
  const [templateDemoState, setTemplateDemoState] = useStoredState<TemplateDemoState>("baoyan-demo.template-demo-state.v1", {
    personalSaved: false,
    published: false,
  });
  const [campusState, setCampusState] = useStoredState<CampusDemoState>("baoyan-demo.campus.v1", createCampusDemoState(), normalizeCampusDemoState);
  const [activePageId, setActivePageId] = useState<PageId>("graduation");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "research-score": true,
  });
  const [workspacePage, setWorkspacePage] = useState<WorkspacePage>("overview");
  const [workspaceHistory, setWorkspaceHistory] = useState<WorkspacePage[]>([]);
  const [workspaceTransition, setWorkspaceTransition] = useState<{ sequence: number; direction: WorkspaceTransitionDirection }>({ sequence: 0, direction: "idle" });
  const [selectedSpaceId, setSelectedSpaceId] = useState("class-finance-25");
  const [selectedReminderId, setSelectedReminderId] = useState("reminder-room-change");
  const [selectedResourceId, setSelectedResourceId] = useState("resource-cf-capital");
  const [selectedCaseId, setSelectedCaseId] = useState(visibleCaseLibraryCases[0]?.id ?? "");
  const [templatePageView, setTemplatePageView] = useState<"mine" | "library">("mine");
  const [templatePageOrigin, setTemplatePageOrigin] = useState<WorkspacePage>("overview");
  const [accountSheet, setAccountSheet] = useState(false);
  const [entrySheet, setEntrySheet] = useState(false);
  const [archivePage, setArchivePage] = useState(false);
  const [archivePageOrigin, setArchivePageOrigin] = useState<WorkspacePage>("overview");
  const [opsSheet, setOpsSheet] = useState(false);
  const [opsPageId, setOpsPageId] = useState<PageId>("qualification");
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [archiveFocusedExperienceId, setArchiveFocusedExperienceId] = useState<string | null>(null);
  const [activeRemoteTemplateId, setActiveRemoteTemplateId] = useState<string | null>(null);
  const [remoteHydrated, setRemoteHydrated] = useState(false);
  const [syncState, setSyncState] = useState<"saved" | "saving" | "error">("saved");
  const [accountNotice, setAccountNotice] = useState("");
  const [sharedTemplate, setSharedTemplate] = useState<AccountTemplateRecord | null>(null);
  const carouselWrapRef = useRef<HTMLDivElement>(null);
  const activePageIndex = Math.max(0, template.pages.filter((page) => page.visible).findIndex((page) => page.id === activePageId));
  const visiblePages = template.pages.filter((page) => page.visible);
  const activeRemoteTemplate = accountState.mode === "authenticated"
    ? accountState.templates.find((item) => item.id === activeRemoteTemplateId) ?? null
    : null;
  const effectiveTemplateDemoState = accountState.mode === "authenticated"
    ? { personalSaved: Boolean(activeRemoteTemplate), published: activeRemoteTemplate?.visibility === "library" }
    : templateDemoState;

  useEffect(() => {
    if (accountState.mode !== "authenticated" || remoteHydrated) return;
    const selected = accountState.templates.find((item) => item.primary) ?? accountState.templates[0];
    setStoredStudent(normalizeStudent(accountState.profile));
    if (selected?.data) {
      setStoredTemplate(normalizeTemplate({ ...selected.data, primary: selected.primary }));
      setActiveRemoteTemplateId(selected.id);
    }
    setRemoteHydrated(true);
  }, [accountState, remoteHydrated, setStoredStudent, setStoredTemplate]);

  useEffect(() => {
    if (accountState.mode !== "authenticated" || !remoteHydrated) return;
    setSyncState("saving");
    const timer = window.setTimeout(async () => {
      try {
        await parseApiResponse(await fetch("/api/profile", {
          method: "PUT",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ profile: student }),
        }));
        setSyncState("saved");
      } catch {
        setSyncState("error");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [accountState.mode, remoteHydrated, student]);

  useEffect(() => {
    if (accountState.mode !== "authenticated" || !remoteHydrated || !activeRemoteTemplateId) return;
    setSyncState("saving");
    const timer = window.setTimeout(async () => {
      try {
        await parseApiResponse(await fetch(`/api/templates/${encodeURIComponent(activeRemoteTemplateId)}`, {
          method: "PUT",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ template, title: template.title }),
        }));
        setSyncState("saved");
      } catch {
        setSyncState("error");
      }
    }, 850);
    return () => window.clearTimeout(timer);
  }, [accountState.mode, activeRemoteTemplateId, remoteHydrated, template]);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("template");
    if (!code) return;
    let cancelled = false;
    void fetch(`/api/templates/shared/${encodeURIComponent(code)}`, { headers: { accept: "application/json" } })
      .then((response) => parseApiResponse<{ template: AccountTemplateRecord }>(response))
      .then((data) => {
        if (cancelled) return;
        setSharedTemplate(data.template);
        if (accountState.mode === "authenticated") {
          setTemplatePageView("library");
          setTemplatePageOrigin("overview");
          setWorkspacePage("templates");
        }
      })
      .catch(() => {
        if (!cancelled) setAccountNotice("分享的模版暂时无法打开");
      });
    return () => { cancelled = true; };
  }, [accountState.mode]);

  useEffect(() => {
    if ((storedStudent.dataVersion ?? 1) < 5) setStoredStudent(student);
  }, [setStoredStudent, storedStudent.dataVersion, student]);

  useEffect(() => {
    const storedGraduation = storedTemplate.pages.find((page) => page.id === "graduation");
    const storedCompetitiveness = storedTemplate.pages.find((page) => page.id === "competitiveness");
    const resumeNeedsMigration = storedCompetitiveness?.tabLabel !== "我的简历"
      || storedCompetitiveness.branches.map((branch) => branch.id).join(",") !== resumeBranchDefaults.map((branch) => branch.id).join(",");
    const missingGraduationModules = !storedGraduation?.graduationModules?.length;
    if (!storedGraduation || (storedGraduation.checklistVersion ?? 1) < 4 || missingGraduationModules || resumeNeedsMigration) setStoredTemplate(template);
  }, [setStoredTemplate, storedTemplate.pages, template]);

  useEffect(() => {
    const node = carouselWrapRef.current?.querySelector<HTMLDivElement>(".mobile-carousel");
    if (!node) return;
    const onScroll = () => {
      const index = Math.round(node.scrollLeft / device.geometry.screen.width);
      const page = visiblePages[index];
      if (page && page.id !== activePageId) setActivePageId(page.id);
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [activePageId, device.geometry.screen.width, visiblePages]);

  useEffect(() => {
    if (visiblePages.some((page) => page.id === activePageId)) return;
    const fallbackPage = visiblePages[0];
    if (!fallbackPage) return;
    setActivePageId(fallbackPage.id);
    carouselWrapRef.current?.querySelector<HTMLDivElement>(".mobile-carousel")?.scrollTo({ left: 0 });
  }, [activePageId, visiblePages]);

  const goToPage = (id: PageId) => {
    const index = visiblePages.findIndex((page) => page.id === id);
    const node = carouselWrapRef.current?.querySelector<HTMLDivElement>(".mobile-carousel");
    if (index < 0 || !node) return;
    node.scrollTo({ left: index * device.geometry.screen.width, behavior: "smooth" });
    setActivePageId(id);
  };

  const updatePage = (pageId: PageId, patch: Partial<PageConfig>) => {
    setTemplate((current) => ({
      ...current,
      pages: current.pages.map((page) => (page.id === pageId ? { ...page, ...patch } : page)),
    }));
  };

  const selectSettingsPage = (pageId: PageId) => {
    keyboard.hide();
    setOpsPageId(pageId);
    setEditingBranchId(null);
  };

  const toggleGraduationRequirement = (id: string) => {
    setStudent((current) => ({
      ...current,
      graduationChecks: {
        ...(current.graduationChecks ?? {}),
        [id]: !(current.graduationChecks ?? {})[id],
      },
    }));
  };

  const updateGraduationRequirement = (id: string, patch: Partial<GraduationRequirement>) => {
    setTemplate((current) => ({
      ...normalizeTemplate(current),
      pages: normalizeTemplate(current).pages.map((page) => page.id === "graduation"
        ? { ...page, checklist: (page.checklist ?? defaultGraduationRequirements).map((item) => item.id === id ? { ...item, ...patch } : item) }
        : page),
    }));
  };

  const updateGraduationModule = (id: GraduationGroupId, patch: Partial<GraduationModule>) => {
    setTemplate((current) => {
      const normalized = normalizeTemplate(current);
      return {
        ...normalized,
        pages: normalized.pages.map((page) => page.id === "graduation"
          ? { ...page, graduationModules: (page.graduationModules ?? defaultGraduationModules).map((module) => module.id === id ? { ...module, ...patch, id: module.id } : module) }
          : page),
      };
    });
  };

  const addGraduationModule = () => {
    const id = `custom-graduation-module-${Date.now()}`;
    const courseId = `${id}-course-1`;
    setTemplate((current) => {
      const normalized = normalizeTemplate(current);
      return {
        ...normalized,
        pages: normalized.pages.map((page) => page.id === "graduation" ? {
          ...page,
          graduationModules: [...(page.graduationModules ?? defaultGraduationModules), { id, title: "新模块" }],
          checklist: [...(page.checklist ?? defaultGraduationRequirements), {
            id: courseId,
            group: id,
            title: "新课程",
            credits: 1,
            creditMode: "fixed",
            detail: "",
            mode: "manual",
            visible: true,
          }],
        } : page),
      };
    });
    return id;
  };

  const deleteGraduationModule = (id: GraduationGroupId) => {
    if (!id.startsWith("custom-graduation-module-")) return;
    const removedIds = new Set((template.pages.find((page) => page.id === "graduation")?.checklist ?? []).filter((item) => item.group === id).map((item) => item.id));
    setTemplate((current) => {
      const normalized = normalizeTemplate(current);
      return {
        ...normalized,
        pages: normalized.pages.map((page) => page.id === "graduation" ? {
          ...page,
          graduationModules: (page.graduationModules ?? defaultGraduationModules).filter((module) => module.id !== id),
          checklist: (page.checklist ?? defaultGraduationRequirements).filter((item) => item.group !== id),
        } : page),
      };
    });
    setStudent((current) => ({
      ...current,
      graduationChecks: Object.fromEntries(Object.entries(current.graduationChecks ?? {}).filter(([requirementId]) => !removedIds.has(requirementId))),
    }));
  };

  const addGraduationRequirement = (group: GraduationGroupId) => {
    const id = `custom-graduation-course-${Date.now()}`;
    setTemplate((current) => {
      const normalized = normalizeTemplate(current);
      return {
        ...normalized,
        pages: normalized.pages.map((page) => page.id === "graduation" ? {
          ...page,
          checklist: [...(page.checklist ?? defaultGraduationRequirements), {
            id,
            group,
            title: "新课程",
            credits: 1,
            creditMode: "fixed",
            detail: "",
            mode: "manual",
            visible: true,
          }],
        } : page),
      };
    });
  };

  const deleteGraduationRequirement = (id: string) => {
    setTemplate((current) => {
      const normalized = normalizeTemplate(current);
      return {
        ...normalized,
        pages: normalized.pages.map((page) => page.id === "graduation"
          ? { ...page, checklist: (page.checklist ?? defaultGraduationRequirements).filter((item) => item.id !== id) }
          : page),
      };
    });
    setStudent((current) => ({
      ...current,
      graduationChecks: Object.fromEntries(Object.entries(current.graduationChecks ?? {}).filter(([requirementId]) => requirementId !== id)),
    }));
  };

  const updateBranch = (pageId: PageId, branchId: string, patch: Partial<BranchConfig>) => {
    setTemplate((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId
          ? { ...page, branches: page.branches.map((branch) => (branch.id === branchId ? { ...branch, ...patch } : branch)) }
          : page,
      ),
    }));
  };

  const moveBranch = (pageId: PageId, branchId: string, direction: -1 | 1) => {
    setTemplate((current) => ({
      ...current,
      pages: current.pages.map((page) => {
        if (page.id !== pageId) return page;
        const branches = [...page.branches];
        const from = branches.findIndex((branch) => branch.id === branchId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= branches.length) return page;
        [branches[from], branches[to]] = [branches[to], branches[from]];
        return { ...page, branches };
      }),
    }));
  };

  const addBranch = (pageId: PageId) => {
    if (pageId === "graduation") return;
    const id = `custom-${Date.now()}`;
    const branch: BranchConfig = {
      id,
      title: "新板块",
      kind: pageId === "qualification" ? "research-score" : "research-count",
      icon: "star",
      target: pageId === "qualification" ? 1 : 0,
      unit: pageId === "qualification" ? "分" : "",
      successText: pageId === "qualification" ? "已达标" : "已有记录",
      pendingText: pageId === "qualification" ? "待达标" : "待补充",
      scoringNote: "请补充规则说明",
      visible: true,
    };
    setTemplate((current) => ({
      ...current,
      pages: current.pages.map((page) => (page.id === pageId ? { ...page, branches: [...page.branches, branch] } : page)),
    }));
    setEditingBranchId(id);
  };

  const deleteBranch = (pageId: PageId, branchId: string) => {
    if (!branchId.startsWith("custom-")) return;
    setTemplate((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === pageId
        ? { ...page, branches: page.branches.filter((branch) => branch.id !== branchId) }
        : page),
    }));
    if (editingBranchId === branchId) setEditingBranchId(null);
  };

  const addPage = () => {
    keyboard.hide();
    const id = `custom-page-${Date.now()}`;
    const branchId = `${id}-branch`;
    const page: PageConfig = {
      id,
      tabLabel: "新页面",
      title: "新页面",
      description: "",
      visible: true,
      branches: [{
        id: branchId,
        title: "新板块",
        kind: "research-count",
        icon: "star",
        target: 0,
        unit: "",
        successText: "已有记录",
        pendingText: "待补充",
        scoringNote: "请补充规则说明",
        visible: true,
      }],
    };
    setTemplate((current) => ({ ...current, pages: [...current.pages, page] }));
    setOpsPageId(id);
    setEditingBranchId(null);
  };

  const deletePage = (pageId: PageId) => {
    if (corePageIds.has(pageId)) return;
    keyboard.hide();
    setTemplate((current) => ({ ...current, pages: current.pages.filter((page) => page.id !== pageId) }));
    setOpsPageId("qualification");
    setEditingBranchId(null);
    if (activePageId === pageId) {
      setActivePageId("graduation");
      carouselWrapRef.current?.querySelector<HTMLDivElement>(".mobile-carousel")?.scrollTo({ left: 0 });
    }
  };

  const resetDemo = () => {
    setStudent(initialStudent);
    setTemplate(initialTemplate);
    setTemplateDemoState({ personalSaved: false, published: false });
    setCampusState(createCampusDemoState());
    setActivePageId("graduation");
    setOpsPageId("qualification");
    setEditingBranchId(null);
    setWorkspaceHistory([]);
    setWorkspacePage("overview");
  };

  const chooseAccountTemplate = (record: AccountTemplateRecord) => {
    if (!record.data) return;
    keyboard.hide();
    setActiveRemoteTemplateId(record.id);
    setStoredTemplate(normalizeTemplate({ ...record.data, primary: record.primary }));
    setActivePageId("graduation");
    setWorkspaceHistory([]);
    setWorkspacePage("goals");
    setAccountNotice("");
  };

  const saveAsPersonalTemplate = async () => {
    if (accountState.mode !== "authenticated") {
      setTemplateDemoState((current) => ({ ...current, personalSaved: true }));
      return;
    }
    setAccountNotice("正在保存…");
    try {
      const data = await parseApiResponse<{ template: AccountTemplateRecord }>(await fetch("/api/templates", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          template: { ...template, primary: false },
          title: `${template.title} 副本`,
          description: activeRemoteTemplate?.description || "",
          sourceTemplateId: activeRemoteTemplate?.id || null,
        }),
      }));
      accountWorkspace.setState((current) => current.mode === "authenticated"
        ? { ...current, templates: [data.template, ...current.templates] }
        : current);
      setActiveRemoteTemplateId(data.template.id);
      setStoredTemplate(normalizeTemplate(data.template.data));
      setAccountNotice("已保存到我的模版");
    } catch (error) {
      setAccountNotice(error instanceof Error ? error.message : "保存失败");
    }
  };

  const publishCurrentTemplate = async () => {
    if (accountState.mode !== "authenticated" || !activeRemoteTemplateId) {
      setTemplateDemoState({ personalSaved: true, published: true });
      return;
    }
    setAccountNotice("正在发布…");
    try {
      await parseApiResponse(await fetch(`/api/templates/${encodeURIComponent(activeRemoteTemplateId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ template, title: template.title }),
      }));
      const data = await parseApiResponse<{ template: { visibility: "library"; shareCode: string; publishedAt: string } }>(await fetch(`/api/templates/${encodeURIComponent(activeRemoteTemplateId)}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: "{}",
      }));
      accountWorkspace.setState((current) => current.mode === "authenticated" ? {
        ...current,
        templates: current.templates.map((item) => item.id === activeRemoteTemplateId ? {
          ...item,
          title: template.title,
          data: template,
          visibility: data.template.visibility,
          shareCode: data.template.shareCode,
          publishedAt: data.template.publishedAt,
        } : item),
        library: [
          {
            id: activeRemoteTemplateId,
            ownerUserId: current.account.id,
            ownerName: current.account.displayName,
            title: template.title,
            description: activeRemoteTemplate?.description || "",
            shareCode: data.template.shareCode,
            publishedAt: data.template.publishedAt,
          },
          ...current.library.filter((item) => item.id !== activeRemoteTemplateId),
        ],
      } : current);
      setAccountNotice("已发布到模版库");
    } catch (error) {
      setAccountNotice(error instanceof Error ? error.message : "发布失败");
    }
  };

  const shareCurrentTemplate = async () => {
    if (accountState.mode !== "authenticated" || !activeRemoteTemplateId) return;
    setAccountNotice("正在生成分享链接…");
    try {
      const data = await parseApiResponse<{ template: { visibility: "unlisted" | "library"; shareCode: string; publishedAt: string } }>(await fetch(`/api/templates/${encodeURIComponent(activeRemoteTemplateId)}/share`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: "{}",
      }));
      const shareUrl = new URL(window.location.origin);
      shareUrl.searchParams.set("template", data.template.shareCode);
      await navigator.clipboard.writeText(shareUrl.toString());
      accountWorkspace.setState((current) => current.mode === "authenticated" ? {
        ...current,
        templates: current.templates.map((item) => item.id === activeRemoteTemplateId ? {
          ...item,
          visibility: data.template.visibility,
          shareCode: data.template.shareCode,
          publishedAt: data.template.publishedAt,
        } : item),
      } : current);
      setAccountNotice("分享链接已复制");
    } catch (error) {
      setAccountNotice(error instanceof Error ? error.message : "暂时无法分享");
    }
  };

  const setPrimaryAccountTemplate = async (record: AccountTemplateRecord) => {
    if (accountState.mode !== "authenticated") return;
    try {
      await parseApiResponse(await fetch(`/api/templates/${encodeURIComponent(record.id)}/primary`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: "{}",
      }));
      accountWorkspace.setState((current) => current.mode === "authenticated" ? {
        ...current,
        templates: current.templates.map((item) => ({
          ...item,
          primary: item.id === record.id,
          data: { ...item.data, primary: item.id === record.id },
        })),
      } : current);
      setStoredTemplate((current) => ({ ...current, primary: activeRemoteTemplateId === record.id }));
      setAccountNotice("已设为主模版");
    } catch (error) {
      setAccountNotice(error instanceof Error ? error.message : "设置失败");
    }
  };

  const installLibraryTemplate = async (record: LibraryTemplateRecord | AccountTemplateRecord, shareCode?: string) => {
    if (accountState.mode !== "authenticated") return;
    setAccountNotice("正在加入我的模版…");
    const path = shareCode
      ? `/api/templates/shared/${encodeURIComponent(shareCode)}/install`
      : `/api/templates/${encodeURIComponent(record.id)}/install`;
    try {
      const data = await parseApiResponse<{ template: AccountTemplateRecord }>(await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: "{}",
      }));
      accountWorkspace.setState((current) => current.mode === "authenticated"
        ? { ...current, templates: [data.template, ...current.templates] }
        : current);
      chooseAccountTemplate(data.template);
      setAccountNotice("已加入我的模版");
      if (shareCode) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("template");
        window.history.replaceState({}, "", cleanUrl);
        setSharedTemplate(null);
      }
    } catch (error) {
      setAccountNotice(error instanceof Error ? error.message : "添加失败");
    }
  };

  const identity = [student.name, student.major, student.cohort].filter(Boolean).join(" · ") || "请完善基础信息";

  const navigateWorkspace = (next: WorkspacePage) => {
    if (next === workspacePage) return;
    keyboard.hide();
    setWorkspaceTransition((current) => ({ sequence: current.sequence + 1, direction: "forward" }));
    setWorkspaceHistory((current) => [...current, workspacePage]);
    setWorkspacePage(next);
  };

  const backWorkspace = (fallback: WorkspacePage = "overview") => {
    keyboard.hide();
    const previous = workspaceHistory.at(-1) ?? fallback;
    setWorkspaceTransition((current) => ({ sequence: current.sequence + 1, direction: "back" }));
    setWorkspaceHistory((current) => current.slice(0, -1));
    setWorkspacePage(previous);
  };

  const openSpace = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    navigateWorkspace("space");
  };

  const openReminder = (reminderId: string) => {
    setSelectedReminderId(reminderId);
    setCampusState((current) => ({
      ...current,
      recipientStates: updateRecipientState(current.recipientStates, reminderId, (recipient) => ({
        ...recipient,
        readAt: recipient.readAt ?? new Date().toISOString(),
      })),
      notices: current.notices.map((notice) => notice.id === `notice-${reminderId}` ? { ...notice, read: true } : notice),
    }));
    navigateWorkspace("reminder");
  };

  const openResource = (resourceId: string) => {
    setSelectedResourceId(resourceId);
    navigateWorkspace("resource");
  };

  const openCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    navigateWorkspace("case-detail");
  };

  const updateReminderAction = (reminderId: string, mode: ReminderActionMode) => {
    const now = new Date().toISOString();
    setCampusState((current) => {
      const reminder = current.reminders.find((item) => item.id === reminderId);
      return {
        ...current,
        recipientStates: updateRecipientState(current.recipientStates, reminderId, (recipient) => ({
          ...recipient,
          readAt: recipient.readAt ?? now,
          confirmedAt: mode === "confirm" ? now : recipient.confirmedAt,
          confirmedVersion: mode === "confirm" ? reminder?.version : recipient.confirmedVersion,
          completedAt: mode === "complete" ? now : recipient.completedAt,
        })),
      };
    });
  };

  const saveCampusReminder = (draft: CampusReminder, publish: boolean) => {
    setCampusState((current) => {
      const existing = current.reminders.find((item) => item.id === draft.id);
      const nextVersion = existing ? existing.version + 1 : 1;
      const next: CampusReminder = {
        ...draft,
        version: nextVersion,
        status: publish ? (existing ? "updated" : "published") : "draft",
        publishedAt: publish ? new Date().toISOString() : draft.publishedAt,
        diff: existing ? reminderDiff(existing, draft) : undefined,
      };
      return {
        ...current,
        reminders: existing
          ? current.reminders.map((item) => item.id === next.id ? next : item)
          : [next, ...current.reminders],
        recipientStates: existing && publish
          ? current.recipientStates.map((item) => item.reminderId === next.id ? { ...item, confirmedAt: undefined, confirmedVersion: undefined } : item)
          : current.recipientStates,
        notices: publish ? [{ id: `notice-${next.id}-${nextVersion}`, title: existing ? `${next.title} 已更新` : `${next.title} 已发布`, createdAt: new Date().toISOString(), read: false }, ...current.notices] : current.notices,
      };
    });
    setSelectedReminderId(draft.id);
    backWorkspace("space");
  };

  const cancelCampusReminder = (reminderId: string) => {
    setCampusState((current) => ({
      ...current,
      reminders: current.reminders.map((item) => item.id === reminderId ? {
        ...item,
        status: "cancelled",
        version: item.version + 1,
        diff: [{ field: "状态", before: "正常进行", after: "已取消" }],
      } : item),
    }));
  };

  if (accountState.mode === "loading") return <AccountGate mode="loading" />;
  if (accountState.mode === "anonymous") return <AccountGate mode="anonymous" />;
  if (accountState.mode === "error") return <AccountGate mode="error" message={accountState.message} onRetry={() => void accountWorkspace.reload()} />;

  if (archivePage) {
    return (
      <div key={`archive-${workspaceTransition.sequence}`} className={`workspace-transition-layer ${workspaceTransition.direction}`} data-direction={workspaceTransition.direction} data-testid="workspace-transition-layer">
        <ArchivePage
          student={student}
          template={template}
          editingId={editingExperienceId}
          focusedId={archiveFocusedExperienceId}
          onEditingId={setEditingExperienceId}
          onChange={setStudent}
          onBack={() => {
            keyboard.hide();
            setEditingExperienceId(null);
            setArchiveFocusedExperienceId(null);
            setWorkspaceTransition((current) => ({ sequence: current.sequence + 1, direction: "back" }));
            setArchivePage(false);
            setWorkspacePage(archivePageOrigin);
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div key={`${workspacePage}-${workspaceTransition.sequence}`} className={`workspace-transition-layer ${workspaceTransition.direction}`} data-direction={workspaceTransition.direction} data-testid="workspace-transition-layer">
      {workspacePage === "overview" ? (
        <CampusOverviewPage
          account={accountState.mode === "authenticated" ? accountState.account : undefined}
          student={student}
          template={template}
          campus={campusState}
          onFeatures={() => navigateWorkspace("features")}
          onAccount={() => setAccountSheet(true)}
          onGoals={() => navigateWorkspace("goals")}
          onAgenda={() => navigateWorkspace("agenda")}
          onReminder={openReminder}
        />
      ) : workspacePage === "features" ? (
        <FeatureCenterPage
          account={accountState.mode === "authenticated" ? accountState.account : undefined}
          student={student}
          templateTitle={template.title}
          templateCount={accountState.mode === "authenticated" ? accountState.templates.length : 1}
          syncState={syncState}
          onBack={() => backWorkspace("overview")}
          onTemplates={(view) => {
            keyboard.hide();
            setTemplatePageView(view);
            setTemplatePageOrigin("features");
            navigateWorkspace("templates");
          }}
          onAgenda={() => navigateWorkspace("agenda")}
          onSpaces={() => navigateWorkspace("spaces")}
          onCases={() => navigateWorkspace("cases")}
          onArchive={() => {
            keyboard.hide();
            setArchiveFocusedExperienceId(null);
            setArchivePageOrigin("features");
            setWorkspaceTransition((current) => ({ sequence: current.sequence + 1, direction: "forward" }));
            setArchivePage(true);
          }}
          onEntry={() => setEntrySheet(true)}
          onSettings={() => { setAccountNotice(""); setOpsSheet(true); }}
          onAccount={() => setAccountSheet(true)}
        />
      ) : workspacePage === "cases" ? (
        <CaseLibraryPage onBack={() => backWorkspace("features")} onCase={openCase} />
      ) : workspacePage === "case-detail" ? (
        <CaseDetailPage caseId={selectedCaseId} onBack={() => backWorkspace("cases")} />
      ) : workspacePage === "templates" ? (
        <TemplateLibraryPage
          accountState={accountState}
          currentTemplate={template}
          activeRemoteTemplateId={activeRemoteTemplateId}
          view={templatePageView}
          sharedTemplate={sharedTemplate}
          notice={accountNotice}
          onView={setTemplatePageView}
          onBack={() => {
            backWorkspace(templatePageOrigin);
          }}
          onChoose={chooseAccountTemplate}
          onPrimary={(record) => void setPrimaryAccountTemplate(record)}
          onShare={() => void shareCurrentTemplate()}
          onInstall={(record, shareCode) => void installLibraryTemplate(record, shareCode)}
        />
      ) : workspacePage === "agenda" ? (
        <AgendaPage campus={campusState} onBack={() => backWorkspace("overview")} onReminder={openReminder} />
      ) : workspacePage === "spaces" ? (
        <SpacesPage
          campus={campusState}
          onChange={setCampusState}
          onBack={() => backWorkspace("features")}
          onSpace={openSpace}
        />
      ) : workspacePage === "space" ? (
        <SpaceDetailPage
          campus={campusState}
          spaceId={selectedSpaceId}
          onChange={setCampusState}
          onBack={() => backWorkspace("spaces")}
          onReminder={openReminder}
          onResource={openResource}
          onCreateReminder={() => {
            setSelectedReminderId(`reminder-custom-${Date.now()}`);
            navigateWorkspace("reminder-editor");
          }}
        />
      ) : workspacePage === "reminder" ? (
        <ReminderDetailPage
          campus={campusState}
          reminderId={selectedReminderId}
          onBack={() => backWorkspace("agenda")}
          onAction={updateReminderAction}
          onEdit={() => navigateWorkspace("reminder-editor")}
          onCancel={cancelCampusReminder}
          onResource={openResource}
        />
      ) : workspacePage === "reminder-editor" ? (
        <ReminderEditorPage
          campus={campusState}
          spaceId={selectedSpaceId}
          reminderId={selectedReminderId}
          onBack={() => backWorkspace("space")}
          onSave={saveCampusReminder}
        />
      ) : workspacePage === "resource" ? (
        <ResourcePreviewPage
          campus={campusState}
          resourceId={selectedResourceId}
          onChange={setCampusState}
          onBack={() => backWorkspace("space")}
          onReminder={openReminder}
        />
      ) : workspacePage === "goals" ? (
      <MobileScroll className="app-screen">
        <main className="prototype-shell" data-testid="student-app">
          <header className="template-header">
            <button className="feature-trigger goal-back-trigger" aria-label="返回概览" onClick={() => backWorkspace("overview")} data-testid="goal-back-button">
              <ChevronRightIcon />
            </button>
            <button className="template-switcher" onClick={() => {
              setTemplatePageView("mine");
              setTemplatePageOrigin("goals");
              navigateWorkspace("templates");
            }} data-testid="template-switcher">
              <span>{template.title}</span>
              {(activeRemoteTemplate?.primary ?? template.primary) ? <span className="primary-tag">主模版</span> : null}
              <ChevronDownIcon />
            </button>
            {accountState.mode === "authenticated" ? (
              <button className="account-trigger" aria-label="打开我的账号" onClick={() => setAccountSheet(true)} data-testid="account-trigger">
                <PersonIcon />
              </button>
            ) : <span />}
          </header>

          <nav
            className={`page-tabs ${visiblePages.length > 3 ? "many-tabs" : ""} ${visiblePages.length > 4 ? "extra-tabs" : ""}`}
            aria-label="25保研路径页面"
            style={{ gridTemplateColumns: `repeat(${visiblePages.length}, minmax(0, 1fr))` }}
          >
            {visiblePages.map((page) => (
              <button
                key={page.id}
                className={page.id === activePageId ? "active" : ""}
                onClick={() => goToPage(page.id)}
                data-testid={`tab-${page.id}`}
              >
                {page.tabLabel}
              </button>
            ))}
            <span className="tab-line" aria-hidden="true">
              <span style={{ width: `${100 / visiblePages.length}%`, transform: `translateX(${activePageIndex * 100}%)` }} />
            </span>
          </nav>
          <div className="page-dots" aria-hidden="true">
            {visiblePages.map((page) => <span key={page.id} className={page.id === activePageId ? "active" : ""} />)}
          </div>

          <div ref={carouselWrapRef} className="goal-pages-wrap">
            <Carousel ariaLabel="25保研目标页面" className="goal-pages" contentClassName="goal-pages-track">
              {visiblePages.map((page) => (
                <section
                  key={page.id}
                  className="goal-page"
                  style={{ width: device.geometry.screen.width }}
                  data-page-id={page.id}
                  data-testid={`page-${page.id}`}
                >
                  <PageHero page={page} identity={identity} student={student} />
                  <div className="path-list">
                    {page.id === "graduation" ? (
                      <GraduationChecklist
                        modules={page.graduationModules ?? defaultGraduationModules}
                        requirements={(page.checklist ?? defaultGraduationRequirements).filter((item) => item.visible)}
                        student={student}
                        onToggle={toggleGraduationRequirement}
                      />
                    ) : page.id === "competitiveness" ? page.branches.filter((branch) => branch.visible).map((branch, index) => (
                        <ResumeSectionCard
                          key={branch.id}
                          branch={branch}
                          student={student}
                          number={index + 1}
                          expanded={Boolean(expanded[branch.id])}
                          onToggle={() => setExpanded((current) => ({ ...current, [branch.id]: !current[branch.id] }))}
                          onStudentChange={setStudent}
                          onOpenExperience={(id) => {
                            keyboard.hide();
                            setEditingExperienceId(null);
                            setArchiveFocusedExperienceId(id);
                            setArchivePageOrigin("goals");
                            setWorkspaceTransition((current) => ({ sequence: current.sequence + 1, direction: "forward" }));
                            setArchivePage(true);
                          }}
                        />
                      )) : page.branches.filter((branch) => branch.visible).map((branch, index) => (
                        <BranchCard
                          key={branch.id}
                          branch={branch}
                          student={student}
                          number={index + 1}
                          showStatus={page.id === "qualification"}
                          expanded={Boolean(expanded[branch.id])}
                          onToggle={() => setExpanded((current) => ({ ...current, [branch.id]: !current[branch.id] }))}
                        />
                      ))}
                  </div>
                </section>
              ))}
            </Carousel>
          </div>

          <footer className="primary-actions">
            <button className="primary-action" onClick={() => setEntrySheet(true)} data-testid="entry-button">
              <Pencil2Icon />
              录入资料
            </button>
            <button className="archive-link" onClick={() => {
              keyboard.hide();
              setArchiveFocusedExperienceId(null);
              setArchivePageOrigin("goals");
              setWorkspaceTransition((current) => ({ sequence: current.sequence + 1, direction: "forward" }));
              setArchivePage(true);
            }} data-testid="archive-button">
              查看完整档案
              <ChevronRightIcon />
            </button>
          </footer>
        </main>
      </MobileScroll>
      ) : null}
      </div>

      <BottomSheet open={accountSheet} onOpenChange={setAccountSheet} title="我的账号" snap={0.5}>
        <div className="account-sheet-content">
          <div className="account-avatar"><PersonIcon /></div>
          <strong>{accountState.mode === "authenticated" ? accountState.account.displayName || student.name || "学生" : student.name || "学生"}</strong>
          <small>{accountState.mode === "authenticated" ? accountState.account.email : "本机演示"}</small>
          <div className={`account-sync-state ${syncState}`}>
            {accountState.mode === "authenticated"
              ? syncState === "saving" ? "正在保存" : syncState === "error" ? "部分内容尚未保存" : "档案与模版已保存"
              : "内容已保存在本机"}
          </div>
          {accountState.mode === "authenticated" ? <a className="account-signout" href="/signout-with-chatgpt?return_to=/"><ExitIcon /> 退出登录</a> : null}
        </div>
      </BottomSheet>

      <BottomSheet open={entrySheet} onOpenChange={setEntrySheet} title="录入资料" snap={0.9}>
        <EntryEditor student={student} template={template} onChange={setStudent} onDone={() => { keyboard.hide(); setEntrySheet(false); }} />
      </BottomSheet>

      <BottomSheet open={opsSheet} onOpenChange={setOpsSheet} title="模版设置" snap={0.93}>
        <>
          <OperationsEditor
            template={template}
            demoState={effectiveTemplateDemoState}
            accountBacked={accountState.mode === "authenticated"}
            pageId={opsPageId}
            editingBranchId={editingBranchId}
            onPageId={selectSettingsPage}
            onEditingBranchId={setEditingBranchId}
            onTemplate={setTemplate}
            onPage={updatePage}
            onBranch={updateBranch}
            onGraduationRequirement={updateGraduationRequirement}
            onGraduationModule={updateGraduationModule}
            onAddGraduationModule={addGraduationModule}
            onDeleteGraduationModule={deleteGraduationModule}
            onAddGraduationRequirement={addGraduationRequirement}
            onDeleteGraduationRequirement={deleteGraduationRequirement}
            onMove={moveBranch}
            onAdd={addBranch}
            onDeleteBranch={deleteBranch}
            onAddPage={addPage}
            onDeletePage={deletePage}
            onSavePersonal={() => void saveAsPersonalTemplate()}
            onPublish={() => void publishCurrentTemplate()}
            onReset={resetDemo}
          />
          {accountNotice ? <p className="account-notice operations-notice" role="status">{accountNotice}</p> : null}
        </>
      </BottomSheet>
    </>
  );
}

function WorkspaceHeader({ title, onBack, action }: { title: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <header className="workspace-page-header campus-page-header">
      {onBack ? <button aria-label="返回" onClick={onBack}><ChevronRightIcon /></button> : <span />}
      <strong>{title}</strong>
      <span className="workspace-header-action">{action}</span>
    </header>
  );
}

function CampusOverviewPage({
  account,
  student,
  template,
  campus,
  onFeatures,
  onAccount,
  onGoals,
  onAgenda,
  onReminder,
}: {
  account?: AccountRecord;
  student: StudentProfile;
  template: TemplateConfig;
  campus: CampusDemoState;
  onFeatures: () => void;
  onAccount: () => void;
  onGoals: () => void;
  onAgenda: () => void;
  onReminder: (id: string) => void;
}) {
  const graduationPage = template.pages.find((page) => page.id === "graduation");
  const qualificationPage = template.pages.find((page) => page.id === "qualification");
  const competitivenessPage = template.pages.find((page) => page.id === "competitiveness");
  const graduation = (graduationPage?.checklist ?? []).filter((item) => item.visible);
  const qualification = (qualificationPage?.branches ?? []).filter((item) => item.visible);
  const competitiveness = (competitivenessPage?.branches ?? []).filter((item) => item.visible);
  const progress = {
    graduation: [graduation.filter((item) => graduationRequirementMet(item, student)).length, graduation.length],
    qualification: [qualification.filter((item) => branchSnapshot(item, student).met).length, qualification.length],
    competitiveness: [competitiveness.filter((item) => branchSnapshot(item, student).met).length, competitiveness.length],
  };
  const today = localDayStart().getTime();
  const activeSpaceIds = new Set(campus.spaces.filter((space) => !space.archived && !space.dissolvedAt).map((space) => space.id));
  const visibleReminders = sortCampusReminders(campus.reminders.filter((reminder) => {
    const moment = reminderMoment(reminder);
    return activeSpaceIds.has(reminder.spaceId) && reminder.status !== "archived" && moment <= today + 7 * 86400000;
  }), campus).slice(0, 4);
  const unread = campus.notices.filter((notice) => !notice.read).length;

  return (
    <MobileScroll className="app-screen overview-screen">
      <main className="overview-shell" data-testid="overview-page">
        <header className="overview-header">
          <button className="overview-launcher" aria-label="打开功能中心" onClick={onFeatures} data-testid="feature-center-trigger"><DashboardIcon /></button>
          <div><small>{formatCampusDay(new Date().toISOString())}</small><strong>概览</strong></div>
          <button className="overview-account" aria-label="打开我的账号" onClick={onAccount} data-testid="account-trigger"><PersonIcon />{unread ? <b>{unread}</b> : null}</button>
        </header>

        <section className="overview-greeting">
          <span>你好，{account?.displayName || student.name || "同学"}</span>
          <h1>今天和接下来要做什么</h1>
        </section>

        <section className="overview-section campus-agenda-preview">
          <div className="overview-section-heading"><div><h2>近期校园事项</h2><span>{activeSpaceIds.size}个班级与课程空间</span></div><button onClick={onAgenda}>查看全部 <ChevronRightIcon /></button></div>
          <div className="overview-reminder-list">
            {visibleReminders.map((reminder) => <CampusReminderCard key={reminder.id} reminder={reminder} campus={campus} onClick={() => onReminder(reminder.id)} compact />)}
          </div>
        </section>

        <section className="overview-section primary-template-section">
          <div className="overview-section-heading"><div><h2>主模版</h2><span>升学准备档案</span></div></div>
          <button className="overview-template-card" onClick={onGoals} data-testid="primary-template-card">
            <div className="overview-template-top">
              <span className="overview-template-icon"><ReaderIcon /></span>
              <span><small>当前目标</small><strong>{template.title}</strong></span>
              <ChevronRightIcon />
            </div>
            <div className="overview-template-progress">
              <ProgressMini label="毕业" value={progress.graduation[0]} total={progress.graduation[1]} tone="teal" />
              <ProgressMini label="推免" value={progress.qualification[0]} total={progress.qualification[1]} tone="blue" />
              <ProgressMini label="简历" value={progress.competitiveness[0]} total={progress.competitiveness[1]} tone="cyan" />
            </div>
          </button>
        </section>
      </main>
    </MobileScroll>
  );
}

function ProgressMini({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const ratio = total ? Math.min(100, Math.round(value / total * 100)) : 0;
  return <div className={`progress-mini ${tone}`}><span><b>{label}</b><em>{value}/{total}</em></span><i><u style={{ width: `${ratio}%` }} /></i></div>;
}

function CampusReminderCard({ reminder, campus, onClick, compact = false }: { reminder: CampusReminder; campus: CampusDemoState; onClick: () => void; compact?: boolean }) {
  const space = campus.spaces.find((item) => item.id === reminder.spaceId);
  const recipient = recipientFor(campus, reminder.id);
  const needsAction = reminderNeedsAction(reminder, recipient);
  const overdue = reminderMoment(reminder) < Date.now() && needsAction && reminder.status !== "cancelled";
  const stateLabel = reminder.status === "cancelled"
    ? "已取消"
    : reminder.actionMode === "confirm" && recipient?.confirmedAt && recipient.confirmedVersion === reminder.version
      ? "已确认"
      : reminder.actionMode === "complete" && recipient?.completedAt
        ? "已完成"
        : reminder.actionMode === "read" && recipient?.readAt
          ? "已查看"
          : overdue ? "已逾期" : reminder.status === "updated" ? "待重新确认" : "待处理";
  return (
    <button className={`campus-reminder-card ${compact ? "compact" : ""} ${reminder.status} ${overdue ? "overdue" : ""}`} onClick={onClick} data-testid={`reminder-card-${reminder.id}`}>
      <span className={`reminder-type-mark ${reminder.type}`}><ReminderTypeIcon type={reminder.type} /></span>
      <span className="reminder-card-copy">
        <span className="reminder-card-meta"><b>{space?.name || "校园空间"}</b><em className={needsAction ? "pending" : "done"}>{stateLabel}</em></span>
        <strong>{reminder.title}</strong>
        <small>{reminderTimeLabel(reminder)}{reminder.location ? ` · ${reminder.location}` : ""}</small>
      </span>
      <ChevronRightIcon />
    </button>
  );
}

function ReminderTypeIcon({ type }: { type: ReminderType }) {
  if (type === "resource") return <FileTextIcon />;
  if (type === "event") return <ClockIcon />;
  if (type === "deadline") return <ListBulletIcon />;
  if (type === "confirmation") return <CheckCircledIcon />;
  return <ReaderIcon />;
}

function AgendaPage({ campus, onBack, onReminder }: { campus: CampusDemoState; onBack: () => void; onReminder: (id: string) => void }) {
  const [range, setRange] = useState<"today" | "week" | "all">("today");
  const [query, setQuery] = useState("");
  const [spaceId, setSpaceId] = useState("all");
  const [type, setType] = useState<ReminderType | "all">("all");
  const [personal, setPersonal] = useState<"all" | "pending" | "done">("all");
  const today = localDayStart().getTime();
  const activeSpaces = campus.spaces.filter((space) => !space.archived && !space.dissolvedAt);
  const activeSpaceIds = new Set(activeSpaces.map((space) => space.id));
  const end = range === "today" ? today + 86400000 : range === "week" ? today + 7 * 86400000 : Number.POSITIVE_INFINITY;
  const filtered = sortCampusReminders(campus.reminders.filter((reminder) => {
    const moment = reminderMoment(reminder);
    const recipient = recipientFor(campus, reminder.id);
    const matchesRange = range === "all" || (range === "today" ? moment < end : moment >= today - 86400000 && moment <= end);
    const matchesPersonal = personal === "all" || (personal === "pending" ? reminderNeedsAction(reminder, recipient) : !reminderNeedsAction(reminder, recipient));
    return activeSpaceIds.has(reminder.spaceId) && matchesRange && matchesPersonal && (spaceId === "all" || reminder.spaceId === spaceId) && (type === "all" || reminder.type === type) && reminder.title.toLowerCase().includes(query.trim().toLowerCase());
  }), campus);
  return (
    <div className="workspace-page campus-workspace-page" data-testid="agenda-page">
      <WorkspaceHeader title="事项" onBack={onBack} />
      <MobileScroll className="workspace-page-scroll campus-page-scroll">
        <main className="workspace-page-content campus-list-page">
          <div className="campus-search"><ListBulletIcon /><KeyboardInput aria-label="搜索事项" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题" /></div>
          <div className="campus-segmented"><button className={range === "today" ? "active" : ""} onClick={() => setRange("today")}>今天</button><button className={range === "week" ? "active" : ""} onClick={() => setRange("week")}>7日</button><button className={range === "all" ? "active" : ""} onClick={() => setRange("all")}>全部</button></div>
          <div className="campus-filter-row">
            <select aria-label="按空间筛选" value={spaceId} onChange={(event) => setSpaceId(event.target.value)}><option value="all">全部空间</option>{activeSpaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select>
            <select aria-label="按类型筛选" value={type} onChange={(event) => setType(event.target.value as ReminderType | "all")}><option value="all">全部类型</option>{Object.entries(reminderTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select aria-label="按状态筛选" value={personal} onChange={(event) => setPersonal(event.target.value as "all" | "pending" | "done")}><option value="all">全部状态</option><option value="pending">待处理</option><option value="done">已处理</option></select>
          </div>
          <div className="campus-result-heading"><strong>{range === "today" ? "今天" : range === "week" ? "未来 7 日" : "全部事项"}</strong><span>{filtered.length}项</span></div>
          <div className="campus-reminder-list">{filtered.map((reminder) => <CampusReminderCard key={reminder.id} reminder={reminder} campus={campus} onClick={() => onReminder(reminder.id)} />)}{!filtered.length ? <CampusEmpty title="没有符合条件的事项" /> : null}</div>
        </main>
      </MobileScroll>
    </div>
  );
}

function SpacesPage({ campus, onChange, onBack, onSpace }: { campus: CampusDemoState; onChange: (value: CampusDemoState | ((current: CampusDemoState) => CampusDemoState)) => void; onBack: () => void; onSpace: (id: string) => void }) {
  const [kind, setKind] = useState<CampusSpaceKind>("course");
  const [showArchived, setShowArchived] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinNotice, setJoinNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [joinPolicy, setJoinPolicy] = useState<CampusJoinPolicy>("approval");
  const [createdSpaceId, setCreatedSpaceId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const spaces = campus.spaces.filter((space) => space.kind === kind && Boolean(space.archived || space.dissolvedAt) === showArchived);
  const createdSpace = campus.spaces.find((space) => space.id === createdSpaceId);
  const join = () => {
    const normalized = joinCode.trim().toUpperCase();
    if (!normalized) return setJoinNotice("请输入加入码");
    const existing = campus.spaces.find((space) => space.code === normalized);
    if (existing?.dissolvedAt) return setJoinNotice("该空间已解散，无法加入");
    if (existing?.archived) return setJoinNotice("该空间已归档，无法加入");
    if (existing) return setJoinNotice("你已经加入这个空间");
    const invite = campusInviteDirectory.find((item) => item.code === normalized);
    if (!invite) return setJoinNotice("加入码无效，请检查后重试");
    if (invite.joinPolicy === "approval") {
      const alreadyRequested = (campus.joinRequests ?? []).some((request) => request.code === normalized && request.applicantName === "林知夏" && request.status === "pending");
      if (alreadyRequested) return setJoinNotice("申请已提交，等待审核");
      onChange((current) => ({
        ...current,
        joinRequests: [...(current.joinRequests ?? []), { id: `join-request-${Date.now()}`, spaceId: invite.id, applicantName: "林知夏", code: normalized, status: "pending", requestedAt: new Date().toISOString() }],
      }));
      setJoinNotice("申请已提交，等待审核");
      setJoinCode("");
      return;
    }
    const next: CampusSpace = { ...invite, id: `${invite.id}-${Date.now()}` };
    onChange((current) => ({
      ...current,
      spaces: [...current.spaces, next],
      members: [
        ...current.members,
        { id: `${next.id}-member-current`, spaceId: next.id, name: "林知夏", role: "member" },
        { id: `${next.id}-member-owner`, spaceId: next.id, name: "课程负责人", role: "owner" },
      ],
    }));
    setJoinNotice("加入成功");
    onSpace(next.id);
  };
  const create = () => {
    if (!spaceName.trim()) return setJoinNotice(`请输入${campusSpaceLabels[kind]}名称`);
    const id = `space-custom-${Date.now()}`;
    const code = createCampusJoinCode(kind);
    onChange((current) => ({
      ...current,
      spaces: [...current.spaces, { id, name: spaceName.trim(), kind, code, role: "owner", memberCount: 1, joinPolicy, color: kind === "class" ? "teal" : "blue" }],
      members: [...current.members, { id: `${id}-member-current`, spaceId: id, name: "林知夏", role: "owner" }],
    }));
    setCreating(false);
    setCreatedSpaceId(id);
    setCopiedCode(false);
    setJoinNotice("");
    setSpaceName("");
  };
  const copyCreatedCode = async () => {
    if (!createdSpace) return;
    try { await navigator.clipboard?.writeText(createdSpace.code); } catch { /* Demo clipboard can be unavailable. */ }
    setCopiedCode(true);
  };
  return (
    <div className="workspace-page campus-workspace-page" data-testid="spaces-page">
      <WorkspaceHeader title="班级与课程" onBack={onBack} action={<button className="text-action" onClick={() => setShowArchived(!showArchived)}>{showArchived ? "返回" : "历史"}</button>} />
      <MobileScroll className="workspace-page-scroll campus-page-scroll"><main className="workspace-page-content campus-list-page">
        <div className="campus-segmented"><button className={kind === "course" ? "active" : ""} onClick={() => setKind("course")}>课程</button><button className={kind === "class" ? "active" : ""} onClick={() => setKind("class")}>班级</button></div>
        {!showArchived ? <section className="space-quick-actions"><div className="join-code"><KeyboardInput aria-label="输入加入码" value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="输入加入码" /><button onClick={join}>加入</button></div>{joinNotice ? <p role="status">{joinNotice}</p> : null}<button className="outline-action" onClick={() => { setCreating(!creating); setCreatedSpaceId(null); setJoinNotice(""); }}><PlusIcon /> 创建{campusSpaceLabels[kind]}</button>{creating ? <div className="create-space-form" data-testid="create-space-form"><label><span>{campusSpaceLabels[kind]}名称</span><KeyboardInput aria-label="空间名称" value={spaceName} onChange={(event) => setSpaceName(event.target.value)} placeholder={`输入${campusSpaceLabels[kind]}名称`} /></label><fieldset><legend>加入方式</legend><div><button type="button" className={joinPolicy === "open" ? "active" : ""} onClick={() => setJoinPolicy("open")}><CheckIcon /> 直接加入</button><button type="button" className={joinPolicy === "approval" ? "active" : ""} onClick={() => setJoinPolicy("approval")}><PersonIcon /> 需要审核</button></div></fieldset><button className="create-space-submit" onClick={create}>创建{campusSpaceLabels[kind]}</button></div> : null}{createdSpace ? <div className="created-space-result" data-testid="created-space-result"><span><CheckIcon /></span><div><small>{campusSpaceLabels[createdSpace.kind]}已创建</small><strong>{createdSpace.name}</strong></div><div className="created-space-code"><span><small>加入码</small><b>{createdSpace.code}</b></span><button onClick={() => void copyCreatedCode()}><CopyIcon /> {copiedCode ? "已复制" : "复制"}</button></div><p>{campusJoinPolicyLabels[createdSpace.joinPolicy]}</p><button className="create-space-enter" onClick={() => onSpace(createdSpace.id)}>进入{campusSpaceLabels[createdSpace.kind]}</button></div> : null}</section> : null}
        <div className="space-list">{spaces.map((space) => <button key={space.id} className={`space-card tone-${space.color} ${space.dissolvedAt ? "dissolved" : ""}`} onClick={() => onSpace(space.id)} data-testid={`space-${space.id}`}><span className="space-card-icon">{space.kind === "course" ? <ReaderIcon /> : <PersonIcon />}</span><span><strong>{space.name}</strong><small>{space.dissolvedAt ? "已解散 · 仅供查看" : `${campusRoleLabels[space.role]} · ${space.memberCount}名成员`}</small></span><ChevronRightIcon /></button>)}{!spaces.length ? <CampusEmpty title={showArchived ? "暂无历史空间" : "暂无空间"} /> : null}</div>
      </main></MobileScroll>
    </div>
  );
}

function SpaceDetailPage({ campus, spaceId, onChange, onBack, onReminder, onResource, onCreateReminder }: { campus: CampusDemoState; spaceId: string; onChange: (value: CampusDemoState | ((current: CampusDemoState) => CampusDemoState)) => void; onBack: () => void; onReminder: (id: string) => void; onResource: (id: string) => void; onCreateReminder: () => void }) {
  const space = campus.spaces.find((item) => item.id === spaceId);
  const [tab, setTab] = useState<"agenda" | "resources" | "members">("agenda");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "duplicate" | "done">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inviteNotice, setInviteNotice] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberNotice, setMemberNotice] = useState("");
  const [dissolveSheet, setDissolveSheet] = useState(false);
  if (!space) return <div className="workspace-page"><WorkspaceHeader title="空间" onBack={onBack} /><CampusEmpty title="空间不存在" /></div>;
  const dissolved = Boolean(space.dissolvedAt);
  const isOwner = space.role === "owner";
  const isAdmin = space.role === "admin";
  const canManage = !dissolved && (isOwner || isAdmin);
  const reminders = sortCampusReminders(campus.reminders.filter((item) => item.spaceId === space.id), campus);
  const resources = campus.resources.filter((item) => item.spaceId === space.id);
  const members = campus.members.filter((item) => item.spaceId === space.id);
  const pendingJoinRequests = (campus.joinRequests ?? []).filter((request) => request.spaceId === space.id && request.status === "pending");
  const approvalRequired = (space.joinPolicy ?? "open") === "approval";
  const selectedMember = members.find((member) => member.id === selectedMemberId);
  const adminCount = members.filter((member) => member.role === "admin").length;
  const canOpenMember = (member: CampusMember) => !dissolved && (isOwner
    ? member.role !== "owner"
    : isAdmin && member.role === "member");
  const copyJoinCode = async () => {
    try { await navigator.clipboard?.writeText(space.code); } catch { /* Demo clipboard can be unavailable. */ }
    setCopiedCode(true);
  };
  const toggleJoinPolicy = () => {
    if (!isOwner || dissolved) return;
    onChange((current) => ({
      ...current,
      spaces: current.spaces.map((item) => item.id === space.id ? { ...item, joinPolicy: (item.joinPolicy ?? "open") === "open" ? "approval" : "open" } : item),
    }));
  };
  const resetJoinCode = () => {
    if (!isOwner || dissolved) return;
    const nextCode = createCampusJoinCode(space.kind);
    onChange((current) => ({
      ...current,
      spaces: current.spaces.map((item) => item.id === space.id ? { ...item, code: nextCode } : item),
    }));
    setCopiedCode(false);
    setInviteNotice("已生成新的加入码");
  };
  const resolveJoinRequest = (request: CampusJoinRequest, approved: boolean) => {
    if (!canManage) return;
    onChange((current) => ({
      ...current,
      spaces: approved ? current.spaces.map((item) => item.id === space.id ? { ...item, memberCount: item.memberCount + 1 } : item) : current.spaces,
      members: approved ? [...current.members, { id: `${space.id}-member-${Date.now()}`, spaceId: space.id, name: request.applicantName, role: "member" }] : current.members,
      joinRequests: (current.joinRequests ?? []).map((item) => item.id === request.id ? { ...item, status: approved ? "approved" : "rejected" } : item),
    }));
  };
  const manageMember = (member: CampusMember, action: "promote" | "demote" | "transfer" | "remove") => {
    if (dissolved) return;
    if (action === "promote") {
      if (!isOwner) return;
      if (adminCount >= 3) {
        setMemberNotice("管理员最多设置 3 名");
        return;
      }
      onChange((current) => ({ ...current, members: current.members.map((item) => item.id === member.id ? { ...item, role: "admin" } : item) }));
      setMemberNotice(`${member.name} 已设为管理员`);
    }
    if (action === "demote" && isOwner) {
      onChange((current) => ({ ...current, members: current.members.map((item) => item.id === member.id ? { ...item, role: "member" } : item) }));
      setMemberNotice(`${member.name} 已取消管理员`);
    }
    if (action === "transfer" && isOwner) {
      onChange((current) => ({
        ...current,
        spaces: current.spaces.map((item) => item.id === space.id ? { ...item, role: member.name === "林知夏" ? "owner" : "member" } : item),
        members: current.members.map((item) => item.spaceId !== space.id
          ? item
          : item.id === member.id
            ? { ...item, role: "owner" }
            : item.role === "owner" ? { ...item, role: "member" } : item),
      }));
      setMemberNotice(`已将空间负责人转让给 ${member.name}`);
    }
    if (action === "remove" && (isOwner || (isAdmin && member.role === "member"))) {
      onChange((current) => ({
        ...current,
        spaces: current.spaces.map((item) => item.id === space.id ? { ...item, memberCount: Math.max(1, item.memberCount - 1) } : item),
        members: current.members.filter((item) => item.id !== member.id),
      }));
      setMemberNotice(`${member.name} 已移出空间`);
    }
    setSelectedMemberId(null);
  };
  const dissolveSpace = () => {
    if (!isOwner || dissolved) return;
    const dissolvedAt = new Date().toISOString();
    onChange((current) => ({
      ...current,
      spaces: current.spaces.map((item) => item.id === space.id ? { ...item, dissolvedAt } : item),
      joinRequests: (current.joinRequests ?? []).map((request) => request.spaceId === space.id && request.status === "pending" ? { ...request, status: "rejected" } : request),
    }));
    setDissolveSheet(false);
  };
  const upload = () => {
    if (!canManage) return;
    setUploadState("uploading"); setUploadProgress(18);
    window.setTimeout(() => setUploadProgress(68), 250);
    window.setTimeout(() => { setUploadProgress(100); setUploadState("duplicate"); }, 600);
  };
  const finishUpload = (replace: boolean) => {
    const id = replace ? "resource-cf-capital" : `resource-upload-${Date.now()}`;
    onChange((current) => {
      if (replace) return { ...current, resources: current.resources.map((item) => item.id === id ? { ...item, currentVersion: item.currentVersion + 1, status: "available" } : item), resourceVersions: [...current.resourceVersions, { id: `${id}-v${Date.now()}`, resourceId: id, version: 3, label: "Mock 上传", url: "/demo-resources/course-handout.pdf", fileName: "资本预算-补充版.pdf", publishedAt: new Date().toISOString() }] };
      return { ...current, resources: [...current.resources, { id, spaceId: space.id, title: "资本预算补充材料", category: "课件", currentVersion: 1, status: "available", mimeType: "application/pdf", sizeLabel: "1.2 MB" }], resourceVersions: [...current.resourceVersions, { id: `${id}-v1`, resourceId: id, version: 1, label: "当前版本", url: "/demo-resources/course-handout.pdf", fileName: "资本预算补充材料.pdf", publishedAt: new Date().toISOString() }] };
    });
    setUploadState("done");
  };
  return (
    <div className="workspace-page campus-workspace-page" data-testid="space-detail-page">
      <WorkspaceHeader title={space.name} onBack={onBack} action={<span className={`role-badge ${space.role}`}>{campusRoleLabels[space.role]}</span>} />
      <MobileScroll className="workspace-page-scroll campus-page-scroll"><main className="workspace-page-content campus-list-page">
        <section className={`space-hero tone-${space.color} ${dissolved ? "dissolved" : ""}`}><span>{space.kind === "course" ? <ReaderIcon /> : <PersonIcon />}</span><div><small>{campusSpaceLabels[space.kind]}空间</small><strong>{space.name}</strong><em>{dissolved ? "已解散 · 内容仅供查看" : `${space.memberCount}名成员`}</em></div></section>
        {dissolved ? <section className="space-readonly-banner" role="status"><ReaderIcon /><span><strong>空间已解散</strong><small>事项、资料和成员记录均保留，不能继续修改。</small></span></section> : <section className={`space-invite-card ${isOwner ? "owner" : ""}`} data-testid="space-invite-card"><div className="space-invite-code"><small>加入码</small><strong>{space.code}</strong></div><button onClick={() => void copyJoinCode()}><CopyIcon /> {copiedCode ? "已复制" : "复制"}</button>{isOwner ? <div className="space-owner-invite-controls" data-testid="space-owner-invite-controls"><button type="button" className="reset-code" onClick={resetJoinCode}><ReloadIcon /> 重置加入码</button><button type="button" role="switch" aria-checked={approvalRequired} aria-label="需要审核" className={`space-approval-switch ${approvalRequired ? "on" : "off"}`} onClick={toggleJoinPolicy}><span>需要审核</span><i aria-hidden="true" /></button></div> : null}{inviteNotice ? <p role="status">{inviteNotice}</p> : null}</section>}
        <div className={`campus-segmented ${space.kind === "class" ? "two" : ""}`}><button className={tab === "agenda" ? "active" : ""} onClick={() => setTab("agenda")}>事项</button>{space.kind === "course" ? <button className={tab === "resources" ? "active" : ""} onClick={() => setTab("resources")}>资料</button> : null}<button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>成员</button></div>
        {tab === "agenda" ? <><div className="campus-result-heading"><strong>空间事项</strong>{canManage ? <button className="small-primary" onClick={onCreateReminder}><PlusIcon /> 发布事项</button> : <span>{reminders.length}项</span>}</div><div className="campus-reminder-list">{reminders.map((item) => <CampusReminderCard key={item.id} reminder={item} campus={campus} onClick={() => onReminder(item.id)} />)}</div></> : null}
        {tab === "resources" ? <><div className="campus-result-heading"><strong>课程资料</strong>{canManage ? <button className="small-primary" onClick={upload}><UploadIcon /> 上传</button> : <span>{resources.length}份</span>}</div>{uploadState !== "idle" ? <div className={`mock-upload ${uploadState}`}><strong>{uploadState === "uploading" ? "正在上传 Mock 文件" : uploadState === "duplicate" ? "检测到同名资料" : "上传完成"}</strong>{uploadState === "uploading" ? <><i><u style={{ width: `${uploadProgress}%` }} /></i><small>{uploadProgress}%</small></> : null}{uploadState === "duplicate" ? <div><button onClick={() => finishUpload(true)}>替换为新版本</button><button onClick={() => finishUpload(false)}>另存为新资料</button></div> : null}</div> : null}<ResourceList resources={resources} campus={campus} onResource={onResource} canRetry={canManage} onRetry={(id) => onChange((current) => ({ ...current, resources: current.resources.map((item) => item.id === id ? { ...item, status: "available" } : item) }))} /></> : null}
        {tab === "members" ? <div className="members-stack">{canManage && pendingJoinRequests.length ? <section className="join-request-list"><div className="campus-result-heading"><strong>加入申请</strong><span>{pendingJoinRequests.length}人待审核</span></div>{pendingJoinRequests.map((request) => <div className="join-request-row" key={request.id}><span>{request.applicantName.slice(0, 1)}</span><div><strong>{request.applicantName}</strong><small>申请加入{campusSpaceLabels[space.kind]}</small></div><button onClick={() => resolveJoinRequest(request, false)}>拒绝</button><button className="approve" onClick={() => resolveJoinRequest(request, true)}>通过</button></div>)}</section> : null}{memberNotice ? <p className="member-management-notice" role="status">{memberNotice}</p> : null}<div className="member-list"><div className="campus-result-heading"><strong>成员</strong><span>{space.memberCount}人 · {adminCount}/3名管理员</span></div>{members.slice(0, 12).map((member) => canOpenMember(member) ? <button className="member-row interactive" key={member.id} aria-label={`管理${member.name}`} onClick={() => { setSelectedMemberId(member.id); setMemberNotice(""); }}><span>{member.name.slice(0, 1)}</span><strong>{member.name}</strong><em>{campusRoleLabels[member.role]}</em><ChevronRightIcon /></button> : <div className="member-row" key={member.id}><span>{member.name.slice(0, 1)}</span><strong>{member.name}</strong><em>{campusRoleLabels[member.role]}</em></div>)}</div>{isOwner && !dissolved ? <button className="dissolve-space-action" onClick={() => setDissolveSheet(true)}><TrashIcon /> 解散空间</button> : null}</div> : null}
      </main></MobileScroll>
      <BottomSheet open={Boolean(selectedMember)} onOpenChange={(open) => { if (!open) setSelectedMemberId(null); }} title="成员管理" snap={0.46}>
        {selectedMember ? <div className="member-action-sheet"><section><span>{selectedMember.name.slice(0, 1)}</span><div><strong>{selectedMember.name}</strong><small>{campusRoleLabels[selectedMember.role]}</small></div></section>{memberNotice ? <p role="status">{memberNotice}</p> : null}<div>{isOwner && selectedMember.role === "member" ? <button onClick={() => manageMember(selectedMember, "promote")}><PersonIcon /> 设为管理员</button> : null}{isOwner && selectedMember.role === "admin" ? <button onClick={() => manageMember(selectedMember, "demote")}><PersonIcon /> 取消管理员</button> : null}{isOwner ? <button onClick={() => manageMember(selectedMember, "transfer")}><ReloadIcon /> 转让空间负责人</button> : null}<button className="danger" onClick={() => manageMember(selectedMember, "remove")}><TrashIcon /> 移出空间</button></div></div> : null}
      </BottomSheet>
      <BottomSheet open={dissolveSheet} onOpenChange={setDissolveSheet} title="解散空间" snap={0.38}>
        <div className="dissolve-confirm"><span><TrashIcon /></span><h2>确认解散“{space.name}”？</h2><p>加入码将立即失效，所有事项、资料和成员记录转为只读并保留在历史空间中。</p><div><button onClick={() => setDissolveSheet(false)}>取消</button><button className="danger" onClick={dissolveSpace}>确认解散</button></div></div>
      </BottomSheet>
    </div>
  );
}

function ResourceList({ resources, campus, onResource, onRetry, canRetry = true }: { resources: CourseResource[]; campus: CampusDemoState; onResource: (id: string) => void; onRetry: (id: string) => void; canRetry?: boolean }) {
  const categories = Array.from(new Set(resources.map((item) => item.category)));
  return <div className="resource-groups">{categories.map((category) => <section key={category}><h3>{category}</h3><div>{resources.filter((item) => item.category === category).map((resource) => <article className={`resource-row ${resource.status}`} key={resource.id}><button onClick={() => resource.status !== "failed" && onResource(resource.id)}><span><FileTextIcon /></span><span><strong>{resource.title}</strong><small>{resource.lesson ? `${resource.lesson} · ` : ""}v{resource.currentVersion} · {resource.sizeLabel}</small></span><em>{resource.status === "offline" ? "已离线" : resource.status === "failed" ? "上传失败" : resource.associatedReminderId ? "已关联事项" : ""}</em><ChevronRightIcon /></button>{resource.status === "failed" && canRetry ? <button className="resource-retry" onClick={() => onRetry(resource.id)}><ReloadIcon /> 重试</button> : null}</article>)}</div></section>)}</div>;
}

function ReminderDetailPage({ campus, reminderId, onBack, onAction, onEdit, onCancel, onResource }: { campus: CampusDemoState; reminderId: string; onBack: () => void; onAction: (id: string, mode: ReminderActionMode) => void; onEdit: () => void; onCancel: (id: string) => void; onResource: (id: string) => void }) {
  const reminder = campus.reminders.find((item) => item.id === reminderId);
  if (!reminder) return <div className="workspace-page"><WorkspaceHeader title="事项详情" onBack={onBack} /><CampusEmpty title="事项不存在" /></div>;
  const space = campus.spaces.find((item) => item.id === reminder.spaceId);
  const recipient = recipientFor(campus, reminder.id);
  const readOnly = Boolean(space?.dissolvedAt);
  const canManage = !readOnly && (space?.role === "owner" || space?.role === "admin");
  const done = !reminderNeedsAction(reminder, recipient);
  const associated = campus.resources.filter((resource) => resource.associatedReminderId === reminder.id);
  const actionLabel = reminder.actionMode === "confirm" ? (done ? "已确认" : reminder.status === "updated" ? "重新确认收到" : "确认收到") : reminder.actionMode === "complete" ? (done ? "已完成" : "标记完成") : "已查看";
  return <div className="workspace-page campus-workspace-page" data-testid="reminder-detail-page"><WorkspaceHeader title="事项详情" onBack={onBack} action={canManage ? <button className="text-action" onClick={onEdit}>编辑</button> : undefined} /><MobileScroll className="workspace-page-scroll campus-page-scroll"><main className="workspace-page-content reminder-detail-content">
    <section className={`reminder-detail-hero ${reminder.status}`}><span><ReminderTypeIcon type={reminder.type} /></span><small>{space?.name} · {reminderTypeLabels[reminder.type]}</small><h1>{reminder.title}</h1>{reminder.status === "cancelled" ? <b>已取消</b> : reminder.priority === "important" ? <b>重要</b> : null}</section>
    {reminder.diff?.length ? <section className="reminder-diff"><strong>{reminder.status === "cancelled" ? "状态变更" : "本次更新"}</strong>{reminder.diff.map((diff) => <div key={diff.field}><b>{diff.field}</b><span><del>{diff.before}</del><ChevronRightIcon /><ins>{diff.after}</ins></span></div>)}</section> : null}
    <section className="reminder-facts"><div><span>时间</span><strong>{reminderTimeLabel(reminder)}</strong></div>{reminder.location ? <div><span>地点</span><strong>{reminder.location}</strong></div> : null}<div><span>个人状态</span><strong>{done ? actionLabel : "待处理"}</strong></div></section>
    {reminder.attentionNotes ? <p className="attention-note">{reminder.attentionNotes}</p> : null}{reminder.body ? <section className="reminder-body"><h2>具体内容</h2><p>{reminder.body}</p></section> : null}
    {associated.length ? <section className="reminder-resources"><h2>关联资料</h2>{associated.map((resource) => <button key={resource.id} onClick={() => onResource(resource.id)}><FileTextIcon /><span><strong>{resource.title}</strong><small>{resource.category} · v{resource.currentVersion}</small></span><ChevronRightIcon /></button>)}</section> : null}
    {canManage ? <section className="reminder-statistics"><h2>处理统计</h2><div><span><b>{reminder.readCount ?? 0}</b>/{reminder.recipientCount ?? space?.memberCount ?? 0}<small>查收</small></span><span><b>{reminder.confirmedCount ?? reminder.completedCount ?? 0}</b>/{reminder.recipientCount ?? space?.memberCount ?? 0}<small>{reminder.actionMode === "complete" ? "完成" : "确认"}</small></span></div><button className="cancel-reminder" onClick={() => onCancel(reminder.id)}>取消事项</button></section> : null}
    {readOnly ? <div className="readonly-detail-note">空间已解散，事项仅供查看</div> : reminder.status !== "cancelled" ? <button className={`reminder-primary-action ${done ? "done" : ""}`} disabled={done} onClick={() => onAction(reminder.id, reminder.actionMode)} data-testid="reminder-action">{done ? <CheckCircledIcon /> : null}{actionLabel}</button> : null}
  </main></MobileScroll></div>;
}

function createReminderDraft(spaceId: string, id: string): CampusReminder {
  const start = new Date(); start.setDate(start.getDate() + 1); start.setHours(9, 0, 0, 0);
  return { id, spaceId, type: "event", title: "", startsAt: start.toISOString(), timezone: "Asia/Shanghai", priority: "normal", actionMode: "confirm", status: "draft", version: 0, publisherId: "current-student", publishedAt: new Date().toISOString() };
}

function toLocalInputValue(iso?: string) {
  if (!iso) return "";
  const value = new Date(iso); const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function ReminderEditorPage({ campus, spaceId, reminderId, onBack, onSave }: { campus: CampusDemoState; spaceId: string; reminderId: string; onBack: () => void; onSave: (reminder: CampusReminder, publish: boolean) => void }) {
  const existing = campus.reminders.find((item) => item.id === reminderId);
  const [draft, setDraft] = useState<CampusReminder>(() => existing ? { ...existing } : createReminderDraft(spaceId, reminderId));
  const [preview, setPreview] = useState(false);
  const patch = (value: Partial<CampusReminder>) => setDraft((current) => ({ ...current, ...value }));
  const valid = Boolean(draft.title.trim() && (draft.type === "info" || draft.type === "confirmation" || draft.startsAt || draft.dueAt));
  return <div className="workspace-page campus-workspace-page" data-testid="reminder-editor-page"><WorkspaceHeader title={existing ? "编辑事项" : "发布事项"} onBack={onBack} action={<button className="text-action" onClick={() => setPreview(!preview)}>{preview ? "编辑" : "预览"}</button>} /><MobileScroll className="workspace-page-scroll campus-page-scroll"><main className="workspace-page-content reminder-editor-content">
    {preview ? <section className="reminder-preview"><CampusReminderCard reminder={{ ...draft, status: "published" }} campus={campus} onClick={() => undefined} /><p>{draft.body || "暂无具体内容"}</p></section> : <div className="reminder-form">
      <label className="form-field"><span>事项类型</span><select aria-label="事项类型" value={draft.type} onChange={(event) => { const type = event.target.value as ReminderType; patch({ type, actionMode: type === "deadline" || type === "resource" ? "complete" : type === "info" ? "read" : "confirm" }); }}>{Object.entries(reminderTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="form-field"><span>标题</span><KeyboardInput aria-label="事项标题" value={draft.title} onChange={(event) => patch({ title: event.target.value })} placeholder="请输入事项标题" /></label>
      {draft.type === "event" ? <><label className="form-field"><span>开始时间</span><KeyboardInput type="datetime-local" aria-label="开始时间" value={toLocalInputValue(draft.startsAt)} onChange={(event) => patch({ startsAt: event.target.value ? new Date(event.target.value).toISOString() : undefined })} /></label><label className="form-field"><span>地点</span><KeyboardInput aria-label="地点" value={draft.location || ""} onChange={(event) => patch({ location: event.target.value })} placeholder="填写到场地点" /></label></> : null}
      {draft.type === "deadline" || draft.type === "resource" || draft.type === "confirmation" ? <label className="form-field"><span>截止时间</span><KeyboardInput type="datetime-local" aria-label="截止时间" value={toLocalInputValue(draft.dueAt)} onChange={(event) => patch({ dueAt: event.target.value ? new Date(event.target.value).toISOString() : undefined })} /></label> : null}
      <label className="form-field"><span>优先级</span><select aria-label="优先级" value={draft.priority} onChange={(event) => patch({ priority: event.target.value as "normal" | "important" })}><option value="normal">普通</option><option value="important">重要</option></select></label>
      <label className="form-field"><span>行动要求</span><select aria-label="行动要求" value={draft.actionMode} onChange={(event) => patch({ actionMode: event.target.value as ReminderActionMode })}><option value="read">查看即可</option><option value="confirm">确认收到</option><option value="complete">标记完成</option></select></label>
      <label className="form-field"><span>具体内容</span><KeyboardTextarea aria-label="具体内容" value={draft.body || ""} onChange={(event) => patch({ body: event.target.value })} placeholder="填写说明、准备要求或提交方式" /></label>
    </div>}
    <div className="editor-publish-actions"><button disabled={!valid} onClick={() => onSave(draft, false)}>保存草稿</button><button disabled={!valid} onClick={() => onSave(draft, true)}>{existing ? "发布更新" : "发布"}</button></div>
  </main></MobileScroll></div>;
}

function ResourcePreviewPage({ campus, resourceId, onChange, onBack, onReminder }: { campus: CampusDemoState; resourceId: string; onChange: (value: CampusDemoState | ((current: CampusDemoState) => CampusDemoState)) => void; onBack: () => void; onReminder: (id: string) => void }) {
  const resource = campus.resources.find((item) => item.id === resourceId);
  const versions = campus.resourceVersions.filter((item) => item.resourceId === resourceId).sort((a, b) => b.version - a.version);
  const [version, setVersion] = useState(resource?.currentVersion ?? 1);
  const active = versions.find((item) => item.version === version) ?? versions[0];
  if (!resource || !active) return <div className="workspace-page"><WorkspaceHeader title="资料预览" onBack={onBack} /><CampusEmpty title="资料不存在" /></div>;
  const readOnly = Boolean(campus.spaces.find((space) => space.id === resource.spaceId)?.dissolvedAt);
  const toggleOffline = () => onChange((current) => ({ ...current, resources: current.resources.map((item) => item.id === resource.id ? { ...item, status: item.status === "offline" ? "available" : "offline" } : item) }));
  return <div className="workspace-page campus-workspace-page" data-testid="resource-preview-page"><WorkspaceHeader title="资料预览" onBack={onBack} action={<a className="workspace-download" href={active.url} download={active.fileName} aria-label="下载资料"><DownloadIcon /></a>} /><MobileScroll className="workspace-page-scroll campus-page-scroll"><main className="workspace-page-content resource-preview-content">
    <section className="resource-preview-heading"><span><FileTextIcon /></span><div><small>{resource.category}{resource.lesson ? ` · ${resource.lesson}` : ""}</small><h1>{resource.title}</h1><em>{resource.sizeLabel}</em></div></section>
    <div className="resource-version-row"><select aria-label="选择资料版本" value={version} onChange={(event) => setVersion(Number(event.target.value))}>{versions.map((item) => <option key={item.id} value={item.version}>v{item.version} · {item.label}</option>)}</select>{readOnly ? <button disabled>仅供查看</button> : <button className={resource.status === "offline" ? "active" : ""} onClick={toggleOffline}>{resource.status === "offline" ? "已离线" : "离线保存"}</button>}</div>
    <div className="resource-document-viewer">{resource.mimeType === "image/png" ? <img src={active.url} alt={`${resource.title}预览`} /> : <iframe title={`${resource.title} PDF 预览`} src={active.url} />}</div>
    {resource.associatedReminderId ? <button className="resource-associated-reminder" onClick={() => onReminder(resource.associatedReminderId!)}><ListBulletIcon /><span><small>关联事项</small><strong>{campus.reminders.find((item) => item.id === resource.associatedReminderId)?.title}</strong></span><ChevronRightIcon /></button> : null}
  </main></MobileScroll></div>;
}

function CampusEmpty({ title }: { title: string }) {
  return <div className="campus-empty"><ReaderIcon /><span>{title}</span></div>;
}

function CaseLibraryLogo({ item, size = "card" }: { item: CaseLibraryCase; size?: "card" | "detail" }) {
  const logo = caseLibraryAssetUrl(item.schoolLogoUrl);
  return (
    <span className={`case-library-logo ${size}`}>
      {logo ? <img src={logo} alt={`${item.offerSchool || "录取学校"}校徽`} loading="lazy" /> : <GlobeIcon />}
    </span>
  );
}

function CaseContactSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={caseLibraryPageConfig["contact.modalTitle"] || "联系 i乐湖"} snap={0.63}>
      <div className="case-contact-sheet">
        <p>{caseLibraryPageConfig["contact.modalDescription"]}</p>
        <div className="case-contact-options">
          <figure>
            <img src={caseLibraryAssetUrl(caseLibraryPageConfig["contact.wechatQrImage"] || null)} alt="i乐湖小助手微信二维码" />
            <figcaption>{caseLibraryPageConfig["contact.wechatQrLabel"]}</figcaption>
          </figure>
          <figure>
            <img src={caseLibraryAssetUrl(caseLibraryPageConfig["contact.formQrImage"] || null)} alt="问卷星表单二维码" />
            <figcaption>{caseLibraryPageConfig["contact.formQrLabel"]}</figcaption>
          </figure>
        </div>
      </div>
    </BottomSheet>
  );
}

function CaseLibraryPage({ onBack, onCase }: { onBack: () => void; onCase: (id: string) => void }) {
  const [tab, setTab] = useState<CaseLibraryTab>("cases");
  const [query, setQuery] = useState("");
  const [season, setSeason] = useState("不限");
  const [college, setCollege] = useState("不限");
  const [major, setMajor] = useState("不限");
  const [regions, setRegions] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<CaseLibraryFilterId | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const seasonGroup = caseLibraryFilterGroups.find((group) => group.id === "season");
  const programGroup = caseLibraryFilterGroups.find((group) => group.id === "program");
  const regionGroup = caseLibraryFilterGroups.find((group) => group.id === "region");
  const selectedCollege = programGroup?.colleges?.find((item) => item.value === college);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCases = useMemo(() => visibleCaseLibraryCases.filter((item) => {
    const matchesQuery = !normalizedQuery || item.searchText.toLowerCase().includes(normalizedQuery);
    const matchesSeason = season === "不限" || item.applicationSeason === season;
    const matchesCollege = college === "不限" || item.undergradCollege === college;
    const matchesMajor = major === "不限" || item.undergradMajor === major;
    const matchesRegion = !regions.length || Boolean(item.offerRegion && regions.includes(item.offerRegion));
    return matchesQuery && matchesSeason && matchesCollege && matchesMajor && matchesRegion;
  }), [college, major, normalizedQuery, regions, season]);
  const programLabel = college === "不限" ? "学院专业" : major === "不限" ? college : `${college} · ${major}`;
  const regionLabel = !regions.length ? "国家（地区）" : regions.length === 1 ? regions[0] : `${regions.length}个地区`;

  return (
    <div className="workspace-page campus-workspace-page case-library-page" data-testid="case-library-page">
      <WorkspaceHeader title="案例库" onBack={onBack} action={<button className="text-action" onClick={() => setContactOpen(true)}>联系</button>} />
      <MobileScroll className="workspace-page-scroll campus-page-scroll">
        <main className="workspace-page-content case-library-content">
          <section className="case-library-heading">
            <span><BackpackIcon /></span>
            <div><small>{caseLibraryPageConfig["home.heroEyebrow"] || "i乐湖"}</small><h1>{caseLibraryPageConfig["home.heroTitle"] || "人大申请案例库"}</h1></div>
          </section>

          <div className="campus-segmented two case-library-tabs">
            <button className={tab === "cases" ? "active" : ""} onClick={() => setTab("cases")}>案例</button>
            <button className={tab === "articles" ? "active" : ""} onClick={() => setTab("articles")}>专访</button>
          </div>

          {tab === "cases" ? (
            <>
              <label className="campus-search case-library-search"><MagnifyingGlassIcon /><KeyboardInput aria-label="搜索案例" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={caseLibraryPageConfig["home.searchPlaceholder"] || "搜索学校、专业、成绩"} /></label>
              <div className="case-library-filters">
                <button className={season !== "不限" ? "active" : ""} onClick={() => setOpenFilter("season")} aria-label="筛选申请季"><span>{season === "不限" ? "申请季" : season}</span><ChevronDownIcon /></button>
                <button className={college !== "不限" ? "active" : ""} onClick={() => setOpenFilter("program")} aria-label="筛选学院专业"><span>{programLabel}</span><ChevronDownIcon /></button>
                <button className={regions.length ? "active" : ""} onClick={() => setOpenFilter("region")} aria-label="筛选国家地区"><span>{regionLabel}</span><ChevronDownIcon /></button>
              </div>
              <div className="campus-result-heading case-result-heading"><strong>申请案例</strong><span>{filteredCases.length}个</span></div>
              <div className="case-library-list">
                {filteredCases.map((item) => (
                  <button className="case-library-card" key={item.id} onClick={() => onCase(item.id)} data-testid={`case-card-${item.id}`}>
                    <CaseLibraryLogo item={item} />
                    <span className="case-library-card-copy">
                      <span className="case-library-card-meta"><small>{item.applicationSeason}</small>{item.isFinalOffer ? <em>最终去向</em> : null}</span>
                      <strong>{item.offerSchool}</strong>
                      <b>{item.offerProgram}</b>
                      <span className="case-library-background">{item.studentDisplayName} · {[item.undergradCollegeLabel, item.undergradMajor].filter(Boolean).join(" ") || "背景待补充"}</span>
                      <span className="case-library-card-tags">{item.gpa ? <i>GPA {item.gpa}</i> : null}{item.languageScoreText ? <i>{item.languageScoreText}</i> : null}{item.displayTags.slice(0, 1).map((tag) => <i key={tag}>{tag}</i>)}</span>
                    </span>
                    <ChevronRightIcon />
                  </button>
                ))}
                {!filteredCases.length ? <CampusEmpty title="没有符合条件的案例" /> : null}
              </div>
            </>
          ) : (
            <section className="case-article-list" data-testid="case-article-list">
              <div className="campus-result-heading case-result-heading"><strong>{caseLibraryPageConfig["articles.sectionTitle"] || "乐湖专访"}</strong><span>{caseLibraryArticles.length}篇</span></div>
              {caseLibraryArticles.map((article) => (
                <a className={`case-article-card ${article.isFeatured ? "featured" : ""}`} href={article.url} target="_blank" rel="noreferrer" key={article.id}>
                  {article.backgroundImageUrl ? <img src={caseLibraryAssetUrl(article.backgroundImageUrl)} alt="" /> : <span><ReaderIcon /></span>}
                  <span><small>{article.uploadTime}{article.isHot ? " · 热门" : ""}</small><strong>{article.subject}</strong><b>{article.summary}</b></span>
                  <OpenInNewWindowIcon />
                </a>
              ))}
            </section>
          )}

          <section className="case-library-contact-card">
            <span><PersonIcon /></span>
            <div><strong>{caseLibraryPageConfig["home.contactTitle"] || "联系我们"}</strong><p>{caseLibraryPageConfig["home.contactDescription"]}</p></div>
            <button onClick={() => setContactOpen(true)}>{caseLibraryPageConfig["home.contactButtonText"] || "立即联系"}</button>
          </section>
        </main>
      </MobileScroll>

      <BottomSheet open={Boolean(openFilter)} onOpenChange={(open) => { if (!open) setOpenFilter(null); }} title={openFilter === "season" ? "申请季" : openFilter === "program" ? "学院专业" : "国家（地区）"} snap={openFilter === "program" ? 0.58 : 0.48}>
        <div className="case-filter-sheet">
          {openFilter === "season" ? <div className="case-filter-options">{(seasonGroup?.options ?? ["不限"]).map((option) => <button className={season === option ? "active" : ""} key={option} onClick={() => { setSeason(option); setOpenFilter(null); }}>{option}</button>)}</div> : null}
          {openFilter === "program" ? <><div className="case-filter-options college-options"><button className={college === "不限" ? "active" : ""} onClick={() => { setCollege("不限"); setMajor("不限"); setOpenFilter(null); }}>不限</button>{(programGroup?.colleges ?? []).map((option) => <button className={college === option.value ? "active" : ""} key={option.value} onClick={() => { setCollege(option.value); setMajor("不限"); }}>{option.label}</button>)}</div>{selectedCollege ? <div className="case-filter-options major-options"><button className={major === "不限" ? "active" : ""} onClick={() => { setMajor("不限"); setOpenFilter(null); }}>全部专业</button>{selectedCollege.majors.map((option) => <button className={major === option ? "active" : ""} key={option} onClick={() => { setMajor(option); setOpenFilter(null); }}>{option}</button>)}</div> : <p className="case-filter-hint">先选择学院，再选择专业</p>}</> : null}
          {openFilter === "region" ? <><div className="case-filter-options">{(regionGroup?.options ?? []).map((option) => <button className={regions.includes(option) ? "active" : ""} key={option} onClick={() => setRegions((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option])}>{option}</button>)}</div><div className="case-filter-actions"><button onClick={() => setRegions([])}>清空</button><button className="primary" onClick={() => setOpenFilter(null)}>完成</button></div></> : null}
        </div>
      </BottomSheet>
      <CaseContactSheet open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}

function CaseDetailPage({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const item = visibleCaseLibraryCases.find((candidate) => candidate.id === caseId);
  const [contactOpen, setContactOpen] = useState(false);
  if (!item) return <div className="workspace-page campus-workspace-page"><WorkspaceHeader title="案例详情" onBack={onBack} /><CampusEmpty title="案例不存在" /></div>;
  return (
    <div className="workspace-page campus-workspace-page case-detail-page" data-testid="case-detail-page">
      <WorkspaceHeader title="案例详情" onBack={onBack} />
      <MobileScroll className="workspace-page-scroll campus-page-scroll">
        <main className="workspace-page-content case-detail-content">
          <section className="case-detail-hero">
            <CaseLibraryLogo item={item} size="detail" />
            <div><small>{[item.applicationSeason, item.offerRegion].filter(Boolean).join(" · ")}</small><h1>{item.offerSchool}</h1><p>{item.offerProgram}</p></div>
          </section>
          <section className="case-detail-student">
            <span><PersonIcon /></span>
            <div><small>申请人背景</small><strong>{item.studentDisplayName}</strong><p>{[item.undergradCollegeLabel, item.undergradMajor].filter(Boolean).join(" · ") || "背景待补充"}</p></div>
          </section>
          {item.displayTags.length ? <div className="case-detail-tags">{item.displayTags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
          <section className="case-detail-section">
            <h2>案例信息</h2>
            <dl>{item.detailSections.map((section) => <div key={section.label}><dt>{section.label}</dt><dd>{section.value}</dd></div>)}</dl>
          </section>
          <section className="case-detail-contact">
            <span><PersonIcon /></span>
            <div><strong>{caseLibraryPageConfig["detail.contactTitle"] || "案例咨询"}</strong><p>{caseLibraryPageConfig["detail.contactDescriptionWithCard"]}</p></div>
            <button onClick={() => setContactOpen(true)}>{caseLibraryPageConfig["detail.contactButtonTextWithCard"] || "立即咨询"}</button>
          </section>
        </main>
      </MobileScroll>
      <CaseContactSheet open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}

function FeatureCenterPage({
  account,
  student,
  templateTitle,
  templateCount,
  syncState,
  onBack,
  onTemplates,
  onAgenda,
  onSpaces,
  onCases,
  onArchive,
  onEntry,
  onSettings,
  onAccount,
}: {
  account?: AccountRecord;
  student: StudentProfile;
  templateTitle: string;
  templateCount: number;
  syncState: "saved" | "saving" | "error";
  onBack: () => void;
  onTemplates: (view: "mine" | "library") => void;
  onAgenda: () => void;
  onSpaces: () => void;
  onCases: () => void;
  onArchive: () => void;
  onEntry: () => void;
  onSettings: () => void;
  onAccount: () => void;
}) {
  const functions = [
    { id: "agenda", label: "事项", note: "今天与接下来", icon: ListBulletIcon, tone: "blue", action: onAgenda },
    { id: "spaces", label: "班级与课程", note: "空间与资料", icon: ReaderIcon, tone: "teal", action: onSpaces },
    { id: "cases", label: "案例库", note: "申请方向参考", icon: BackpackIcon, tone: "cyan", action: onCases },
    { id: "template-library", label: "模版库", note: "发现目标路径", icon: LayersIcon, tone: "blue", action: () => onTemplates("library") },
    { id: "my-templates", label: "我的模版", note: `${templateCount}个模版`, icon: CardStackIcon, tone: "teal", action: () => onTemplates("mine") },
    { id: "archive", label: "完整档案", note: "成绩与经历", icon: FileTextIcon, tone: "cyan", action: onArchive },
    { id: "entry", label: "录入资料", note: "更新当前进度", icon: Pencil2Icon, tone: "blue", action: onEntry },
    { id: "settings", label: "模版设置", note: "字段与规则", icon: GearIcon, tone: "teal", action: onSettings },
    { id: "account", label: "我的账号", note: "账号与保存", icon: PersonIcon, tone: "cyan", action: onAccount },
  ];

  return (
    <div className="workspace-page feature-center-page" data-testid="feature-center-page">
      <header className="workspace-page-header">
        <button aria-label="返回首页" onClick={onBack}><ChevronRightIcon /></button>
        <strong>功能中心</strong>
        <span />
      </header>
      <MobileScroll className="workspace-page-scroll">
        <main className="workspace-page-content feature-center-content">
          <section className="feature-account-card">
            <div className="feature-account-avatar"><PersonIcon /></div>
            <div className="feature-account-copy">
              <strong>{account?.displayName || student.name || "学生"}</strong>
              <span>{student.major || "未填写专业"} · {student.cohort || "未填写年级"}</span>
              <small>{account?.email || "本机演示"}</small>
            </div>
            <span className={`feature-sync-dot ${syncState}`} aria-label={syncState === "saved" ? "已保存" : syncState === "saving" ? "正在保存" : "保存异常"} />
          </section>

          <button className="feature-current-template" onClick={() => onTemplates("mine")}>
            <span className="feature-current-icon"><ReaderIcon /></span>
            <span>
              <small>当前目标</small>
              <strong>{templateTitle}</strong>
            </span>
            <ChevronRightIcon />
          </button>

          <section className="feature-section">
            <h1>全部功能</h1>
            <div className="feature-grid">
              {functions.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={item.action} data-testid={`feature-${item.id}`}>
                    <span className={`feature-icon ${item.tone}`}><Icon /></span>
                    <strong>{item.label}</strong>
                    <small>{item.note}</small>
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      </MobileScroll>
    </div>
  );
}

function TemplateLibraryPage({
  accountState,
  currentTemplate,
  activeRemoteTemplateId,
  view,
  sharedTemplate,
  notice,
  onView,
  onBack,
  onChoose,
  onPrimary,
  onShare,
  onInstall,
}: {
  accountState: AccountState;
  currentTemplate: TemplateConfig;
  activeRemoteTemplateId: string | null;
  view: "mine" | "library";
  sharedTemplate: AccountTemplateRecord | null;
  notice: string;
  onView: (view: "mine" | "library") => void;
  onBack: () => void;
  onChoose: (record: AccountTemplateRecord) => void;
  onPrimary: (record: AccountTemplateRecord) => void;
  onShare: () => void;
  onInstall: (record: LibraryTemplateRecord | AccountTemplateRecord, shareCode?: string) => void;
}) {
  const authenticated = accountState.mode === "authenticated" ? accountState : null;

  return (
    <div className="workspace-page template-library-page" data-testid="template-library-page">
      <header className="workspace-page-header">
        <button aria-label="返回功能中心" onClick={onBack}><ChevronRightIcon /></button>
        <strong>目标模版</strong>
        <span />
      </header>
      <MobileScroll className="workspace-page-scroll">
        <main className="workspace-page-content template-library-content">
          <div className="template-library-tabs template-page-tabs">
            <button className={view === "mine" ? "active" : ""} onClick={() => onView("mine")}>我的模版</button>
            <button className={view === "library" ? "active" : ""} onClick={() => onView("library")}>模版库</button>
          </div>

          {view === "mine" ? (
            <section className="template-page-section">
              <div className="template-page-heading">
                <h1>我的目标</h1>
                <span>{authenticated?.templates.length ?? 1}个</span>
              </div>
              <div className="account-template-list">
                {authenticated ? authenticated.templates.map((record) => (
                  <article className={`account-template-card ${record.id === activeRemoteTemplateId ? "selected" : ""}`} key={record.id}>
                    <button className="account-template-main" onClick={() => onChoose(record)}>
                      <span>
                        <strong>{record.title}</strong>
                        <small>{record.primary ? "主模版" : record.visibility === "library" ? "已发布" : record.visibility === "unlisted" ? "可通过链接使用" : "仅自己可见"}</small>
                      </span>
                      {record.id === activeRemoteTemplateId ? <CheckIcon /> : <ChevronRightIcon />}
                    </button>
                    <div className="account-template-actions">
                      {!record.primary ? <button onClick={() => onPrimary(record)}>设为主模版</button> : null}
                      {record.id === activeRemoteTemplateId ? <button onClick={onShare}><CopyIcon /> 分享</button> : null}
                    </div>
                  </article>
                )) : (
                  <article className="account-template-card selected">
                    <button className="account-template-main" onClick={onBack}>
                      <span><strong>{currentTemplate.title}</strong><small>{currentTemplate.primary ? "主模版" : "当前模版"}</small></span>
                      <CheckIcon />
                    </button>
                  </article>
                )}
              </div>
            </section>
          ) : (
            <section className="template-page-section">
              <div className="template-page-heading">
                <h1>模版库</h1>
                <span>{authenticated?.library.length ?? 0}个</span>
              </div>
              <div className="account-template-list">
                {sharedTemplate && authenticated ? (
                  <article className="library-template-card shared-template-card">
                    <span className="library-template-badge">分享给你的模版</span>
                    <strong>{sharedTemplate.title}</strong>
                    <small>{sharedTemplate.ownerName || "学生创作者"}</small>
                    <button className="sheet-primary compact" onClick={() => onInstall(sharedTemplate, sharedTemplate.shareCode || undefined)}>使用这个模版</button>
                  </article>
                ) : null}
                {authenticated?.library.map((record) => {
                  const owned = record.ownerUserId === authenticated.account.id;
                  return (
                    <article className="library-template-card" key={record.id}>
                      <span className="library-template-badge">公开模版</span>
                      <strong>{record.title}</strong>
                      <small>{record.ownerName || "学生创作者"}{record.description ? ` · ${record.description}` : ""}</small>
                      <button className="outline-action compact" disabled={owned} onClick={() => onInstall(record)}>
                        {owned ? "我发布的" : "加入我的模版"}
                      </button>
                    </article>
                  );
                })}
                {!sharedTemplate && (!authenticated || authenticated.library.length === 0) ? <p className="template-library-empty">模版库暂时还没有公开模版</p> : null}
              </div>
            </section>
          )}
          {notice ? <p className="account-notice" role="status">{notice}</p> : null}
        </main>
      </MobileScroll>
    </div>
  );
}

function AccountGate({
  mode,
  message,
  onRetry,
}: {
  mode: "loading" | "anonymous" | "error";
  message?: string;
  onRetry?: () => void;
}) {
  const returnTo = `${window.location.pathname}${window.location.search}` || "/";
  const signInHref = `/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo.startsWith("/") ? returnTo : "/")}`;

  return (
    <MobileScroll className="account-gate-screen">
      <main className={`account-gate ${mode}`} data-testid={`account-gate-${mode}`}>
        <div className="account-gate-mark"><ReaderIcon /></div>
        {mode === "loading" ? (
          <>
            <strong>正在打开你的升学档案</strong>
            <span className="account-gate-loader" aria-label="正在加载" />
          </>
        ) : mode === "anonymous" ? (
          <>
            <p className="account-gate-eyebrow">人大中法升学准备档案</p>
            <h1>把成绩、经历和目标模版放进同一个账号</h1>
            <p className="account-gate-copy">登录后，你的档案会跟随账号保存，也可以选择、编辑和分享自己的模版。</p>
            <a className="account-gate-primary" href={signInHref}><PersonIcon /> 注册 / 登录</a>
            <small>首次登录会自动创建账号</small>
          </>
        ) : (
          <>
            <h1>暂时无法打开账号</h1>
            <p className="account-gate-copy">{message || "请稍后重试"}</p>
            <button className="account-gate-primary" onClick={onRetry}>重新加载</button>
          </>
        )}
      </main>
    </MobileScroll>
  );
}

function PageHero({ page, identity, student }: { page: PageConfig; identity: string; student: StudentProfile }) {
  const qualificationBranches = page.branches.filter((branch) => branch.visible);
  const metCount = qualificationBranches.filter((branch) => branchSnapshot(branch, student).met).length;
  const graduationRequirements = (page.checklist ?? []).filter((item) => item.visible);
  const graduationCompleted = graduationRequirements.filter((item) => graduationRequirementMet(item, student)).length;
  const illustration = page.id === "competitiveness" ? "/assets/app/competitiveness-target.png" : "/assets/app/qualification-tree.png";

  return (
    <div className={`page-hero ${page.id}`}>
      <div className="hero-copy">
        <h1>{page.title}</h1>
        <p className="identity">{identity}</p>
        {page.id === "qualification" ? (
          <div className="gpa-summary">
            <span>平均学分绩点</span>
            <strong>{student.gpa.toFixed(2)}</strong>
            <small>{qualificationBranches.length}项要求，{metCount}项已达标</small>
          </div>
        ) : page.id === "graduation" ? (
          <div className="graduation-summary">
            <strong>{graduationCompleted}</strong>
            <span>/ {graduationRequirements.length}项已满足</span>
          </div>
        ) : null}
      </div>
      <img className="hero-illustration" src={illustration} alt="" aria-hidden="true" draggable={false} />
    </div>
  );
}

function GraduationChecklist({
  modules,
  requirements,
  student,
  onToggle,
}: {
  modules: GraduationModule[];
  requirements: GraduationRequirement[];
  student: StudentProfile;
  onToggle: (id: string) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    foundation: true,
    major: false,
    excellence: false,
  });
  const [expandedVolunteer, setExpandedVolunteer] = useState<string | null>(null);
  const groups = modules
    .map((module) => ({ ...module, items: requirements.filter((item) => item.group === module.id) }))
    .filter((group) => group.items.length);
  return (
    <div className="graduation-checklist" data-testid="graduation-checklist">
      {groups.map((group, index) => {
        const completed = group.items.filter((item) => graduationRequirementMet(item, student)).length;
        const groupExpanded = expandedGroups[group.id];
        const Icon = iconMap[graduationGroupIcons[group.id] ?? "star"];
        return (
          <article className={`path-item graduation-path-item ${groupExpanded ? "expanded" : ""}`} key={group.id}>
            <span className="path-number">{index + 1}</span>
            <button
              className="branch-summary without-status graduation-module-summary"
              onClick={() => setExpandedGroups((current) => ({ ...current, [group.id]: !current[group.id] }))}
              aria-expanded={groupExpanded}
            >
              <span className={`branch-icon tone-${index % 3}`}><Icon /></span>
              <span className="branch-copy">
                <strong>{group.title}</strong>
                <span className="branch-value">{formatGraduationCredits(graduationGroupCredits(group.items))}学分</span>
                <small>{completed}/{group.items.length}项已满足</small>
              </span>
              {groupExpanded ? <ChevronUpIcon className="disclosure" /> : <ChevronDownIcon className="disclosure" />}
            </button>
            {groupExpanded ? <div className="branch-details graduation-module-details"><div className="graduation-items">
              {group.items.map((item) => {
                const met = graduationRequirementMet(item, student);
                if (item.mode === "manual") {
                  return (
                    <label className={`graduation-item manual ${met ? "checked" : ""}`} key={item.id}>
                      <input type="checkbox" checked={met} onChange={() => onToggle(item.id)} />
                      <span className="graduation-checkbox" aria-hidden="true">{met ? <CheckIcon /> : null}</span>
                      <span className="graduation-item-copy"><strong>{item.title}</strong><small>{graduationRequirementDetail(item)}</small></span>
                    </label>
                  );
                }
                if (item.mode === "volunteer") {
                  const volunteer = volunteerProgress(student.experiences, item);
                  const isExpanded = expandedVolunteer === item.id;
                  const status = `${volunteer.count}/${volunteer.thresholds.count}次 · ${formatVolunteerHours(volunteer.hours)}/${formatVolunteerHours(volunteer.thresholds.hours)}小时`;
                  return (
                    <div className={`graduation-volunteer ${met ? "checked" : ""}`} key={item.id}>
                      <button
                        className={`graduation-item readonly volunteer-summary ${met ? "checked" : ""}`}
                        onClick={() => setExpandedVolunteer(isExpanded ? null : item.id)}
                        aria-expanded={isExpanded}
                        data-testid="volunteer-requirement"
                      >
                        <span className={`graduation-readonly-icon ${met ? "met" : "pending"}`} aria-hidden="true">
                          {met ? <CheckCircledIcon /> : <ClockIcon />}
                        </span>
                        <span className="graduation-item-copy"><strong>{item.title}</strong><small>{graduationRequirementDetail(item)}</small></span>
                        <span className={`graduation-item-status ${met ? "met" : "pending"}`}>{status}</span>
                        {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                      </button>
                      {isExpanded ? (
                        <div className="volunteer-source-list">
                          {volunteer.records.length ? volunteer.records.map((experience) => (
                            <div className="volunteer-source-row" key={experience.id}>
                              <span>
                                <strong>{experience.name}</strong>
                                <small>{experiencePeriod(experience)} · {experience.result}</small>
                              </span>
                              <b>1次 · {formatVolunteerHours(experience.volunteerHours ?? 0)}小时</b>
                            </div>
                          )) : <div className="volunteer-empty">暂无志愿服务经历</div>}
                        </div>
                      ) : null}
                    </div>
                  );
                }
                return (
                  <div className={`graduation-item readonly ${met ? "checked" : ""}`} key={item.id}>
                    <span className={`graduation-readonly-icon ${met ? "met" : "pending"}`} aria-hidden="true">
                      {met ? <CheckCircledIcon /> : <ClockIcon />}
                    </span>
                    <span className="graduation-item-copy"><strong>{item.title}</strong><small>{graduationRequirementDetail(item)}</small></span>
                    <span className={`graduation-item-status ${met ? "met" : "pending"}`}>默认满足</span>
                  </div>
                );
              })}
            </div></div> : null}
          </article>
        );
      })}
    </div>
  );
}

function BranchCard({
  branch,
  student,
  number,
  showStatus,
  expanded,
  onToggle,
}: {
  branch: BranchConfig;
  student: StudentProfile;
  number: number;
  showStatus: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = iconMap[branch.icon];
  const snapshot = branchSnapshot(branch, student);
  const researchScoring = qualificationScoring(student.experiences);
  const base = branch.kind === "base" ? baseProgress(branch, student) : null;
  const [expandedBaseSection, setExpandedBaseSection] = useState<BaseSection | null>(null);

  return (
    <article className={`path-item ${expanded ? "expanded" : ""}`} data-testid={`branch-${branch.id}`}>
      <span className="path-number">{number}</span>
      <button className={`branch-summary ${showStatus ? "" : "without-status"}`} onClick={onToggle} aria-expanded={expanded}>
        <span className={`branch-icon tone-${(number - 1) % 3}`}><Icon /></span>
        <span className="branch-copy">
          <strong>{branch.title}</strong>
          <span className="branch-value">{snapshot.value}</span>
          {snapshot.note ? <small>{snapshot.note}</small> : null}
        </span>
        {showStatus ? <span className={`status-chip ${snapshot.met ? "met" : "pending"}`}>
          {snapshot.met ? <CheckCircledIcon /> : null}
          {snapshot.met ? branch.successText : branch.pendingText}
        </span> : null}
        {expanded ? <ChevronUpIcon className="disclosure" /> : <ChevronDownIcon className="disclosure" />}
      </button>
      {expanded ? (
        <div className="branch-details">
          {base ? (
            <div className="base-breakdown">
              <div className="base-rule-row gate">
                <span><strong>思想政治理论课</strong><small>平均成绩良好及以上</small></span>
                <em className={student.politicalTheoryQualified ? "met" : "pending"}>{student.politicalTheoryQualified ? "已满足" : "待确认"}</em>
              </div>
              {base.rules.map((rule) => {
                const score = base.sectionScores[rule.id];
                const met = rule.mode === "minimum" ? score >= rule.target : rule.mode === "deduction" ? score >= 0 : true;
                const sectionExpanded = expandedBaseSection === rule.id;
                const sources = student.experiences
                  .filter((item) => item.countsForBase && item.baseSection === rule.id)
                  .sort((a, b) => experienceStart(b).localeCompare(experienceStart(a)));
                return (
                  <div className={`base-rule-item ${sectionExpanded ? "expanded" : ""}`} key={rule.id}>
                    <button className="base-rule-row" onClick={() => setExpandedBaseSection(sectionExpanded ? null : rule.id)} aria-expanded={sectionExpanded}>
                      <span><strong>{rule.title}</strong><small>{rule.mode === "minimum" ? `至少 ${rule.target}分` : "计入总分，无单项门槛"}</small></span>
                      <span className="base-rule-result"><em className={met ? "met" : "pending"}>{score}分</em>{sectionExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}</span>
                    </button>
                    {sectionExpanded ? (
                      <div className="base-score-sources">
                        {sources.length ? sources.map((experience) => (
                          <div className="base-score-source" key={experience.id}>
                            <span><strong>{experience.name}</strong><small>{experiencePeriod(experience)} · {experience.result}</small></span>
                            <em>+{experience.baseScore ?? 0}分</em>
                          </div>
                        )) : <div className="base-score-empty">暂无计分项目</div>}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <div className="base-total-row"><span>基础素养总分</span><strong>{base.total} / {branch.target}分</strong></div>
            </div>
          ) : snapshot.experiences.length ? snapshot.experiences.map((experience) => {
            const scoreStatus = branch.kind === "research-score" ? researchScoring.statuses.get(experience.id) : undefined;
            const categoryLabel = experienceCategoryLabels[experience.category] ?? "其他";
            return (
              <div className="branch-experience" key={experience.id}>
                <div className="experience-row">
                <span className="experience-mark"><StarIcon /></span>
                <span className="experience-copy">
                  <strong>{experience.year} {experience.name} {experience.result}</strong>
                  {branch.kind === "research-score" ? (
                    <small>{scoreStatus?.label ?? "已记录"}</small>
                  ) : <small>{categoryLabel}</small>}
                </span>
                </div>
              </div>
            );
          }) : (
            <div className="empty-detail">档案中暂时没有匹配记录</div>
          )}
        </div>
      ) : null}
    </article>
  );
}

function ResumeSectionCard({
  branch,
  student,
  number,
  expanded,
  onToggle,
  onStudentChange,
  onOpenExperience,
}: {
  branch: BranchConfig;
  student: StudentProfile;
  number: number;
  expanded: boolean;
  onToggle: () => void;
  onStudentChange: (value: StudentProfile | ((current: StudentProfile) => StudentProfile)) => void;
  onOpenExperience: (id: string) => void;
}) {
  const Icon = iconMap[branch.icon];
  const snapshot = branchSnapshot(branch, student);
  const experiences = [...snapshot.experiences].sort(resumeExperienceSort);
  const summary = branch.kind === "gpa"
    ? `绩点 ${student.gpa.toFixed(2)} · 排名 ${student.coreRank}`
    : snapshot.value;

  return (
    <article className={`path-item resume-section ${expanded ? "expanded" : ""}`} data-testid={`resume-section-${branch.id}`}>
      <span className="path-number">{number}</span>
      <button className="branch-summary without-status resume-section-summary" onClick={onToggle} aria-expanded={expanded}>
        <span className={`branch-icon tone-${(number - 1) % 3}`}><Icon /></span>
        <span className="branch-copy">
          <strong>{branch.title}</strong>
          <span className="branch-value">{summary}</span>
        </span>
        {expanded ? <ChevronUpIcon className="disclosure" /> : <ChevronDownIcon className="disclosure" />}
      </button>
      {expanded ? (
        <div className="branch-details resume-section-details">
          {branch.kind === "gpa" ? (
            <section className="resume-education" data-testid="resume-education-details">
              <div className="resume-education-heading">
                <span className="resume-school-mark"><BackpackIcon /></span>
                <span><strong>{student.school || "中国人民大学"}</strong><small>{student.college || "中法学院"}</small></span>
              </div>
              <dl className="resume-education-facts">
                <div><dt>专业</dt><dd>{student.major || "待补充"}</dd></div>
                <div><dt>年级</dt><dd>{student.cohort || "待补充"}</dd></div>
                <div><dt>绩点</dt><dd>{student.gpa > 0 ? student.gpa.toFixed(2) : "待补充"}</dd></div>
                <div><dt>专业排名</dt><dd>{student.coreRank < 999 ? student.coreRank : "待补充"}</dd></div>
              </dl>
            </section>
          ) : branch.kind === "skills" ? (
            <section className="resume-direct-editor" data-testid="resume-skills-editor">
              <FormTextarea
                label="技能"
                value={student.skills ?? ""}
                onChange={(value) => onStudentChange({ ...student, skills: value })}
                placeholder="如 Excel、Python、Stata"
              />
              <FormTextarea
                label="爱好"
                value={student.hobbies ?? ""}
                onChange={(value) => onStudentChange({ ...student, hobbies: value })}
                placeholder="如 摄影、羽毛球"
              />
            </section>
          ) : experiences.length ? (
            <div className="resume-experience-list">
              {experiences.map((experience) => (
                <button
                  className="resume-experience-row"
                  key={experience.id}
                  onClick={() => onOpenExperience(experience.id)}
                  data-testid={`resume-experience-${experience.id}`}
                >
                  <span className="experience-mark"><StarIcon /></span>
                  <span className="experience-copy">
                    <strong>{experience.name}</strong>
                    <span className="experience-summary-meta"><small>{experience.result}</small><time>{experiencePeriod(experience)}</time></span>
                  </span>
                  <ChevronRightIcon />
                </button>
              ))}
            </div>
          ) : <div className="empty-detail">暂未录入相关经历</div>}
        </div>
      ) : null}
    </article>
  );
}

function LanguageScoreFields({ presetId, values, onChange }: { presetId: string; values: Record<string, string>; onChange: (value: Record<string, string>) => void }) {
  const patch = (key: string, value: string) => onChange({ ...values, [key]: value });
  if (presetId === "cet4" || presetId === "cet6") return (
    <>
      <FormInput label="笔试总分（0–710）" value={values.total ?? ""} onChange={(value) => patch("total", value)} inputMode="decimal" />
      <div className="form-grid">
        <FormInput label="听力（0–248.5）" value={values.listening ?? ""} onChange={(value) => patch("listening", value)} inputMode="decimal" />
        <FormInput label="阅读（0–248.5）" value={values.reading ?? ""} onChange={(value) => patch("reading", value)} inputMode="decimal" />
      </div>
      <FormInput label="写作和翻译（0–213）" value={values.writingTranslation ?? ""} onChange={(value) => patch("writingTranslation", value)} inputMode="decimal" />
      <label className="form-field"><span>口试等级（选填）</span>
        <select value={values.oralGrade ?? ""} onChange={(event) => patch("oralGrade", event.target.value)}>
          <option value="">未参加／暂不填写</option>
          <option value="优秀">优秀</option><option value="良好">良好</option><option value="合格">合格</option><option value="不合格">不合格</option>
        </select>
      </label>
    </>
  );
  if (presetId === "ielts") return (
    <>
      <FormInput label="总分（0–9）" value={values.overall ?? ""} onChange={(value) => patch("overall", value)} inputMode="decimal" />
      <div className="form-grid">
        <FormInput label="听力（0–9）" value={values.listening ?? ""} onChange={(value) => patch("listening", value)} inputMode="decimal" />
        <FormInput label="阅读（0–9）" value={values.reading ?? ""} onChange={(value) => patch("reading", value)} inputMode="decimal" />
      </div>
      <div className="form-grid">
        <FormInput label="写作（0–9）" value={values.writing ?? ""} onChange={(value) => patch("writing", value)} inputMode="decimal" />
        <FormInput label="口语（0–9）" value={values.speaking ?? ""} onChange={(value) => patch("speaking", value)} inputMode="decimal" />
      </div>
    </>
  );
  if (presetId === "toefl") {
    const current = values.scale !== "legacy";
    return (
      <>
        <label className="form-field"><span>成绩计分制</span>
          <select value={values.scale ?? "current"} onChange={(event) => patch("scale", event.target.value)}>
            <option value="current">1–6制（2026-01-21起）</option>
            <option value="legacy">0–120制（历史成绩）</option>
          </select>
        </label>
        <FormInput label={current ? "综合等级（1–6）" : "总分（0–120）"} value={current ? values.overall ?? "" : values.total ?? ""} onChange={(value) => patch(current ? "overall" : "total", value)} inputMode="decimal" />
        <div className="form-grid">
          <FormInput label={current ? "阅读（1–6）" : "阅读（0–30）"} value={values.reading ?? ""} onChange={(value) => patch("reading", value)} inputMode="decimal" />
          <FormInput label={current ? "听力（1–6）" : "听力（0–30）"} value={values.listening ?? ""} onChange={(value) => patch("listening", value)} inputMode="decimal" />
        </div>
        <div className="form-grid">
          <FormInput label={current ? "口语（1–6）" : "口语（0–30）"} value={values.speaking ?? ""} onChange={(value) => patch("speaking", value)} inputMode="decimal" />
          <FormInput label={current ? "写作（1–6）" : "写作（0–30）"} value={values.writing ?? ""} onChange={(value) => patch("writing", value)} inputMode="decimal" />
        </div>
        {current ? <FormInput label="对照总分（0–120，选填）" value={values.comparableTotal ?? ""} onChange={(value) => patch("comparableTotal", value)} inputMode="decimal" /> : null}
      </>
    );
  }
  if (presetId === "gre") return (
    <>
      <div className="form-grid">
        <FormInput label="语文（130–170）" value={values.verbal ?? ""} onChange={(value) => patch("verbal", value)} inputMode="numeric" />
        <FormInput label="数学（130–170）" value={values.quantitative ?? ""} onChange={(value) => patch("quantitative", value)} inputMode="numeric" />
      </div>
      <FormInput label="分析性写作（0–6）" value={values.analyticalWriting ?? ""} onChange={(value) => patch("analyticalWriting", value)} inputMode="decimal" />
    </>
  );
  if (presetId === "gmat") {
    const current = values.version !== "legacy";
    return (
      <>
        <label className="form-field"><span>考试版本</span>
          <select value={values.version ?? "current"} onChange={(event) => patch("version", event.target.value)}>
            <option value="current">现行GMAT</option>
            <option value="legacy">GMAT 10th Edition（旧版）</option>
          </select>
        </label>
        <FormInput label={current ? "总分（205–805）" : "总分（200–800）"} value={values.total ?? ""} onChange={(value) => patch("total", value)} inputMode="numeric" />
        <div className="form-grid">
          <FormInput label={current ? "数学（60–90）" : "数学（0–60）"} value={values.quantitative ?? ""} onChange={(value) => patch("quantitative", value)} inputMode="numeric" />
          <FormInput label={current ? "语文（60–90）" : "语文（0–60）"} value={values.verbal ?? ""} onChange={(value) => patch("verbal", value)} inputMode="numeric" />
        </div>
        {current ? <FormInput label="数据洞察（60–90）" value={values.dataInsights ?? ""} onChange={(value) => patch("dataInsights", value)} inputMode="numeric" /> : <div className="form-grid">
          <FormInput label="综合推理（1–8）" value={values.integratedReasoning ?? ""} onChange={(value) => patch("integratedReasoning", value)} inputMode="decimal" />
          <FormInput label="分析性写作（0–6）" value={values.analyticalWriting ?? ""} onChange={(value) => patch("analyticalWriting", value)} inputMode="decimal" />
        </div>}
      </>
    );
  }
  if (presetId === "delf" || presetId === "tcf" || presetId === "tef") {
    return <label className="form-field"><span>等级</span>
      <select value={values.level ?? ""} onChange={(event) => patch("level", event.target.value)}>
        <option value="">请选择等级</option>
        {cefrLevels.map((level) => <option key={level} value={level}>{level}</option>)}
      </select>
    </label>;
  }
  return null;
}

function PresetScoreEditor({ section, value, onChange }: { section: ResearchSection; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const updateDraft = (next: string) => {
    setDraft(next);
    if (/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(next)) onChange(next);
  };
  return (
    <label className="preset-score-editor">
      <small>{researchSectionLabels[section]}</small>
      <span>
        <KeyboardInput aria-label="科研与创新得分" value={draft} inputMode="decimal" onChange={(event) => updateDraft(event.target.value)} onBlur={() => onChange(draft)} />
        <b>分</b>
      </span>
    </label>
  );
}

type ExperienceDraft = {
  startMonth: string;
  endMonth: string;
  category: ExperienceCategory;
  presetId: string;
  customName: string;
  projectTitle: string;
  journalName: string;
  resultId: string;
  customResult: string;
  roleId: string;
  completionId: string;
  countsForBase: boolean;
  baseSection: BaseSection;
  baseScore: string;
  countsForResearch: boolean;
  researchSection: ResearchSection;
  researchScore: string;
  competitivenessBranchId: string;
  countsForVolunteer: boolean;
  volunteerHours: string;
  details: string;
  languageScores: Record<string, string>;
};

const initialExperienceDraft: ExperienceDraft = {
  startMonth: "2026-01",
  endMonth: "2026-02",
  category: "academic",
  presetId: "qiushi-academic",
  customName: "",
  projectTitle: "",
  journalName: "",
  resultId: "qiangguo",
  customResult: "",
  roleId: "leader",
  completionId: "pending",
  countsForBase: false,
  baseSection: "ideology",
  baseScore: "5",
  countsForResearch: true,
  researchSection: "academic",
  researchScore: "2.5",
  competitivenessBranchId: "research-count",
  countsForVolunteer: false,
  volunteerHours: "",
  details: findExperiencePreset("qiushi-academic")?.defaultDetails ?? "",
  languageScores: {},
};

// 一条常用经历决定的草稿字段。名称类输入一并清空，它们只描述上一条经历。
function presetDraftDefaults(preset: CommonExperiencePreset): Partial<ExperienceDraft> {
  const resultId = preset.results[0]?.id ?? "";
  const roleId = preset.roles?.[0]?.id ?? "";
  const completionId = preset.completionOptions?.[0]?.id ?? "";
  return {
    presetId: preset.id,
    resultId,
    roleId,
    completionId,
    countsForResearch: preset.qualificationScored !== false,
    researchSection: preset.researchSection,
    researchScore: String(presetScore(preset, resultId, roleId, completionId)),
    competitivenessBranchId: preset.competitivenessBranchId ?? "research-count",
    languageScores: defaultLanguageScores(preset.id),
    details: preset.defaultDetails,
    projectTitle: "",
    journalName: "",
    customName: "",
    customResult: "",
  };
}

function EntryEditor({ student, template, onChange, onDone }: { student: StudentProfile; template: TemplateConfig; onChange: (value: StudentProfile | ((current: StudentProfile) => StudentProfile)) => void; onDone: () => void }) {
  const [mode, setMode] = useState<"profile" | "experience">("experience");
  const [gpaDraft, setGpaDraft] = useState(String(student.gpa));
  const [draft, setDraft] = useState<ExperienceDraft>(initialExperienceDraft);
  const [saved, setSaved] = useState(false);
  const [validation, setValidation] = useState("");

  const patch = (next: Partial<ExperienceDraft>) => setDraft((current) => ({ ...current, ...next }));

  const presetOptions = commonExperiencePresets.filter((preset) => preset.category === draft.category);
  const selectedPreset = findExperiencePreset(draft.presetId);
  const isLanguagePreset = selectedPreset?.category === "language";
  const isDirectEntryCategory = directEntryCategories.has(draft.category);
  const competitivenessBranches = template.pages.find((page) => page.id === "competitiveness")?.branches.filter((branch) => branch.visible && branch.kind !== "gpa" && branch.kind !== "skills") ?? [];

  const updateGpa = (value: string) => {
    setGpaDraft(value);
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return;
    const nextGpa = Number(value);
    if (Number.isFinite(nextGpa)) onChange({ ...student, gpa: nextGpa });
  };

  const applyPreset = (nextPresetId: string) => {
    const preset = findExperiencePreset(nextPresetId);
    if (preset) {
      patch(presetDraftDefaults(preset));
      return;
    }
    patch({
      presetId: nextPresetId,
      researchSection: draft.category === "academic" ? "academic" : draft.category === "competition" ? "competition" : "practice",
      researchScore: "0",
      countsForResearch: draft.category === "academic" || draft.category === "competition",
      languageScores: {},
      details: "",
      projectTitle: "",
      journalName: "",
      customName: "",
      customResult: "",
    });
  };

  const changeCategory = (nextCategory: ExperienceCategory) => {
    const firstPreset = commonExperiencePresets.find((preset) => preset.category === nextCategory);
    patch(firstPreset ? { category: nextCategory, ...presetDraftDefaults(firstPreset) } : {
      category: nextCategory,
      presetId: "custom",
      countsForResearch: false,
      researchScore: "0",
      languageScores: {},
      details: "",
      competitivenessBranchId: nextCategory === "language"
        ? "language"
        : nextCategory === "internship"
          ? "internship"
          : nextCategory === "organization" || nextCategory === "arts"
            ? "campus"
            : nextCategory === "academic" || nextCategory === "competition"
              ? "research-count"
              : noCompetitivenessBranchId,
      projectTitle: "",
      journalName: "",
      customName: "",
      customResult: "",
    });
    setValidation("");
  };

  const updatePresetSelection = (nextResultId: string, nextRoleId: string, nextCompletionId: string) => {
    if (!selectedPreset) return;
    patch({
      resultId: nextResultId,
      roleId: nextRoleId,
      completionId: nextCompletionId,
      researchScore: String(presetScore(selectedPreset, nextResultId, nextRoleId, nextCompletionId)),
    });
  };

  const updateJournalName = (value: string) => {
    patch({ journalName: value });
    updatePresetSelection(matchJournalClass(value), draft.roleId, draft.completionId);
  };

  const saveExperience = () => {
    const presetResult = isLanguagePreset && selectedPreset
      ? languageResultSummary(selectedPreset.id, draft.languageScores)
      : selectedPreset
        ? presetResultText(selectedPreset, draft.resultId, draft.roleId, draft.completionId)
        : draft.customResult.trim();
    const name = selectedPreset
      ? isLanguagePreset
        ? selectedPreset.name
        : selectedPreset.id === "journal-paper"
        ? [`《${draft.journalName.trim()}》学术论文`, draft.projectTitle.trim()].filter(Boolean).join("｜")
        : [selectedPreset.name, draft.projectTitle.trim()].filter(Boolean).join("｜")
      : draft.customName.trim();
    const fixedPresetScore = selectedPreset ? presetScore(selectedPreset, draft.resultId, draft.roleId, draft.completionId) : 0;
    const finalCountsForBase = selectedPreset ? false : draft.countsForBase;
    const finalCountsForResearch = selectedPreset ? selectedPreset.qualificationScored !== false : draft.countsForResearch;
    const finalResearchSection = selectedPreset?.researchSection ?? draft.researchSection;
    const finalResearchScore = selectedPreset && selectedPreset.qualificationScored !== false ? Math.max(0, Number(draft.researchScore) || 0) : selectedPreset ? fixedPresetScore : Number(draft.researchScore) || 0;
    const finalCompetitivenessBranchId = draft.competitivenessBranchId;
    const finalEndMonth = isLanguagePreset ? draft.startMonth.trim() : draft.endMonth.trim();
    if (!name || (selectedPreset?.id === "journal-paper" && !draft.journalName.trim()) || !draft.startMonth.trim() || !finalEndMonth || !presetResult) {
      setValidation(isLanguagePreset ? "请先填写考试时间与成绩。" : "请先填写经历名称、起止年月与结果。");
      return;
    }
    if (isLanguagePreset && selectedPreset && !validateLanguageScores(selectedPreset.id, draft.languageScores)) {
      setValidation("请填写该考试的必填成绩项。");
      return;
    }
    if (finalCountsForBase && draft.baseSection === "award" && finalCountsForResearch) {
      setValidation("根据PDF规则，重大获奖不能与科研与创新重复计分，请选择其中一项。");
      return;
    }
    if (!selectedPreset && draft.countsForVolunteer && (Number(draft.volunteerHours) || 0) <= 0) {
      setValidation("请填写本次志愿服务时长。");
      return;
    }
    const next: Experience = {
      id: `experience-${Date.now()}`,
      year: draft.startMonth.trim().slice(0, 4),
      startMonth: draft.startMonth.trim(),
      endMonth: finalEndMonth,
      name,
      result: presetResult,
      details: isLanguagePreset && selectedPreset ? composeLanguageDetails(selectedPreset.id, draft.languageScores, draft.details) : draft.details.trim(),
      groupKey: selectedPreset
        ? selectedPreset.id === "journal-paper"
          ? `${selectedPreset.id}:${normalizeJournalName(draft.journalName)}:${draft.projectTitle.trim().toLowerCase().replace(/\s+/g, "-") || draft.startMonth.trim()}`
          : isLanguagePreset
          ? `${selectedPreset.id}:${draft.startMonth.trim()}`
          : selectedPreset.category === "academic"
          ? `${selectedPreset.id}:${draft.projectTitle.trim().toLowerCase().replace(/\s+/g, "-") || draft.startMonth.trim()}`
          : selectedPreset.id
        : name.toLowerCase().replace(/\s+/g, "-"),
      presetId: selectedPreset?.id,
      projectTitle: draft.projectTitle.trim() || undefined,
      journalName: selectedPreset?.id === "journal-paper" ? draft.journalName.trim() : undefined,
      role: selectedPreset?.roles?.find((item) => item.id === draft.roleId)?.label,
      resultCode: selectedPreset ? draft.resultId : undefined,
      completionCode: selectedPreset?.completionOptions ? draft.completionId : undefined,
      languageScores: isLanguagePreset ? draft.languageScores : undefined,
      languageNote: isLanguagePreset ? draft.details.trim() : undefined,
      competitivenessBranchId: finalCompetitivenessBranchId,
      countsForBase: finalCountsForBase,
      baseSection: finalCountsForBase ? draft.baseSection : undefined,
      baseScore: finalCountsForBase ? Number(draft.baseScore) || 0 : 0,
      countsForResearch: finalCountsForResearch,
      researchSection: finalCountsForResearch ? finalResearchSection : undefined,
      researchScore: finalCountsForResearch ? finalResearchScore : 0,
      countsForVolunteer: selectedPreset ? false : draft.countsForVolunteer,
      volunteerHours: !selectedPreset && draft.countsForVolunteer ? Number(draft.volunteerHours) || 0 : 0,
      category: draft.category,
    };
    onChange((current) => ({ ...current, experiences: [...current.experiences, next] }));
    setValidation("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="editor-stack">
      <div className="editor-tabs">
        <button className={mode === "experience" ? "active" : ""} onClick={() => setMode("experience")}>经历录入</button>
        <button className={mode === "profile" ? "active" : ""} onClick={() => setMode("profile")}>成绩与基础信息</button>
      </div>
      {mode === "experience" ? (
        <div className="form-stack">
          <label className="form-field"><span>经历类型</span>
            <select value={draft.category} onChange={(event) => changeCategory(event.target.value as ExperienceCategory)}>
              {Object.entries(experienceCategoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          {!isDirectEntryCategory ? <label className="form-field"><span>常用经历</span>
            <select value={draft.presetId} onChange={(event) => applyPreset(event.target.value)}>
              {presetOptions.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
              <option value="custom">不常见经历（手动录入）</option>
            </select>
          </label> : null}
          {!selectedPreset ? <FormInput label="经历名称" value={draft.customName} onChange={(value) => patch({ customName: value })} placeholder="请输入完整名称" /> : null}
          {selectedPreset?.id === "journal-paper" ? <FormInput label="期刊名称" value={draft.journalName} onChange={updateJournalName} placeholder="如 经济研究" /> : null}
          {selectedPreset?.requiresProjectTitle ? <FormInput label={selectedPreset.id === "journal-paper" ? "论文题目（选填）" : "项目名称（选填）"} value={draft.projectTitle} onChange={(value) => patch({ projectTitle: value })} placeholder={selectedPreset.id === "journal-paper" ? "可填写论文题目" : "填写具体课题或调研名称"} /> : null}
          {!isLanguagePreset && selectedPreset?.roles?.length ? <label className="form-field"><span>{selectedPreset.id === "journal-paper" ? "作者身份" : "身份 / 角色"}</span>
            <select value={draft.roleId} onChange={(event) => updatePresetSelection(draft.resultId, event.target.value, draft.completionId)}>
              {selectedPreset.roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
            </select>
          </label> : null}
          {selectedPreset && !isLanguagePreset ? <label className="form-field"><span>{selectedPreset.resultLabel}</span>
            <select value={draft.resultId} onChange={(event) => updatePresetSelection(event.target.value, draft.roleId, draft.completionId)}>
              {selectedPreset.results.map((result) => <option key={result.id} value={result.id}>{result.label}</option>)}
            </select>
          </label> : !selectedPreset ? <FormInput label="奖项 / 结果 / 职（岗）位" value={draft.customResult} onChange={(value) => patch({ customResult: value })} placeholder="如 一等奖、已完成、实习生、部长" /> : null}
          {!isLanguagePreset && selectedPreset?.completionOptions?.length ? <label className="form-field"><span>结项情况</span>
            <select value={draft.completionId} onChange={(event) => updatePresetSelection(draft.resultId, draft.roleId, event.target.value)}>
              {selectedPreset.completionOptions.map((completion) => <option key={completion.id} value={completion.id}>{completion.label}</option>)}
            </select>
          </label> : null}
          {isLanguagePreset && selectedPreset ? <LanguageScoreFields presetId={selectedPreset.id} values={draft.languageScores} onChange={(value) => patch({ languageScores: value })} /> : null}
          {isLanguagePreset ? <FormInput label="考试时间" value={draft.startMonth} onChange={(value) => patch({ startMonth: value })} placeholder="如 2026-06" /> : <div className="form-grid">
            <FormInput label="开始年月" value={draft.startMonth} onChange={(value) => patch({ startMonth: value })} placeholder="如 2026-01" />
            <FormInput label="结束年月" value={draft.endMonth} onChange={(value) => patch({ endMonth: value })} placeholder="如 2026-02" />
          </div>}
          {selectedPreset && !isLanguagePreset ? <div className="preset-score-preview">
            <span>政策计分</span>
            <strong>{presetResultText(selectedPreset, draft.resultId, draft.roleId, draft.completionId)}</strong>
            <PresetScoreEditor section={selectedPreset.researchSection} value={draft.researchScore} onChange={(value) => patch({ researchScore: value })} />
          </div> : null}
          {isLanguagePreset && selectedPreset ? <div className="preset-score-preview language-score-preview">
            <span>成绩摘要</span>
            <strong>{languageResultSummary(selectedPreset.id, draft.languageScores)}</strong>
            {languageScoreDetails(selectedPreset.id, draft.languageScores) ? <em>{languageScoreDetails(selectedPreset.id, draft.languageScores)}</em> : null}
          </div> : null}
          {selectedPreset ? <label className="form-field"><span>我的简历板块</span>
            <select value={draft.competitivenessBranchId} onChange={(event) => patch({ competitivenessBranchId: event.target.value })}>
              <option value={noCompetitivenessBranchId}>不归入我的简历</option>
              {competitivenessBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.title}</option>)}
            </select>
          </label> : null}
          {!selectedPreset ? <div className="score-mapping">
            <div className="score-mapping-title"><strong>经历归属</strong></div>
            <div className="score-mapping-block">
              <label className="form-field"><span>是否计入基础素养分</span>
                <select value={draft.countsForBase ? "yes" : "no"} onChange={(event) => patch({ countsForBase: event.target.value === "yes" })}>
                  <option value="no">否</option><option value="yes">是</option>
                </select>
              </label>
              {draft.countsForBase ? <div className="form-grid">
                <label className="form-field"><span>基础素养所属板块</span>
                  <select value={draft.baseSection} onChange={(event) => patch({ baseSection: event.target.value as BaseSection })}>
                    {defaultBaseRules.map((rule) => <option key={rule.id} value={rule.id}>{rule.title}</option>)}
                  </select>
                </label>
                <FormInput label={draft.baseSection === "negative" ? "扣减分值（填负数）" : "基础素养得分"} value={draft.baseScore} onChange={(value) => patch({ baseScore: value })} inputMode="decimal" />
              </div> : null}
            </div>
            <div className="score-mapping-block">
              <label className="form-field"><span>是否计入科研与创新分</span>
                <select value={draft.countsForResearch ? "yes" : "no"} onChange={(event) => patch({ countsForResearch: event.target.value === "yes" })}>
                  <option value="no">否</option><option value="yes">是</option>
                </select>
              </label>
              {draft.countsForResearch ? <div className="form-grid">
                <label className="form-field"><span>科研与创新所属板块</span>
                  <select value={draft.researchSection} onChange={(event) => patch({ researchSection: event.target.value as ResearchSection })}>
                    {Object.entries(researchSectionLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
                <FormInput label="科研与创新得分" value={draft.researchScore} onChange={(value) => patch({ researchScore: value })} inputMode="decimal" />
              </div> : null}
            </div>
            <div className="score-mapping-block">
              <label className="form-field"><span>我的简历板块</span>
                <select value={draft.competitivenessBranchId} onChange={(event) => patch({ competitivenessBranchId: event.target.value })}>
                  <option value={noCompetitivenessBranchId}>不归入我的简历</option>
                  {competitivenessBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.title}</option>)}
                </select>
              </label>
            </div>
            <div className="score-mapping-block">
              <label className="form-field"><span>是否记录志愿时长</span>
                <select value={draft.countsForVolunteer ? "yes" : "no"} onChange={(event) => patch({ countsForVolunteer: event.target.value === "yes" })}>
                  <option value="no">否</option><option value="yes">是</option>
                </select>
              </label>
              {draft.countsForVolunteer ? <FormInput label="志愿时长（小时）" value={draft.volunteerHours} onChange={(value) => patch({ volunteerHours: value })} inputMode="decimal" /> : null}
            </div>
          </div> : null}
          <FormTextarea label={isLanguagePreset ? "补充说明（选填）" : "经历具体内容（选填）"} value={draft.details} onChange={(value) => patch({ details: value })} placeholder={isLanguagePreset ? "可填写考试场次、证书编号等" : "可以填写参与内容、承担职责、完成成果等"} />
          {validation ? <p className="form-validation">{validation}</p> : null}
          <button className="sheet-primary" onClick={saveExperience}>{saved ? <><CheckIcon /> 已保存</> : "保存经历"}</button>
        </div>
      ) : (
        <div className="form-stack">
          <FormInput label="姓名" value={student.name} onChange={(value) => onChange({ ...student, name: value })} />
          <div className="form-grid">
            <FormInput label="专业" value={student.major} onChange={(value) => onChange({ ...student, major: value })} />
            <FormInput label="年级" value={student.cohort} onChange={(value) => onChange({ ...student, cohort: value })} />
          </div>
          <div className="form-grid">
            <FormInput label="平均学分绩点" value={gpaDraft} onChange={updateGpa} inputMode="decimal" />
            <FormInput label="核心绩点排名" value={String(student.coreRank)} onChange={(value) => onChange({ ...student, coreRank: Number(value) || 0 })} inputMode="numeric" />
          </div>
          <label className="form-field"><span>思想政治理论课平均成绩</span>
            <select value={student.politicalTheoryQualified ? "qualified" : "pending"} onChange={(event) => onChange({ ...student, politicalTheoryQualified: event.target.value === "qualified" })}>
              <option value="qualified">良好及以上</option>
              <option value="pending">暂未满足 / 待确认</option>
            </select>
          </label>
          <button className="sheet-primary" onClick={onDone}>完成</button>
        </div>
      )}
    </div>
  );
}
function ArchivePage({ student, template, editingId, focusedId, onEditingId, onChange, onBack }: { student: StudentProfile; template: TemplateConfig; editingId: string | null; focusedId: string | null; onEditingId: (id: string | null) => void; onChange: (value: StudentProfile | ((current: StudentProfile) => StudentProfile)) => void; onBack: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(focusedId);
  const sorted = [...student.experiences].sort((a, b) => experienceStart(b).localeCompare(experienceStart(a)));
  const competitivenessBranches = template.pages.find((page) => page.id === "competitiveness")?.branches.filter((branch) => branch.visible && branch.kind !== "gpa" && branch.kind !== "skills") ?? [];

  useEffect(() => {
    if (focusedId) setExpandedId(focusedId);
  }, [focusedId]);

  const patchExperience = (id: string, patch: Partial<Experience>) => {
    onChange((current) => ({
      ...current,
      experiences: current.experiences.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  };

  const patchPresetExperience = (experience: Experience, patch: Partial<Experience>) => {
    const preset = findExperiencePreset(experience.presetId ?? "");
    if (!preset) {
      patchExperience(experience.id, patch);
      return;
    }
    if (preset.category === "language") {
      const nextScores = patch.languageScores ?? experience.languageScores ?? defaultLanguageScores(preset.id);
      const nextNote = patch.languageNote ?? experience.languageNote ?? "";
      const nextMonth = patch.startMonth ?? experienceStart(experience);
      patchExperience(experience.id, {
        ...patch,
        year: nextMonth.slice(0, 4),
        startMonth: nextMonth,
        endMonth: nextMonth,
        name: preset.name,
        result: languageResultSummary(preset.id, nextScores),
        details: composeLanguageDetails(preset.id, nextScores, nextNote),
        groupKey: `${preset.id}:${nextMonth}`,
        category: "language",
        languageScores: nextScores,
        languageNote: nextNote,
        role: undefined,
        resultCode: undefined,
        completionCode: undefined,
        competitivenessBranchId: patch.competitivenessBranchId ?? experience.competitivenessBranchId ?? preset.competitivenessBranchId ?? "language",
        countsForBase: false,
        baseSection: undefined,
        baseScore: 0,
        countsForResearch: false,
        researchSection: undefined,
        researchScore: 0,
        countsForVolunteer: false,
        volunteerHours: 0,
      });
      return;
    }
    const nextProjectTitle = patch.projectTitle ?? experience.projectTitle ?? "";
    const nextJournalName = patch.journalName ?? experience.journalName ?? "";
    const nextResultCode = patch.resultCode ?? experience.resultCode ?? preset.results[0]?.id ?? "";
    const nextRoleCode = patch.role ?? preset.roles?.find((item) => item.label === experience.role)?.id ?? preset.roles?.[0]?.id ?? "";
    const nextCompletionCode = patch.completionCode ?? experience.completionCode ?? preset.completionOptions?.[0]?.id ?? "";
    const presetSelectionChanged = patch.resultCode !== undefined || patch.role !== undefined || patch.completionCode !== undefined || patch.journalName !== undefined;
    const nextResearchScore = patch.researchScore !== undefined
      ? Math.max(0, Number(patch.researchScore) || 0)
      : presetSelectionChanged
        ? presetScore(preset, nextResultCode, nextRoleCode, nextCompletionCode)
        : experience.researchScore ?? presetScore(preset, nextResultCode, nextRoleCode, nextCompletionCode);
    patchExperience(experience.id, {
      ...patch,
      name: preset.id === "journal-paper"
        ? [`《${nextJournalName.trim()}》学术论文`, nextProjectTitle.trim()].filter(Boolean).join("｜")
        : [preset.name, nextProjectTitle.trim()].filter(Boolean).join("｜"),
      result: presetResultText(preset, nextResultCode, nextRoleCode, nextCompletionCode),
      journalName: preset.id === "journal-paper" ? nextJournalName.trim() : undefined,
      role: preset.roles?.find((item) => item.id === nextRoleCode)?.label,
      resultCode: nextResultCode,
      completionCode: preset.completionOptions ? nextCompletionCode : undefined,
      category: preset.category,
      groupKey: preset.id === "journal-paper"
        ? `${preset.id}:${normalizeJournalName(nextJournalName)}:${nextProjectTitle.trim().toLowerCase().replace(/\s+/g, "-") || patch.startMonth || experienceStart(experience)}`
        : preset.category === "academic"
        ? `${preset.id}:${nextProjectTitle.trim().toLowerCase().replace(/\s+/g, "-") || patch.startMonth || experienceStart(experience)}`
        : preset.id,
      countsForBase: false,
      baseSection: undefined,
      baseScore: 0,
      countsForResearch: true,
      researchSection: preset.researchSection,
      researchScore: nextResearchScore,
      competitivenessBranchId: patch.competitivenessBranchId ?? experience.competitivenessBranchId ?? preset.competitivenessBranchId ?? "research-count",
      countsForVolunteer: false,
      volunteerHours: 0,
    });
  };

  return (
    <div className="archive-page" data-testid="archive-page">
      <header className="archive-page-header">
        <button aria-label="返回" onClick={onBack}><ChevronRightIcon /></button>
        <div><strong>完整档案</strong><span>经历按开始时间由近到远排列</span></div>
        <span className="archive-header-space" />
      </header>
      <MobileScroll className="archive-page-scroll">
        <main className="archive-page-content">
          <section className="archive-profile-card">
            <div><strong>{student.name}</strong><span>{student.major} · {student.cohort}</span></div>
            <dl>
              <div><dt>绩点</dt><dd>{student.gpa.toFixed(2)}</dd></div>
              <div><dt>基础素养</dt><dd>{baseTotal(student.experiences)}分</dd></div>
              <div><dt>核心排名</dt><dd>{student.coreRank}</dd></div>
            </dl>
          </section>
          <div className="archive-page-title"><span><ListBulletIcon /> 经历时间线</span><small>{sorted.length}条经历</small></div>
          <section className="archive-timeline">
            {sorted.map((experience) => {
              const expanded = expandedId === experience.id;
              const editing = editingId === experience.id;
              const policyPreset = findExperiencePreset(experience.presetId ?? "");
              return (
                <article className={`archive-event ${expanded ? "expanded" : ""}`} key={experience.id} data-testid={`archive-experience-${experience.id}`}>
                  <span className="timeline-dot" />
                  <button className="archive-event-summary" onClick={() => { setExpandedId(expanded ? null : experience.id); if (expanded) onEditingId(null); }} aria-expanded={expanded}>
                    <span className="archive-event-period">{experiencePeriod(experience)}</span>
                    <strong>{experience.name}</strong>
                    <span className="archive-event-result">{experience.result}</span>
                    {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </button>
                  {expanded ? (
                    <div className="archive-event-detail">
                      {editing ? (
                        <div className="archive-edit-form">
                          {policyPreset ? policyPreset.category === "language" ? (
                            <>
                              <LanguageScoreFields presetId={policyPreset.id} values={experience.languageScores ?? defaultLanguageScores(policyPreset.id)} onChange={(value) => patchPresetExperience(experience, { languageScores: value })} />
                              <div className="preset-score-preview language-score-preview">
                                <span>成绩摘要</span>
                                <strong>{experience.result}</strong>
                                {languageScoreDetails(policyPreset.id, experience.languageScores ?? {}) ? <em>{languageScoreDetails(policyPreset.id, experience.languageScores ?? {})}</em> : null}
                              </div>
                            </>
                          ) : (
                            <>
                              {policyPreset.id === "journal-paper" ? <FormInput label="期刊名称" value={experience.journalName ?? ""} onChange={(value) => patchPresetExperience(experience, { journalName: value, resultCode: matchJournalClass(value) })} /> : null}
                              {policyPreset.requiresProjectTitle ? <FormInput label={policyPreset.id === "journal-paper" ? "论文题目（选填）" : "项目名称（选填）"} value={experience.projectTitle ?? ""} onChange={(value) => patchPresetExperience(experience, { projectTitle: value })} /> : null}
                              {policyPreset.roles?.length ? <label className="form-field"><span>{policyPreset.id === "journal-paper" ? "作者身份" : "身份 / 角色"}</span>
                                <select value={policyPreset.roles.find((item) => item.label === experience.role)?.id ?? policyPreset.roles[0]?.id} onChange={(event) => patchPresetExperience(experience, { role: event.target.value })}>
                                  {policyPreset.roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                                </select>
                              </label> : null}
                              <label className="form-field"><span>{policyPreset.resultLabel}</span>
                                <select value={experience.resultCode ?? policyPreset.results[0]?.id} onChange={(event) => patchPresetExperience(experience, { resultCode: event.target.value })}>
                                  {policyPreset.results.map((result) => <option key={result.id} value={result.id}>{result.label}</option>)}
                                </select>
                              </label>
                              {policyPreset.completionOptions?.length ? <label className="form-field"><span>结项情况</span>
                                <select value={experience.completionCode ?? policyPreset.completionOptions[0]?.id} onChange={(event) => patchPresetExperience(experience, { completionCode: event.target.value })}>
                                  {policyPreset.completionOptions.map((completion) => <option key={completion.id} value={completion.id}>{completion.label}</option>)}
                                </select>
                              </label> : null}
                              <div className="preset-score-preview">
                                <span>政策计分</span>
                                <strong>{experience.result}</strong>
                                <PresetScoreEditor section={policyPreset.researchSection} value={String(experience.researchScore ?? 0)} onChange={(value) => patchPresetExperience(experience, { researchScore: Number(value) || 0 })} />
                              </div>
                            </>
                          ) : <FormInput label="经历名称" value={experience.name} onChange={(value) => patchExperience(experience.id, { name: value })} />}
                          {policyPreset?.category === "language" ? <FormInput label="考试时间" value={experienceStart(experience)} onChange={(value) => patchPresetExperience(experience, { startMonth: value })} /> : <div className="form-grid">
                            <FormInput label="开始年月" value={experienceStart(experience)} onChange={(value) => policyPreset ? patchPresetExperience(experience, { startMonth: value, year: value.slice(0, 4) }) : patchExperience(experience.id, { startMonth: value, year: value.slice(0, 4) })} />
                            <FormInput label="结束年月" value={experienceEnd(experience)} onChange={(value) => policyPreset ? patchPresetExperience(experience, { endMonth: value }) : patchExperience(experience.id, { endMonth: value })} />
                          </div>}
                          {!policyPreset ? <>
                            <FormInput label="奖项 / 结果 / 职（岗）位" value={experience.result} onChange={(value) => patchExperience(experience.id, { result: value })} />
                            <label className="form-field"><span>经历类型</span>
                              <select value={experience.category} onChange={(event) => patchExperience(experience.id, { category: event.target.value as ExperienceCategory })}>
                                {Object.entries(experienceCategoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                              </select>
                            </label>
                            <label className="form-field"><span>是否计入基础素养分</span>
                              <select value={experience.countsForBase ? "yes" : "no"} onChange={(event) => patchExperience(experience.id, { countsForBase: event.target.value === "yes", baseSection: event.target.value === "yes" ? experience.baseSection ?? "ideology" : undefined, baseScore: event.target.value === "yes" ? experience.baseScore ?? 5 : 0 })}>
                                <option value="yes">是</option>
                                <option value="no">否</option>
                              </select>
                            </label>
                            {experience.countsForBase ? <div className="form-grid">
                              <label className="form-field"><span>基础素养所属板块</span>
                                <select value={experience.baseSection ?? "ideology"} onChange={(event) => patchExperience(experience.id, { baseSection: event.target.value as BaseSection })}>
                                  {defaultBaseRules.map((rule) => <option key={rule.id} value={rule.id}>{rule.title}</option>)}
                                </select>
                              </label>
                              <FormInput label={experience.baseSection === "negative" ? "扣减分值（填负数）" : "基础素养得分"} value={String(experience.baseScore ?? 0)} onChange={(value) => patchExperience(experience.id, { baseScore: Number(value) || 0 })} inputMode="decimal" />
                            </div> : null}
                            <label className="form-field"><span>是否计入科研与创新分</span>
                              <select value={experience.countsForResearch ? "yes" : "no"} onChange={(event) => patchExperience(experience.id, { countsForResearch: event.target.value === "yes", researchSection: event.target.value === "yes" ? experience.researchSection ?? "competition" : undefined, researchScore: event.target.value === "yes" ? experience.researchScore ?? 0 : 0 })}>
                                <option value="yes">是</option>
                                <option value="no">否</option>
                              </select>
                            </label>
                            {experience.countsForResearch ? <div className="form-grid">
                              <label className="form-field"><span>科研与创新所属板块</span>
                                <select value={experience.researchSection ?? "competition"} onChange={(event) => patchExperience(experience.id, { researchSection: event.target.value as ResearchSection })}>
                                  {Object.entries(researchSectionLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                                </select>
                              </label>
                              <FormInput label="科研与创新得分" value={String(experience.researchScore ?? 0)} onChange={(value) => patchExperience(experience.id, { researchScore: Number(value) || 0 })} inputMode="decimal" />
                            </div> : null}
                            <label className="form-field"><span>是否记录志愿时长</span>
                              <select value={experience.countsForVolunteer ? "yes" : "no"} onChange={(event) => patchExperience(experience.id, { countsForVolunteer: event.target.value === "yes", volunteerHours: event.target.value === "yes" ? experience.volunteerHours ?? 0 : 0 })}>
                                <option value="yes">是</option>
                                <option value="no">否</option>
                              </select>
                            </label>
                            {experience.countsForVolunteer ? <FormInput label="志愿时长（小时）" value={String(experience.volunteerHours ?? 0)} onChange={(value) => patchExperience(experience.id, { volunteerHours: Number(value) || 0 })} inputMode="decimal" /> : null}
                          </> : null}
                          <label className="form-field"><span>我的简历板块</span>
                            <select
                              value={experience.competitivenessBranchId ?? noCompetitivenessBranchId}
                              onChange={(event) => policyPreset
                                ? patchPresetExperience(experience, { competitivenessBranchId: event.target.value })
                                : patchExperience(experience.id, { competitivenessBranchId: event.target.value })}
                            >
                              <option value={noCompetitivenessBranchId}>不归入我的简历</option>
                              {competitivenessBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.title}</option>)}
                            </select>
                          </label>
                          <FormTextarea
                            label={policyPreset?.category === "language" ? "补充说明（选填）" : "经历具体内容（选填）"}
                            value={policyPreset?.category === "language" ? experience.languageNote ?? "" : experience.details || ""}
                            onChange={(value) => policyPreset?.category === "language" ? patchPresetExperience(experience, { languageNote: value }) : patchExperience(experience.id, { details: value })}
                            placeholder={policyPreset?.category === "language" ? "可填写考试场次、证书编号等" : "填写参与内容、承担职责、完成成果等"}
                          />
                          <div className="archive-edit-actions">
                            <button className="delete-experience" onClick={() => { onChange((current) => ({ ...current, experiences: current.experiences.filter((item) => item.id !== experience.id) })); setExpandedId(null); onEditingId(null); }}><TrashIcon /> 删除</button>
                            <button className="save-experience" onClick={() => onEditingId(null)}><CheckIcon /> 完成编辑</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <dl className="experience-facts">
                            <div><dt>经历类型</dt><dd>{experienceCategoryLabels[experience.category] ?? "其他"}</dd></div>
                            {experience.category !== "language" ? <div><dt>基础素养</dt><dd>{experience.countsForBase ? `${baseSectionLabels[experience.baseSection ?? "ideology"]} · ${experience.baseScore ?? 0}分` : "不计入"}</dd></div> : null}
                            {experience.category !== "language" ? <div><dt>科研与创新</dt><dd>{experience.countsForResearch ? `${researchSectionLabels[experience.researchSection ?? "competition"]} · ${experience.researchScore ?? 0}分` : "不计入"}</dd></div> : null}
                            {experience.countsForVolunteer ? <div><dt>志愿服务</dt><dd>{experience.volunteerHours ?? 0}小时</dd></div> : null}
                          </dl>
                          <div className="experience-description"><span>{experience.category === "language" ? "成绩详情" : "经历具体内容"}</span><p>{experience.details || "未填写具体内容"}</p></div>
                          <button className="edit-experience" onClick={() => onEditingId(experience.id)}><Pencil2Icon /> 编辑这条经历</button>
                        </>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        </main>
      </MobileScroll>
    </div>
  );
}

function OperationsEditor({
  template,
  demoState,
  accountBacked,
  pageId,
  editingBranchId,
  onPageId,
  onEditingBranchId,
  onTemplate,
  onPage,
  onBranch,
  onGraduationRequirement,
  onGraduationModule,
  onAddGraduationModule,
  onDeleteGraduationModule,
  onAddGraduationRequirement,
  onDeleteGraduationRequirement,
  onMove,
  onAdd,
  onDeleteBranch,
  onAddPage,
  onDeletePage,
  onSavePersonal,
  onPublish,
  onReset,
}: {
  template: TemplateConfig;
  demoState: TemplateDemoState;
  accountBacked: boolean;
  pageId: PageId;
  editingBranchId: string | null;
  onPageId: (id: PageId) => void;
  onEditingBranchId: (id: string | null) => void;
  onTemplate: (value: TemplateConfig | ((current: TemplateConfig) => TemplateConfig)) => void;
  onPage: (id: PageId, patch: Partial<PageConfig>) => void;
  onBranch: (pageId: PageId, branchId: string, patch: Partial<BranchConfig>) => void;
  onGraduationRequirement: (id: string, patch: Partial<GraduationRequirement>) => void;
  onGraduationModule: (id: GraduationGroupId, patch: Partial<GraduationModule>) => void;
  onAddGraduationModule: () => GraduationGroupId;
  onDeleteGraduationModule: (id: GraduationGroupId) => void;
  onAddGraduationRequirement: (group: GraduationGroupId) => void;
  onDeleteGraduationRequirement: (id: string) => void;
  onMove: (pageId: PageId, branchId: string, direction: -1 | 1) => void;
  onAdd: (pageId: PageId) => void;
  onDeleteBranch: (pageId: PageId, branchId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: PageId) => void;
  onSavePersonal: () => void;
  onPublish: () => void;
  onReset: () => void;
}) {
  const page = template.pages.find((item) => item.id === pageId) ?? template.pages[0];
  const branch = page.branches.find((item) => item.id === editingBranchId) ?? null;
  const pageEditorRef = useRef<HTMLDivElement>(null);
  const pageNavigationRef = useRef<HTMLDivElement>(null);
  const previousPageIdRef = useRef(page.id);
  const [expandedGraduationSettings, setExpandedGraduationSettings] = useState<Record<string, boolean>>({
    foundation: true,
    major: false,
    excellence: false,
  });

  useEffect(() => {
    if (branch || previousPageIdRef.current === page.id) return;
    previousPageIdRef.current = page.id;
    const frame = window.requestAnimationFrame(() => {
      const editor = pageEditorRef.current;
      const scrollArea = editor?.closest<HTMLElement>(".sheet-content");
      if (!editor || !scrollArea) return;
      const stickyHeight = pageNavigationRef.current?.offsetHeight ?? 0;
      const top = scrollArea.scrollTop
        + editor.getBoundingClientRect().top
        - scrollArea.getBoundingClientRect().top
        - stickyHeight
        - 8;
      scrollArea.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [branch, page.id]);

  if (branch) {
    return (
      <div className="ops-stack">
        <button className="back-row" onClick={() => onEditingBranchId(null)}><ChevronRightIcon /> 返回板块列表</button>
        <div className="ops-title-row"><strong>编辑板块</strong><span>{page.tabLabel}</span></div>
        {page.id === "competitiveness" ? (
          <div className="ops-resume-note"><strong>{branch.title}</strong></div>
        ) : (
          <>
            <FormInput label="板块名称" value={branch.title} onChange={(value) => onBranch(pageId, branch.id, { title: value })} />
            <div className="form-grid">
              <FormInput label="目标值" value={String(branch.target)} onChange={(value) => onBranch(pageId, branch.id, { target: Number(value) || 0 })} inputMode="decimal" />
              <FormInput label="单位" value={branch.unit} onChange={(value) => onBranch(pageId, branch.id, { unit: value })} />
            </div>
            <div className="form-grid">
              <FormInput label="完成状态文案" value={branch.successText} onChange={(value) => onBranch(pageId, branch.id, { successText: value })} />
              <FormInput label="未完成状态文案" value={branch.pendingText} onChange={(value) => onBranch(pageId, branch.id, { pendingText: value })} />
            </div>
          </>
        )}
        {branch.kind === "base" ? (
          <section className="ops-subrules">
            <div className="ops-section-title"><strong>基础素养子板块</strong></div>
            {baseRulesFor(branch).map((rule) => (
              <div className="ops-subrule-row" key={rule.id}>
                <FormInput label="板块名称" value={rule.title} onChange={(value) => onBranch(pageId, branch.id, { subRules: baseRulesFor(branch).map((item) => item.id === rule.id ? { ...item, title: value } : item) })} />
                {rule.mode === "minimum" ? <FormInput label="最低分" value={String(rule.target)} onChange={(value) => onBranch(pageId, branch.id, { subRules: baseRulesFor(branch).map((item) => item.id === rule.id ? { ...item, target: Number(value) || 0 } : item) })} inputMode="decimal" /> : <span className="ops-rule-kind">{rule.mode === "deduction" ? "扣分项" : "无单项门槛"}</span>}
              </div>
            ))}
          </section>
        ) : null}
        {page.id !== "competitiveness" ? <FormInput label="规则说明" value={branch.scoringNote} onChange={(value) => onBranch(pageId, branch.id, { scoringNote: value })} /> : null}
        <label className="toggle-row">
          <span><strong>显示</strong></span>
          <button className={branch.visible ? "on" : ""} onClick={() => onBranch(pageId, branch.id, { visible: !branch.visible })} aria-pressed={branch.visible}>
            {branch.visible ? <EyeOpenIcon /> : <EyeNoneIcon />}
          </button>
        </label>
        <button className="sheet-primary" onClick={() => onEditingBranchId(null)}>保存并返回</button>
      </div>
    );
  }

  return (
    <div className="ops-stack">
      <FormInput label="模版名称" value={template.title} onChange={(value) => onTemplate({ ...template, title: value })} />
      <div className="template-demo-actions" aria-live="polite">
        <button autoFocus className={`template-save-action ${!accountBacked && demoState.personalSaved ? "completed" : ""}`} onClick={onSavePersonal} data-testid="save-personal-template">
          {accountBacked ? <CopyIcon /> : demoState.personalSaved ? <CheckCircledIcon /> : <PlusIcon />}
          {accountBacked ? "另存为个人模版" : demoState.personalSaved ? "已保存为个人模版" : "保存为个人模版"}
        </button>
        <button className={`sheet-primary ${demoState.published ? "completed" : ""}`} onClick={onPublish} data-testid="publish-template">
          {demoState.published ? <CheckCircledIcon /> : <GlobeIcon />}
          {demoState.published ? "已发布到模版库" : "发布到模版库"}
        </button>
      </div>
      <div className="ops-page-navigation" ref={pageNavigationRef}>
        <div className="editor-tabs">
          {template.pages.map((item) => (
            <button
              key={item.id}
              className={item.id === pageId ? "active" : ""}
              aria-pressed={item.id === pageId}
              onClick={() => onPageId(item.id)}
            >
              {item.tabLabel}
            </button>
          ))}
        </div>
        <button className="add-page-action" onClick={onAddPage} data-testid="add-page-tab"><PlusIcon /> 新建页面</button>
      </div>
      <div className="ops-page-editor" key={page.id} ref={pageEditorRef} data-testid="ops-page-editor">
        <div className="ops-page-toolbar">
          <strong>页面设置</strong>
          {!corePageIds.has(page.id) ? <button className="delete-page-action" onClick={() => onDeletePage(page.id)}><TrashIcon /> 删除页面</button> : null}
        </div>
        <div className="ops-page-fields">
          {page.id === "competitiveness" ? <div className="ops-resume-note"><strong>我的简历</strong></div> : <>
            <FormInput label="页签名称" value={page.tabLabel} onChange={(value) => onPage(page.id, { tabLabel: value })} />
            <FormInput label="页面标题" value={page.title} onChange={(value) => onPage(page.id, { title: value })} />
          </>}
        </div>
      </div>
      {page.id === "graduation" ? (
        <>
          <div className="ops-section-title"><strong>毕业模块</strong></div>
          <div className="ops-graduation-groups">
            {(page.graduationModules ?? defaultGraduationModules).map((module) => {
              const groupId = module.id;
              const groupItems = (page.checklist ?? defaultGraduationRequirements).filter((item) => item.group === groupId);
              const visibleItems = groupItems.filter((item) => item.visible);
              const isExpanded = expandedGraduationSettings[groupId];
              return (
                <section className={`ops-graduation-group ${isExpanded ? "expanded" : ""}`} key={groupId}>
                  <button
                    className="ops-graduation-group-heading"
                    onClick={() => setExpandedGraduationSettings((current) => ({ ...current, [groupId]: !current[groupId] }))}
                    aria-expanded={isExpanded}
                  >
                    <span>
                      <strong>{module.title}</strong>
                      <small>{formatGraduationCredits(graduationGroupCredits(visibleItems))}学分 · {visibleItems.length}/{groupItems.length}项显示</small>
                    </span>
                    {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </button>
                  {isExpanded ? (
                    <div className="ops-graduation-list">
                      <div className="ops-graduation-module-controls">
                        <FormInput label="模块名称" value={module.title} onChange={(value) => onGraduationModule(groupId, { title: value })} />
                        {groupId.startsWith("custom-graduation-module-") ? (
                          <button
                            className="delete-graduation-module"
                            onClick={() => {
                              onDeleteGraduationModule(groupId);
                              setExpandedGraduationSettings((current) => {
                                const next = { ...current };
                                delete next[groupId];
                                return next;
                              });
                            }}
                          >
                            <TrashIcon /> 删除模块
                          </button>
                        ) : null}
                      </div>
                      {groupItems.map((item, index) => (
                        <article className="ops-graduation-row" key={item.id}>
                          <div className="ops-course-toolbar">
                            <strong>课程 {index + 1}</strong>
                            <button className="delete-course-action" aria-label={`删除${item.title}`} onClick={() => onDeleteGraduationRequirement(item.id)}>
                              <TrashIcon />
                            </button>
                          </div>
                          <FormInput label="条件名称" value={item.title} onChange={(value) => onGraduationRequirement(item.id, { title: value })} />
                          <div className="form-grid">
                            <FormInput label="学分" value={String(item.credits)} onChange={(value) => onGraduationRequirement(item.id, { credits: Math.max(0, Number(value) || 0) })} inputMode="decimal" />
                            <label className="form-field"><span>学分口径</span>
                              <select value={item.creditMode} onChange={(event) => onGraduationRequirement(item.id, { creditMode: event.target.value as GraduationRequirement["creditMode"] })}>
                                <option value="fixed">固定学分</option>
                                <option value="minimum">至少学分</option>
                              </select>
                            </label>
                          </div>
                          {item.mode === "volunteer" ? (
                            <div className="form-grid">
                              <FormInput label="最低次数" value={String(item.volunteerMinCount ?? 8)} onChange={(value) => onGraduationRequirement(item.id, { volunteerMinCount: Math.max(0, Number(value) || 0) })} inputMode="numeric" />
                              <FormInput label="最低小时数" value={String(item.volunteerMinHours ?? 24)} onChange={(value) => onGraduationRequirement(item.id, { volunteerMinHours: Math.max(0, Number(value) || 0) })} inputMode="decimal" />
                            </div>
                          ) : <FormInput label="补充说明（选填）" value={item.detail} onChange={(value) => onGraduationRequirement(item.id, { detail: value })} />}
                          <label className="form-field"><span>完成方式</span>
                            <select value={item.mode} onChange={(event) => onGraduationRequirement(item.id, { mode: event.target.value as GraduationRequirement["mode"] })}>
                              <option value="automatic">默认满足</option>
                              <option value="manual">学生勾选</option>
                              {item.id === "volunteer-service" ? <option value="volunteer">按志愿经历计算</option> : null}
                            </select>
                          </label>
                          <label className="toggle-row compact">
                            <span><strong>显示</strong></span>
                            <button className={item.visible ? "on" : ""} onClick={() => onGraduationRequirement(item.id, { visible: !item.visible })} aria-pressed={item.visible}>
                              {item.visible ? <EyeOpenIcon /> : <EyeNoneIcon />}
                            </button>
                          </label>
                        </article>
                      ))}
                      <button className="add-course-action" onClick={() => onAddGraduationRequirement(groupId)}>
                        <PlusIcon /> 新增课程
                      </button>
                    </div>
                  ) : null}
                </section>
              );
            })}
            <button
              className="outline-action add-graduation-module"
              data-testid="add-graduation-module"
              onClick={() => {
                const id = onAddGraduationModule();
                setExpandedGraduationSettings((current) => ({ ...current, [id]: true }));
              }}
            >
              <PlusIcon /> 新增模块
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="ops-section-title"><strong>板块与字段</strong></div>
          <div className="ops-branch-list">
            {page.branches.map((item, index) => (
              <article className="ops-branch-row" key={item.id}>
                <span className={`visibility-dot ${item.visible ? "active" : ""}`} />
                <div><strong>{item.title}</strong><small>{page.id === "competitiveness" ? item.kind === "gpa" ? "自动读取基础信息" : item.kind === "skills" ? "直接编辑" : "读取对应经历" : item.scoringNote}</small></div>
                <div className="ops-row-actions">
                  {page.id !== "competitiveness" ? <>
                    <button aria-label="上移" disabled={index === 0} onClick={() => onMove(pageId, item.id, -1)}><ArrowUpIcon /></button>
                    <button aria-label="下移" disabled={index === page.branches.length - 1} onClick={() => onMove(pageId, item.id, 1)}><ArrowDownIcon /></button>
                  </> : null}
                  <button aria-label="编辑" onClick={() => onEditingBranchId(item.id)}><Pencil2Icon /></button>
                  {item.id.startsWith("custom-") ? <button className="delete-branch-action" aria-label="删除板块" onClick={() => onDeleteBranch(pageId, item.id)}><TrashIcon /></button> : null}
                </div>
              </article>
            ))}
          </div>
          {page.id !== "competitiveness" ? <button className="outline-action" onClick={() => onAdd(pageId)}><PlusIcon /> 新增板块</button> : null}
        </>
      )}
      <button className="reset-action" onClick={onReset}>恢复演示默认数据</button>
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, inputMode }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; inputMode?: "text" | "decimal" | "numeric" }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <KeyboardInput value={value} placeholder={placeholder} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FormTextarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <KeyboardTextarea value={value} placeholder={placeholder} rows={4} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
