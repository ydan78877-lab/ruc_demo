import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { MiniIcon, type MiniIconName } from '../../components/MiniIcon'
import type { CampusMatter, CampusSpace } from '../../data/campus'
import { qualificationScoring } from '../../data/experienceRules'
import type { StudentGoal, TemplateBranch } from '../../models'
import { AccountApiError, bootstrapAccount, getCachedAccount } from '../../services/accountRepository'
import { getCampusMatters, getCampusSpaces, syncCampusSnapshot } from '../../services/campusRepository'
import { getGoalWorkspace } from '../../services/goalRepository'
import { getExperiences, getGraduationChecks, getProfile } from '../../services/studentRepository'
import { capsuleSafeRight, customNavigationStyle } from '../../utils/navigationLayout'
import './index.scss'

type SectionId = 'todos' | 'classes' | 'resume' | 'goals'

function goalProgress(goal: StudentGoal, context: ReturnType<typeof progressContext>) {
  if (goal.kind === 'graduation') {
    const page = goal.pages.find((item) => item.kind === 'graduation')
    const items = (page?.checklist || []).filter((item) => item.visible)
    const completed = items.filter((item) => {
      if (item.mode === 'automatic') return true
      if (item.mode === 'manual') return Boolean(context.checks[item.id])
      return context.volunteerCount >= (item.volunteerMinCount || 0) && context.volunteerHours >= (item.volunteerMinHours || 0)
    }).length
    return { completed, total: items.length, label: '毕业要求' }
  }
  const qualification = goal.pages.find((item) => item.kind === 'qualification')
  if (qualification) {
    const branches = qualification.branches.filter((branch) => branch.visible)
    const met = branches.filter((branch: TemplateBranch) => {
      if (branch.kind === 'base') return (branch.baseRules || []).every((rule) => (context.baseScores[rule.id] || 0) >= rule.target)
      if (branch.kind === 'research-score') return context.researchScore >= branch.target
      if (branch.kind === 'rank') return Number.isFinite(context.rank) && context.rank <= branch.target
      return false
    }).length
    return { completed: met, total: branches.length, label: '推免资格获取' }
  }
  const items = goal.pages.flatMap((page) => page.branches.flatMap((branch) => branch.items || []))
  return { completed: items.filter((item) => item.completed).length, total: items.length, label: `${goal.pages.length}个子目标` }
}

function progressContext(experiences: ReturnType<typeof getExperiences>, checks: Record<string, boolean>, rankValue: string) {
  const baseScores = experiences.reduce<Record<string, number>>((scores, item) => {
    if (item.countsForBase && item.baseSection) scores[item.baseSection] = (scores[item.baseSection] || 0) + (item.baseScore || 0)
    return scores
  }, {})
  const volunteer = experiences.filter((item) => item.countsForVolunteer)
  return {
    baseScores,
    checks,
    rank: Number.parseInt(rankValue, 10),
    researchScore: qualificationScoring(experiences).total,
    volunteerCount: volunteer.length,
    volunteerHours: volunteer.reduce((sum, item) => sum + (item.volunteerHours || 0), 0)
  }
}

