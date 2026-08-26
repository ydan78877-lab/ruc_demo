import { Input, Switch, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { CampusHeader } from '../../components/CampusHeader'
import { MiniIcon } from '../../components/MiniIcon'
import type { CampusSpace, CampusSpaceType } from '../../data/campus'
import { createCampusSpace, getCampusSpaces, joinCampusSpace, syncCampusSnapshot } from '../../services/campusRepository'
import '../../styles/campus.scss'
import './index.scss'

export default function SpacesPage() {
  const [tab, setTab] = useState<CampusSpaceType>('课程')
  const [code, setCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [approvalRequired, setApprovalRequired] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [spaces, setSpaces] = useState<CampusSpace[]>(getCampusSpaces())
  const [saving, setSaving] = useState(false)

  useDidShow(() => {
    setSpaces(getCampusSpaces())
    void syncCampusSnapshot().then((snapshot) => setSpaces(snapshot.spaces)).catch(() => Taro.showToast({ title: '空间同步失败', icon: 'none' }))
  })

  const visible = spaces.filter((space) => space.type === tab && (showArchived ? space.status === 'dissolved' : space.status !== 'dissolved'))

  const join = async () => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return Taro.showToast({ title: '请输入加入码', icon: 'none' })
    if (saving) return
    setSaving(true)
    try {
      const result = await joinCampusSpace(normalized)
      setSpaces(result.snapshot.spaces)
      setCode('')
      if (result.state === 'pending') return Taro.showToast({ title: '加入申请已提交', icon: 'success' })
      Taro.showToast({ title: result.state === 'already' ? '你已经在该空间' : '已加入空间', icon: 'success' })
      await Taro.navigateTo({ url: `/pages/space-detail/index?id=${result.space.id}` })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '加入失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const createSpace = async () => {
    if (!name.trim()) return Taro.showToast({ title: `请输入${tab}名称`, icon: 'none' })
    if (saving) return
    setSaving(true)
    try {
      const result = await createCampusSpace({ name: name.trim(), type: tab, approvalRequired })
      setSpaces(result.snapshot.spaces)
      setName('')
      setCreating(false)
      Taro.showToast({ title: `${tab}已创建`, icon: 'success' })
      await Taro.navigateTo({ url: `/pages/space-detail/index?id=${result.space.id}` })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '创建失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className='workspace-page campus-workspace-page spaces-page'>
      <CampusHeader title='班级与课程' action={showArchived ? '返回' : '归档'} onAction={() => setShowArchived(!showArchived)} />
      <View className='campus-page-body'>
        <View className='campus-segmented two'>
          <View className={tab === '课程' ? 'active' : ''} onClick={() => { setTab('课程'); setCreating(false) }}>课程</View>
          <View className={tab === '班级' ? 'active' : ''} onClick={() => { setTab('班级'); setCreating(false) }}>班级</View>
        </View>

        {!showArchived && <View className='space-quick-card'>
          <View className='space-join-row'>
            <Input value={code} placeholder='输入加入码' onInput={(event) => setCode(event.detail.value)} />
            <View hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80} onClick={join}>加入</View>
          </View>
          <View className='space-create-trigger' hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80} onClick={() => setCreating(!creating)}><Text>＋</Text> 创建{tab}</View>
          {creating && <View className='space-create-panel'>
            <Input value={name} placeholder={`输入${tab}名称`} onInput={(event) => setName(event.detail.value)} />
            <View className='space-create-switch'><Text>加入需要审核</Text><Switch checked={approvalRequired} color='#20b486' onChange={(event) => setApprovalRequired(event.detail.value)} /></View>
            <View className='space-create-actions'><View onClick={() => setCreating(false)}>取消</View><View onClick={createSpace}>创建</View></View>
          </View>}
        </View>}

        <View className='space-list-heading'><Text>{showArchived ? `已解散${tab}` : `我的${tab}`}</Text><Text>{visible.length}个</Text></View>
        <View className='space-list'>
          {visible.map((space) => <View className='space-list-card' key={space.id} hoverClass='campus-card-pressed' hoverStartTime={10} hoverStayTime={80} onClick={() => Taro.navigateTo({ url: `/pages/space-detail/index?id=${space.id}` })}>
            <View className={`space-list-icon ${space.tone}`}><MiniIcon name={space.type === '课程' ? 'reader-blue' : 'person'} /></View>
            <View className='space-list-copy'><Text>{space.name}</Text><Text>{space.role} · {space.members}名成员</Text></View>
            <MiniIcon name='chevron-right' />
          </View>)}
          {!visible.length && <View className='campus-empty'>{showArchived ? '暂无已解散空间' : `还没有加入${tab}`}</View>}
        </View>
      </View>
    </View>
  )
}
