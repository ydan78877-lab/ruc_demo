import { Button, Input, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { CampusHeader } from '../../components/CampusHeader'
import { MiniIcon } from '../../components/MiniIcon'
import { addCustomGoal, getGoalWorkspace, setActiveGoal } from '../../services/goalRepository'
import '../../styles/campus.scss'
import './index.scss'

export default function GoalsPage() {
  const [workspace, setWorkspace] = useState(getGoalWorkspace())
  const [creating, setCreating] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')

  useDidShow(() => setWorkspace(getGoalWorkspace()))

  const open = async (goalId: string) => {
    try {
      await setActiveGoal(goalId)
      await Taro.navigateTo({ url: `/pages/target/index?goalId=${goalId}` })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '打开失败', icon: 'none' })
    }
  }

  const addGoal = async () => {
    const title = draftTitle.trim()
    if (!title) {
      Taro.showToast({ title: '请填写目标名称', icon: 'none' })
      return
    }
    try {
      const goal = await addCustomGoal(title)
      setCreating(false)
      setDraftTitle('')
      setWorkspace(getGoalWorkspace())
      await Taro.navigateTo({ url: `/pages/template-settings/index?goalId=${goal.id}` })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '创建失败', icon: 'none' })
    }
  }

  return <View className='templates-page'>
    <CampusHeader title='我的目标' />
    <View className='templates-content'>
      <View className='templates-hero'><View><Text>管理你的目标</Text><Text>毕业目标由系统初始化，升学目标可以按个人路径自由增加</Text></View><View className='templates-hero-icon'><MiniIcon name='layers-blue' /></View></View>
      <View className='templates-heading'><Text>一级目标</Text><Text>{workspace.goals.length}个</Text></View>
      <View className='templates-list'>
        {workspace.goals.map((goal) => <View className='template-card available' key={goal.id} onClick={() => void open(goal.id)} hoverClass='campus-pressed'>
          <View className='template-icon'><MiniIcon name={goal.kind === 'graduation' ? 'reader-teal' : goal.kind === 'custom' ? 'list-blue' : 'layers-blue'} /></View>
          <View className='template-copy'><Text className='template-name'>{goal.title}</Text><Text className='template-note'>{goal.kind === 'graduation' ? goal.sourceLabel : goal.pages.map((page) => page.tabLabel).join('、')}</Text></View>
          <View className={`template-tag ${goal.kind === 'graduation' ? 'main' : ''}`}>{goal.kind === 'graduation' ? '默认' : goal.kind === 'custom' ? '自定义' : '系统'}</View>
          <MiniIcon name='chevron-right' />
        </View>)}
      </View>
      {creating ? <View className='goals-create-card'><Text>目标名称</Text><Input value={draftTitle} focus placeholder='例如：港新申请' onInput={(event) => setDraftTitle(event.detail.value)} /><View><Button onClick={() => { setCreating(false); setDraftTitle('') }}>取消</Button><Button className='primary' onClick={() => void addGoal()}>创建</Button></View></View> : <Button className='goals-add-button' onClick={() => setCreating(true)}>＋ 添加我的目标</Button>}
      <View className='templates-library-note'><MiniIcon name='dashboard' /><View><Text>自定义目标采用手动完成</Text><Text>最多使用“目标—子目标—分类”三级菜单，具体条目由你自主填写和勾选。</Text></View></View>
    </View>
  </View>
}
