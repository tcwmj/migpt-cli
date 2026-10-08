import type { CSSProperties, ReactNode } from 'react'
import { I } from '../../icons.tsx'

/** 状态标签：统一 `.tag` 与语气变体（`accent` / `neu` / `warn` / `bad` / `builtin`） */
export function Tag({
  tone,
  icon,
  className,
  style,
  children,
}: {
  tone?: string
  icon?: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <span
      className={
        'tag' + (tone ? ' ' + tone : '') + (className ? ' ' + className : '')
      }
      style={style}
    >
      {icon ? <I n={icon} /> : null}
      {icon && children ? ' ' : null}
      {children}
    </span>
  )
}
