import { Switch, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { CampusHeader } from '../../components/CampusHeader'
import { CampusMatterCard } from '../../components/CampusMatterCard'
import { MiniIcon } from '../../components/MiniIcon'
import type { CampusJoinRequest, CampusMatter, CampusMember, CampusResource, CampusSpace } from '../../data/campus'
import {
  completeCampusResourceUpload,
  deleteCampusResource,
  dissolveCampusSpace,
  getCampusJoinRequests,
  getCampusMatters,
  getCampusMembers,
  getCampusResources,
  getCampusSpaces,
  prepareCampusResourceUpload,
  removeCampusMember,
  resetCampusJoinCode,
  reviewCampusJoinRequest,
  setCampusMemberRole,
  syncCampusSnapshot,
  transferCampusOwnership,
  updateCampusJoinPolicy
} from '../../services/campusRepository'
import '../../styles/campus.scss'
import './index.scss'

type SpaceTab = 'matters' | 'resources' | 'members'
const fallbackSpace: CampusSpace = { id: '', name: '空间', type: '课程', role: '成员', members: 0, code: '', approvalRequired: true, tone: 'blue' }

export default function SpaceDetailPage() {
  const router = useRouter()
  const spaceId = String(router.params.id || '')
  const [spaces, setSpaces] = useState<CampusSpace[]>(getCampusSpaces())
  const space = spaces.find((item) => item.id === spaceId) || fallbackSpace
  const [tab, setTab] = useState<SpaceTab>('matters')
  const [matters, setMatters] = useState<CampusMatter[]>(getCampusMatters())
  const [resources, setResources] = useState<CampusResource[]>(getCampusResources())
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'failed'>('idle')
  const [uploadingName, setUploadingName] = useState('')
  const [deletingResourceId, setDeletingResourceId] = useState('')
  const [members, setMembers] = useState<CampusMember[]>(getCampusMembers(spaceId))
  const [joinRequests, setJoinRequests] = useState<CampusJoinRequest[]>(getCampusJoinRequests(spaceId))
  const [saving, setSaving] = useState(false)
  const dissolved = space.status === 'dissolved'
  const isOwner = space.role === '空间负责人'
  const isAdmin = space.role === '管理员'
  const canManage = !dissolved && (isOwner || isAdmin)
  const tabs = space.type === '班级' ? ['matters', 'members'] as SpaceTab[] : ['matters', 'resources', 'members'] as SpaceTab[]
  const labels: Record<SpaceTab, string> = { matters: '事项', resources: '资料', members: '成员' }
  const spaceMatters = matters.filter((item) => item.spaceId === space.id)
  const spaceResources = resources.filter((item) => item.spaceId === space.id)
  const adminCount = members.filter((member) => member.role === '管理员').length
  const publishMatter = () => Taro.navigateTo({ url: `/pages/matter-editor/index?spaceId=${space.id}` })

  useDidShow(() => {
    setSpaces(getCampusSpaces())
    setMatters(getCampusMatters())
    setResources(getCampusResources())
    setMembers(getCampusMembers(spaceId))
    setJoinRequests(getCampusJoinRequests(spaceId))
    void syncCampusSnapshot().then((snapshot) => {
      setSpaces(snapshot.spaces)
      setMatters(getCampusMatters())
      setResources(snapshot.resources)
      setMembers(snapshot.membersBySpace[spaceId] || [])
      setJoinRequests(snapshot.joinRequestsBySpace[spaceId] || [])
    }).catch(() => Taro.showToast({ title: '空间同步失败', icon: 'none' }))
  })

  const applySnapshot = (snapshot: Awaited<ReturnType<typeof syncCampusSnapshot>>) => {
    setSpaces(snapshot.spaces)
    setMatters(getCampusMatters())
    setResources(snapshot.resources)
    setMembers(snapshot.membersBySpace[spaceId] || [])
    setJoinRequests(snapshot.joinRequestsBySpace[spaceId] || [])
  }

  const updateApproval = async (value: boolean) => {
    if (saving) return
    setSaving(true)
    try {
      const result = await updateCampusJoinPolicy(space.id, value)
      applySnapshot(result.snapshot)
      Taro.showToast({ title: value ? '新成员加入需审核' : '新成员可直接加入', icon: 'none' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '修改失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const copyCode = () => {
    if (space.code) Taro.setClipboardData({ data: space.code })
  }

  const toggleAdmin = async (memberId: string) => {
    const member = members.find((item) => item.id === memberId)
    if (!member || !isOwner || member.role === '空间负责人') return
    if (member.role !== '管理员' && adminCount >= 3) return Taro.showToast({ title: '最多设置3名管理员', icon: 'none' })
    try {
      const result = await setCampusMemberRole(space.id, memberId, member.role === '管理员' ? '成员' : '管理员')
      applySnapshot(result.snapshot)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '修改失败', icon: 'none' })
    }
  }

  const dissolve = () => {
    Taro.showModal({
      title: '解散空间',
      content: '空间解散后将进入只读历史记录，成员不能再发布或加入。',
      confirmText: '确认解散',
      confirmColor: '#d44b4b',
      success: (result) => {
        if (!result.confirm) return
        void dissolveCampusSpace(space.id).then((response) => {
          applySnapshot(response.snapshot)
          Taro.showToast({ title: '空间已解散', icon: 'none' })
        }).catch((error) => Taro.showToast({ title: error instanceof Error ? error.message : '解散失败', icon: 'none' }))
      }
    })
  }

  const resetCode = () => {
    Taro.showModal({
      title: '重置加入码',
      content: '旧加入码会立即失效，是否继续？',
      confirmText: '确认重置',
      success: (result) => {
        if (!result.confirm) return
        void resetCampusJoinCode(space.id).then((response) => {
          applySnapshot(response.snapshot)
          Taro.showToast({ title: '加入码已更新', icon: 'success' })
        }).catch((error) => Taro.showToast({ title: error instanceof Error ? error.message : '重置失败', icon: 'none' }))
      }
    })
  }

  const reviewRequest = async (requestId: string, decision: 'approved' | 'rejected') => {
    try {
      const result = await reviewCampusJoinRequest(space.id, requestId, decision)
      applySnapshot(result.snapshot)
      Taro.showToast({ title: decision === 'approved' ? '已同意加入' : '已拒绝申请', icon: 'none' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '审核失败', icon: 'none' })
    }
  }

  const removeMember = (member: CampusMember) => {
    Taro.showModal({
      title: '移出空间',
      content: `确认将“${member.name}”移出当前空间？`,
      confirmText: '移出',
      confirmColor: '#d44b4b',
      success: (result) => {
        if (!result.confirm) return
        void removeCampusMember(space.id, member.id).then((response) => applySnapshot(response.snapshot))
          .catch((error) => Taro.showToast({ title: error instanceof Error ? error.message : '移出失败', icon: 'none' }))
      }
    })
  }

  const transferOwner = () => {
    const candidates = members.filter((member) => member.role !== '空间负责人')
    if (!candidates.length) return Taro.showToast({ title: '暂无可转让成员', icon: 'none' })
    Taro.showActionSheet({
      itemList: candidates.map((member) => `${member.name} · ${member.role}`),
      success: ({ tapIndex }) => {
        const member = candidates[tapIndex]
        if (!member) return
        Taro.showModal({
          title: '转让空间',
          content: `转让给“${member.name}”后，你会变为普通成员。`,
          confirmText: '确认转让',
          success: (result) => {
            if (!result.confirm) return
            void transferCampusOwnership(space.id, member.id).then((response) => {
              applySnapshot(response.snapshot)
              Taro.showToast({ title: '空间已转让', icon: 'success' })
            }).catch((error) => Taro.showToast({ title: error instanceof Error ? error.message : '转让失败', icon: 'none' }))
          }
        })
      }
    })
  }

  const removeResource = (resource: CampusResource) => {
    if (!isOwner || dissolved || deletingResourceId) return
    Taro.showModal({
      title: '删除资料',
      content: `确认删除“${resource.title}”及其全部历史版本？删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#d44b4b',
      success: (result) => {
        if (!result.confirm) return
        setDeletingResourceId(resource.id)
        void deleteCampusResource(resource.id).then((response) => {
          applySnapshot(response.snapshot)
          Taro.showToast({ title: '资料已删除', icon: 'success' })
        }).catch((error) => {
          Taro.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
        }).finally(() => setDeletingResourceId(''))
      }
    })
  }

  const startUpload = async () => {
    if (process.env.TARO_ENV !== 'weapp') return Taro.showToast({ title: '请在微信小程序中上传文件', icon: 'none' })
    try {
      const selected = await Taro.chooseMessageFile({ count: 1, type: 'file' })
      const file = selected.tempFiles[0]
      if (!file) return
      if (file.size > 20 * 1024 * 1024) return Taro.showToast({ title: '文件不能超过20MB', icon: 'none' })
      const categories = ['课件', '阅读材料', '作业资料', '其他']
      const categoryChoice = await Taro.showActionSheet({ itemList: categories })
      const category = categories[categoryChoice.tapIndex]
      if (!category) return
      const title = file.name.replace(/\.[^.]+$/, '')
      const duplicate = spaceResources.find((item) => item.title.trim().toLowerCase() === title.trim().toLowerCase())
      let mode: 'new' | 'replace' = 'new'
      if (duplicate) {
        const duplicateChoice = await Taro.showActionSheet({ itemList: ['替换为新版本', '另存为新资料'] })
        mode = duplicateChoice.tapIndex === 0 ? 'replace' : 'new'
      }
      setUploadingName(file.name)
      setUploadState('uploading')
      const ticket = await prepareCampusResourceUpload({
        spaceId: space.id,
        resourceId: mode === 'replace' ? duplicate?.id : undefined,
        mode,
        title,
        category,
        fileName: file.name,
        size: file.size
      })
      const uploaded = await Taro.cloud.uploadFile({ cloudPath: ticket.cloudPath, filePath: file.path })
      const completed = await completeCampusResourceUpload(ticket.ticketId, uploaded.fileID)
      applySnapshot(completed.snapshot)
      setUploadState('idle')
      setUploadingName('')
      Taro.showToast({ title: mode === 'replace' ? '新版本已上传' : '资料已上传', icon: 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String((error as { errMsg?: string })?.errMsg || '')
      if (/cancel/i.test(message)) return
      setUploadState('failed')
      Taro.showToast({ title: message || '上传失败，请重试', icon: 'none' })
    }
  }

  return (
    <View className='workspace-page campus-workspace-page space-detail-page'>
      <CampusHeader title={space.name} action={space.role} />
      <View className='campus-page-body'>
        <View className='space-detail-hero'>
          <View className={`space-detail-icon ${space.tone}`}><MiniIcon name={space.type === '课程' ? 'reader-blue' : 'person'} /></View>
          <View><Text>{space.type}空间</Text><Text>{space.name}</Text><Text>{space.members}名成员</Text></View>
        </View>

        {dissolved && <View className='space-role-note'>该空间已解散，事项、成员和资料仅保留为历史记录。</View>}

        <View className='space-invite-card'>
          <View className='space-invite-primary'>
            <View className='space-invite-code'><Text>加入码</Text><Text>{space.code || '已失效'}</Text></View>
            {!dissolved && <View className='space-copy-button' hoverClass='campus-pressed' onClick={copyCode}><MiniIcon name='file-cyan' />复制</View>}
          </View>
          {isOwner && !dissolved && <View className='space-invite-controls'>
            <View className='space-approval-toggle'><Text>需要审核</Text><Switch checked={space.approvalRequired} color='#20b486' onChange={(event) => updateApproval(event.detail.value)} /></View>
            <View className='space-reset-code' hoverClass='campus-pressed' onClick={resetCode}>重置加入码</View>
          </View>}
        </View>

        <View className={`campus-segmented space-detail-tabs ${tabs.length === 2 ? 'two' : ''}`}>
          {tabs.map((item) => <View key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{labels[item]}</View>)}
        </View>

        {tab === 'matters' && <View>
          <View className='campus-result-heading'><Text>空间事项</Text><Text>{spaceMatters.length}项</Text></View>
          <View className='campus-matter-list'>{spaceMatters.length ? spaceMatters.map((item) => <CampusMatterCard item={item} key={item.id} />) : <View className='campus-empty'>暂无事项</View>}</View>
        </View>}

        {tab === 'resources' && <View>
          <View className='campus-result-heading'><Text>课程资料</Text>{canManage && <Text className='campus-small-primary' onClick={startUpload}>＋ 上传资料</Text>}</View>
          {uploadState !== 'idle' && <View className='space-upload-card'>
            {uploadState === 'uploading' && <><Text>正在上传</Text><Text>{uploadingName}</Text><View className='space-upload-progress'><View /></View></>}
            {uploadState === 'failed' && <><Text>上传失败</Text><Text onClick={startUpload}>重新选择文件</Text></>}
          </View>}
          <View className='space-resource-list'>{spaceResources.length ? spaceResources.map((resource) => <View className='space-resource-row' key={resource.id} hoverClass='campus-card-pressed' onClick={() => Taro.navigateTo({ url: `/pages/resource-preview/index?id=${resource.id}` })}>
            <View className='space-resource-icon'><MiniIcon name='file-cyan' /></View>
            <View><Text>{resource.category}</Text><Text>{resource.title}</Text><Text>{resource.meta}</Text></View>
            {isOwner && !dissolved && <View className='space-resource-delete' hoverClass='campus-pressed' onClick={(event) => {
              event.stopPropagation()
              removeResource(resource)
            }}>{deletingResourceId === resource.id ? '删除中' : '删除'}</View>}
          </View>) : <View className='campus-empty'>暂无资料</View>}</View>
        </View>}

        {tab === 'members' && <View>
          <View className='campus-result-heading'><Text>空间成员</Text><Text>{members.length}人</Text></View>
          {isOwner && <View className='space-role-note'>管理员 {adminCount}/3 · 管理员可维护内容和普通成员，只有空间负责人可设置管理员、转让或解散空间。</View>}
          {canManage && joinRequests.length > 0 && <View className='space-join-requests'>
            <View className='campus-result-heading'><Text>待审核申请</Text><Text>{joinRequests.length}人</Text></View>
            {joinRequests.map((request) => <View className='space-member-row' key={request.id}>
              <View className='space-member-avatar'><MiniIcon name='person' /></View>
              <View className='space-member-copy'><Text>{request.applicantName}</Text><Text>申请加入</Text></View>
              <View className='space-request-actions'><Text onClick={() => reviewRequest(request.id, 'rejected')}>拒绝</Text><Text onClick={() => reviewRequest(request.id, 'approved')}>同意</Text></View>
            </View>)}
          </View>}
          <View className='space-member-list'>{members.map((member) => <View className='space-member-row' key={member.id}>
            <View className='space-member-avatar'><MiniIcon name='person' /></View>
            <View className='space-member-copy'><Text>{member.name}</Text><Text>{member.role}</Text></View>
            {isOwner && !dissolved && member.role !== '空间负责人' && <View className='space-member-controls'>
              <View className={member.role === '管理员' ? 'space-member-action active' : 'space-member-action'} onClick={() => toggleAdmin(member.id)}>{member.role === '管理员' ? '取消管理员' : '设为管理员'}</View>
              {member.role === '成员' && <View className='space-member-remove' onClick={() => removeMember(member)}>移出</View>}
            </View>}
            {isAdmin && !dissolved && member.role === '成员' && <View className='space-member-action' onClick={() => removeMember(member)}>移出</View>}
          </View>)}</View>
          {isOwner && !dissolved && <View className='space-owner-actions'><View onClick={transferOwner}>转让空间</View><View onClick={dissolve}>解散空间</View></View>}
        </View>}
      </View>
      {tab === 'matters' && canManage && <View className='campus-floating-action' hoverClass='campus-pressed' onClick={publishMatter}><Text>＋</Text></View>}
    </View>
  )
}
