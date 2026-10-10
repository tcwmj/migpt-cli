/* ══ 轻提示 ══ */
import { I } from '../../icons.tsx'
import type { ToastData, ToastKind } from '../../hooks/useToast.ts'

const ICONS: Record<ToastKind, string> = {
  ok: 'check',
  err: 'x',
  warn: 'warning',
}

export function Toast({
  toast,
  leaving,
}: {
  toast: ToastData | null
  leaving?: boolean
}) {
  return (
    <div
      className={
        'toast' +
        (toast ? ` on ${toast.kind}` : '') +
        (leaving ? ' closing' : '')
      }
    >
      <I n={toast ? ICONS[toast.kind] : 'check'} size={15} />
      <span>
        <b>{toast?.msg}</b>
      </span>
    </div>
  )
}
