import { Input, Picker, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { CampusHeader } from '../../components/CampusHeader'
import { CampusMatterCard } from '../../components/CampusMatterCard'
import { MiniIcon } from '../../components/MiniIcon'
import type { CampusMatter, CampusSpace } from '../../data/campus'
import { getCampusMatters, getCampusSpaces, syncCampusSnapshot } from '../../services/campusRepository'
import '../../styles/campus.scss'
import './index.scss'

type TimeTab = 'today' | 'week' | 'all'
const typeOptions = ['全部类型', '个人提醒', '到场事项', '截止事项', '确认事项', '资料事项', '通知']
const statusOptions = ['全部状态', '待处理', '已逾期', '已确认', '已完成']

export default function MattersPage() {
  const [tab, setTab] = useState<TimeTab>('today')
  const [keyword, setKeyword] = useState('')
  const [spaceIndex, setSpaceIndex] = useState(0)
  const [typeIndex, setTypeIndex] = useState(0)
  const [statusIndex, setStatusIndex] = useState(0)
  const [matters, setMatters] = useState<CampusMatter[]>(getCampusMatters())
  const [spaces, setSpaces] = useState<CampusSpace[]>(getCampusSpaces())
  const spaceOptions = useMemo(() => ['全部空间', '个人事项', ...spaces.filter((space) => space.status !== 'dissolved').map((space) => space.name)], [spaces])
  const addPersonalMatter = () => Taro.navigateTo({ url: '/pages/matter-editor/index?personal=1' })

  useDidShow(() => {
    setMatters(getCampusMatters())
    setSpaces(getCampusSpaces())
    void syncCampusSnapshot().then((snapshot) => {
      setMatters(getCampusMatters())
      setSpaces(snapshot.spaces)
    }).catch(() => Taro.showToast({ title: '事项同步失败', icon: 'none' }))
  })

  const visible = useMemo(() => matters.filter((item, index) => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const matterTime = item.date ? new Date(`${item.date}T00:00:00`).getTime() : Number.NaN
    if (tab === 'today' && (Number.isFinite(matterTime) ? matterTime !== start : index > 3)) return false
    if (tab === 'week' && (Number.isFinite(matterTime) ? matterTime < start || matterTime >= start + 7 * 86400000 : index > 6)) return false
    if (spaceIndex > 0 && item.space !== spaceOptions[spaceIndex]) return false
    if (typeIndex > 0 && item.type !== typeOptions[typeIndex]) return false
    if (statusIndex > 0 && item.status !== statusOptions[statusIndex]) return false
    return !keyword.trim() || `${item.title}${item.space}`.includes(keyword.trim())
  }), [keyword, matters, spaceIndex, spaceOptions, statusIndex, tab, typeIndex])

  return (
    <View className='workspace-page campus-workspace-page matters-page'>
      <CampusHeader title='事项' />
      <View className='campus-page-body'>
        <View className='campus-search'>
          <MiniIcon name='list-blue' />
          <Input value={keyword} placeholder='搜索事项、提醒或空间' onInput={(event) => setKeyword(event.detail.value)} />
        </View>

        <View className='campus-segmented matters-tabs'>
          <View className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>今天</View>
          <View className={tab === 'week' ? 'active' : ''} onClick={() => setTab('week')}>7日</View>
          <View className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>全部</View>
        </View>

        <View className='campus-filter-row'>
          <Picker mode='selector' range={spaceOptions} value={spaceIndex} onChange={(event) => setSpaceIndex(Number(event.detail.value))}>
            <View className='campus-filter-chip'>{spaceOptions[spaceIndex]} <Text>⌄</Text></View>
          </Picker>
          <Picker mode='selector' range={typeOptions} value={typeIndex} onChange={(event) => setTypeIndex(Number(event.detail.value))}>
            <View className='campus-filter-chip'>{typeOptions[typeIndex]} <Text>⌄</Text></View>
          </Picker>
          <Picker mode='selector' range={statusOptions} value={statusIndex} onChange={(event) => setStatusIndex(Number(event.detail.value))}>
            <View className='campus-filter-chip'>{statusOptions[statusIndex]} <Text>⌄</Text></View>
          </Picker>
        </View>

        <View className='campus-result-heading'><Text>{tab === 'today' ? '今天' : tab === 'week' ? '未来7日' : '全部事项'}</Text><Text>{visible.length}项</Text></View>
        <View className='campus-matter-list'>
          {visible.map((item) => <CampusMatterCard key={item.id} item={item} />)}
          {!visible.length && <View className='campus-empty matters-empty-action' hoverClass='campus-pressed' onClick={addPersonalMatter}>
            <Text>暂无符合条件的事项</Text>
            <Text>点击添加个人事项</Text>
          </View>}
        </View>
      </View>
      <View className='campus-floating-action' hoverClass='campus-pressed' onClick={addPersonalMatter}><Text>＋</Text></View>
    </View>
  )
}
