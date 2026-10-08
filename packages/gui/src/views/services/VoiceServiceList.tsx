import type { VoiceService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button, Tag } from '../../components/atoms/index.ts'
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
          {s.builtin ? <Tag>内置</Tag> : s.isDefault ? <Tag>默认</Tag> : null}
        </div>
      ))}
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
