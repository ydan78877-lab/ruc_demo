import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { CampusMatter } from '../data/campus'
import { MiniIcon, type MiniIconName } from './MiniIcon'

export function CampusMatterCard({ item, status }: { item: CampusMatter; status?: string }) {
  const state = status ?? item.status
  return <View className={`campus-matter-card ${item.tone}`} hoverClass='campus-card-pressed' hoverStartTime={10} hoverStayTime={80} onClick={() => Taro.navigateTo({ url: `/pages/matter-detail/index?id=${item.id}` })}>
    <View className={`campus-matter-icon ${item.tone}`}><MiniIcon name={item.icon as MiniIconName} /></View>
    <View className='campus-matter-copy'>
      <View className='campus-matter-meta'><Text>{item.space}</Text><Text className={state.includes('逾期') || state.includes('待') ? 'pending' : 'done'}>{state}</Text></View>
      <Text className='campus-matter-title'>{item.title}</Text>
      <Text className='campus-matter-time'>{item.time}{item.location ? ` · ${item.location}` : ''}</Text>
    </View>
    <MiniIcon name='chevron-right' />
  </View>
}
