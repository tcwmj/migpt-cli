import type { Model } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button, ProviderLogo } from '../../components/atoms/index.ts'
import { MODEL_PROVIDERS } from '../../constants.ts'

export function ModelList(props: {
  models: Model[]
  selModel: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <aside className="slist">
      {props.models.map((s) => {
        const p = MODEL_PROVIDERS[s.provider]
        return (
          <div
            key={s.id}
            className={'li' + (s.id === props.selModel ? ' on' : '')}
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
