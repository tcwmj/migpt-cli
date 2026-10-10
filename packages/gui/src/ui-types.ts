/* ── App 内多处共用的 UI 状态类型 ── */
export interface ModalState {
  kind: 'account' | 'think' | 'voice' | 'robot' | 'pwd' | 'deviceBind'
  title: string
  desc: string
  payload?: unknown
}

/** 二次确认弹窗状态；`danger === false` 时使用中性「确认」按钮，其余沿用「删除」 */
export interface ConfirmState {
  title: string
  msg: string
  danger?: boolean
  onOk: () => void
}
