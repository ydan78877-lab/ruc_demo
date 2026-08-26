import type { ExperienceRecord, StudentProfile } from '../models'
import {
  categoryFromLegacyType,
  categoryLabel,
  defaultCompetitivenessBranch,
  defaultResearchSection,
  researchScoreOf
} from '../data/experienceRules'
import { savePersonalData } from './accountRepository'
import { blankProfile, getPersonalData, updatePersonalData } from './personalDataRepository'

export const defaultProfile: StudentProfile = { ...blankProfile }
export const initialExperiences: ExperienceRecord[] = []

export function getProfile(): StudentProfile {
  return getPersonalData().profile
}

export function saveProfile(profile: StudentProfile) {
  const next = updatePersonalData((draft) => {
    draft.profile = { ...profile }
  })
  return savePersonalData(next)
}

export function getExperiences(): ExperienceRecord[] {
  return getPersonalData().experiences.map(normalizeExperienceRecord)
}

export function saveExperiences(records: ExperienceRecord[]) {
  const normalized = records.map(normalizeExperienceRecord)
  const next = updatePersonalData((draft) => {
    draft.experiences = normalized
  })
  return savePersonalData(next)
}

export function addExperience(record: ExperienceRecord) {
  return saveExperiences([record, ...getExperiences()])
}

export function updateExperience(record: ExperienceRecord) {
  return saveExperiences(getExperiences().map((item) => item.id === record.id ? record : item))
}

export function deleteExperience(id: string) {
  return saveExperiences(getExperiences().filter((item) => item.id !== id))
}

export function getGraduationChecks(): Record<string, boolean> {
  return getPersonalData().graduationChecks
}

export function saveGraduationChecks(checks: Record<string, boolean>) {
  const next = updatePersonalData((draft) => {
    draft.graduationChecks = { ...checks }
  })
  return savePersonalData(next)
}

export function getTodoStates(): Record<string, boolean | string> {
  return getPersonalData().todoStates
}

export function saveTodoStates(todoStates: Record<string, boolean | string>) {
  const next = updatePersonalData((draft) => {
    draft.todoStates = { ...todoStates }
  })
  return savePersonalData(next)
}

export function getPersonalNotes(): string {
  return getPersonalData().notes
}

export function savePersonalNotes(notes: string) {
  const next = updatePersonalData((draft) => {
    draft.notes = notes
  })
  return savePersonalData(next)
}

export function normalizeExperienceRecord(record: ExperienceRecord): ExperienceRecord {
  const category = record.category || categoryFromLegacyType(record.type)
  const researchScore = researchScoreOf(record)
  const branchId = record.competitivenessBranchId || (() => {
    if (record.resumeSection === '科研与竞赛') return 'research-count'
    if (record.resumeSection === '外语与标化') return 'language'
    if (record.resumeSection === '实习经历') return 'internship'
    if (record.resumeSection === '兴趣与技能') return 'campus'
    if (record.resumeSection === '其他') return 'other'
    if (record.resumeSection === '不归入综合竞争力' || record.resumeSection === '不归入我的简历') return 'none'
    return defaultCompetitivenessBranch(category)
  })()
  return {
    ...record,
    type: categoryLabel(category),
    year: record.year || record.startMonth?.slice(0, 4) || '',
    category,
    groupKey: record.groupKey || record.presetId || record.name,
    competitivenessBranchId: branchId,
    countsForResearch: record.countsForResearch ?? researchScore > 0,
    researchSection: record.researchSection || defaultResearchSection(category),
    researchScore,
    score: researchScore
  }
}
