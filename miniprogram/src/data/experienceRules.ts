import type {
  BaseSection,
  ExperienceCategory,
  ExperienceRecord,
  JournalClass,
  ResearchSection
} from '../models'

export type Choice = { id: string; label: string; score?: number }
export type ExperiencePreset = {
  id: string
  category: ExperienceCategory
  name: string
  resultLabel: string
  results: Choice[]
  roles?: Choice[]
  completionOptions?: Choice[]
  requiresProjectTitle?: boolean
  teamAward?: boolean
  qualificationScored?: boolean
  researchSection?: ResearchSection
  competitivenessBranchId?: string
  defaultDetails: string
}

export const categoryOptions: Choice[] = [
  { id: 'academic', label: '学术研究与学术会议' },
  { id: 'competition', label: '竞赛' },
  { id: 'internship', label: '实习实训' },
  { id: 'organization', label: '学生组织／社团经历' },
  { id: 'arts', label: '文体活动' },
  { id: 'language', label: '外语与标化' },
  { id: 'other', label: '其他' }
]

export const baseSectionOptions: Choice[] = [
  { id: 'ideology', label: '思想政治教育' },
  { id: 'service', label: '服务奉献、社会实践与对外交流' },
  { id: 'sports', label: '体育、文艺与劳动实践' },
  { id: 'award', label: '重大获奖' }
]

export const researchSectionOptions: Choice[] = [
  { id: 'academic', label: '学术研究' },
  { id: 'competition', label: '学科竞赛' },
  { id: 'conference', label: '学术会议' },
  { id: 'practice', label: '实习实训' },
  { id: 'innovation', label: '创新项目' }
]

export const directEntryCategories = new Set<ExperienceCategory>(['internship', 'organization', 'arts'])
export const projectRoles: Choice[] = [
  { id: 'leader', label: '负责人' },
  { id: 'member', label: '参与人' }
]
export const academicCompletionOptions: Choice[] = [
  { id: 'pending', label: '尚未结项' },
  { id: 'completed', label: '已结项' },
  { id: 'good', label: '良好结项' },
  { id: 'excellent', label: '优秀结项' }
]
export const journalAuthorRoles: Choice[] = [
  { id: 'independent', label: '独立作者' },
  { id: 'first', label: '第一作者（含共同第一作者）' },
  { id: 'corresponding-second', label: '通讯作者／第二作者（导师第一作者）' },
  { id: 'third-plus', label: '第三及以后作者' }
]

