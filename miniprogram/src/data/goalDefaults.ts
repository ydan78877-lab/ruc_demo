import type {
  GraduationRequirement,
  StudentGoal,
  StudentGoalWorkspace,
  StudentProfile,
  StudentTemplateConfig,
  TemplatePage
} from '../models'
import {
  defaultGraduationModules,
  defaultGraduationRequirements,
  defaultTemplateConfig
} from './templateDefaults'

type MajorPlan = {
  professional: [number, number, number]
  foreignLanguage: number
  mathematics?: number
  thesisDetail?: string
  internshipCredits?: number
  extraExcellence?: { id: string; title: string; credits: number; detail: string }
}

const majorPlans: Record<string, MajorPlan> = {
  mathematics: { professional: [38, 14, 15], foreignLanguage: 46, thesisDetail: '第四学年完成约10000字论文' },
  economy: { professional: [21, 27, 20], foreignLanguage: 46, mathematics: 12 },
  communication: { professional: [16, 22, 26], foreignLanguage: 46, mathematics: 3 },
  french: { professional: [74, 30, 18], foreignLanguage: 6, mathematics: 3 },
  finance: { professional: [24, 19, 20], foreignLanguage: 46, mathematics: 12 },
  hr: { professional: [20, 26, 20], foreignLanguage: 46, mathematics: 12 },
  bigdata25: {
    professional: [30, 28, 20], foreignLanguage: 6, internshipCredits: 6,
    thesisDetail: '第四学年完成15000字以上论文并完成开题报告',
    extraExcellence: { id: 'professional-innovation', title: '专业特色创新训练', credits: 2, detail: '完成人工智能与智慧治理方向创新方案或实践报告' }
  },
  bigdata26: { professional: [31, 36, 15], foreignLanguage: 46, thesisDetail: '第四学年完成不少于15000字论文' },
  ai26: {
    professional: [34, 30, 20], foreignLanguage: 6,
    thesisDetail: '完成开题报告并在第四学年完成15000字以上论文',
    extraExcellence: { id: 'professional-innovation', title: '专业特色创新训练', credits: 6, detail: '以创研课形式完成项目驱动的创新成果' }
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function majorKey(major: string, cohort: string) {
  const text = major.trim()
  if (text.includes('数学')) return 'mathematics'
  if (text.includes('国民') || text === '国管') return 'economy'
  if (text.includes('传播')) return 'communication'
  if (text.includes('法语')) return 'french'
  if (text.includes('金融')) return 'finance'
  if (text.includes('人力') || text === '人管') return 'hr'
  if (text.includes('人工智能') && cohort === '26级') return 'ai26'
  if (text.includes('大数据') || text.includes('数据科学')) return cohort === '26级' ? 'bigdata26' : 'bigdata25'
  return ''
}

function updateRequirement(items: GraduationRequirement[], id: string, patch: Partial<GraduationRequirement>) {
  const target = items.find((item) => item.id === id)
  if (target) Object.assign(target, patch)
}

function graduationRequirementsFor(cohort: string, major: string) {
  const key = majorKey(major, cohort)
  const matched = ['25级', '26级'].includes(cohort) && Boolean(key)
  const planKey = matched ? key : 'finance'
  const plan = majorPlans[planKey]
  const items = clone(defaultGraduationRequirements)
  const usesDistinct26Rules = matched && ['bigdata26', 'ai26'].includes(planKey)

  updateRequirement(items, 'politics', {
    title: usesDistinct26Rules ? '思政课' : '思想政治理论课',
    credits: usesDistinct26Rules ? 14 : 21,
    detail: usesDistinct26Rules ? '完成培养方案规定的14学分模块' : '模块课程全部完成'
  })
  updateRequirement(items, 'foreign-language', { credits: plan.foreignLanguage })
  if (plan.mathematics === undefined) {
    const index = items.findIndex((item) => item.id === 'mathematics')
    if (index >= 0) items.splice(index, 1)
  } else {
    updateRequirement(items, 'mathematics', { credits: plan.mathematics })
  }
  if (['bigdata25', 'bigdata26', 'ai26'].includes(planKey)) {
    const index = items.findIndex((item) => item.id === 'ai-data')
    if (index >= 0) items.splice(index, 1)
  }
  const [foundation, core, elective] = plan.professional
  updateRequirement(items, 'major-foundation', { credits: foundation })
  updateRequirement(items, 'major-core', { credits: core })
  updateRequirement(items, 'major-elective', { credits: elective })
  updateRequirement(items, 'professional-internship', { credits: plan.internshipCredits || 4 })
  if (plan.thesisDetail) updateRequirement(items, 'graduation-thesis', { detail: plan.thesisDetail })
  updateRequirement(items, 'public-elective', {
    id: usesDistinct26Rules ? 'innovation-guidance' : 'public-elective',
    title: usesDistinct26Rules ? '创新引导课' : '公共选修课'
  })
  if (plan.extraExcellence) {
    items.splice(Math.max(0, items.findIndex((item) => item.id === 'professional-internship')), 0, {
      ...plan.extraExcellence,
      group: 'excellence',
      creditMode: 'fixed',
      mode: 'manual',
      visible: true
    })
  }
  return { items, matched, planKey }
}

function qualificationPageFrom(config: StudentTemplateConfig): TemplatePage {
  return clone(config.pages.find((page) => page.kind === 'qualification') || defaultTemplateConfig.pages.find((page) => page.kind === 'qualification')!)
}

export function createGraduationGoal(profile: Pick<StudentProfile, 'cohort' | 'major'>, previous?: TemplatePage): StudentGoal {
  const generated = graduationRequirementsFor(profile.cohort, profile.major)
  const page: TemplatePage = previous?.kind === 'graduation'
    ? clone(previous)
    : {
      id: 'graduation',
      tabLabel: '毕业要求',
      title: '毕业目标',
      kind: 'graduation',
      visible: true,
      branches: [],
      graduationModules: clone(defaultGraduationModules),
      checklist: generated.items
    }
  page.title = '毕业目标'
  page.tabLabel = '毕业要求'
  return {
    id: 'graduation-goal',
    title: '毕业目标',
    primary: false,
    pages: [page],
    kind: 'graduation',
    protected: true,
    sourceKey: generated.matched ? `${profile.cohort}-${generated.planKey}` : 'default-finance-demo',
    sourceLabel: generated.matched ? `根据${profile.cohort}${profile.major}培养方案生成` : '默认参考方案（金融专业 Demo）',
    matched: generated.matched
  }
}

export function createRecommendationGoal(config: StudentTemplateConfig = defaultTemplateConfig): StudentGoal {
  return {
    id: '25-baoyan',
    title: '25中法保研',
    primary: true,
    pages: [qualificationPageFrom(config)],
    kind: 'system',
    protected: false,
    sourceKey: '25-recommendation-policy',
    sourceLabel: '25级推免政策目标',
    matched: true
  }
}

export function createCustomGoal(title: string): StudentGoal {
  const stamp = Date.now()
  return {
    id: `custom-goal-${stamp}`,
    title: title.trim() || '新目标',
    primary: false,
    kind: 'custom',
    protected: false,
    sourceKey: 'personal-custom',
    sourceLabel: '个人自定义目标',
    matched: true,
    pages: [{
      id: `custom-subgoal-${stamp}`,
      tabLabel: '准备事项',
      title: '准备事项',
      kind: 'custom',
      visible: true,
      branches: [{
        id: `custom-category-${stamp}`,
        title: '待完成',
        kind: 'custom',
        target: 0,
        unit: '',
        scoringNote: '按自己的申请节奏维护',
        visible: true,
        items: []
      }]
    }]
  }
}

export function createGoalWorkspace(profile: Pick<StudentProfile, 'cohort' | 'major'>, legacy = defaultTemplateConfig): StudentGoalWorkspace {
  const oldGraduation = legacy.pages?.find((page) => page.kind === 'graduation')
  const generatedGraduation = createGraduationGoal(profile)
  const graduation = generatedGraduation.matched ? generatedGraduation : createGraduationGoal(profile, oldGraduation)
  const recommendation = createRecommendationGoal(legacy)
  return { schemaVersion: 2, activeGoalId: recommendation.id, goals: [graduation, recommendation] }
}

export function createInitialTemplateConfig(profile: Pick<StudentProfile, 'cohort' | 'major'>): StudentTemplateConfig {
  const config = clone(defaultTemplateConfig)
  config.goalWorkspace = createGoalWorkspace(profile, config)
  return config
}

export const resumeSections = [
  { id: 'academic', title: '教育背景' },
  { id: 'internship', title: '实习经历' },
  { id: 'research-count', title: '科研与竞赛' },
  { id: 'campus', title: '校园经历' },
  { id: 'language', title: '语言与标化' },
  { id: 'skills', title: '兴趣与技能' },
  { id: 'other', title: '其他' }
] as const
