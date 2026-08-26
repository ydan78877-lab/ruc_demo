export type CaseLibraryTag = {
  label: string;
  type: string;
};

export type CaseLibraryDetailSection = {
  label: string;
  value: string;
};

export type CaseLibraryCase = {
  id: string;
  applicationSeason: string;
  studentDisplayName: string;
  studentNameMasked: string;
  anonymousMode: boolean;
  undergradCollege: string | null;
  undergradCollegeLabel: string | null;
  undergradMajor: string | null;
  gpa: string | null;
  englishScore: string | null;
  greGmat: string | null;
  offerSchool: string | null;
  offerProgram: string | null;
  schoolLogoUrl: string | null;
  offerRegion: string | null;
  description: string | null;
  internships: string | null;
  research: string | null;
  finalDestination: string | null;
  isFinalOffer: boolean;
  isPinned: boolean;
  displayTags: string[];
  scoreList: string[];
  languageScoreText: string | null;
  tags: CaseLibraryTag[];
  listTitle: string;
  logoText: string;
  detailSections: CaseLibraryDetailSection[];
  searchText: string;
};

export type CaseLibraryArticle = {
  id: string;
  subject: string;
  summary: string;
  backgroundImageUrl: string | null;
  url: string;
  uploadTime: string;
  isHot: boolean;
  isNew: boolean;
  isFeatured: boolean;
};

export type CaseLibraryFilterGroup = {
  id: "season" | "program" | "region";
  label: string;
  options?: string[];
  colleges?: Array<{ value: string; label: string; majors: string[] }>;
};

export const cases: CaseLibraryCase[];
export const articles: CaseLibraryArticle[];
export const filterGroups: CaseLibraryFilterGroup[];
export const pageConfig: Record<string, string>;
