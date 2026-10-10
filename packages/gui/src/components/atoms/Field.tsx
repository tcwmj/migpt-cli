import type { ReactNode } from 'react'
import { I } from '../../icons.tsx'

/** 表单字段：统一 `.fld` 结构（标签 / 必填星号 / 提示气泡 / 说明文字）
 *
 * 变体：
 * - `row`：横向字段（弹窗内 label 在左、控件在右）
 * - `icon`：控件左侧内嵌图标（登录表单）
 * - `tip`：标签尾部「?」气泡
 * - `hint` / `hintTone`：控件下方说明，`warn` 用于警示语气
 */
export function Field({
  label,
  required,
  tip,
  icon,
  hint,
  hintTone,
  row,
  halfWidth,
  children,
}: {
  label?: ReactNode
  required?: boolean
  tip?: string
  icon?: string
  hint?: ReactNode
  hintTone?: 'warn'
  row?: boolean
  halfWidth?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={
        'fld' +
        (row ? ' row' : '') +
        (icon ? ' ic' : '') +
        (halfWidth ? ' half-width' : '')
      }
    >
      {label !== undefined && (
        <label>
          {label}
          {required && <span className="req">*</span>}
          {tip && (
            <span className="tip" data-tip={tip}>
              ?
            </span>
          )}
        </label>
      )}
      {icon ? (
        <div className="input-wrap">
          <I n={icon} size={15} />
          {children}
        </div>
      ) : (
        children
      )}
      {hint !== undefined && (
        <span className={'hint' + (hintTone ? ' ' + hintTone : '')}>
          {hint}
        </span>
      )}
    </div>
  )
}
