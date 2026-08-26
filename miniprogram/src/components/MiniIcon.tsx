import { Image } from '@tarojs/components'

export type MiniIconName =
  | 'dashboard'
  | 'person'
  | 'person-white'
  | 'reader-blue'
  | 'reader-teal'
  | 'backpack-cyan'
  | 'layers-blue'
  | 'card-stack-teal'
  | 'file-cyan'
  | 'pencil-blue'
  | 'gear-teal'
  | 'list-blue'
  | 'list-orange'
  | 'chevron-right'
  | 'chevron-left'
  | 'clock-teal'
  | 'check-blue'

export function MiniIcon({ name, className = '' }: { name: MiniIconName; className?: string }) {
  return <Image className={`mini-icon ${className}`} src={`/assets/ui/${name}.svg`} mode='aspectFit' />
}
