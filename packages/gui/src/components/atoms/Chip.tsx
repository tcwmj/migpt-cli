import type { HTMLAttributes } from 'react'

/** 筛选芯片：统一 `.chip` 与选中态 `.on` */
export function Chip({
  on,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { on?: boolean }) {
  return (
    <span
      className={
        'chip' + (on ? ' on' : '') + (className ? ' ' + className : '')
      }
      {...rest}
    >
      {children}
    </span>
  )
}
