import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { MiniIcon } from './MiniIcon'
import { capsuleSafeRight, customNavigationStyle } from '../utils/navigationLayout'

export function CampusHeader({ title, action, onBack, onAction }: { title: string; action?: string; onBack?: () => void; onAction?: () => void }) {
  return <View className='campus-header' style={customNavigationStyle()}>
    <View className='campus-header-back' hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80} onClick={onBack ?? (() => Taro.navigateBack())}><MiniIcon name='chevron-left' /></View>
    <Text>{title}</Text>
    <Text className='campus-header-action' style={{ right: capsuleSafeRight(10) }} onClick={onAction}>{action ?? ''}</Text>
  </View>
}
