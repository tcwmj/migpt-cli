import type { ThinkService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button, ProviderLogo, Tag } from '../../components/atoms/index.ts'
import { THINK_PROVIDERS } from '../../constants.ts'

export function ThinkServiceList(props: {
  services: ThinkService[]
  selThink: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <aside className="slist">
      {props.services.map((s) => {
        const p = THINK_PROVIDERS[s.provider]
        return (
          <div
            key={s.id}
            className={'li' + (s.id === props.selThink ? ' on' : '')}
            onClick={() => props.onSelect(s.id)}
          >
            {p ? (
              <span className="ic t pv">
                <ProviderLogo p={p} size={20} />
              </span>
            ) : (
              <span className="ic t">
                <I n="bolt" />
              </span>
            )}
            <span className="txt">
              <b>{s.name}</b>
              <span>{(p?.name || s.provider) + ' · ' + s.model}</span>
            </span>
            {s.isDefault && <Tag>默认</Tag>}
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
