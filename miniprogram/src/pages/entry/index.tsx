import { Button, Input, Picker, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { CampusHeader } from '../../components/CampusHeader'
import {
  academicCompletionOptions,
  baseSectionOptions,
  categoryLabel,
  categoryOptions,
  cefrLevels,
  choiceLabel,
  commonExperiencePresets,
  defaultCompetitivenessBranch,
  defaultLanguageScores,
  defaultResearchSection,
  directEntryCategories,
  findExperiencePreset,
  journalAuthorRoles,
  languageResultSummary,
  languageScoreDetails,
  matchJournalClass,
  presetResultText,
  presetScore,
  presetsForCategory,
  projectRoles,
  researchSectionOptions,
  validateLanguageScores
} from '../../data/experienceRules'
import { resumeSections } from '../../data/goalDefaults'
import type { ExperienceCategory, ExperienceRecord, JournalClass, StudentProfile } from '../../models'
import { addExperience, getExperiences, getProfile, saveProfile, updateExperience } from '../../services/studentRepository'
import '../../styles/campus.scss'
import './index.scss'

const yesNoOptions = ['否', '是']

function optionIndex<T extends { id: string }>(options: T[], id?: string) {
  return Math.max(0, options.findIndex((item) => item.id === id))
}

export default function EntryPage() {
  const editId = Taro.getCurrentInstance().router?.params?.id || ''
  const existing = getExperiences().find((item) => item.id === editId)
  const initialCategory: ExperienceCategory = existing?.category || 'competition'
  const initialPreset = findExperiencePreset(existing?.presetId)
  const [tab, setTab] = useState<'experience' | 'profile'>('experience')
  const [category, setCategory] = useState<ExperienceCategory>(initialCategory)
  const [presetId, setPresetId] = useState(existing?.presetId || '')
  const [manual, setManual] = useState(Boolean(existing && !initialPreset))
  const [projectTitle, setProjectTitle] = useState(existing?.projectTitle || '')
  const [name, setName] = useState(existing?.name || '')
  const [journalName, setJournalName] = useState(existing?.journalName || '')
  const [journalClass, setJournalClass] = useState<JournalClass>(existing?.journalClass || '')
  const [roleCode, setRoleCode] = useState(existing?.roleCode || '')
  const [resultCode, setResultCode] = useState(existing?.resultCode || '')
  const [completionCode, setCompletionCode] = useState(existing?.completionCode || 'pending')
  const [manualResult, setManualResult] = useState(existing?.result || '')
  const [startMonth, setStartMonth] = useState(existing?.startMonth || '2026-01')
  const [endMonth, setEndMonth] = useState(existing?.endMonth || '2026-02')
  const [details, setDetails] = useState(existing?.details || '')
  const [languageScores, setLanguageScores] = useState<Record<string, string>>(existing?.languageScores || {})
  const [researchScore, setResearchScore] = useState(String(existing?.researchScore ?? existing?.score ?? 0))
  const [countsForBase, setCountsForBase] = useState(Boolean(existing?.countsForBase))
  const [baseSection, setBaseSection] = useState(existing?.baseSection || 'ideology')
  const [baseScore, setBaseScore] = useState(String(existing?.baseScore ?? 0))
  const [countsForResearch, setCountsForResearch] = useState(existing?.countsForResearch ?? false)
  const [researchSection, setResearchSection] = useState(existing?.researchSection || defaultResearchSection(initialCategory))
  const [competitivenessBranchId, setCompetitivenessBranchId] = useState(existing?.competitivenessBranchId || defaultCompetitivenessBranch(initialCategory))
  const [countsForVolunteer, setCountsForVolunteer] = useState(Boolean(existing?.countsForVolunteer))
  const [volunteerHours, setVolunteerHours] = useState(String(existing?.volunteerHours ?? ''))
  const [profile, setProfile] = useState(getProfile())
  const [saving, setSaving] = useState(false)

  const resumeOptions = useMemo(() => {
    const choices = resumeSections
      .filter((section) => !['academic', 'skills'].includes(section.id))
      .map((section) => ({ id: section.id, label: section.title }))
    return [...choices, { id: 'none', label: '不归入我的简历' }]
  }, [])

  const preset = findExperiencePreset(presetId)
  const categoryPresets = useMemo(() => presetsForCategory(category), [category])
  const isLanguage = category === 'language' && Boolean(preset)
  const showPresetPicker = !directEntryCategories.has(category) && category !== 'other'
  const resultOptions = preset?.id === 'journal-paper'
    ? [{ id: '', label: '未匹配／暂不填写' }, { id: 'A', label: 'A类期刊' }, { id: 'B', label: 'B类期刊' }, { id: 'C', label: 'C类期刊' }]
    : preset?.results || []
  const roleOptions = preset?.roles || []
  const completionOptions = preset?.completionOptions || []

  const applyPreset = (nextPresetId: string) => {
    const next = findExperiencePreset(nextPresetId)
    setPresetId(nextPresetId)
    setManual(!next)
    setProjectTitle('')
    setName(next?.name || '')
    setJournalName('')
    setJournalClass('')
    setRoleCode(next?.roles?.[0]?.id || '')
    setResultCode(next?.results?.[0]?.id || '')
    setCompletionCode(next?.completionOptions?.[0]?.id || 'pending')
    setManualResult('')
    setDetails(next?.defaultDetails || '')
    const scores = next ? defaultLanguageScores(next.id) : {}
    setLanguageScores(scores)
    const calculated = next ? presetScore(next, next.results?.[0]?.id || '', next.roles?.[0]?.id || '', next.completionOptions?.[0]?.id || '') : 0
    setResearchScore(String(calculated))
    setCountsForResearch(Boolean(next?.researchSection && calculated > 0))
    setResearchSection(next?.researchSection || defaultResearchSection(category))
    setCompetitivenessBranchId(next?.competitivenessBranchId || defaultCompetitivenessBranch(category))
  }

  const changeCategory = (index: number) => {
    const next = categoryOptions[index].id as ExperienceCategory
    setCategory(next)
    setPresetId('')
    setManual(directEntryCategories.has(next) || next === 'other')
    setName('')
    setProjectTitle('')
    setManualResult('')
    setResultCode('')
    setRoleCode('')
    setCompletionCode('pending')
    setLanguageScores({})
    setResearchScore('0')
    setCountsForResearch(false)
    setResearchSection(defaultResearchSection(next))
    setCompetitivenessBranchId(defaultCompetitivenessBranch(next))
  }

  const updatePolicyScore = (nextResult = resultCode, nextRole = roleCode, nextCompletion = completionCode) => {
    if (!preset) return
    const value = presetScore(preset, nextResult, nextRole, nextCompletion)
    setResearchScore(String(value))
    setCountsForResearch(Boolean(preset.researchSection && value > 0))
  }

  const chooseResult = (index: number) => {
    const next = resultOptions[index]?.id || ''
    setResultCode(next)
    if (preset?.id === 'journal-paper') setJournalClass(next as JournalClass)
    updatePolicyScore(next, roleCode, completionCode)
  }

  const chooseRole = (index: number) => {
    const next = roleOptions[index]?.id || ''
    setRoleCode(next)
    updatePolicyScore(resultCode, next, completionCode)
  }

  const chooseCompletion = (index: number) => {
    const next = completionOptions[index]?.id || ''
    setCompletionCode(next)
    updatePolicyScore(resultCode, roleCode, next)
  }

  const setLanguageScore = (key: string, value: string) => setLanguageScores((current) => ({ ...current, [key]: value }))

  const saveExperience = async () => {
    const actualName = preset?.name || name.trim()
    if (!actualName) return Taro.showToast({ title: '请填写经历名称', icon: 'none' })
    if (preset && !isLanguage && resultOptions.length && resultCode === '' && preset.id !== 'journal-paper') return Taro.showToast({ title: `请选择${preset.resultLabel}`, icon: 'none' })
    if (preset?.roles?.length && !roleCode) return Taro.showToast({ title: '请选择身份／角色', icon: 'none' })
    if (isLanguage && !validateLanguageScores(preset!.id, languageScores)) return Taro.showToast({ title: '请补充考试成绩', icon: 'none' })

    const result = isLanguage
      ? languageResultSummary(preset!.id, languageScores)
      : preset
        ? presetResultText(preset, resultCode, roleCode, completionCode)
        : manualResult.trim()
    const score = Math.max(0, Number.parseFloat(researchScore) || 0)
    const categoryText = categoryLabel(category)
    const branchLabel = choiceLabel(resumeOptions, competitivenessBranchId)
    const record: ExperienceRecord = {
      id: existing?.id || `experience-${Date.now()}`,
      type: categoryText,
      category,
      year: startMonth.slice(0, 4),
      groupKey: preset ? `${preset.id}-${startMonth.slice(0, 4)}` : actualName,
      presetId: preset?.id,
      name: actualName,
      projectTitle: projectTitle.trim(),
      journalName: journalName.trim(),
      journalClass,
      role: choiceLabel(roleOptions, roleCode),
      roleCode,
      result,
      resultCode,
      completionCode,
      languageScores: isLanguage ? languageScores : undefined,
      languageNote: isLanguage ? languageScoreDetails(preset!.id, languageScores) : undefined,
      startMonth,
      endMonth: isLanguage ? startMonth : endMonth,
      details: details.trim(),
      competitivenessBranchId,
      resumeSection: branchLabel,
      countsForBase,
      baseSection: countsForBase ? baseSection : undefined,
      baseScore: countsForBase ? Math.max(0, Number.parseFloat(baseScore) || 0) : 0,
      countsForResearch: isLanguage ? false : (preset ? score > 0 : countsForResearch),
      researchSection: isLanguage ? undefined : (preset?.researchSection || researchSection),
      researchScore: isLanguage ? 0 : score,
      score: isLanguage ? 0 : score,
      countsForVolunteer,
      volunteerHours: countsForVolunteer ? Math.max(0, Number.parseFloat(volunteerHours) || 0) : 0,
      createdAt: existing?.createdAt || Date.now()
    }
    setSaving(true)
    try {
      await (existing ? updateExperience(record) : addExperience(record))
      Taro.showToast({ title: existing ? '已更新并同步' : '已保存并同步', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 300)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '保存失败，请重试', icon: 'none', duration: 2600 })
    } finally {
      setSaving(false)
    }
  }

  const saveBasic = async () => {
    setSaving(true)
    try {
      await saveProfile(profile)
      Taro.showToast({ title: '已保存并同步', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 300)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '保存失败，请重试', icon: 'none', duration: 2600 })
    } finally {
      setSaving(false)
    }
  }

  const updateProfile = (key: keyof StudentProfile, value: string) => setProfile({ ...profile, [key]: value })

  const languageFields = () => {
    if (!preset) return null
    if (preset.id === 'delf' || preset.id === 'tcf' || preset.id === 'tef') return (
      <View className='entry-field'>
        <Text>等级</Text>
        <Picker mode='selector' range={cefrLevels} value={Math.max(0, cefrLevels.indexOf(languageScores.level || ''))} onChange={(event) => setLanguageScore('level', cefrLevels[Number(event.detail.value)])}>
          <View className={`entry-picker ${languageScores.level ? '' : 'placeholder'}`}>{languageScores.level || '请选择等级'}</View>
        </Picker>
      </View>
    )
    const definitions: Record<string, { key: string; label: string; placeholder?: string }[]> = {
      cet4: [{ key: 'total', label: '总分' }, { key: 'listening', label: '听力' }, { key: 'reading', label: '阅读' }, { key: 'writingTranslation', label: '写作和翻译' }, { key: 'oralGrade', label: '口试等级（选填）' }],
      cet6: [{ key: 'total', label: '总分' }, { key: 'listening', label: '听力' }, { key: 'reading', label: '阅读' }, { key: 'writingTranslation', label: '写作和翻译' }, { key: 'oralGrade', label: '口试等级（选填）' }],
      ielts: [{ key: 'overall', label: '总分' }, { key: 'listening', label: '听力' }, { key: 'reading', label: '阅读' }, { key: 'writing', label: '写作' }, { key: 'speaking', label: '口语' }],
      gre: [{ key: 'verbal', label: '语文' }, { key: 'quantitative', label: '数学' }, { key: 'analyticalWriting', label: '分析性写作' }]
    }
    if (preset.id === 'toefl') {
      const isLegacy = languageScores.scale === 'legacy'
      return <>
        <View className='entry-field'><Text>计分版本</Text><Picker mode='selector' range={['现行量表', '旧版120分制']} value={isLegacy ? 1 : 0} onChange={(event) => setLanguageScore('scale', Number(event.detail.value) === 1 ? 'legacy' : 'current')}><View className='entry-picker'>{isLegacy ? '旧版120分制' : '现行量表'}</View></Picker></View>
        <View className='language-score-grid'>{(isLegacy
          ? [{ key: 'total', label: '总分' }, { key: 'reading', label: '阅读' }, { key: 'listening', label: '听力' }, { key: 'speaking', label: '口语' }, { key: 'writing', label: '写作' }]
          : [{ key: 'overall', label: '综合等级' }, { key: 'reading', label: '阅读等级' }, { key: 'listening', label: '听力等级' }, { key: 'speaking', label: '口语等级' }, { key: 'writing', label: '写作等级' }, { key: 'comparableTotal', label: '百分制对照（选填）' }]
        ).map((field) => <View className='entry-field vertical' key={field.key}><Text>{field.label}</Text><Input type='digit' value={languageScores[field.key] || ''} onInput={(event) => setLanguageScore(field.key, event.detail.value)} /></View>)}</View>
      </>
    }
    if (preset.id === 'gmat') {
      const legacy = languageScores.version === 'legacy'
      return <>
        <View className='entry-field'><Text>考试版本</Text><Picker mode='selector' range={['GMAT Focus', '旧版 GMAT']} value={legacy ? 1 : 0} onChange={(event) => setLanguageScore('version', Number(event.detail.value) === 1 ? 'legacy' : 'current')}><View className='entry-picker'>{legacy ? '旧版 GMAT' : 'GMAT Focus'}</View></Picker></View>
        <View className='language-score-grid'>{(legacy
          ? [{ key: 'total', label: '总分' }, { key: 'quantitative', label: '数学' }, { key: 'verbal', label: '语文' }, { key: 'integratedReasoning', label: '综合推理' }, { key: 'analyticalWriting', label: '分析性写作' }]
          : [{ key: 'total', label: '总分' }, { key: 'quantitative', label: '数学' }, { key: 'verbal', label: '语文' }, { key: 'dataInsights', label: '数据洞察' }]
        ).map((field) => <View className='entry-field vertical' key={field.key}><Text>{field.label}</Text><Input type='digit' value={languageScores[field.key] || ''} onInput={(event) => setLanguageScore(field.key, event.detail.value)} /></View>)}</View>
      </>
    }
    return <View className='language-score-grid'>{(definitions[preset.id] || []).map((field) => <View className='entry-field vertical' key={field.key}><Text>{field.label}</Text><Input type='digit' value={languageScores[field.key] || ''} onInput={(event) => setLanguageScore(field.key, event.detail.value)} /></View>)}</View>
  }

  return (
    <View className='entry-page'>
      <CampusHeader title={existing ? '编辑经历' : '录入资料'} />
      <View className='entry-content'>
        {!existing && <View className='entry-tabs'><View className={tab === 'experience' ? 'active' : ''} onClick={() => setTab('experience')}>经历录入</View><View className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>成绩与基础信息</View></View>}

        {tab === 'experience' ? <>
          <View className='entry-section-title'>经历</View>
          <View className='entry-form-card'>
            <View className='entry-field'><Text>经历类型</Text><Picker mode='selector' range={categoryOptions.map((item) => item.label)} value={optionIndex(categoryOptions, category)} onChange={(event) => changeCategory(Number(event.detail.value))}><View className='entry-picker'>{categoryLabel(category)}</View></Picker></View>
            {showPresetPicker && <View className='entry-field'><Text>常用经历</Text><Picker mode='selector' range={[...categoryPresets.map((item) => item.name), '不常见经历（手动录入）']} value={preset ? Math.max(0, categoryPresets.findIndex((item) => item.id === preset.id)) : categoryPresets.length} onChange={(event) => { const index = Number(event.detail.value); applyPreset(categoryPresets[index]?.id || '') }}><View className={`entry-picker ${preset || manual ? '' : 'placeholder'}`}>{preset?.name || (manual ? '不常见经历（手动录入）' : '请选择常用经历')}</View></Picker></View>}
            {manual && <View className='entry-field vertical'><Text>经历名称</Text><Input value={name} placeholder='请输入完整名称' onInput={(event) => setName(event.detail.value)} /></View>}
            {preset?.requiresProjectTitle && <View className='entry-field vertical'><Text>{preset.id === 'journal-paper' ? '论文题目（选填）' : '项目名称（选填）'}</Text><Input value={projectTitle} placeholder='填写具体课题或项目名称' onInput={(event) => setProjectTitle(event.detail.value)} /></View>}
            {preset?.id === 'journal-paper' && <View className='entry-field vertical'><Text>期刊名称</Text><Input value={journalName} placeholder='输入中文期刊名称，系统自动匹配' onInput={(event) => { const value = event.detail.value; setJournalName(value); const matched = matchJournalClass(value); setJournalClass(matched); setResultCode(matched); updatePolicyScore(matched, roleCode, completionCode) }} /></View>}
            {roleOptions.length > 0 && <View className='entry-field'><Text>身份／角色</Text><Picker mode='selector' range={roleOptions.map((item) => item.label)} value={optionIndex(roleOptions, roleCode)} onChange={(event) => chooseRole(Number(event.detail.value))}><View className={`entry-picker ${roleCode ? '' : 'placeholder'}`}>{choiceLabel(roleOptions, roleCode) || '请选择身份／角色'}</View></Picker></View>}
            {preset && !isLanguage && resultOptions.length > 0 && <View className='entry-field'><Text>{preset.resultLabel}</Text><Picker mode='selector' range={resultOptions.map((item) => item.label)} value={optionIndex(resultOptions, resultCode)} onChange={(event) => chooseResult(Number(event.detail.value))}><View className={`entry-picker ${resultCode || preset.id === 'journal-paper' ? '' : 'placeholder'}`}>{choiceLabel(resultOptions, resultCode) || '请选择'}</View></Picker></View>}
            {completionOptions.length > 0 && <View className='entry-field'><Text>结项情况</Text><Picker mode='selector' range={completionOptions.map((item) => item.label)} value={optionIndex(completionOptions, completionCode)} onChange={(event) => chooseCompletion(Number(event.detail.value))}><View className='entry-picker'>{choiceLabel(completionOptions, completionCode)}</View></Picker></View>}
            {manual && <View className='entry-field vertical'><Text>奖项／结果／职（岗）位</Text><Input value={manualResult} placeholder='如 一等奖、优秀结项、实习生、部长' onInput={(event) => setManualResult(event.detail.value)} /></View>}
            {isLanguage && languageFields()}
            <View className='entry-month-row'><View><Text>{isLanguage ? '考试时间' : '开始年月'}</Text><Picker mode='date' fields='month' value={startMonth} onChange={(event) => setStartMonth(event.detail.value)}><View>{startMonth}</View></Picker></View>{!isLanguage && <View><Text>结束年月</Text><Picker mode='date' fields='month' value={endMonth} onChange={(event) => setEndMonth(event.detail.value)}><View>{endMonth}</View></Picker></View>}</View>
            {preset && !isLanguage && <View className='policy-score-card'><View><Text>政策计分</Text><Text>{presetResultText(preset, resultCode, roleCode, completionCode)}</Text></View><View className='score-input'><Input type='digit' value={researchScore} onInput={(event) => setResearchScore(event.detail.value)} /><Text>分</Text></View></View>}
          </View>

          <View className='entry-section-title'>经历归属</View>
          <View className='entry-form-card mapping-card'>
            <View className='mapping-block'><Text>是否计入基础素养分</Text><Picker mode='selector' range={yesNoOptions} value={countsForBase ? 1 : 0} onChange={(event) => setCountsForBase(Number(event.detail.value) === 1)}><View className='entry-picker'>{countsForBase ? '是' : '否'}</View></Picker>{countsForBase && <View className='mapping-inline'><Picker mode='selector' range={baseSectionOptions.map((item) => item.label)} value={optionIndex(baseSectionOptions, baseSection)} onChange={(event) => setBaseSection(baseSectionOptions[Number(event.detail.value)].id as typeof baseSection)}><View className='entry-picker'>{choiceLabel(baseSectionOptions, baseSection)}</View></Picker><View className='score-input'><Input type='digit' value={baseScore} onInput={(event) => setBaseScore(event.detail.value)} /><Text>分</Text></View></View>}</View>
            {!preset && !isLanguage && <View className='mapping-block'><Text>是否计入科研与创新分</Text><Picker mode='selector' range={yesNoOptions} value={countsForResearch ? 1 : 0} onChange={(event) => setCountsForResearch(Number(event.detail.value) === 1)}><View className='entry-picker'>{countsForResearch ? '是' : '否'}</View></Picker>{countsForResearch && <View className='mapping-inline'><Picker mode='selector' range={researchSectionOptions.map((item) => item.label)} value={optionIndex(researchSectionOptions, researchSection)} onChange={(event) => setResearchSection(researchSectionOptions[Number(event.detail.value)].id as typeof researchSection)}><View className='entry-picker'>{choiceLabel(researchSectionOptions, researchSection)}</View></Picker><View className='score-input'><Input type='digit' value={researchScore} onInput={(event) => setResearchScore(event.detail.value)} /><Text>分</Text></View></View>}</View>}
            <View className='mapping-block'><Text>我的简历栏目</Text><Picker mode='selector' range={resumeOptions.map((item) => item.label)} value={optionIndex(resumeOptions, competitivenessBranchId)} onChange={(event) => setCompetitivenessBranchId(resumeOptions[Number(event.detail.value)].id)}><View className='entry-picker'>{choiceLabel(resumeOptions, competitivenessBranchId)}</View></Picker></View>
            <View className='mapping-block'><Text>是否记录志愿时长</Text><Picker mode='selector' range={yesNoOptions} value={countsForVolunteer ? 1 : 0} onChange={(event) => setCountsForVolunteer(Number(event.detail.value) === 1)}><View className='entry-picker'>{countsForVolunteer ? '是' : '否'}</View></Picker>{countsForVolunteer && <View className='entry-field vertical compact'><Text>志愿时长（小时）</Text><Input type='digit' value={volunteerHours} onInput={(event) => setVolunteerHours(event.detail.value)} /></View>}</View>
          </View>
          <View className='entry-section-title'>经历具体内容（选填）</View>
          <Textarea className='entry-textarea' value={details} placeholder='可以填写参与内容、承担职责、完成成果等' onInput={(event) => setDetails(event.detail.value)} />
          <Button className='entry-save' loading={saving} disabled={saving} onClick={saveExperience} hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80}>{existing ? '保存修改' : '保存经历'}</Button>
        </> : <>
          <View className='entry-section-title'>基础信息</View>
          <View className='entry-form-card'>{([['name', '姓名'], ['major', '专业'], ['cohort', '年级'], ['gpa', '平均学分绩点'], ['rank', '核心绩点排名']] as [keyof StudentProfile, string][]).map(([key, label]) => <View className='entry-field vertical' key={key}><Text>{label}</Text><Input type={key === 'gpa' ? 'digit' : 'text'} value={profile[key]} onInput={(event) => updateProfile(key, event.detail.value)} /></View>)}</View>
          <Button className='entry-save' loading={saving} disabled={saving} onClick={saveBasic} hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80}>完成</Button>
        </>}
      </View>
    </View>
  )
}
