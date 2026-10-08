import type { ButtonHTMLAttributes } from 'react'
import { I } from '../../icons.tsx'

/** 动作按钮：统一 `.btn` 与变体（`primary` / `ghost` / `danger`，可组合为 `ghost danger`）
 *
 * `icon` 传入图标名时自动前置图标并保留一个空格间距。
 */
export function Button({
  variant,
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string
  icon?: string
}) {
  return (
    <button
      className={
        'btn' +
        (variant ? ' ' + variant : '') +
        (className ? ' ' + className : '')
      }
      {...rest}
    >
      {icon ? <I n={icon} /> : null}
      {icon && children ? ' ' : null}
      {children}
    </button>
  )
}