export const commonExperiencePresets: ExperiencePreset[] = [
  {
    id: 'qiushi-academic', category: 'academic', name: '求是学术品牌研究（大创）', resultLabel: '立项层级',
    results: [{ id: 'qiangguo', label: '强国' }, { id: 'shoushan', label: '首善' }, { id: 'qingmiao', label: '青苗' }, { id: 'dongliang', label: '栋梁' }],
    roles: projectRoles, completionOptions: academicCompletionOptions, requiresProjectTitle: true, researchSection: 'academic',
    defaultDetails: '参与项目立项、研究设计、资料收集与结项工作，主要负责研究设计和数据分析。'
  },
  {
    id: 'read-jiangnan', category: 'academic', name: '长读江南社会调查', resultLabel: '结项结果',
    results: [{ id: 'excellent', label: '优秀结项' }, { id: 'completed', label: '结项' }], roles: projectRoles,
    requiresProjectTitle: true, researchSection: 'academic', defaultDetails: '参与社会调查、访谈、资料整理与报告撰写，主要负责研究设计和实地调研。'
  },
  {
    id: 'meet-civilization', category: 'academic', name: '遇鉴文明中欧社会文化观察', resultLabel: '结项结果',
    results: [{ id: 'excellent', label: '优秀结项' }, { id: 'completed', label: '结项' }], roles: projectRoles,
    requiresProjectTitle: true, researchSection: 'academic', defaultDetails: '参与中欧社会文化观察、资料搜集与成果撰写，主要负责访谈整理和比较分析。'
  },
  {
    id: 'urban-rural-china', category: 'academic', name: '城乡中国基层社会调研', resultLabel: '结项结果',
    results: [{ id: 'excellent', label: '优秀结项', score: 2 }, { id: 'completed', label: '结项', score: 1 }],
    requiresProjectTitle: true, researchSection: 'academic', defaultDetails: '参与基层社会调研、访谈记录与调研报告撰写，主要负责资料整理和问题分析。'
  },
  {
    id: 'journal-paper', category: 'academic', name: '中文期刊学术论文', resultLabel: '期刊类别（选填）',
    results: [{ id: '', label: '未匹配／暂不填写' }, { id: 'A', label: 'A类期刊' }, { id: 'B', label: 'B类期刊' }, { id: 'C', label: 'C类期刊' }],
    roles: journalAuthorRoles, requiresProjectTitle: true, researchSection: 'academic', defaultDetails: '完成论文选题、研究、写作与修改，并在中文期刊发表或录用。'
  },
  {
    id: 'china-innovation', category: 'competition', name: '中国国际大学生创新大赛', resultLabel: '奖项／结果',
    results: [{ id: 'national-gold', label: '国赛金奖', score: 4 }, { id: 'national-silver', label: '国赛银奖', score: 3 }, { id: 'national-bronze', label: '国赛铜奖', score: 2 }, { id: 'other', label: '其他阶段奖项', score: 0 }],
    roles: projectRoles, teamAward: true, researchSection: 'competition', defaultDetails: '参与项目方案设计、材料准备与现场展示，主要负责项目论证和申报材料撰写。'
  },
  {
    id: 'cumcm', category: 'competition', name: '全国大学生数学建模竞赛', resultLabel: '奖项／结果',
    results: [{ id: 'national-first', label: '全国一等奖', score: 4 }, { id: 'national-second', label: '全国二等奖', score: 3 }, { id: 'provincial-first', label: '省级一等奖', score: 2 }, { id: 'provincial-second', label: '省级二等奖', score: 0 }, { id: 'provincial-third', label: '省级三等奖', score: 0 }],
    roles: projectRoles, teamAward: true, researchSection: 'competition', defaultDetails: '与队友完成赛题建模、数据分析和论文写作，主要负责模型构建与结果检验。'
  },
  {
    id: 'national-math-competition', category: 'competition', name: '全国大学生数学竞赛', resultLabel: '奖项／结果',
    results: [{ id: 'final-first', label: '决赛一等奖', score: 3 }, { id: 'final-second', label: '决赛二等奖', score: 2 }, { id: 'final-third', label: '决赛三等奖', score: 1 }, { id: 'preliminary-first', label: '初赛一等奖', score: 0 }, { id: 'preliminary-second', label: '初赛二等奖', score: 0 }, { id: 'preliminary-third', label: '初赛三等奖', score: 0 }],
    researchSection: 'competition', defaultDetails: '参加全国大学生数学竞赛，完成相应组别的竞赛考核。'
  },
  {
    id: 'mcm', category: 'competition', name: '美国大学生数学建模竞赛（MCM/ICM）', resultLabel: '奖项／结果',
    results: [{ id: 'o', label: 'O奖', score: 3 }, { id: 'f', label: 'F奖', score: 3 }, { id: 'm', label: 'M奖', score: 2 }, { id: 'h', label: 'H奖', score: 1 }, { id: 's', label: 'S奖', score: 0 }],
    roles: projectRoles, teamAward: true, researchSection: 'competition', defaultDetails: '与队友完成英文赛题建模、数据分析和论文写作，主要负责模型构建与结果验证。'
  },
  {
    id: 'neccs', category: 'competition', name: '全国大学生英语竞赛', resultLabel: '奖项／结果',
    results: [{ id: 'special', label: '特等奖', score: 2 }, { id: 'first', label: '一等奖', score: 1 }, { id: 'second', label: '二等奖', score: 0.5 }, { id: 'third', label: '三等奖', score: 0 }],
    researchSection: 'competition', defaultDetails: '参加全国大学生英语竞赛并完成相应类别的初赛或决赛。'
  },
  {
    id: 'suzhou-paper', category: 'competition', name: '苏州校区本科生学术论文大赛', resultLabel: '奖项／结果',
    results: [{ id: 'first', label: '一等奖', score: 2 }, { id: 'second', label: '二等奖', score: 1 }, { id: 'third', label: '三等奖', score: 0.5 }],
    roles: projectRoles, teamAward: true, researchSection: 'competition', defaultDetails: '独立或合作完成学术论文的选题、研究、写作与修改，并参加论文评审。'
  },
  {
    id: 'innovation-cup', category: 'competition', name: '“创新杯”中国人民大学学生课外学术科技作品竞赛（小创）', resultLabel: '奖项／结果',
    results: [{ id: 'special', label: '特等奖', score: 2 }, { id: 'first', label: '一等奖', score: 1 }, { id: 'second', label: '二等奖', score: 0.5 }, { id: 'third', label: '三等奖', score: 0 }],
    roles: projectRoles, teamAward: true, researchSection: 'competition', defaultDetails: '完成课外学术科技作品的研究、申报材料撰写与成果展示。'
  },
  ...([
    ['cet4', '大学英语四级（CET-4）'], ['cet6', '大学英语六级（CET-6）'], ['ielts', '雅思（IELTS）'],
    ['toefl', '托福（TOEFL iBT）'], ['gre', 'GRE General Test'], ['gmat', 'GMAT'], ['delf', '法语 DELF / DALF'],
    ['tcf', '法语 TCF'], ['tef', '法语 TEF']
  ] as const).map(([id, name]) => ({
    id, category: 'language' as const, name, resultLabel: '成绩', results: [], qualificationScored: false,
    competitivenessBranchId: 'language', researchSection: 'academic' as const, defaultDetails: ''
  }))
]

