import { Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { CampusHeader } from '../../components/CampusHeader'
import { MiniIcon } from '../../components/MiniIcon'
import type { CampusMatter, CampusSpace } from '../../data/campus'
import { getCampusMatters, getCampusResources, getCampusSpaces, setCampusMatterState, syncCampusSnapshot } from '../../services/campusRepository'
import '../../styles/campus.scss'
import './index.scss'

const fallbackMatter: CampusMatter = { id: '', spaceId: '', space: '空间', title: '事项', time: '', location: '', status: '待处理', tone: 'blue', icon: 'list-blue', type: '通知', action: '确认收到', body: '' }

export default function MatterDetailPage() {
  const router = useRouter()
  const matterId = String(router.params.id || '')
  const [item, setItem] = useState<CampusMatter>(getCampusMatters().find((matter) => matter.id === matterId) || fallbackMatter)
  const [spaces, setSpaces] = useState<CampusSpace[]>(getCampusSpaces())
  const space = spaces.find((record) => record.id === item.spaceId)
  const isPersonal = item.scope === 'personal'
  const canManage = isPersonal || (space?.status !== 'dissolved' && (space?.role === '空间负责人' || space?.role === '管理员'))
  const resources = getCampusResources().filter((resource) => item.associatedResourceIds?.includes(resource.id))

  useDidShow(() => {
    const cached = getCampusMatters().find((matter) => matter.id === matterId)
    if (cached) setItem(cached)
    setSpaces(getCampusSpaces())
    void syncCampusSnapshot().then((snapshot) => {
      const synced = getCampusMatters().find((matter) => matter.id === matterId)
      if (synced) setItem(synced)
      setSpaces(snapshot.spaces)
    }).catch(() => Taro.showToast({ title: '事项同步失败', icon: 'none' }))
  })

  const completeAction = async () => {
    const next = isPersonal && item.status === '已完成' ? '待处理' : item.action === '标记完成' ? '已完成' : '已确认'
    try {
      await setCampusMatterState(item.id, next)
      setItem({ ...item, status: next })
      Taro.showToast({ title: next, icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' })
    }
  }

  const done = item.status === '已确认' || item.status === '已完成'

  return (
    <View className='workspace-page campus-workspace-page matter-detail-page'>
      <CampusHeader title='事项详情' action={canManage ? '编辑' : undefined} onAction={() => Taro.navigateTo({ url: `/pages/matter-editor/index?id=${item.id}` })} />
      <View className='campus-page-body'>
        <View className={`matter-detail-hero tone-${item.tone}`}>
          <View className='matter-detail-icon'><MiniIcon name={item.icon as 'clock-teal'} /></View>
          <View className='matter-detail-copy'><Text>{item.space}</Text><Text>{item.title}</Text><Text>{item.type}</Text></View>
          <Text className={`matter-detail-status ${done ? 'done' : ''}`}>{item.status}</Text>
        </View>

        <View className='matter-detail-facts'>
          <View><Text>时间</Text><Text>{item.time}</Text></View>
          {item.location && <View><Text>地点</Text><Text>{item.location}</Text></View>}
          <View><Text>{isPersonal ? '来源' : '所属空间'}</Text><Text>{item.space}</Text></View>
        </View>

        <View className='matter-detail-section'>
          <Text className='matter-detail-section-title'>事项说明</Text>
          <Text className='matter-detail-body'>{item.body || '暂无补充说明'}</Text>
        </View>

        {item.diff && item.diff.length > 0 && <View className='matter-detail-section matter-diff'>
          <Text className='matter-detail-section-title'>本次更新</Text>
          {item.diff.map((change) => <View key={change.field}><Text>{change.field}</Text><View><Text>{change.before}</Text><Text>→ {change.after}</Text></View></View>)}
        </View>}

        {resources.length > 0 && <View className='matter-detail-section matter-resources'>
          <Text className='matter-detail-section-title'>关联资料</Text>
          {resources.map((resource) => <View key={resource.id} onClick={() => Taro.navigateTo({ url: `/pages/resource-preview/index?id=${resource.id}` })}><View><Text>{resource.category}</Text><Text>{resource.title}</Text></View><MiniIcon name='chevron-right' /></View>)}
        </View>}

        {!isPersonal && <View className='matter-detail-section change-log'>
          <Text className='matter-detail-section-title'>更新记录</Text>
          <View><Text>最新版本</Text><Text>发布者已确认当前时间与行动要求</Text></View>
          <View><Text>初次发布</Text><Text>来自{item.space}</Text></View>
        </View>}
      </View>

      <View className='matter-detail-footer'>
        <View className={`matter-detail-action ${done ? 'done' : ''}`} hoverClass='campus-pressed' onClick={done && !isPersonal ? undefined : completeAction}>
          <MiniIcon name={done ? 'check-blue' : 'pencil-blue'} /><Text>{isPersonal && done ? '恢复待办' : done ? item.status : item.action}</Text>
        </View>
      </View>
    </View>
  )
}
