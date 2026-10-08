import type { CSSProperties, ReactNode } from 'react'
import { I } from '../../icons.tsx'

/** 空态占位：可选图标 + 标题 + 说明 + 可选动作 */
export function EmptyState({
  icon,
  title,
  desc,
  action,
  className,
  style,
}: {
  icon?: string
  title: ReactNode
  desc?: ReactNode
  action?: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={'empty' + (className ? ' ' + className : '')} style={style}>
      {icon && (
        <div className="art">
          <I n={icon} size={26} />
        </div>
      )}
      <b>{title}</b>
      {desc !== undefined && <span>{desc}</span>}
      {action}
    </div>
  )
}