export function findExperiencePreset(id?: string) {
  return commonExperiencePresets.find((preset) => preset.id === id)
}

export function presetsForCategory(category: ExperienceCategory) {
  return commonExperiencePresets.filter((preset) => preset.category === category)
}

export function presetScore(preset: ExperiencePreset, resultId: string, roleId: string, completionId: string) {
  if (preset.id === 'journal-paper') {
    const scores: Record<'A' | 'B' | 'C', Record<string, number>> = {
      A: { independent: 4, first: 3, 'corresponding-second': 2, 'third-plus': 0.5 },
      B: { independent: 3, first: 2, 'corresponding-second': 1.5, 'third-plus': 0.5 },
      C: { independent: 2, first: 1.5, 'corresponding-second': 1, 'third-plus': 0.5 }
    }
    return scores[resultId as 'A' | 'B' | 'C']?.[roleId] ?? 0
  }
  if (preset.id === 'qiushi-academic') {
    const baseScores: Record<string, number> = { qiangguo: 2, shoushan: 1.5, qingmiao: 1, dongliang: 1 }
    const leaderBonus = roleId === 'leader' && resultId !== 'dongliang' ? 0.5 : 0
    const completionBonus = completionId === 'excellent' ? 1 : completionId === 'good' ? 0.5 : 0
    return (baseScores[resultId] ?? 0) + leaderBonus + completionBonus
  }
  if (preset.id === 'read-jiangnan' || preset.id === 'meet-civilization') {
    if (resultId === 'excellent') return roleId === 'leader' ? 2.5 : 2
    return roleId === 'leader' ? 1.5 : 1
  }
  const resultScore = preset.results.find((result) => result.id === resultId)?.score ?? 0
  if (preset.teamAward && roleId === 'member' && resultScore > 0) return Math.max(0.5, resultScore - 0.5)
  return resultScore
}

export function presetResultText(preset: ExperiencePreset, resultId: string, roleId: string, completionId: string) {
  const result = preset.results.find((item) => item.id === resultId)?.label ?? ''
  const role = preset.roles?.find((item) => item.id === roleId)?.label
  const completion = preset.completionOptions?.find((item) => item.id === completionId)?.label
  if (preset.id === 'journal-paper') return [`${resultId || '期刊类别未填写'}${resultId ? '类期刊' : ''}`, role].filter(Boolean).join(' · ')
  if (preset.id === 'qiushi-academic') return [result + '立项', role, completion].filter(Boolean).join(' · ')
  return [result, role].filter(Boolean).join(' · ')
}

