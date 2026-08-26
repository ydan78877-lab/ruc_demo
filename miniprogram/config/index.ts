import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import devConfig from './dev'
import prodConfig from './prod'

export default defineConfig<'webpack5'>(async (merge, { mode }) => {
  const isH5 = process.env.TARO_ENV === 'h5'
  const outputRoot = isH5 ? 'dist-h5' : 'dist'
  const adminApiUrl = process.env.TARO_APP_ADMIN_API_URL || ''
  const cloudEnvId = process.env.TARO_APP_CLOUD_ENV_ID || ''

  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: '人大中法学生助手',
    date: '2026-08-21',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot,
    framework: 'react',
    compiler: 'webpack5',
    cache: { enable: false },
    defineConstants: {
      'process.env.TARO_APP_ADMIN_API_URL': JSON.stringify(adminApiUrl),
      'process.env.TARO_APP_CLOUD_ENV_ID': JSON.stringify(cloudEnvId)
    },
    copy: {
      patterns: [
        { from: 'src/assets', to: `${outputRoot}/assets` }
      ],
      options: {}
    },
    mini: {
      postcss: {
        pxtransform: { enable: true, config: {} },
        url: { enable: true, config: { limit: 1024 } },
        cssModules: { enable: false, config: { namingPattern: 'module', generateScopedName: '[name]__[local]___[hash:base64:5]' } }
      }
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      router: { mode: 'hash' },
      devServer: {
        host: '127.0.0.1',
        port: 10086,
        open: false,
        hot: true
      }
    }
  }

  return merge({}, baseConfig, mode === 'development' ? devConfig : prodConfig)
})
