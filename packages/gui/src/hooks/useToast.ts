/* ══ 轻提示：统一 3.2s 自动消隐的 toast 状态（含退场过渡） ══ */
import { useCallback, useRef, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<number | null>(null)
  const hideTimer = useRef<number | null>(null)
  const showToast = useCallback((msg: string) => {
    if (timer.current) window.clearTimeout(timer.current)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    setLeaving(false)
    setToast(msg)
    timer.current = window.setTimeout(() => {
      setLeaving(true)
      hideTimer.current = window.setTimeout(() => {
        setToast(null)
        setLeaving(false)
      }, 200)
    }, 3200)
  }, [])
  return { toast, leaving, showToast }
}