const chineseJournalA2017 = [
  '中国法学', '法学研究', '管理世界', '南开管理评论', '公共管理学报', '管理科学学报', '中国行政管理', '中国环境科学', '教育研究', '经济研究',
  '世界经济', '中国工业经济', '金融研究', '会计研究', '中国农村经济', '文物', '历史研究', '马克思主义研究', '中共党史研究', '美术研究',
  '民族研究', '人口研究', '装饰', '社会学研究', '上海体育学院学报', '统计研究', '中国图书馆学报', '档案学通讯', '外国文学评论', '戏剧',
  '心理学报', '新闻与传播研究', '文艺研究', '中央音乐学院学报', '哲学研究', '世界经济与政治', '政治学研究', '文学评论', '地理学报',
  '世界宗教研究', '中国社会科学', '中国人民大学学报', '求是', '教学与研究', '北京大学学报(哲学社会科学版)', '新华文摘（全文转载）'
]
const chineseJournalB2017 = [
  '中外法学', '法学家', '法商研究', '法学', '政法论坛', '现代法学', '清华法学', '法制与社会发展', '法律科学', '法学评论',
  '高等教育研究', '中国高教研究', '中国软科学', '科研管理', '科学学研究', '管理科学', '科学学与科学技术管理', '管理工程学报', '管理学报', '管理评论',
  '中国管理科学', '系统工程理论与实践', '系统工程', '系统管理学报', '营销科学学报', '自然资源学报', '中国人口·资源与环境', '资源科学',
  '安全与环境学报', '环境科学', '环境科学学报', '环境科学研究', '课程.教材.教法', '中国教育学刊', '北京大学教育评论', '清华大学教育研究',
  '比较教育研究', '复旦教育论坛', '经济学（季刊）', '数量经济技术经济研究', '世界经济文汇', '中国农村观察', '财贸经济', '国际经济评论',
  '国际金融研究', '农业经济问题', '经济理论与经济管理', '经济学家', '国际贸易问题', '审计研究', '农业技术经济', '经济学动态', '中国土地科学',
  '政治经济学评论', '中国经济史研究', '保险研究', '考古学报', '考古', '近代史研究', '中国史研究', '清史研究', '史学月刊', '史学集刊',
  '当代中国史研究', '史学理论研究', '史林', '中华文史论丛', '抗日战争研究', '文史', '史学史研究', '西域研究', '世界历史', '文献',
  '中央研究院近代史研究所集刊', '中央研究院历史语言研究所集刊', '马克思主义与现实', '国外理论动态', '当代世界与社会主义',
  '中国特色社会主义研究', '思想理论教育导刊', '马克思主义理论学科研究', '美术观察', '中国藏学', '中国人口科学', '人口学刊', '地理研究',
  '经济地理', '城市规划', '社会', '青年研究', '社会保障研究', '中国体育科技', '北京体育大学学报', '数理统计与管理', '图书情报工作',
  '情报学报', '图书情报知识', '情报理论与实践', '情报资料工作', '档案学研究', '外国文学', '外国文学研究', '国外文学', '心理科学进展',
  '心理发展与教育', '心理科学', '中国临床心理学杂志', '新闻大学', '国际新闻界', '现代传播(中国传媒大学学报)', '编辑之友', '当代传播',
  '新闻记者', '外语教学与研究', '中国外语', '中国翻译', '中国语文', '当代语言学', '语言研究', '语言科学', '中国卫生政策研究', '哲学动态',
  '道德与文明', '世界哲学', '现代哲学', '孔子研究', '中国哲学史', '自然辩证法研究', '逻辑学研究', '当代亚太', '外交评论(外交学院学报)',
  '现代国际关系', '江苏行政学院学报', '欧洲研究', '国家行政学院学报', '中共中央党校学报', '北京行政学院学报', '文学遗产', '文艺理论研究',
  '中国比较文学', '中国现代文学研究丛刊', '红楼梦学刊', '基督教文化学刊', '浙江大学学报(人文社会科学版)', '华中师范大学学报(人文社会科学版)',
  '北京师范大学学报(社会科学版)', '南京大学学报(哲学.人文科学.社会科学版)', '中山大学学报(社会科学版)', '清华大学学报(哲学社会科学版)',
  '吉林大学社会科学学报', '复旦学报(社会科学版)', '武汉大学学报（人文科学版）', '学术月刊', '社会科学', '江海学刊', '江苏社会科学',
  '浙江社会科学', '学术研究', '中国高校社会科学'
]

