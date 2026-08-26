import { Button, Input, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { CampusHeader } from '../../components/CampusHeader'
import { MiniIcon } from '../../components/MiniIcon'
import { cohortOptions, majorOptions } from '../../config/accountOptions'
import type { StudentProfile } from '../../models'
import { getProfile, saveProfile } from '../../services/studentRepository'
import '../../styles/campus.scss'
import './index.scss'

const basicFields: [keyof StudentProfile, string, string][] = [
  ['name', '姓名', '请输入姓名'], ['school', '学校', '请输入学校'], ['college', '学院', '请输入学院']
]
const academicFields: [keyof StudentProfile, string, string][] = [
  ['gpa', '平均学分绩点', '如 3.81'], ['rank', '核心绩点排名', '如 7/10']
]
const extraFields: [keyof StudentProfile, string, string][] = [
  ['skills', '技能', '使用顿号分隔'], ['interests', '兴趣', '使用顿号分隔']
]

export default function ProfilePage() {
  const [profile, setProfile] = useState(getProfile())
  const [majorChoice, setMajorChoice] = useState(majorOptions.includes(profile.major) ? profile.major : (profile.major ? '其他' : ''))
  const [saving, setSaving] = useState(false)
  const update = (key: keyof StudentProfile, value: string) => setProfile({ ...profile, [key]: value })
  const save = async () => {
    if (profile.name.trim().length < 2 || !profile.cohort || !profile.major.trim()) {
      Taro.showToast({ title: '请补全姓名、年级和专业', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      await saveProfile({ ...profile, name: profile.name.trim(), major: profile.major.trim() })
      Taro.showToast({ title: '已同步到云端', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 350)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '保存失败，请重试', icon: 'none', duration: 2600 })
    } finally {
      setSaving(false)
    }
  }
  const renderFields = (fields: typeof basicFields) => fields.map(([key, label, placeholder]) => (
    <View className='profile-field' key={key}>
      <Text>{label}</Text>
      <Input type={key === 'gpa' ? 'digit' : 'text'} value={profile[key]} placeholder={placeholder} onInput={(event) => update(key, event.detail.value)} />
    </View>
  ))
  return (
    <View className='profile-page'>
      <CampusHeader title='个人信息' />
      <View className='profile-content'>
        <View className='profile-hero'>
          <View className='profile-hero-avatar'><MiniIcon name='person-white' /></View>
          <View><Text>{profile.name || '未填写姓名'}</Text><Text>{profile.major || '未填写专业'} · {profile.cohort || '未填写年级'}</Text></View>
        </View>
        <View className='profile-section-title'>基础信息</View>
        <View className='profile-form-card'>
          {renderFields(basicFields)}
          <Picker mode='selector' range={cohortOptions} value={Math.max(0, cohortOptions.indexOf(profile.cohort))} onChange={(event) => update('cohort', cohortOptions[Number(event.detail.value)])}>
            <View className='profile-field profile-picker-field'><Text>年级</Text><Text>{profile.cohort || '请选择年级'}</Text><Text>›</Text></View>
          </Picker>
          <Picker mode='selector' range={[...majorOptions, '其他']} value={Math.max(0, [...majorOptions, '其他'].indexOf(majorChoice))} onChange={(event) => {
            const choice = [...majorOptions, '其他'][Number(event.detail.value)]
            setMajorChoice(choice)
            update('major', choice === '其他' ? '' : choice)
          }}>
            <View className='profile-field profile-picker-field'><Text>专业</Text><Text>{majorChoice || profile.major || '请选择专业'}</Text><Text>›</Text></View>
          </Picker>
          {majorChoice === '其他' ? <View className='profile-field'><Text>专业名称</Text><Input value={profile.major} placeholder='请输入专业名称' onInput={(event) => update('major', event.detail.value)} /></View> : null}
        </View>
        <View className='profile-section-title'>学业信息</View>
        <View className='profile-form-card two-column'>{renderFields(academicFields)}</View>
        <View className='profile-section-title'>兴趣与技能</View>
        <View className='profile-form-card'>{renderFields(extraFields)}</View>
        <Button className='profile-save' loading={saving} disabled={saving} onClick={save} hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80}>保存并同步</Button>
      </View>
    </View>
  )
}
