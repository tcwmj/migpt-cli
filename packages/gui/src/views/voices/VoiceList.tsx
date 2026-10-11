import type { VoiceService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button, ProviderLogo, Tag } from '../../components/atoms/index.ts'
import { TTS_ENGINES, VOICE_PROVIDERS } from '../../constants.ts'

export function VoiceServiceList(props: {
  services: VoiceService[]
  selVoice: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <aside className="slist">
      {props.services.map((s) => {
        const p = s.builtin ? undefined : VOICE_PROVIDERS[s.provider]
        return (
          <div
            key={s.id}
            className={'li' + (s.id === props.selVoice ? ' on' : '')}
            onClick={() => props.onSelect(s.id)}
          >
            {p ? (
              <span className="ic v pv">
                <ProviderLogo p={p} size={20} />
              </span>
            ) : (
              <span className="ic v">
                <I n="mic" />
              </span>
            )}
            <span className="txt">
              <b>{s.name}</b>
              <span>
                {s.builtin
                  ? 'builtin · 小米内置音色'
                  : (TTS_ENGINES[s.provider] || s.provider) +
                    (s.voiceId ? ' · ' + s.voiceId : '')}
              </span>
            </span>
            {s.builtin ? <Tag>内置</Tag> : null}
          </div>
        )
      })}
      <Button
        style={{ justifyContent: 'center', marginTop: 4 }}
        icon="plus"
        onClick={() => props.onSelect(null)}
      >
        新建
      </Button>
    </aside>
  )
}
