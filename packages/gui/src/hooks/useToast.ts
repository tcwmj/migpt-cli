/* ══ 轻提示：统一 5s 自动消隐的 toast 状态（含退场过渡），支持 成功/失败/警告 三类 ══ */
import { useCallback, useRef, useState } from 'react'

export type ToastKind = 'ok' | 'err' | 'warn'

export interface ToastData {
  msg: string
  kind: ToastKind
}

export type ShowToast = (msg: string, kind?: ToastKind) => void

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null)
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<number | null>(null)
  const hideTimer = useRef<number | null>(null)
  const showToast = useCallback<ShowToast>((msg, kind = 'ok') => {
    if (timer.current) window.clearTimeout(timer.current)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    setLeaving(false)
    setToast({ msg, kind })
    timer.current = window.setTimeout(() => {
      setLeaving(true)
      hideTimer.current = window.setTimeout(() => {
        setToast(null)
        setLeaving(false)
      }, 260)
    }, 5000)
  }, [])
  return { toast, leaving, showToast }
}
