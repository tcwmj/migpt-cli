import type { VoiceService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { TTS_ENGINES } from '../../constants.ts'

export function VoiceServiceList(props: {
  services: VoiceService[]
  selVoice: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <aside className="slist">
      {props.services.map((s) => (
        <div
          key={s.id}
          className={'li' + (s.id === props.selVoice ? ' on' : '')}
          onClick={() => props.onSelect(s.id)}
        >
          <span className="ic v">
            <I n="mic" />
          </span>
          <span className="txt">
            <b>{s.name}</b>
            <span>
              {s.builtin
                ? 'builtin · 全局默认音色'
                : (TTS_ENGINES[s.provider] || s.provider) +
                  (s.voiceId ? ' · ' + s.voiceId : '')}
            </span>
          </span>
          {s.builtin ? (
            <span className="tag">内置</span>
          ) : s.isDefault ? (
            <span className="tag">默认</span>
          ) : null}
        </div>
      ))}
      <button
        className="btn"
        style={{ justifyContent: 'center', marginTop: 4 }}
        onClick={() => props.onSelect(null)}
      >
        <I n="plus" /> 新建
      </button>
    </aside>
  )
}
