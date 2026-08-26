import Taro from '@tarojs/taro'
import type { CSSProperties } from 'react'

type NavigationStyle = CSSProperties & { '--mini-navigation-top': string }

/**
 * Custom navigation bars need a real status-bar inset on Android. CSS safe-area
 * variables are reliable on iOS, but commonly resolve to zero in Android
 * WebViews, so use WeChat's device metrics instead.
 */
export function customNavigationStyle(): NavigationStyle {
  if (process.env.TARO_ENV === 'h5') return { '--mini-navigation-top': '24px' }

  try {
    const windowInfo = Taro.getWindowInfo()
    const capsule = Taro.getMenuButtonBoundingClientRect()
    const statusBarHeight = Number(windowInfo.statusBarHeight || 0)
    const safeAreaTop = Number(windowInfo.safeArea?.top || 0)
    const capsuleFallback = Number(capsule.top || 0) > 8 ? Number(capsule.top) - 8 : 0
    const topInset = Math.max(statusBarHeight, safeAreaTop, capsuleFallback, 24)
    return { '--mini-navigation-top': `${Math.ceil(topInset)}px` }
  } catch {
    return { '--mini-navigation-top': '24px' }
  }
}

/** Keep custom actions immediately to the left of WeChat's native capsule. */
export function capsuleSafeRight(gapRpx = 14) {
  if (process.env.TARO_ENV === 'h5') {
    const physicalGap = Math.ceil(gapRpx * 430 / 750)
    return `${100 + physicalGap}px`
  }

  try {
    const { windowWidth } = Taro.getWindowInfo()
    const capsule = Taro.getMenuButtonBoundingClientRect()
    if (!windowWidth || capsule.left <= 0 || capsule.left >= windowWidth) return `${gapRpx + 24}rpx`
    return `${Math.ceil((windowWidth - capsule.left) / windowWidth * 750) + gapRpx}rpx`
  } catch {
    return `${gapRpx + 24}rpx`
  }
}