function normalizeJournalName(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[《》〈〉\s·•.。:：,，;；'"“”‘’()（）\-—_]/g, '')
}
const journalClass2017 = new Map<string, JournalClass>([
  ...chineseJournalA2017.map((name) => [normalizeJournalName(name), 'A'] as [string, JournalClass]),
  ...chineseJournalB2017.map((name) => [normalizeJournalName(name), 'B'] as [string, JournalClass]),
  [normalizeJournalName('新华文摘'), 'A'], [normalizeJournalName('现代传播'), 'B'], [normalizeJournalName('外交评论'), 'B']
])
export function matchJournalClass(value: string): JournalClass {
  return journalClass2017.get(normalizeJournalName(value)) ?? ''
}

export const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
export function defaultLanguageScores(presetId: string): Record<string, string> {
  if (presetId === 'toefl') return { scale: 'current', overall: '', reading: '', listening: '', speaking: '', writing: '', comparableTotal: '' }
  if (presetId === 'gmat') return { version: 'current', total: '', quantitative: '', verbal: '', dataInsights: '', integratedReasoning: '', analyticalWriting: '' }
  if (presetId === 'delf' || presetId === 'tcf' || presetId === 'tef') return { level: '' }
  return {}
}
export function languageResultSummary(presetId: string, scores: Record<string, string>) {
  if (presetId === 'cet4' || presetId === 'cet6') return `总分 ${scores.total || '待填写'}${scores.oralGrade ? ` · 口试${scores.oralGrade}` : ''}`
  if (presetId === 'ielts') return `总分 ${scores.overall || '待填写'}`
  if (presetId === 'toefl') return scores.scale === 'legacy' ? `总分 ${scores.total || '待填写'}` : `综合等级 ${scores.overall || '待填写'}${scores.comparableTotal ? ` · 对照${scores.comparableTotal}分` : ''}`
  if (presetId === 'gre') return `V+Q ${scores.verbal && scores.quantitative ? Number(scores.verbal) + Number(scores.quantitative) : '待填写'}`
  if (presetId === 'gmat') return `总分 ${scores.total || '待填写'}`
  if (presetId === 'delf' || presetId === 'tcf' || presetId === 'tef') return `等级 ${scores.level || '待填写'}`
  return '成绩待填写'
}
export function languageScoreDetails(presetId: string, scores: Record<string, string>) {
  if (presetId === 'cet4' || presetId === 'cet6') return [`听力 ${scores.listening || '—'}`, `阅读 ${scores.reading || '—'}`, `写作和翻译 ${scores.writingTranslation || '—'}`, scores.oralGrade ? `口试 ${scores.oralGrade}` : ''].filter(Boolean).join(' · ')
  if (presetId === 'ielts') return `听力 ${scores.listening || '—'} · 阅读 ${scores.reading || '—'} · 写作 ${scores.writing || '—'} · 口语 ${scores.speaking || '—'}`
  if (presetId === 'toefl') return `阅读 ${scores.reading || '—'} · 听力 ${scores.listening || '—'} · 口语 ${scores.speaking || '—'} · 写作 ${scores.writing || '—'}`
  if (presetId === 'gre') return `语文 ${scores.verbal || '—'} · 数学 ${scores.quantitative || '—'} · 分析性写作 ${scores.analyticalWriting || '—'}`
  if (presetId === 'gmat') return scores.version === 'legacy'
    ? `数学 ${scores.quantitative || '—'} · 语文 ${scores.verbal || '—'} · 综合推理 ${scores.integratedReasoning || '—'} · 分析性写作 ${scores.analyticalWriting || '—'}`
    : `数学 ${scores.quantitative || '—'} · 语文 ${scores.verbal || '—'} · 数据洞察 ${scores.dataInsights || '—'}`
  return ''
}
export function validateLanguageScores(presetId: string, scores: Record<string, string>) {
  const required = presetId === 'cet4' || presetId === 'cet6' ? ['total', 'listening', 'reading', 'writingTranslation']
    : presetId === 'ielts' ? ['overall', 'listening', 'reading', 'writing', 'speaking']
      : presetId === 'toefl' ? (scores.scale === 'legacy' ? ['total', 'reading', 'listening', 'speaking', 'writing'] : ['overall', 'reading', 'listening', 'speaking', 'writing'])
        : presetId === 'gre' ? ['verbal', 'quantitative', 'analyticalWriting']
          : presetId === 'gmat' ? (scores.version === 'legacy' ? ['total', 'quantitative', 'verbal', 'integratedReasoning', 'analyticalWriting'] : ['total', 'quantitative', 'verbal', 'dataInsights'])
            : ['level']
  return required.every((key) => Boolean(scores[key]?.trim()))
}

export function categoryFromLegacyType(type: string): ExperienceCategory {
  return categoryOptions.find((item) => item.label === type)?.id as ExperienceCategory || 'other'
}
export function categoryLabel(category?: ExperienceCategory) {
  return categoryOptions.find((item) => item.id === category)?.label || '其他'
}
export function researchScoreOf(record: ExperienceRecord) {
  return Math.max(0, record.researchScore ?? record.score ?? 0)
}
export function qualificationScoring(records: ExperienceRecord[]) {
  const candidates = records.filter((item) => item.countsForResearch ?? researchScoreOf(item) > 0)
  const winners = new Map<string, ExperienceRecord>()
  candidates.forEach((item) => {
    const groupKey = item.groupKey || item.presetId || item.name
    const winner = winners.get(groupKey)
    if (!winner || researchScoreOf(item) > researchScoreOf(winner)) winners.set(groupKey, item)
  })
  const unique = Array.from(winners.values()).filter((item) => researchScoreOf(item) > 0)
  const limitedAcademic = unique
    .filter((item) => item.researchSection === 'academic' && researchScoreOf(item) <= 1.5)
    .sort((a, b) => researchScoreOf(b) - researchScoreOf(a) || (b.startMonth || '').localeCompare(a.startMonth || ''))
  const limitedIds = new Set(limitedAcademic.slice(0, 2).map((item) => item.id))
  const eligible = unique
    .filter((item) => item.researchSection !== 'academic' || researchScoreOf(item) > 1.5 || limitedIds.has(item.id))
    .sort((a, b) => researchScoreOf(b) - researchScoreOf(a) || (b.startMonth || '').localeCompare(a.startMonth || ''))
  let total = 0
  const counted = new Map<string, number>()
  eligible.forEach((item) => {
    const value = Math.min(researchScoreOf(item), Math.max(0, 4 - total))
    total += value
    counted.set(item.id, value)
  })
  return { total, counted, winners }
}

export function defaultResearchSection(category: ExperienceCategory): ResearchSection {
  if (category === 'competition') return 'competition'
  if (category === 'internship') return 'practice'
  return 'academic'
}
export function defaultCompetitivenessBranch(category: ExperienceCategory) {
  if (category === 'academic' || category === 'competition') return 'research-count'
  if (category === 'language') return 'language'
  if (category === 'internship') return 'internship'
  if (category === 'organization' || category === 'arts') return 'campus'
  return 'none'
}
export function choiceLabel(options: Choice[], id?: string) {
  return options.find((item) => item.id === id)?.label || ''
}
