import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { MiniIcon, type MiniIconName } from '../../components/MiniIcon'
import { qualificationScoring, researchScoreOf } from '../../data/experienceRules'
import type { ExperienceRecord, GraduationRequirement, StudentGoal, TemplateBranch, TemplatePage } from '../../models'
import { getGoal, saveGoal } from '../../services/goalRepository'
import { getExperiences, getGraduationChecks, getProfile, saveGraduationChecks } from '../../services/studentRepository'
import { capsuleSafeRight, customNavigationStyle } from '../../utils/navigationLayout'
import './index.scss'

type QualificationData = {
  value: string
  note: string
  records?: ExperienceRecord[]
  sections?: Array<{ id: string; title: string; score: number; target: number; records: ExperienceRecord[] }>
}

const branchIcons: Record<string, MiniIconName> = {
  base: 'reader-teal', 'research-score': 'layers-blue', rank: 'list-blue', custom: 'reader-teal'
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizedChecks() {
  const stored = getGraduationChecks()
  return { ...stored, 'ai-data': stored['ai-data'] ?? stored.ai ?? false, 'science-humanities': stored['science-humanities'] ?? stored.humanities ?? false, 'aesthetic-education': stored['aesthetic-education'] ?? stored.aesthetic ?? false, 'volunteer-service': stored['volunteer-service'] ?? stored.volunteer ?? false }
}

function pageFor(goal: StudentGoal, pageId: string): TemplatePage {
  return goal.pages.find((item) => item.id === pageId && item.visible) || goal.pages.find((item) => item.visible) || goal.pages[0]
}

export default function TargetPage() {
  const routeGoalId = Taro.getCurrentInstance().router?.params?.goalId || ''
  const initialGoal = getGoal(routeGoalId)
  const [goal, setGoal] = useState(initialGoal)
  const [pageId, setPageId] = useState(initialGoal ? pageFor(initialGoal, '').id : '')
  const [checks, setChecks] = useState<Record<string, boolean>>(normalizedChecks)
  const [expandedGroup, setExpandedGroup] = useState('')
  const [expandedBranch, setExpandedBranch] = useState('')
  const [profile, setProfile] = useState(getProfile())
  const [experiences, setExperiences] = useState(getExperiences())
  const accountRight = useMemo(() => capsuleSafeRight(), [])

  useDidShow(() => {
    const nextGoal = getGoal(routeGoalId)
    if (nextGoal) {
      setGoal(nextGoal)
      if (!nextGoal.pages.some((item) => item.id === pageId && item.visible)) setPageId(pageFor(nextGoal, '').id)
    }
    setProfile(getProfile())
    setExperiences(getExperiences())
    setChecks(normalizedChecks())
  })

  if (!goal) return <View className='target-page'><View className='target-empty-card'>暂无目标</View></View>

  const pages = goal.pages.filter((item) => item.visible)
  const page = pageFor(goal, pageId)
  const scoring = qualificationScoring(experiences)
  const volunteerRecords = experiences.filter((item) => item.countsForVolunteer)
  const volunteerHours = volunteerRecords.reduce((sum, item) => sum + (item.volunteerHours || 0), 0)
  const checklist = (page.checklist || []).filter((item) => item.visible)
  const volunteerMet = (item: GraduationRequirement) => volunteerRecords.length >= (item.volunteerMinCount || 0) && volunteerHours >= (item.volunteerMinHours || 0)
  const isGraduationItemMet = (item: GraduationRequirement) => item.mode === 'automatic' || (item.mode === 'volunteer' ? volunteerMet(item) : Boolean(checks[item.id]))
  const graduationMet = checklist.filter(isGraduationItemMet).length
  const customItems = page.branches.flatMap((branch) => branch.items || [])
  const customMet = customItems.filter((item) => item.completed).length

  const backToOverview = () => {
    if (Taro.getCurrentPages().length > 1) void Taro.navigateBack()
    else void Taro.reLaunch({ url: '/pages/overview/index' })
  }

  const toggleRequirement = (item: GraduationRequirement) => {
    if (item.mode !== 'manual') return
    const next = { ...checks, [item.id]: !checks[item.id] }
    setChecks(next)
    void saveGraduationChecks(next).catch((error) => {
      setChecks(normalizedChecks())
      Taro.showToast({ title: error instanceof Error ? error.message : '同步失败', icon: 'none' })
    })
  }

  const toggleCustomItem = (branchId: string, itemId: string) => {
    const next = clone(goal)
    const nextPage = next.pages.find((item) => item.id === page.id)
    const branch = nextPage?.branches.find((item) => item.id === branchId)
    const item = branch?.items?.find((entry) => entry.id === itemId)
    if (!item) return
    item.completed = !item.completed
    setGoal(next)
    void saveGoal(next).catch((error) => {
      setGoal(getGoal(goal.id) || goal)
      Taro.showToast({ title: error instanceof Error ? error.message : '同步失败', icon: 'none' })
    })
  }

  const qualificationData = (branch: TemplateBranch): QualificationData => {
    if (branch.kind === 'base') {
      const sections = (branch.baseRules || []).map((rule) => {
        const records = experiences.filter((item) => item.countsForBase && item.baseSection === rule.id)
        return { ...rule, records, score: records.reduce((sum, item) => sum + (item.baseScore || 0), 0) }
      })
      const total = sections.reduce((sum, item) => sum + item.score, 0)
      return { value: `${total} / ${branch.target}${branch.unit}`, note: `${sections.filter((item) => item.score >= item.target).length}/${sections.length}个板块达标`, sections }
    }
    if (branch.kind === 'research-score') {
      const records = experiences.filter((item) => item.countsForResearch && researchScoreOf(item) > 0)
      return { value: `${scoring.total.toFixed(1)} / ${branch.target.toFixed(1)}${branch.unit}`, note: `${records.length}项经历已录入`, records }
    }
    if (branch.kind === 'rank') {
      const rank = Number.parseInt(profile.rank, 10)
      return { value: `${profile.rank || '—'} / ${branch.target}`, note: Number.isFinite(rank) && rank <= branch.target ? '有效位次内' : '暂未达标' }
    }
    return { value: branch.target ? `目标 ${branch.target}${branch.unit}` : '自定义分类', note: branch.scoringNote || '暂无规则说明' }
  }

  const renderExperience = (item: ExperienceRecord, score?: number) => <View className='experience-mini-row interactive' key={item.id} onClick={() => Taro.navigateTo({ url: `/pages/archive/index?id=${item.id}` })}>
    <View><Text>{item.name}</Text><Text>{item.result || '暂无结果'} · {item.startMonth}—{item.endMonth}</Text></View>
    {score !== undefined && <Text>{score > 0 ? `+${score}分` : '已记录'}</Text>}
  </View>

  const renderGraduation = () => <View className='graduation-list'>
    {(page.graduationModules || []).map((group) => {
      const items = checklist.filter((item) => item.group === group.id)
      const met = items.filter(isGraduationItemMet).length
      const credits = items.reduce((sum, item) => sum + item.credits, 0)
      const expanded = expandedGroup === group.id
      return <View className={`graduation-group ${expanded ? 'expanded' : ''}`} key={group.id}>
        <View className='graduation-group-heading' onClick={() => setExpandedGroup(expanded ? '' : group.id)}><View><Text>{group.title} · {credits}学分</Text><Text>{met}/{items.length}</Text></View><MiniIcon name='chevron-right' /></View>
        {expanded && <View className='graduation-group-items'>
          {items.map((item) => {
            const metItem = isGraduationItemMet(item)
            return <View className={`graduation-row ${metItem ? 'met' : ''} ${item.mode !== 'manual' ? 'readonly' : ''}`} key={item.id} onClick={() => toggleRequirement(item)}>
              <View className={`graduation-check ${metItem ? 'checked' : ''}`}>{metItem ? '✓' : ''}</View>
              <View className='graduation-copy'><Text>{item.title}</Text><Text>{item.creditMode === 'minimum' ? '至少' : ''}{item.credits}学分{item.detail ? ` · ${item.detail}` : ''}</Text></View>
              {item.mode === 'automatic' && <Text className='graduation-auto'>自动读取</Text>}
              {item.mode === 'volunteer' && <Text className={`graduation-auto ${metItem ? '' : 'pending'}`}>{volunteerRecords.length}/{item.volunteerMinCount || 0}次 · {volunteerHours}/{item.volunteerMinHours || 0}小时</Text>}
            </View>
          })}
        </View>}
      </View>
    })}
  </View>

  const renderQualification = () => <View className='target-path-list'>
    {page.branches.filter((item) => item.visible).map((branch, index) => {
      const expanded = expandedBranch === branch.id
      const data = qualificationData(branch)
      return <View className={`target-branch ${expanded ? 'expanded' : ''}`} key={branch.id}>
        <View className='target-branch-summary' onClick={() => setExpandedBranch(expanded ? '' : branch.id)}><Text className='target-step'>{index + 1}</Text><View className='target-branch-icon'><MiniIcon name={branchIcons[branch.kind] || 'reader-teal'} /></View><View className='target-branch-copy'><Text>{branch.title}</Text><Text>{data.value}</Text><Text>{data.note}</Text></View><MiniIcon name='chevron-right' /></View>
        {expanded && <View className='target-branch-details'>
          {data.sections?.map((section) => <View className='base-section-row' key={section.id}><View><Text>{section.title}</Text><Text>{section.records.map((item) => item.name).join('、') || '暂无记录'}</Text></View><Text>{section.score}/{section.target}分</Text></View>)}
          {data.records?.map((item) => renderExperience(item, scoring.counted.get(item.id) || 0))}
          {!data.sections && !data.records && <View className='rank-note'>{branch.scoringNote || data.note}</View>}
        </View>}
      </View>
    })}
  </View>

  const renderCustom = () => <View className='target-path-list'>
    {page.branches.filter((item) => item.visible).map((branch, index) => {
      const expanded = expandedBranch === branch.id
      const items = branch.items || []
      return <View className={`target-branch ${expanded ? 'expanded' : ''}`} key={branch.id}>
        <View className='target-branch-summary' onClick={() => setExpandedBranch(expanded ? '' : branch.id)}><Text className='target-step'>{index + 1}</Text><View className='target-branch-icon'><MiniIcon name='reader-teal' /></View><View className='target-branch-copy'><Text>{branch.title}</Text><Text>{items.filter((item) => item.completed).length}/{items.length}项</Text><Text>{branch.scoringNote || '手动勾选完成'}</Text></View><MiniIcon name='chevron-right' /></View>
        {expanded && <View className='target-branch-details custom-item-list'>
          {items.map((item) => <View className={`custom-goal-item ${item.completed ? 'completed' : ''}`} key={item.id} onClick={() => toggleCustomItem(branch.id, item.id)}>
            <View className={`graduation-check ${item.completed ? 'checked' : ''}`}>{item.completed ? '✓' : ''}</View>
            <View><Text>{item.title}</Text><Text>{item.requirement || '由你自主判断是否完成'}</Text>{item.description && <Text>{item.description}</Text>}</View>
          </View>)}
          {!items.length && <View className='target-empty'>暂无条目，请进入目标设置添加</View>}
        </View>}
      </View>
    })}
    {!page.branches.some((item) => item.visible) && <View className='target-empty-card'>请进入目标设置添加分类和具体条目</View>}
  </View>

  return <View className='target-page' style={customNavigationStyle()}>
    <View className='target-header'>
      <View className='target-round-button' hoverClass='target-pressed' onClick={backToOverview}><MiniIcon name='chevron-left' /></View>
      <View className='target-template-switcher' hoverClass='target-pressed' onClick={() => Taro.navigateTo({ url: '/pages/templates/index' })}><Text>{goal.title}</Text><MiniIcon name='chevron-right' /></View>
      <View className='target-round-button target-account-button' style={{ right: accountRight }} hoverClass='target-pressed' onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}><MiniIcon name='person' /></View>
    </View>
    {goal.kind !== 'graduation' && <>
      <ScrollView scrollX className='target-tabs-scroll' enhanced showScrollbar={false}><View className='target-tabs dynamic-tabs'>{pages.map((item) => <View key={item.id} className={page.id === item.id ? 'active' : ''} onClick={() => { setPageId(item.id); setExpandedBranch(''); setExpandedGroup('') }}>{item.tabLabel}</View>)}</View></ScrollView>
      <View className='target-dots'>{pages.map((item) => <Text key={item.id} className={page.id === item.id ? 'active' : ''} />)}</View>
    </>}
    <View key={page.id} className='target-content'>
      <View className='target-hero'><View><Text className='target-hero-title'>{goal.kind === 'graduation' ? goal.title : page.title}</Text><Text className='target-hero-profile'>{goal.sourceLabel}</Text>{page.kind === 'graduation' && <View className='target-hero-progress'><Text>{graduationMet}</Text><Text> / {checklist.length}项已满足</Text></View>}{page.kind === 'custom' && <View className='target-hero-progress'><Text>{customMet}</Text><Text> / {customItems.length}项已完成</Text></View>}</View><View className='target-hero-mark'><MiniIcon name={page.kind === 'qualification' ? 'layers-blue' : 'reader-teal'} /></View></View>
      {page.kind === 'graduation' && renderGraduation()}
      {page.kind === 'qualification' && renderQualification()}
      {page.kind === 'custom' && renderCustom()}
      <View className='target-primary-action' onClick={() => Taro.navigateTo({ url: page.kind === 'custom' ? `/pages/template-settings/index?goalId=${goal.id}` : '/pages/entry/index' })}><MiniIcon name='pencil-blue' /><Text>{page.kind === 'custom' ? '编辑目标内容' : '录入资料'}</Text></View>
      <View className='target-secondary-action' onClick={() => Taro.navigateTo({ url: `/pages/template-settings/index?goalId=${goal.id}` })}>目标设置 <Text>›</Text></View>
    </View>
  </View>
}
