import { Input, Picker, Switch, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { CampusHeader } from '../../components/CampusHeader'
import type { CampusMatter, CampusSpace } from '../../data/campus'
import { deletePersonalMatter, getCampusMatters, getCampusSpaces, saveCampusMatter } from '../../services/campusRepository'
import '../../styles/campus.scss'
import './index.scss'

const types = ['到场事项', '截止事项', '确认事项', '资料事项', '通知']
const fallbackSpace: CampusSpace = { id: '', name: '空间', type: '课程', role: '成员', members: 0, code: '', approvalRequired: true, tone: 'blue' }

export default function MatterEditorPage() {
  const router = useRouter()
  const existing = getCampusMatters().find((item) => item.id === router.params.id)
  const isPersonal = String(router.params.personal || '') === '1' || existing?.scope === 'personal'
  const space = getCampusSpaces().find((item) => item.id === (router.params.spaceId || existing?.spaceId)) || fallbackSpace
  const [type, setType] = useState(isPersonal ? '个人提醒' : existing?.type || types[0])
  const [title, setTitle] = useState(existing?.title || '')
  const [date, setDate] = useState(existing?.date || new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState(existing?.clock || '15:00')
  const [location, setLocation] = useState(existing?.location || '')
  const [body, setBody] = useState(existing?.body || '')
  const [important, setImportant] = useState(existing?.priority === '重要')
  const [preview, setPreview] = useState(false)
  const action = isPersonal || type === '截止事项' ? '标记完成' : '确认收到'
  const timeLabel = isPersonal || type === '截止事项' ? `${date.slice(5).replace('-', '月')}日 截止${time}` : `${date.slice(5).replace('-', '月')}日 ${time}`
  const previewItem = useMemo<CampusMatter>(() => ({
    id: existing?.id || `matter-${Date.now()}`,
    scope: isPersonal ? 'personal' : 'space',
    spaceId: isPersonal ? '' : space.id,
    space: isPersonal ? '个人事项' : space.name,
    title: title || '未命名事项',
    time: timeLabel,
    date,
    clock: time,
    location,
    status: existing?.status || '待处理',
    tone: isPersonal ? 'blue' : type === '到场事项' ? 'teal' : type === '确认事项' ? 'blue' : 'orange',
    icon: isPersonal ? 'check-blue' : type === '到场事项' ? 'clock-teal' : type === '确认事项' ? 'check-blue' : 'list-orange',
    type,
    action,
    body,
    priority: important ? '重要' : '普通',
    diff: existing && !isPersonal ? [
      ...(existing.time !== timeLabel ? [{ field: '时间', before: existing.time, after: timeLabel }] : []),
      ...(existing.location !== location ? [{ field: '地点', before: existing.location || '未填写', after: location || '未填写' }] : []),
      ...(existing.body !== body ? [{ field: '行动要求', before: existing.body, after: body }] : [])
    ] : []
  }), [action, body, date, existing, important, isPersonal, location, space.id, space.name, time, timeLabel, title, type])

  const save = async (draft = false) => {
    if (!title.trim()) return Taro.showToast({ title: '请填写事项标题', icon: 'none' })
    try {
      await saveCampusMatter(previewItem, isPersonal ? false : draft)
      Taro.showToast({ title: isPersonal ? '个人事项已保存' : draft ? '草稿已保存' : '事项已发布', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 450)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '保存失败', icon: 'none' })
    }
  }

  const remove = async () => {
    if (!existing || !isPersonal) return
    const result = await Taro.showModal({ title: '删除个人事项', content: '删除后无法恢复，确定继续吗？', confirmText: '删除', confirmColor: '#d95c56' })
    if (!result.confirm) return
    try {
      await deletePersonalMatter(existing.id)
      Taro.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 350)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
    }
  }

  return <View className='workspace-page campus-workspace-page matter-editor-page'>
    <CampusHeader title={isPersonal ? existing ? '编辑个人事项' : '添加个人事项' : existing ? '编辑事项' : '发布事项'} action={preview ? '继续编辑' : '预览'} onAction={() => setPreview(!preview)} />
    <View className='campus-page-body'>
      {preview ? <View className='matter-preview-card'>
        <Text>{previewItem.space} · {previewItem.type}</Text><Text>{previewItem.title}</Text><Text>{previewItem.time}{previewItem.location ? ` · ${previewItem.location}` : ''}</Text><Text>{previewItem.body || '暂无补充说明'}</Text>
      </View> : <View className='matter-editor-form'>
        <Text className='matter-form-title'>{isPersonal ? '个人提醒' : '基本信息'}</Text>
        {!isPersonal && <Picker range={types} value={Math.max(0, types.indexOf(type))} onChange={(event) => setType(types[Number(event.detail.value)])}><View className='matter-field'><Text>事项类型</Text><Text>{type}⌄</Text></View></Picker>}
        <View className='matter-field input'><Text>事项标题</Text><Input value={title} placeholder='填写事项标题' onInput={(event) => setTitle(event.detail.value)} /></View>
        <View className='matter-two-fields'>
          <Picker mode='date' value={date} onChange={(event) => setDate(event.detail.value)}><View className='matter-field'><Text>日期</Text><Text>{date}</Text></View></Picker>
          <Picker mode='time' value={time} onChange={(event) => setTime(event.detail.value)}><View className='matter-field'><Text>时间</Text><Text>{time}</Text></View></Picker>
        </View>
        {!isPersonal && type === '到场事项' && <View className='matter-field input'><Text>地点</Text><Input value={location} placeholder='填写教室或集合地点' onInput={(event) => setLocation(event.detail.value)} /></View>}
        <View className='matter-field textarea'><Text>事项说明</Text><Textarea value={body} placeholder='填写行动要求和补充说明' onInput={(event) => setBody(event.detail.value)} /></View>
        <View className='matter-field switch'><View><Text>重要事项</Text><Text>在概览中优先展示</Text></View><Switch checked={important} color='#20b486' onChange={(event) => setImportant(event.detail.value)} /></View>
      </View>}
    </View>
    {isPersonal
      ? <View className='matter-editor-footer'><View onClick={existing ? remove : () => Taro.navigateBack()}>{existing ? '删除' : '取消'}</View><View onClick={() => save(false)}>保存</View></View>
      : <View className='matter-editor-footer'><View onClick={() => save(true)}>保存草稿</View><View onClick={() => save(false)}>发布</View></View>}
  </View>
}
