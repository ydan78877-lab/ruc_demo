import type { GraduationModule, GraduationRequirement, StudentTemplateConfig, TemplateBaseRule } from '../models'

export const defaultGraduationModules: GraduationModule[] = [
  { id: 'foundation', title: '立本模块' },
  { id: 'major', title: '专业模块' },
  { id: 'excellence', title: '卓越模块' }
]

export const defaultGraduationRequirements: GraduationRequirement[] = [
  { id: 'politics', group: 'foundation', title: '思想政治理论课', credits: 21, creditMode: 'fixed', detail: '模块课程全部完成', mode: 'automatic', visible: true },
  { id: 'foreign-language', group: 'foundation', title: '公共外语课', credits: 46, creditMode: 'fixed', detail: '模块课程全部完成', mode: 'automatic', visible: true },
  { id: 'mathematics', group: 'foundation', title: '公共数学课', credits: 12, creditMode: 'fixed', detail: '模块课程全部完成', mode: 'automatic', visible: true },
  { id: 'ai-data', group: 'foundation', title: '人工智能与数据技术', credits: 2, creditMode: 'minimum', detail: '', mode: 'manual', visible: true },
  { id: 'freshman-guidance', group: 'foundation', title: '新生引导课', credits: 1, creditMode: 'fixed', detail: '', mode: 'automatic', visible: true },
  { id: 'science-humanities', group: 'foundation', title: '科学与人文素养课', credits: 2, creditMode: 'fixed', detail: '讲座至少32学时并获学院认定', mode: 'manual', visible: true },
  { id: 'physical-education', group: 'foundation', title: '公共体育课', credits: 4, creditMode: 'fixed', detail: '前四学期每学期1学分', mode: 'automatic', visible: true },
  { id: 'aesthetic-education', group: 'foundation', title: '美育课程', credits: 2, creditMode: 'minimum', detail: '', mode: 'manual', visible: true },
  { id: 'labor-education', group: 'foundation', title: '劳动教育', credits: 1, creditMode: 'fixed', detail: '理论与实践均完成', mode: 'automatic', visible: true },
  { id: 'mental-health', group: 'foundation', title: '心理健康教育', credits: 2, creditMode: 'fixed', detail: '', mode: 'automatic', visible: true },
  { id: 'career-education', group: 'foundation', title: '职业生涯教育', credits: 1, creditMode: 'fixed', detail: '理论与实践均完成', mode: 'automatic', visible: true },
  { id: 'military-course', group: 'foundation', title: '军事课', credits: 4, creditMode: 'fixed', detail: '军事理论与军事技能', mode: 'automatic', visible: true },
  { id: 'volunteer-service', group: 'foundation', title: '志愿服务', credits: 2, creditMode: 'fixed', detail: '', mode: 'volunteer', volunteerMinCount: 8, volunteerMinHours: 24, visible: true },
  { id: 'major-foundation', group: 'major', title: '专业基础课', credits: 24, creditMode: 'fixed', detail: '全部完成', mode: 'automatic', visible: true },
  { id: 'major-core', group: 'major', title: '专业核心课', credits: 19, creditMode: 'fixed', detail: '按培养方案表格口径全部完成', mode: 'automatic', visible: true },
  { id: 'major-elective', group: 'major', title: '专业选修课', credits: 20, creditMode: 'minimum', detail: '', mode: 'automatic', visible: true },
  { id: 'research-training', group: 'excellence', title: '研究训练', credits: 2, creditMode: 'fixed', detail: '完成研究项目或调研报告', mode: 'manual', visible: true },
  { id: 'professional-internship', group: 'excellence', title: '专业实习', credits: 4, creditMode: 'fixed', detail: '4周并提交日记、总结和约3000字报告', mode: 'manual', visible: true },
  { id: 'graduation-thesis', group: 'excellence', title: '毕业论文', credits: 4, creditMode: 'fixed', detail: '第四学年完成约12000字论文', mode: 'manual', visible: true },
  { id: 'public-elective', group: 'excellence', title: '公共选修课', credits: 2, creditMode: 'minimum', detail: '', mode: 'manual', visible: true }
]

export const defaultBaseRules: TemplateBaseRule[] = [
  { id: 'ideology', title: '思想政治教育', target: 20 },
  { id: 'service', title: '服务奉献、社会实践与对外交流', target: 20 },
  { id: 'sports', title: '体育、文艺与劳动实践', target: 20 },
  { id: 'award', title: '重大获奖', target: 40 }
]

export const defaultTemplateConfig: StudentTemplateConfig = {
  id: '25-baoyan',
  title: '25中法保研',
  primary: true,
  pages: [
    {
      id: 'graduation', tabLabel: '毕业条件', title: '毕业条件', kind: 'graduation', visible: true, branches: [],
      graduationModules: defaultGraduationModules,
      checklist: defaultGraduationRequirements
    },
    {
      id: 'qualification', tabLabel: '推免资格获取', title: '推免资格获取', kind: 'qualification', visible: true,
      branches: [
        { id: 'base', title: '基础素养', kind: 'base', target: 100, unit: '分', scoringNote: '累计达到目标分值', visible: true, baseRules: defaultBaseRules },
        { id: 'research-score', title: '科研与创新', kind: 'research-score', target: 4, unit: '分', scoringNote: '同一活动重复参加只计最高结果，总分封顶4分', visible: true },
        { id: 'rank', title: '核心绩点排名', kind: 'rank', target: 10, unit: '名', scoringNote: '排名处于有效位次内即达标', visible: true }
      ]
    },
    {
      id: 'resume', tabLabel: '我的简历', title: '我的简历', kind: 'resume', visible: true,
      branches: [
        { id: 'academic', title: '教育背景', kind: 'gpa', target: 0, unit: '', scoringNote: '自动读取基础信息', visible: true },
        { id: 'internship', title: '实习经历', kind: 'internship', target: 0, unit: '', scoringNote: '读取对应经历', visible: true },
        { id: 'research-count', title: '科研与竞赛', kind: 'research-count', target: 0, unit: '', scoringNote: '读取对应经历', visible: true },
        { id: 'campus', title: '校园经历', kind: 'campus', target: 0, unit: '', scoringNote: '读取对应经历', visible: true },
        { id: 'language', title: '语言与标化', kind: 'language', target: 0, unit: '', scoringNote: '读取对应经历', visible: true },
        { id: 'skills', title: '技能与爱好', kind: 'skills', target: 0, unit: '', scoringNote: '直接编辑', visible: true }
      ]
    }
  ]
}
