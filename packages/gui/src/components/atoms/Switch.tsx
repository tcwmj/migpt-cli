/** 开关：统一 `.switch` + `.track` 结构与选中/禁用态
 *
 * 默认渲染为 `<label>`（自带点击切换）；当外层已有 `<label>` 包裹时用 `as="span"` 避免嵌套。
 * `onChange` 可省略，用于只读/禁用态展示（内部始终挂载回调以避免受控告警）。
 */
export function Switch({
  checked,
  onChange,
  disabled,
  title,
  as = 'label',
}: {
  checked: boolean
  onChange?: (next: boolean) => void
  disabled?: boolean
  title?: string
  as?: 'label' | 'span'
}) {
  const body = (
    <>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="track" />
    </>
  )
  return as === 'span' ? (
    <span className="switch" title={title}>
      {body}
    </span>
  ) : (
    <label className="switch" title={title}>
      {body}
    </label>
  )
}