export default function OverviewPage() {
  const [profile, setProfile] = useState(getProfile())
  const [experiences, setExperiences] = useState(getExperiences())
  const [checks, setChecks] = useState(getGraduationChecks())
  const [workspace, setWorkspace] = useState(getGoalWorkspace())
  const [matters, setMatters] = useState<CampusMatter[]>(getCampusMatters())
  const [spaces, setSpaces] = useState<CampusSpace[]>(getCampusSpaces())
  const [collapsed, setCollapsed] = useState<Record<SectionId, boolean>>({ todos: false, classes: false, resume: false, goals: false })
  const accountRight = useMemo(() => capsuleSafeRight(), [])

  const refreshPersonal = () => {
    setProfile(getProfile())
    setExperiences(getExperiences())
    setChecks(getGraduationChecks())
    setWorkspace(getGoalWorkspace())
  }

  useDidShow(() => {
    if (!getCachedAccount()) {
      void Taro.reLaunch({ url: '/pages/login/index' })
      return
    }
    refreshPersonal()
    setMatters(getCampusMatters())
    setSpaces(getCampusSpaces())
    void bootstrapAccount().then(refreshPersonal).catch((error) => {
      const reason = error instanceof AccountApiError && error.code === 'ACCOUNT_DISABLED' ? 'disabled' : 'sync'
      void Taro.reLaunch({ url: `/pages/login/index?reason=${reason}` })
    })
    void syncCampusSnapshot().then(() => {
      setMatters(getCampusMatters())
      setSpaces(getCampusSpaces())
    }).catch(() => Taro.showToast({ title: '校园事项同步失败', icon: 'none' }))
  })

  const activeMatters = matters.filter((item) => !['草稿', '已完成', '已确认'].includes(item.status))
  const classes = spaces.filter((space) => space.type === '班级' && space.status !== 'dissolved')
  const resumeRecords = experiences.filter((item) => item.competitivenessBranchId && item.competitivenessBranchId !== 'none')
  const context = progressContext(experiences, checks, profile.rank)
  const go = (url: string) => Taro.navigateTo({ url })
  const toggle = (section: SectionId) => setCollapsed((current) => ({ ...current, [section]: !current[section] }))

  const SectionHeading = ({ id, title, note, action, onAction }: { id: SectionId; title: string; note: string; action?: string; onAction?: () => void }) => <View className='overview-section-heading'>
    <View className='overview-section-name'><Text>{title}</Text><Text>{note}</Text></View>
    <View className='overview-section-actions'>{action && <Text onClick={onAction}>{action}</Text>}<View className={`overview-collapse ${collapsed[id] ? 'collapsed' : ''}`} onClick={() => toggle(id)}><MiniIcon name='chevron-right' /></View></View>
  </View>

  return <View className='overview-page' style={customNavigationStyle()}>
    <View className='overview-header'>
      <View className='overview-header-button' hoverClass='overview-pressed' onClick={() => go('/pages/functions/index')}><MiniIcon name='dashboard' /></View>
      <View className='overview-header-title'><Text>今天</Text><Text>概览</Text></View>
      <View className='overview-header-button overview-account-button' style={{ right: accountRight }} hoverClass='overview-pressed' onClick={() => go('/pages/profile/index')}><MiniIcon name='person' /></View>
    </View>

    <View className='overview-content'>
      <View className='overview-greeting'><Text>你好，{profile.name || '同学'}</Text><Text>你的校园生活与成长目标</Text></View>

      <View className='overview-section'>
        <SectionHeading id='todos' title='我的待办' note={`${activeMatters.length}项待处理`} action='查看全部' onAction={() => go('/pages/matters/index')} />
        {!collapsed.todos && <View className='overview-matter-list'>
          {activeMatters.slice(0, 3).map((item) => <View className='overview-matter-card' key={item.id} onClick={() => go(`/pages/matter-detail/index?id=${item.id}`)}>
            <View className={`overview-matter-icon ${item.tone}`}><MiniIcon name={item.icon as MiniIconName} /></View>
            <View className='overview-matter-copy'><View className='overview-matter-meta'><Text>{item.space || '个人待办'}</Text><Text className={item.status === '待处理' ? 'pending' : 'overdue'}>{item.status}</Text></View><Text className='overview-matter-title'>{item.title}</Text><Text className='overview-matter-time'>{item.time}</Text></View>
            <MiniIcon name='chevron-right' className='overview-card-chevron' />
          </View>)}
          {!activeMatters.length && <View className='overview-empty'>暂无待办事项</View>}
        </View>}
      </View>

      <View className='overview-section'>
        <SectionHeading id='classes' title='我的班级' note={`${classes.length}个班级`} action='班级与课程' onAction={() => go('/pages/spaces/index')} />
        {!collapsed.classes && <View className='overview-class-list'>
          {classes.map((space) => <View className='overview-class-card' key={space.id} onClick={() => go(`/pages/space-detail/index?id=${space.id}`)}><View className={`overview-class-icon ${space.tone}`}><MiniIcon name='backpack-cyan' /></View><View><Text>{space.name}</Text><Text>{space.role} · {space.members}名成员</Text></View><MiniIcon name='chevron-right' /></View>)}
          {!classes.length && <View className='overview-empty'>加入班级后会显示在这里</View>}
        </View>}
      </View>

      <View className='overview-section'>
        <SectionHeading id='resume' title='我的简历' note='仅与个人账号绑定' action='打开简历' onAction={() => go('/pages/resume/index')} />
        {!collapsed.resume && <View className='overview-resume-card' onClick={() => go('/pages/resume/index')}><View className='overview-resume-icon'><MiniIcon name='card-stack-teal' /></View><View><Text>{profile.name || '完善个人简历'}</Text><Text>{resumeRecords.length}项经历 · 教育背景、经历、技能与其他</Text></View><MiniIcon name='chevron-right' /></View>}
      </View>

      <View className='overview-section overview-last-section'>
        <SectionHeading id='goals' title='我的目标' note={`${workspace.goals.length}个一级目标`} action='管理目标' onAction={() => go('/pages/templates/index')} />
        {!collapsed.goals && <View className='overview-goal-list'>
          {workspace.goals.map((goal) => {
            const progress = goalProgress(goal, context)
            const percent = progress.total ? Math.round(progress.completed / progress.total * 100) : 0
            return <View className='overview-goal-card' key={goal.id} onClick={() => go(`/pages/target/index?goalId=${goal.id}`)}><View className={`overview-goal-icon ${goal.kind}`}><MiniIcon name={goal.kind === 'graduation' ? 'reader-teal' : goal.kind === 'custom' ? 'list-blue' : 'layers-blue'} /></View><View className='overview-goal-copy'><View><Text>{goal.title}</Text><Text>{progress.completed}/{progress.total}</Text></View><Text>{progress.label}</Text><View className='overview-goal-track'><View style={{ width: `${percent}%` }} /></View></View><MiniIcon name='chevron-right' /></View>
          })}
        </View>}
      </View>
    </View>
  </View>
}
