/* ── App 内多处共用的 UI 状态类型 ── */
export interface ModalState {
  kind: 'account' | 'think' | 'voice' | 'role' | 'pwd' | 'deviceBind'
  title: string
  desc: string
  payload?: unknown
}
