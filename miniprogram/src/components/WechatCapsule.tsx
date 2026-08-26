import { View } from '@tarojs/components'

/** H5 preview only: mirror WeChat's system capsule without changing the native build. */
export function WechatCapsule() {
  return (
    <View className='wechat-preview-capsule' aria-label='微信小程序胶囊'>
      <View className='wechat-preview-more'>
        <View />
        <View />
        <View />
      </View>
      <View className='wechat-preview-divider' />
      <View className='wechat-preview-close'>
        <View />
      </View>
    </View>
  )
}
