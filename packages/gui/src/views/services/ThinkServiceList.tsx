import type { ThinkService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { PROVIDERS } from '../../constants.ts'

export function ThinkServiceList(props: {
  services: ThinkService[]
  selThink: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <aside className="slist">
      {props.services.map((s) => (
        <div
          key={s.id}
          className={'li' + (s.id === props.selThink ? ' on' : '')}
          onClick={() => props.onSelect(s.id)}
        >
          <span className="ic t">
            <I n="bolt" />
          </span>
          <span className="txt">
            <b>{s.name}</b>
            <span>
              {PROVIDERS[s.provider] || s.provider} · {s.model}
            </span>
          </span>
          {s.isDefault && <span className="tag">默认</span>}
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
