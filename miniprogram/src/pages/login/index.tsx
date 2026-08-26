import { Button, Input, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { cohortOptions, majorOptions } from '../../config/accountOptions'
import { createInitialTemplateConfig } from '../../data/goalDefaults'
import type { StudentProfile } from '../../models'
import {
  AccountApiError,
  bootstrapAccount,
  completeOnboarding,
  getCachedAccount,
  loginLocalAdmin
} from '../../services/accountRepository'
import { blankProfile } from '../../services/personalDataRepository'
import { customNavigationStyle } from '../../utils/navigationLayout'
import './index.scss'

type Screen = 'login' | 'loading' | 'onboarding' | 'error' | 'disabled'

const selectableMajors = [...majorOptions, '其他']

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : '连接云端失败，请稍后重试'
}

function targetHome() {
  return Taro.reLaunch({ url: '/pages/overview/index' })
}

export default function LoginPage() {
  const isWeApp = process.env.TARO_ENV === 'weapp'
  const [screen, setScreen] = useState<Screen>('login')
  const [errorMessage, setErrorMessage] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [profile, setProfile] = useState<StudentProfile>({ ...blankProfile })
  const [majorChoice, setMajorChoice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigationStyle = useMemo(customNavigationStyle, [])

  const cohortIndex = useMemo(() => Math.max(0, cohortOptions.indexOf(profile.cohort)), [profile.cohort])
  const majorIndex = useMemo(() => Math.max(0, selectableMajors.indexOf(majorChoice || profile.major)), [majorChoice, profile.major])

  const showFailure = (error: unknown) => {
    const disabled = error instanceof AccountApiError && error.code === 'ACCOUNT_DISABLED'
    setScreen(disabled ? 'disabled' : 'error')
    setErrorMessage(messageOf(error))
  }

  const acceptBootstrap = async (bootstrap: Awaited<ReturnType<typeof bootstrapAccount>>) => {
    if (bootstrap.user.status === 'disabled') {
      setScreen('disabled')
      setErrorMessage('账号已被禁用，请联系管理员')
      return
    }
    if (bootstrap.user.onboardingComplete) {
      await targetHome()
      return
    }
    setProfile({ ...blankProfile, ...bootstrap.data.profile })
    const knownMajor = majorOptions.includes(bootstrap.data.profile.major)
    setMajorChoice(knownMajor ? bootstrap.data.profile.major : (bootstrap.data.profile.major ? '其他' : ''))
    setScreen('onboarding')
  }

  const connectWeChat = async () => {
    setScreen('loading')
    try {
      await acceptBootstrap(await bootstrapAccount())
    } catch (error) {
      showFailure(error)
    }
  }

  useEffect(() => {
    if (isWeApp && getCachedAccount()) void connectWeChat()
  }, [])

  const loginLocal = async () => {
    if (!username.trim() || !password) {
      Taro.showToast({ title: '请输入账号和密码', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const bootstrap = await loginLocalAdmin(username.trim(), password)
      if (!bootstrap.user.onboardingComplete) throw new Error('绑定的微信账号尚未完成首次资料')
      await targetHome()
    } catch (error) {
      showFailure(error)
    } finally {
      setSubmitting(false)
    }
  }

  const finishOnboarding = async () => {
    const name = profile.name.trim()
    const major = profile.major.trim()
    if (name.length < 2) {
      Taro.showToast({ title: '请填写真实姓名', icon: 'none' })
      return
    }
    if (!cohortOptions.includes(profile.cohort)) {
      Taro.showToast({ title: '请选择年级', icon: 'none' })
      return
    }
    if (!major) {
      Taro.showToast({ title: '请选择或填写专业', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const completedProfile = { ...profile, name, major }
      await completeOnboarding(completedProfile, createInitialTemplateConfig(completedProfile))
      Taro.showToast({ title: '资料已建立', icon: 'success' })
      await targetHome()
    } catch (error) {
      showFailure(error)
    } finally {
      setSubmitting(false)
    }
  }

  if (screen === 'loading') {
    return <View className='login-page login-centered' style={navigationStyle}><View className='login-spinner' /><Text className='login-state-title'>正在连接你的账号</Text><Text className='login-state-note'>从云端读取个人资料…</Text></View>
  }

  if (screen === 'disabled' || screen === 'error') {
    return <View className='login-page login-centered' style={navigationStyle}>
      <View className={`login-state-icon ${screen}`}>{screen === 'disabled' ? '!' : '×'}</View>
      <Text className='login-state-title'>{screen === 'disabled' ? '账号暂不可用' : '暂时无法进入'}</Text>
      <Text className='login-state-note'>{errorMessage}</Text>
      <Button className='login-secondary' onClick={() => setScreen('login')}>返回重试</Button>
    </View>
  }

  if (screen === 'onboarding') {
    return <View className='login-page onboarding-page' style={navigationStyle}>
      <View className='login-brand small'><View className='login-brand-mark'>R</View><Text>人大中法学生助手</Text></View>
      <View className='onboarding-heading'><Text>建立你的个人资料</Text><Text>这些信息会跟随微信账号，用于你的档案与简历。</Text></View>
      <View className='onboarding-card'>
        <View className='onboarding-field'><Text>真实姓名</Text><Input value={profile.name} maxlength={30} placeholder='请输入真实姓名' onInput={(event) => setProfile({ ...profile, name: event.detail.value })} /></View>
        <Picker mode='selector' range={cohortOptions} value={cohortIndex} onChange={(event) => setProfile({ ...profile, cohort: cohortOptions[Number(event.detail.value)] })}>
          <View className='onboarding-field selectable'><Text>年级</Text><Text className={profile.cohort ? '' : 'placeholder'}>{profile.cohort || '请选择年级'}</Text><Text className='field-chevron'>›</Text></View>
        </Picker>
        <Picker mode='selector' range={selectableMajors} value={majorIndex} onChange={(event) => {
          const choice = selectableMajors[Number(event.detail.value)]
          setMajorChoice(choice)
          setProfile({ ...profile, major: choice === '其他' ? '' : choice })
        }}>
          <View className='onboarding-field selectable'><Text>专业</Text><Text className={majorChoice || profile.major ? '' : 'placeholder'}>{majorChoice || profile.major || '请选择专业'}</Text><Text className='field-chevron'>›</Text></View>
        </Picker>
        {majorChoice === '其他' ? <View className='onboarding-field'><Text>专业名称</Text><Input value={profile.major} maxlength={40} placeholder='请输入专业名称' onInput={(event) => setProfile({ ...profile, major: event.detail.value })} /></View> : null}
      </View>
      <Button className='login-primary' loading={submitting} disabled={submitting} onClick={finishOnboarding}>进入应用</Button>
      <Text className='onboarding-footnote'>学校与学院默认使用“中国人民大学 · 中法学院”，之后可在个人信息中修改。</Text>
    </View>
  }

  return <View className='login-page' style={navigationStyle}>
    <View className='login-visual'>
      <View className='login-orbit orbit-one' /><View className='login-orbit orbit-two' />
      <View className='login-brand-mark hero'>R</View>
    </View>
    <View className='login-copy'><Text>人大中法学生助手</Text><Text>把目标、经历与准备进度，放在一个清晰的个人档案里。</Text></View>
    {isWeApp ? <Button className='login-primary wechat' onClick={connectWeChat}>微信登录</Button> : <View className='local-login-card'>
      <Text className='local-login-title'>本地真实账号</Text>
      <Text className='local-login-note'>登录管理账号，进入后台已绑定的本人微信数据。</Text>
      <Input value={username} placeholder='管理账号' onInput={(event) => setUsername(event.detail.value)} />
      <Input password value={password} placeholder='管理密码' onInput={(event) => setPassword(event.detail.value)} />
      <Button className='login-primary' loading={submitting} disabled={submitting} onClick={loginLocal}>登录并同步</Button>
    </View>}
    <Text className='login-footnote'>{isWeApp ? '首次使用会创建一份空白个人档案' : '本地 demo 与小程序使用同一份云端个人数据'}</Text>
  </View>
}
