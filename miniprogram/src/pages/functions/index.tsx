import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { MiniIcon, type MiniIconName } from '../../components/MiniIcon'
import { getGoal, getGoalWorkspace } from '../../services/goalRepository'
import { getProfile } from '../../services/studentRepository'
import { customNavigationStyle } from '../../utils/navigationLayout'
import './index.scss'

type FunctionItem = { id: string; label: string; note: string; icon: MiniIconName; tone: string; url: string }

const functions: FunctionItem[] = [
  { id: 'agenda', label: '事项', note: '今天与接下来', icon: 'list-blue', tone: 'blue', url: '/pages/matters/index' },
  { id: 'spaces', label: '班级与课程', note: '多人空间与事项', icon: 'reader-teal', tone: 'teal', url: '/pages/spaces/index' },
  { id: 'cases', label: '案例库', note: '申请方向参考', icon: 'backpack-cyan', tone: 'cyan', url: '/pages/cases/index' },
  { id: 'goals', label: '我的目标', note: '添加与管理目标', icon: 'layers-blue', tone: 'blue', url: '/pages/templates/index' },
  { id: 'resume', label: '我的简历', note: '仅与个人绑定', icon: 'card-stack-teal', tone: 'teal', url: '/pages/resume/index' },
  { id: 'archive', label: '完整档案', note: '成绩与经历', icon: 'file-cyan', tone: 'cyan', url: '/pages/archive/index' },
  { id: 'entry', label: '录入资料', note: '更新当前进度', icon: 'pencil-blue', tone: 'blue', url: '/pages/entry/index' },
  { id: 'account', label: '我的账号', note: '账号与保存', icon: 'person', tone: 'cyan', url: '/pages/profile/index' }
]

const functionGroups: { id: string; title: string; functionIds: string[] }[] = [
  { id: 'goals', title: '目标', functionIds: ['goals'] },
  { id: 'experiences', title: '我的经历', functionIds: ['entry', 'archive', 'resume'] },
  { id: 'matters', title: '我的事项', functionIds: ['agenda', 'spaces'] },
  { id: 'admissions', title: '乐湖升学', functionIds: ['cases'] },
  { id: 'other', title: '其他', functionIds: ['account'] }
]

const FAVORITE_FUNCTIONS_KEY = 'ruc-favorite-functions-v1'
const DEFAULT_FAVORITE_IDS = ['agenda', 'goals', 'resume', 'entry']

function readFavoriteIds() {
  const stored = Taro.getStorageSync(FAVORITE_FUNCTIONS_KEY)
  if (!Array.isArray(stored)) return DEFAULT_FAVORITE_IDS
  const validIds = stored.filter((id): id is string => typeof id === 'string' && functions.some((item) => item.id === id))
  return validIds.length === stored.length ? validIds : DEFAULT_FAVORITE_IDS
}

export default function FunctionsPage() {
  const [profile, setProfile] = useState(getProfile())
  const [goalTitle, setGoalTitle] = useState(getGoal()?.title || '我的目标')
  const [favoriteIds, setFavoriteIds] = useState<string[]>(DEFAULT_FAVORITE_IDS)
  const [editingFavorites, setEditingFavorites] = useState(false)
  useDidShow(() => {
    setProfile(getProfile())
    const workspace = getGoalWorkspace()
    setGoalTitle(getGoal(workspace.activeGoalId)?.title || '我的目标')
    setFavoriteIds(readFavoriteIds())
  })
  const go = (url: string) => Taro.navigateTo({ url })
  const backToOverview = () => {
    if (Taro.getCurrentPages().length > 1) {
      void Taro.navigateBack()
      return
    }
    void Taro.reLaunch({ url: '/pages/overview/index' })
  }
  const toggleFavorite = (id: string) => {
    setFavoriteIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      Taro.setStorageSync(FAVORITE_FUNCTIONS_KEY, next)
      return next
    })
  }
  const favoriteFunctions = favoriteIds.map((id) => functions.find((item) => item.id === id)).filter((item): item is FunctionItem => Boolean(item))
  const activateFunction = (item: FunctionItem) => {
    if (editingFavorites) {
      toggleFavorite(item.id)
      return
    }
    go(item.url)
  }
  const renderFunction = (item: FunctionItem, fromFavorites = false) => {
    const isFavorite = favoriteIds.includes(item.id)
    return <View className={`feature-item${editingFavorites ? ' editing' : ''}`} hoverClass='feature-item-pressed' hoverStartTime={10} hoverStayTime={80} key={`${fromFavorites ? 'favorite' : 'all'}-${item.id}`} onClick={() => activateFunction(item)}>
      <View className={`feature-icon ${item.tone}`}><MiniIcon name={item.icon} /></View>
      <Text className='feature-name'>{item.label}</Text>
      {editingFavorites && <Text className={`feature-favorite-state${isFavorite ? ' selected' : ''}`}>{fromFavorites ? '移除' : isFavorite ? '已添加' : '添加'}</Text>}
    </View>
  }

  return (
    <View className='feature-page' style={customNavigationStyle()}>
      <View className='feature-header'>
        <View className='feature-back' hoverClass='feature-pressed' hoverStartTime={10} hoverStayTime={80} onClick={backToOverview}><MiniIcon name='chevron-left' /></View>
        <Text>功能中心</Text>
        <View />
      </View>
      <View className='feature-content'>
        <View className='feature-account-card' hoverClass='feature-card-pressed' hoverStartTime={10} hoverStayTime={80} onClick={() => go('/pages/profile/index')}>
          <View className='feature-account-avatar'><MiniIcon name='person' /></View>
          <View className='feature-account-copy'><Text>{profile.name || '未填写姓名'}</Text><Text>{profile.major || '未填写专业'} · {profile.cohort || '未填写年级'}</Text><Text>个人数据已接入云端</Text></View>
          <View className='feature-sync-dot' />
        </View>

        <View className='feature-current-template' hoverClass='feature-card-pressed' hoverStartTime={10} hoverStayTime={80} onClick={() => go('/pages/templates/index')}>
          <View className='feature-current-icon'><MiniIcon name='reader-blue' /></View>
          <View className='feature-current-copy'><Text>最近查看目标</Text><Text>{goalTitle}</Text></View>
          <MiniIcon name='chevron-right' className='feature-chevron' />
        </View>

        <View className='feature-section feature-common-card'>
          <View className='feature-section-heading'>
            <Text className='feature-section-title'>常用功能</Text>
            <Text className={`feature-edit-action${editingFavorites ? ' active' : ''}`} onClick={() => setEditingFavorites((value) => !value)}>{editingFavorites ? '完成' : '编辑'}</Text>
          </View>
          {favoriteFunctions.length > 0
            ? <View className='feature-grid feature-common-grid'>{favoriteFunctions.map((item) => renderFunction(item, true))}</View>
            : <View className='feature-empty-favorites'><Text>暂未添加常用功能</Text><Text>可从下方分区中添加</Text></View>}
          {editingFavorites && <Text className='feature-edit-hint'>点按功能即可添加或移除</Text>}
        </View>

        <View className='feature-section feature-all-card'>
          {functionGroups.map((group) => (
            <View className='feature-group' key={group.id}>
              <Text className='feature-group-title'>{group.title}</Text>
              <View className='feature-grid feature-group-grid'>
                {group.functionIds.map((id) => functions.find((item) => item.id === id)).filter((item): item is FunctionItem => Boolean(item)).map((item) => renderFunction(item))}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
