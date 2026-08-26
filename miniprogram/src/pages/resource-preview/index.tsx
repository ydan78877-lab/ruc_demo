import { Picker, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { CampusHeader } from '../../components/CampusHeader'
import { MiniIcon } from '../../components/MiniIcon'
import type { CampusResource } from '../../data/campus'
import {
  getCampusResourceDownload,
  getCampusResources,
  getCampusResourceVersions,
  getCampusSpaces,
  syncCampusSnapshot
} from '../../services/campusRepository'
import '../../styles/campus.scss'
import './index.scss'

const OFFLINE_KEY = 'campus_offline_resource_files_v1'

type OfflineFiles = Record<string, { path: string; fileName: string }>

function offlineFiles(): OfflineFiles {
  return Taro.getStorageSync<OfflineFiles>(OFFLINE_KEY) || {}
}

async function openResourceFile(path: string, previewKind: 'document' | 'image') {
  if (previewKind === 'image') {
    await Taro.previewImage({ urls: [path], current: path })
    return
  }
  await Taro.openDocument({ filePath: path, showMenu: true })
}

export default function ResourcePreviewPage() {
  const router = useRouter()
  const resourceId = String(router.params.id || '')
  const [resources, setResources] = useState(getCampusResources())
  const [versionIndex, setVersionIndex] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [offline, setOffline] = useState<OfflineFiles>(offlineFiles())
  const resource: CampusResource | undefined = resources.find((item) => item.id === resourceId)
  const versions = resource ? getCampusResourceVersions(resource.id) : []
  const version = versions[versionIndex] || versions[0]
  const space = resource ? getCampusSpaces().find((item) => item.id === resource.spaceId) : undefined
  const offlineRecord = version ? offline[version.id] : undefined

  useDidShow(() => {
    setResources(getCampusResources())
    setOffline(offlineFiles())
    void syncCampusSnapshot().then((snapshot) => setResources(snapshot.resources)).catch(() => Taro.showToast({ title: '资料同步失败', icon: 'none' }))
  })

  const download = async (saveOffline: boolean) => {
    if (!resource || !version || downloading) return
    if (process.env.TARO_ENV !== 'weapp') return Taro.showToast({ title: '请在微信小程序中下载文件', icon: 'none' })
    setDownloading(true)
    Taro.showLoading({ title: saveOffline ? '正在保存' : '正在下载', mask: true })
    try {
      if (!saveOffline && offlineRecord?.path) {
        await openResourceFile(offlineRecord.path, resource.previewKind)
        return
      }
      const access = await getCampusResourceDownload(resource.id, version.id)
      const result = await Taro.downloadFile({ url: access.tempFileURL })
      if (result.statusCode !== 200) throw new Error('文件下载失败')
      if (saveOffline) {
        const saved = await Taro.saveFile({ tempFilePath: result.tempFilePath })
        if (!('savedFilePath' in saved)) throw new Error('文件未能保存到本地')
        const next = { ...offlineFiles(), [version.id]: { path: saved.savedFilePath, fileName: access.fileName } }
        Taro.setStorageSync(OFFLINE_KEY, next)
        setOffline(next)
        Taro.showToast({ title: '已保存到小程序', icon: 'success' })
      } else {
        await openResourceFile(result.tempFilePath, access.previewKind)
      }
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '文件下载失败', icon: 'none' })
    } finally {
      Taro.hideLoading()
      setDownloading(false)
    }
  }

  const toggleOffline = async () => {
    if (!version || downloading) return
    if (!offlineRecord) return download(true)
    try {
      await Taro.removeSavedFile({ filePath: offlineRecord.path })
    } catch {
      // WeChat may already have cleared the saved file; remove the stale local record anyway.
    }
    const next = { ...offlineFiles() }
    delete next[version.id]
    Taro.setStorageSync(OFFLINE_KEY, next)
    setOffline(next)
    Taro.showToast({ title: '已移除离线资料', icon: 'none' })
  }

  if (!resource) return <View className='workspace-page campus-workspace-page resource-preview-page'>
    <CampusHeader title='资料预览' />
    <View className='campus-page-body'><View className='campus-empty'>资料不存在或尚未同步</View></View>
  </View>

  return <View className='workspace-page campus-workspace-page resource-preview-page'>
    <CampusHeader title='资料预览' action={downloading ? '处理中' : offlineRecord ? '取消离线' : '保存离线'} onAction={toggleOffline} />
    <View className='campus-page-body'>
      <View className='resource-preview-meta'>
        <View className='resource-preview-icon'><MiniIcon name='file-cyan' /></View>
        <View><Text>{resource.category} · {space?.name}</Text><Text>{resource.title}</Text><Text>{version ? `v${version.version} · ${version.fileName}` : resource.meta}</Text></View>
      </View>

      {versions.length > 0 && <Picker range={versions.map((item) => item.label)} value={versionIndex} onChange={(event) => setVersionIndex(Number(event.detail.value))}>
        <View className='resource-version-row'><View><Text>资料版本</Text><Text>{version?.label}</Text></View><Text>切换⌄</Text></View>
      </Picker>}

      <View className='resource-file-card'>
        <View className='resource-file-mark'><MiniIcon name='file-cyan' /></View>
        <Text>{version?.fileName || resource.fileName}</Text>
        <Text>{resource.extension.toUpperCase()} · {resource.meta}</Text>
        <Text>文件保存在课程空间的云端，空间成员均可下载查看。</Text>
        <View className='resource-download-button' hoverClass='campus-pressed' onClick={() => download(false)}>{downloading ? '正在处理…' : '下载并打开'}</View>
      </View>
    </View>
  </View>
}
