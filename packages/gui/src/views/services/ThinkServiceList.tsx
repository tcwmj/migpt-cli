import type { ThinkService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button, Tag } from '../../components/atoms/index.ts'
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
          {s.isDefault && <Tag>默认</Tag>}
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
