/* ══ 轻提示 ══ */
import { I } from '../../icons.tsx'

export function Toast({ msg }: { msg: string | null }) {
  return (
    <div className={'toast' + (msg ? ' on' : '')}>
      <I n="check" size={15} />
      <span>
        <b>{msg}</b>
      </span>
    </div>
  )
}
