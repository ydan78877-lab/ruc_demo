import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { CampusHeader } from '../../components/CampusHeader'
import { MiniIcon } from '../../components/MiniIcon'
import { caseRepository } from '../../services/caseRepository'
import '../../styles/campus.scss'
import './index.scss'

export default function InterviewsPage() {
  const openArticle = (url: string) => {
    Taro.setClipboardData({ data: url })
    Taro.showModal({ title: '链接已复制', content: '可粘贴到浏览器或微信中打开专访。', showCancel: false })
  }
  return (
    <View className='interviews-page'>
      <CampusHeader title='升学案例库' />
      <View className='interviews-content'>
      <View className='interviews-switch'>
        <View hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80} onClick={() => Taro.navigateBack()}>案例</View>
        <View className='active'>专访</View>
      </View>
      <View className='interviews-hero'><View><Text>学生专访</Text><Text>来自真实申请者的经验分享</Text></View><MiniIcon name='reader-blue' /></View>
      {caseRepository.listInterviews().map((item) => (
        <View className='interview-card' key={item.id} hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80} onClick={() => openArticle(item.url)}>
          <View className='interview-card-top'><Text>{item.subject}</Text><MiniIcon name='chevron-right' /></View>
          <Text className='interview-summary'>{item.summary}</Text>
          <View className='interview-tags'>{item.tags.map((tag) => <View key={tag}>{tag}</View>)}</View>
        </View>
      ))}
      </View>
    </View>
  )
}
