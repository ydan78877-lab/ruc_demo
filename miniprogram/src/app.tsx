import type { PropsWithChildren } from 'react'
import { WechatCapsule } from './components/WechatCapsule'
import { initializeCloud } from './config/cloud'
import './app.css'

export default function App({ children }: PropsWithChildren) {
  initializeCloud()

  return <>{process.env.TARO_ENV === 'h5' ? <WechatCapsule /> : null}{children}</>
}
