import Taro from '@tarojs/taro'

export const CLOUD_ENV_ID = String(process.env.TARO_APP_CLOUD_ENV_ID || '')

let initialized = false

export function initializeCloud() {
  if (process.env.TARO_ENV !== 'weapp' || initialized) return
  if (!CLOUD_ENV_ID) throw new Error('TARO_APP_CLOUD_ENV_ID is not configured')

  Taro.cloud.init({ env: CLOUD_ENV_ID })
  initialized = true
}
