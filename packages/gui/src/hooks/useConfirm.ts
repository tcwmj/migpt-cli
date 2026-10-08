/* ══ 二次确认弹窗：统一 200ms 退场动画与确认回调 ══ */
import { useState } from 'react'
import type { ConfirmState } from '../ui-types.ts'

export function useConfirm() {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [confirmLeaving, setConfirmLeaving] = useState(false)
  const closeConfirm = (doIt?: boolean) => {
    if (confirmLeaving) return
    setConfirmLeaving(true)
    window.setTimeout(() => {
      const c = confirm
      setConfirm(null)
      setConfirmLeaving(false)
      if (doIt && c) c.onOk()
    }, 200)
  }
  return { confirm, confirmLeaving, setConfirm, closeConfirm }
}
