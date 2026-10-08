/* ══ 轻提示：统一 3.2s 自动消隐的 toast 状态 ══ */
import { useCallback, useRef, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  const showToast = useCallback((msg: string) => {
    if (timer.current) window.clearTimeout(timer.current)
    setToast(msg)
    timer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])
  return { toast, showToast }
}
