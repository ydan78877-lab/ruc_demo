import { Button, Input, Picker, ScrollView, Switch, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { MiniIcon } from '../../components/MiniIcon'
import type { GraduationCreditMode, GraduationMode, StudentGoal, TemplatePage } from '../../models'
import { deleteGoal, getGoal, resetGoal, saveGoal } from '../../services/goalRepository'
import { customNavigationStyle } from '../../utils/navigationLayout'
import './index.scss'

const creditModeLabels = ['固定学分', '至少学分']
const creditModes: GraduationCreditMode[] = ['fixed', 'minimum']
const completionLabels = ['默认满足', '学生自查', '经历自动计算']
const completionModes: GraduationMode[] = ['automatic', 'manual', 'volunteer']

function copyConfig(config: StudentGoal) {
  return JSON.parse(JSON.stringify(config)) as StudentGoal
}

export default function TemplateSettingsPage() {
  const goalId = Taro.getCurrentInstance().router?.params?.goalId || ''
  const [config, setConfig] = useState(() => getGoal(goalId)!)
  const [pageId, setPageId] = useState(config.pages[0]?.id || '')
  const [expandedModule, setExpandedModule] = useState('')
  const [expandedBranch, setExpandedBranch] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const page = useMemo(() => config.pages.find((item) => item.id === pageId) || config.pages[0], [config, pageId])

  const commit = (mutator: (draft: StudentGoal) => void) => {
    const draft = copyConfig(config)
    mutator(draft)
    setConfig(draft)
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveGoal(config)
      setDirty(false)
      Taro.showToast({ title: '目标已同步', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '保存失败，请重试', icon: 'none', duration: 2600 })
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    setSaving(true)
    try {
      const next = await resetGoal(config.id)
      setConfig(next)
      setPageId(next.pages[0]?.id || '')
      setDirty(false)
      Taro.showToast({ title: '已恢复并同步', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '恢复失败，请重试', icon: 'none', duration: 2600 })
    } finally {
      setSaving(false)
    }
  }

  const updatePage = (mutator: (draft: TemplatePage) => void) => commit((draft) => {
    const current = draft.pages.find((item) => item.id === page.id)
    if (current) mutator(current)
  })

  const addPage = () => {
    if (config.kind === 'graduation') return
    const stamp = Date.now()
    const id = `custom-page-${stamp}`
    commit((draft) => draft.pages.push({
      id,
      tabLabel: '新子目标',
      title: '新子目标',
      kind: 'custom',
      visible: true,
      branches: [{ id: `custom-branch-${stamp}`, title: '待完成', kind: 'custom', target: 0, unit: '', scoringNote: '', visible: true, items: [] }]
    }))
    setPageId(id)
  }

  const removePage = async () => {
    if (config.kind === 'graduation' || config.pages.length <= 1) return
    const confirmed = await Taro.showModal({ title: '删除子目标', content: `确定删除“${page.tabLabel}”及其中内容吗？`, confirmColor: '#c93b3b' })
    if (!confirmed.confirm) return
    const nextId = config.pages.find((item) => item.id !== page.id)?.id || ''
    commit((draft) => { draft.pages = draft.pages.filter((item) => item.id !== page.id) })
    setPageId(nextId)
  }

  const addModule = () => updatePage((draft) => {
    draft.graduationModules ||= []
    draft.graduationModules.push({ id: `module-${Date.now()}`, title: '新模块' })
  })

  const removeModule = (moduleId: string) => updatePage((draft) => {
    draft.graduationModules = (draft.graduationModules || []).filter((item) => item.id !== moduleId)
    draft.checklist = (draft.checklist || []).filter((item) => item.group !== moduleId)
  })

  const addRequirement = (moduleId: string) => updatePage((draft) => {
    draft.checklist ||= []
    draft.checklist.push({ id: `requirement-${Date.now()}`, group: moduleId, title: '新课程', credits: 0, creditMode: 'fixed', detail: '', mode: 'manual', visible: true })
  })

  const addBranch = () => updatePage((draft) => {
    draft.branches.push({ id: `custom-branch-${Date.now()}`, title: '新分类', kind: 'custom', target: 0, unit: '', scoringNote: '', visible: true, items: [] })
  })

  const addCustomItem = (branchId: string) => updatePage((draft) => {
    const branch = draft.branches.find((item) => item.id === branchId)
    if (!branch) return
    branch.items ||= []
    branch.items.push({ id: `goal-item-${Date.now()}`, title: '新条目', requirement: '', description: '', completed: false })
  })

  const moveBranch = (branchId: string, offset: number) => updatePage((draft) => {
    const index = draft.branches.findIndex((item) => item.id === branchId)
    const target = index + offset
    if (index < 0 || target < 0 || target >= draft.branches.length) return
    const [branch] = draft.branches.splice(index, 1)
    draft.branches.splice(target, 0, branch)
  })

  const backToPreviousOrOverview = () => {
    if (Taro.getCurrentPages().length > 1) {
      void Taro.navigateBack()
      return
    }
    void Taro.reLaunch({ url: '/pages/overview/index' })
  }

  return <View className='settings-page' style={customNavigationStyle()}>
    <View className='settings-header'>
      <View className='settings-back' onClick={backToPreviousOrOverview}><MiniIcon name='chevron-left' /></View>
      <Text>目标设置</Text><View />
    </View>
    <View className='settings-content'>
      <View className='settings-card template-name-card'>
        <Text className='settings-label'>目标名称</Text>
        <Input value={config.title} onInput={(event) => commit((draft) => { draft.title = event.detail.value })} />
        <Text className='settings-source-note'>{config.sourceLabel}</Text>
        <View className='settings-template-actions'>
          <Button loading={saving} disabled={saving || !dirty} onClick={save}>{dirty ? '保存到云端' : '已同步'}</Button>
          <Button className='primary' onClick={() => Taro.navigateTo({ url: `/pages/target/index?goalId=${config.id}` })}>查看目标</Button>
        </View>
      </View>

      <ScrollView scrollX className='settings-page-tabs' enhanced showScrollbar={false}>
        <View className='settings-page-tab-row'>
          {config.pages.map((item) => <View key={item.id} className={item.id === page.id ? 'active' : ''} onClick={() => { setPageId(item.id); setExpandedModule(''); setExpandedBranch('') }}>{item.tabLabel}</View>)}
        </View>
      </ScrollView>
      {config.kind !== 'graduation' && <View className='settings-subgoal-actions'>
        <Button className='settings-add-page' onClick={addPage}>＋ 添加子目标</Button>
        <Button className='settings-delete-page' disabled={config.pages.length <= 1} onClick={() => void removePage()}>－ 删除当前子目标</Button>
      </View>}

      <View className='settings-section-heading'><Text>{config.kind === 'graduation' ? '目标内容' : '子目标设置'}</Text></View>
      <View className='settings-card settings-page-fields'>
        <View className='settings-field'><Text>子目标名称</Text><Input value={page.tabLabel} onInput={(event) => updatePage((draft) => { draft.tabLabel = event.detail.value; draft.title = event.detail.value })} /></View>
        <View className='settings-switch-row'><Text>显示子目标</Text><Switch color='#1768ec' checked={page.visible} onChange={(event) => updatePage((draft) => { draft.visible = event.detail.value })} /></View>
      </View>

      {page.kind === 'graduation' ? <>
        <View className='settings-section-heading'><Text>毕业模块</Text><Text onClick={addModule}>＋ 添加模块</Text></View>
        <View className='settings-stack'>{(page.graduationModules || []).map((module) => {
          const requirements = (page.checklist || []).filter((item) => item.group === module.id)
          const credits = requirements.reduce((sum, item) => sum + item.credits, 0)
          const expanded = expandedModule === module.id
          const isCore = ['foundation', 'major', 'excellence'].includes(module.id)
          return <View className={`settings-module ${expanded ? 'expanded' : ''}`} key={module.id}>
            <View className='settings-module-summary' onClick={() => setExpandedModule(expanded ? '' : module.id)}>
              <View><Text>{module.title}</Text><Text>{credits}学分 · {requirements.length}项</Text></View><MiniIcon name='chevron-right' />
            </View>
            {expanded && <View className='settings-module-body'>
              <View className='settings-field'><Text>模块名称</Text><Input value={module.title} onInput={(event) => updatePage((draft) => { const target = draft.graduationModules?.find((item) => item.id === module.id); if (target) target.title = event.detail.value })} /></View>
              {!isCore && <Text className='danger-link block' onClick={() => removeModule(module.id)}>删除模块及其中课程</Text>}
              {requirements.map((requirement) => <View className='settings-requirement' key={requirement.id}>
                <View className='settings-field'><Text>课程／条件名称</Text><Input value={requirement.title} onInput={(event) => updatePage((draft) => { const target = draft.checklist?.find((item) => item.id === requirement.id); if (target) target.title = event.detail.value })} /></View>
                <View className='settings-two-fields'>
                  <View className='settings-field'><Text>学分</Text><Input type='digit' value={String(requirement.credits)} onInput={(event) => updatePage((draft) => { const target = draft.checklist?.find((item) => item.id === requirement.id); if (target) target.credits = Number.parseFloat(event.detail.value) || 0 })} /></View>
                  <View className='settings-field'><Text>学分口径</Text><Picker mode='selector' range={creditModeLabels} value={creditModes.indexOf(requirement.creditMode)} onChange={(event) => updatePage((draft) => { const target = draft.checklist?.find((item) => item.id === requirement.id); if (target) target.creditMode = creditModes[Number(event.detail.value)] })}><View className='settings-picker'>{requirement.creditMode === 'minimum' ? '至少学分' : '固定学分'}</View></Picker></View>
                </View>
                <View className='settings-field'><Text>补充说明（选填）</Text><Input value={requirement.detail} onInput={(event) => updatePage((draft) => { const target = draft.checklist?.find((item) => item.id === requirement.id); if (target) target.detail = event.detail.value })} /></View>
                <View className='settings-field'><Text>完成方式</Text><Picker mode='selector' range={completionLabels} value={completionModes.indexOf(requirement.mode)} onChange={(event) => updatePage((draft) => { const target = draft.checklist?.find((item) => item.id === requirement.id); if (target) target.mode = completionModes[Number(event.detail.value)] })}><View className='settings-picker'>{completionLabels[completionModes.indexOf(requirement.mode)]}</View></Picker></View>
                {requirement.mode === 'volunteer' && <View className='settings-two-fields'>
                  <View className='settings-field'><Text>至少次数</Text><Input type='number' value={String(requirement.volunteerMinCount || 0)} onInput={(event) => updatePage((draft) => { const target = draft.checklist?.find((item) => item.id === requirement.id); if (target) target.volunteerMinCount = Number.parseInt(event.detail.value, 10) || 0 })} /></View>
                  <View className='settings-field'><Text>至少小时</Text><Input type='digit' value={String(requirement.volunteerMinHours || 0)} onInput={(event) => updatePage((draft) => { const target = draft.checklist?.find((item) => item.id === requirement.id); if (target) target.volunteerMinHours = Number.parseFloat(event.detail.value) || 0 })} /></View>
                </View>}
                <View className='settings-switch-row'><Text>在页面显示</Text><Switch color='#1768ec' checked={requirement.visible} onChange={(event) => updatePage((draft) => { const target = draft.checklist?.find((item) => item.id === requirement.id); if (target) target.visible = event.detail.value })} /></View>
                <Text className='danger-link block' onClick={() => updatePage((draft) => { draft.checklist = (draft.checklist || []).filter((item) => item.id !== requirement.id) })}>删除此项</Text>
              </View>)}
              <Button className='settings-add-row' onClick={() => addRequirement(module.id)}>＋ 添加课程／条件</Button>
            </View>}
          </View>
        })}</View>
      </> : <>
        <View className='settings-section-heading'><Text>{page.kind === 'custom' ? '分类与条目' : '分类与规则'}</Text><Text onClick={addBranch}>＋ 新增分类</Text></View>
        <View className='settings-stack'>{page.branches.map((branch, index) => {
          const expanded = expandedBranch === branch.id
          const isCore = page.kind !== 'custom' && !branch.id.startsWith('custom-branch-')
          return <View className={`settings-module ${expanded ? 'expanded' : ''}`} key={branch.id}>
            <View className='settings-module-summary' onClick={() => setExpandedBranch(expanded ? '' : branch.id)}>
              <View><Text>{branch.title}</Text><Text>{branch.scoringNote || '读取档案中的对应内容'}</Text></View><MiniIcon name='chevron-right' />
            </View>
            {expanded && <View className='settings-module-body'>
              <View className='settings-order-actions'><Button disabled={index === 0} onClick={() => moveBranch(branch.id, -1)}>上移</Button><Button disabled={index === page.branches.length - 1} onClick={() => moveBranch(branch.id, 1)}>下移</Button></View>
              <View className='settings-field'><Text>分类名称</Text><Input value={branch.title} onInput={(event) => updatePage((draft) => { const target = draft.branches.find((item) => item.id === branch.id); if (target) target.title = event.detail.value })} /></View>
              {page.kind === 'qualification' && <View className='settings-two-fields'>
                <View className='settings-field'><Text>目标值</Text><Input type='digit' value={String(branch.target)} onInput={(event) => updatePage((draft) => { const target = draft.branches.find((item) => item.id === branch.id); if (target) target.target = Number.parseFloat(event.detail.value) || 0 })} /></View>
                <View className='settings-field'><Text>单位</Text><Input value={branch.unit} onInput={(event) => updatePage((draft) => { const target = draft.branches.find((item) => item.id === branch.id); if (target) target.unit = event.detail.value })} /></View>
              </View>}
              <View className='settings-field'><Text>分类说明（选填）</Text><Textarea value={branch.scoringNote} onInput={(event) => updatePage((draft) => { const target = draft.branches.find((item) => item.id === branch.id); if (target) target.scoringNote = event.detail.value })} /></View>
              <View className='settings-switch-row'><Text>在页面显示</Text><Switch color='#1768ec' checked={branch.visible} onChange={(event) => updatePage((draft) => { const target = draft.branches.find((item) => item.id === branch.id); if (target) target.visible = event.detail.value })} /></View>
              {page.kind === 'custom' && (branch.items || []).map((item) => <View className='settings-requirement' key={item.id}>
                <View className='settings-field'><Text>目标内容</Text><Input value={item.title} onInput={(event) => updatePage((draft) => { const target = draft.branches.find((entry) => entry.id === branch.id)?.items?.find((entry) => entry.id === item.id); if (target) target.title = event.detail.value })} /></View>
                <View className='settings-field'><Text>完成要求</Text><Input value={item.requirement} placeholder='由用户自主判断并勾选' onInput={(event) => updatePage((draft) => { const target = draft.branches.find((entry) => entry.id === branch.id)?.items?.find((entry) => entry.id === item.id); if (target) target.requirement = event.detail.value })} /></View>
                <View className='settings-field'><Text>说明（选填）</Text><Textarea value={item.description} onInput={(event) => updatePage((draft) => { const target = draft.branches.find((entry) => entry.id === branch.id)?.items?.find((entry) => entry.id === item.id); if (target) target.description = event.detail.value })} /></View>
                <Text className='danger-link block' onClick={() => updatePage((draft) => { const target = draft.branches.find((entry) => entry.id === branch.id); if (target) target.items = (target.items || []).filter((entry) => entry.id !== item.id) })}>删除条目</Text>
              </View>)}
              {page.kind === 'custom' && <Button className='settings-add-row' onClick={() => addCustomItem(branch.id)}>＋ 添加具体条目</Button>}
              {!isCore && <Text className='danger-link block' onClick={() => updatePage((draft) => { draft.branches = draft.branches.filter((item) => item.id !== branch.id) })}>删除分类</Text>}
            </View>}
          </View>
        })}</View>
      </>}
      <Text className='settings-reset' onClick={() => !saving && void reset()}>恢复这个目标的默认设置</Text>
      {!config.protected && <Text className='settings-delete-goal' onClick={() => void Taro.showModal({ title: '删除目标', content: `确定删除“${config.title}”吗？`, confirmColor: '#c93b3b' }).then(async (result) => { if (!result.confirm) return; await deleteGoal(config.id); await Taro.reLaunch({ url: '/pages/templates/index' }) })}>删除这个目标</Text>}
    </View>
  </View>
}
