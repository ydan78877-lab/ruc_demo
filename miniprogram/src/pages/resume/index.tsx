import { Button, Input, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { CampusHeader } from '../../components/CampusHeader'
import { MiniIcon, type MiniIconName } from '../../components/MiniIcon'
import { resumeSections } from '../../data/goalDefaults'
import type { ExperienceRecord, StudentProfile } from '../../models'
import { getExperiences, getProfile, saveProfile } from '../../services/studentRepository'
import '../../styles/campus.scss'
import './index.scss'

const sectionIcons: Record<string, MiniIconName> = {
  academic: 'backpack-cyan',
  internship: 'card-stack-teal',
  'research-count': 'layers-blue',
  campus: 'reader-teal',
  language: 'list-blue',
  skills: 'check-blue',
  other: 'dashboard'
}

function recordsFor(sectionId: string, experiences: ExperienceRecord[]) {
  if (sectionId === 'other') return experiences.filter((item) => item.competitivenessBranchId === 'other' || item.category === 'other')
  return experiences.filter((item) => item.competitivenessBranchId === sectionId)
}

export default function ResumePage() {
  const [profile, setProfile] = useState(getProfile())
  const [experiences, setExperiences] = useState(getExperiences())
  const [expanded, setExpanded] = useState('academic')

  useDidShow(() => {
    setProfile(getProfile())
    setExperiences(getExperiences())
  })

  const saveProfileField = (key: 'skills' | 'interests', value: string) => {
    const next = { ...profile, [key]: value }
    setProfile(next)
    void saveProfile(next).then(() => Taro.showToast({ title: '已同步', icon: 'success', duration: 900 })).catch((error) => {
      setProfile(getProfile())
      Taro.showToast({ title: error instanceof Error ? error.message : '同步失败', icon: 'none' })
    })
  }

  const openRecord = (record: ExperienceRecord) => Taro.navigateTo({ url: `/pages/archive/index?id=${record.id}` })

  return <View className='resume-page'>
    <CampusHeader title='我的简历' />
    <View className='resume-content'>
      <View className='resume-hero'>
        <View><Text>{profile.name || '未填写姓名'}</Text><Text>{profile.major || '未填写专业'} · {profile.cohort || '未填写年级'}</Text><Text>仅与当前个人账号绑定</Text></View>
        <MiniIcon name='card-stack-teal' />
      </View>

      <View className='resume-sections'>
        {resumeSections.map((section) => {
          const records = recordsFor(section.id, experiences)
          const open = expanded === section.id
          const summary = section.id === 'academic'
            ? (profile.gpa ? `GPA ${profile.gpa}` : '基础信息待完善')
            : section.id === 'skills'
              ? ([profile.skills, profile.interests].filter(Boolean).join(' · ') || '技能与爱好待完善')
              : `${records.length}项内容`
          return <View className={`resume-section ${open ? 'expanded' : ''}`} key={section.id}>
            <View className='resume-section-heading' onClick={() => setExpanded(open ? '' : section.id)}>
              <View className='resume-section-icon'><MiniIcon name={sectionIcons[section.id]} /></View>
              <View className='resume-section-copy'><Text>{section.title}</Text><Text>{summary}</Text></View>
              <MiniIcon name='chevron-right' />
            </View>
            {open && <View className='resume-section-body'>
              {section.id === 'academic' && <View className='resume-education'>
                <Text>{profile.school} · {profile.college}</Text>
                <Text>{profile.major} · {profile.cohort}</Text>
                <Text>平均学分绩点：{profile.gpa || '未填写'} · 核心绩点排名：{profile.rank || '未填写'}</Text>
              </View>}
              {section.id === 'skills' && <View className='resume-field-stack'>
                <Text>技能</Text><Input value={profile.skills} placeholder='填写掌握的技能' onBlur={(event) => saveProfileField('skills', event.detail.value)} />
                <Text>兴趣与爱好</Text><Input value={profile.interests} placeholder='填写兴趣与爱好' onBlur={(event) => saveProfileField('interests', event.detail.value)} />
              </View>}
              {!['academic', 'skills'].includes(section.id) && <>
                {records.map((record) => <View className='resume-record' key={record.id} onClick={() => openRecord(record)}><View><Text>{record.name}</Text><Text>{record.result || record.details || '已记录'}</Text></View><MiniIcon name='chevron-right' /></View>)}
                {!records.length && <View className='resume-empty'>暂无内容，可以通过“录入资料”添加</View>}
              </>}
            </View>}
          </View>
        })}
      </View>

      <Button className='resume-primary' onClick={() => Taro.navigateTo({ url: '/pages/entry/index' })}>录入资料</Button>
      <Button className='resume-secondary' onClick={() => Taro.navigateTo({ url: '/pages/archive/index' })}>查看完整档案</Button>
    </View>
  </View>
}
