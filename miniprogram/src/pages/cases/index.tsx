import { Image, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { CampusHeader } from '../../components/CampusHeader'
import { MiniIcon } from '../../components/MiniIcon'
import { caseRepository } from '../../services/caseRepository'
import '../../styles/campus.scss'
import './index.scss'

const regions = ['全部', '香港', '新加坡', '英国', '美国', '法国', '澳大利亚']

export default function CasesPage() {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('全部')
  const [limit, setLimit] = useState(30)
  const cases = useMemo(() => caseRepository.list().filter((item) => {
    const matchesRegion = region === '全部' || item.region === region
    return matchesRegion && (!query.trim() || item.searchText.toLowerCase().includes(query.trim().toLowerCase()))
  }), [query, region])

  return (
    <View className='cases-page'>
      <CampusHeader title='升学案例库' />
      <View className='cases-content'>
      <View className='cases-switch'>
        <View className='active'>案例</View>
        <View hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80} onClick={() => Taro.navigateTo({ url: '/pages/interviews/index' })}>专访</View>
      </View>
      <View className='cases-intro'><View><Text>公开案例</Text><Text>共 {caseRepository.list().length} 条</Text></View><MiniIcon name='backpack-cyan' /></View>
      <View className='cases-search'><MiniIcon name='dashboard' /><Input value={query} placeholder='搜索学校、项目或背景' onInput={(event) => setQuery(event.detail.value)} /></View>
      <View className='cases-chips'>
        {regions.map((item) => <View key={item} className={region === item ? 'active' : ''} onClick={() => { setRegion(item); setLimit(30) }}>{item}</View>)}
      </View>
      {cases.slice(0, limit).map((item) => (
        <View className='case-card' key={item.id} hoverClass='campus-pressed' hoverStartTime={10} hoverStayTime={80} onClick={() => Taro.navigateTo({ url: `/pages/case-detail/index?id=${item.id}` })}>
          <Image className='case-logo' src={item.logoPath} mode='aspectFit' />
          <View className='case-card-copy'>
            <View className='case-card-title'>{item.school}</View>
            <View className='case-card-program'>{item.program}</View>
            <View className='case-card-tags'><Text>{item.applicationSeason}</Text><Text>{item.region}</Text>{item.gpa && <Text>GPA {item.gpa}</Text>}</View>
          </View>
          <MiniIcon name='chevron-right' />
        </View>
      ))}
      {cases.length === 0 && <View className='cases-empty'>没有匹配的案例</View>}
      {limit < cases.length && <View className='cases-more' onClick={() => setLimit(limit + 30)}>查看更多</View>}
      </View>
    </View>
  )
}
