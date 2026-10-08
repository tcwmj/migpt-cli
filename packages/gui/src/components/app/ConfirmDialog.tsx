/* ══ 二次确认弹窗 ══ */
import { I } from '../../icons.tsx'
import type { ConfirmState } from '../../ui-types.ts'

export function ConfirmDialog(props: {
  confirm: ConfirmState
  leaving: boolean
  onClose: (doIt?: boolean) => void
}) {
  const { confirm, leaving, onClose } = props
  // 统一确认按钮：非危险操作（danger === false）用中性「确认」，删除类操作沿用「删除」
  const neutral = confirm.danger === false
  const icon = neutral ? 'check' : 'trash'
  const text = neutral ? '确认' : '删除'
  return (
    <>
      <div
        className={'scrim on' + (leaving ? ' closing' : '')}
        onClick={() => onClose()}
      />
      <div className={'modal on' + (leaving ? ' closing' : '')}>
        <h3>
          <I n={icon} size={18} /> {confirm.title}
        </h3>
        <div className="desc">{confirm.msg}</div>
        <div className="acts">
          <span className="sp" />
          <button className="btn ghost" onClick={() => onClose()}>
            取消
          </button>
          <button
            className={'btn' + (neutral ? '' : ' danger')}
            onClick={() => onClose(true)}
          >
            <I n={icon} /> {text}
          </button>
        </div>
      </div>
    </>
  )
}
