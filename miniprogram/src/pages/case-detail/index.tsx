import { Image, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { CampusHeader } from '../../components/CampusHeader'
import { caseRepository } from '../../services/caseRepository'
import '../../styles/campus.scss'
import './index.scss'

export default function CaseDetailPage() {
  const { params } = useRouter()
  const item = caseRepository.getById(params.id || '')
  if (!item) return <View className='case-detail-page'><CampusHeader title='案例详情' /><View className='case-detail-empty'>案例不存在</View></View>

  const fields = [
    ['本科院校', item.undergradCollege], ['本科专业', item.undergradMajor],
    ['GPA', item.gpa], ['语言成绩', item.englishScore],
    ['GRE / GMAT', item.greGmat], ['实习', item.internships],
    ['科研', item.research], ['申请季', item.applicationSeason]
  ].filter(([, value]) => value)
  const qr = '/assets/case-library/contact-qrs/wechat-qr-v2.jpg'

  return (
    <View className='case-detail-page'>
      <CampusHeader title='案例详情' />
      <View className='case-detail-content'>
      <View className='case-detail-hero'>
        <Image className='case-detail-logo' src={item.logoPath} mode='aspectFit' />
        <View className='case-detail-copy'><Text>{item.school}</Text><Text>{item.program}</Text><Text>{item.applicationSeason}</Text></View>
      </View>
      <View className='case-detail-tags'>{item.tags.map((tag) => <View key={tag}>{tag}</View>)}</View>
      <View className='case-detail-title'>{item.studentName}的申请背景</View>
      <View className='case-detail-grid'>
        {fields.map(([label, value]) => <View className='case-detail-cell' key={label}><Text>{label}</Text><Text>{value}</Text></View>)}
      </View>
      <View className='case-detail-title'>案例说明</View>
      <View className='case-detail-note'>{item.studentCardIntro}</View>
      <View className='case-detail-contact'>
        <View><Text>进一步了解</Text><Text>查看升学服务与咨询方式</Text></View>
        <Image src={qr} mode='aspectFit' onClick={() => Taro.previewImage({ current: qr, urls: [qr] })} />
      </View>
      </View>
    </View>
  )
}
