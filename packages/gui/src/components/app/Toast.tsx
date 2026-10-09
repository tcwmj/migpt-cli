/* ══ 轻提示 ══ */
import { I } from '../../icons.tsx'

export function Toast({
  msg,
  leaving,
}: {
  msg: string | null
  leaving?: boolean
}) {
  return (
    <div className={'toast' + (msg ? ' on' : '') + (leaving ? ' closing' : '')}>
      <I n="check" size={15} />
      <span>
        <b>{msg}</b>
      </span>
    </div>
  )
}
