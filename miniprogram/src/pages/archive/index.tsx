import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { CampusHeader } from '../../components/CampusHeader'
import { MiniIcon } from '../../components/MiniIcon'
import type { ExperienceRecord } from '../../models'
import { deleteExperience, getExperiences, getProfile } from '../../services/studentRepository'
import '../../styles/campus.scss'
import './index.scss'

export default function ArchivePage() {
  const router = useRouter()
  const [records, setRecords] = useState<ExperienceRecord[]>(getExperiences())
  const [expandedId, setExpandedId] = useState(router.params.id || '')
  const [deletingId, setDeletingId] = useState('')
  const profile = getProfile()
  useDidShow(() => {
    setRecords(getExperiences())
    if (router.params.id) setExpandedId(router.params.id)
  })
  const sorted = useMemo(() => [...records].sort((a, b) => b.startMonth.localeCompare(a.startMonth)), [records])

  const remove = (record: ExperienceRecord) => {
    Taro.showModal({ title: '删除这段经历？', content: record.name, confirmColor: '#e24d4d' }).then(async ({ confirm }) => {
      if (!confirm) return
      setDeletingId(record.id)
      try {
        await deleteExperience(record.id)
        setRecords(getExperiences())
        setExpandedId('')
        Taro.showToast({ title: '已删除并同步', icon: 'success' })
      } catch (error) {
        setRecords(getExperiences())
        Taro.showToast({ title: error instanceof Error ? error.message : '删除失败，请重试', icon: 'none', duration: 2600 })
      } finally {
        setDeletingId('')
      }
    })
  }

  return (
    <View className='archive-page'>
      <CampusHeader title='完整档案' />
      <View className='archive-content'>
        <View className='archive-profile-card'>
          <View className='archive-avatar'><MiniIcon name='person-white' /></View>
          <View className='archive-profile-copy'>
            <Text className='archive-profile-name'>{profile.name}</Text>
            <Text className='archive-profile-meta'>{profile.school} · {profile.college}</Text>
            <Text className='archive-profile-meta'>{profile.major} · {profile.cohort} · GPA {profile.gpa}</Text>
          </View>
          <View className='archive-edit-profile' onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })} hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80}>
            <MiniIcon name='pencil-blue' />
          </View>
        </View>

        <View className='archive-heading'><Text>经历时间线</Text><Text>{records.length} 项</Text></View>
        <View className='archive-timeline'>
          {sorted.map((item) => {
            const expanded = expandedId === item.id
            return (
              <View className={`archive-record ${expanded ? 'expanded' : ''}`} key={item.id}>
                <View className='archive-time-rail'><View className='archive-dot' /></View>
                <View className='archive-record-card'>
                  <View className='archive-record-summary' onClick={() => setExpandedId(expanded ? '' : item.id)} hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80}>
                    <View className='archive-record-copy'>
                      <Text className='archive-record-title'>{item.name}</Text>
                      <View className='archive-record-bottom'><Text>{item.result || item.type}</Text><Text>{item.startMonth} — {item.endMonth}</Text></View>
                    </View>
                    <MiniIcon name='chevron-right' />
                  </View>
                  {expanded && (
                    <View className='archive-record-detail'>
                      <Text className='archive-detail-label'>经历具体内容</Text>
                      <Text className='archive-detail-text'>{item.details || item.languageNote || '暂未填写具体内容'}</Text>
                      <View className='archive-detail-actions'>
                        <View onClick={() => Taro.navigateTo({ url: `/pages/entry/index?id=${item.id}` })}>编辑</View>
                        <View onClick={() => !deletingId && remove(item)}>{deletingId === item.id ? '同步中…' : '删除'}</View>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )
          })}
        </View>
        {records.length === 0 && <View className='archive-empty'>还没有录入经历</View>}
        <Button className='archive-add' onClick={() => Taro.navigateTo({ url: '/pages/entry/index' })} hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80}>
          <MiniIcon name='pencil-blue' /><Text>录入资料</Text>
        </Button>
      </View>
    </View>
  )
}
