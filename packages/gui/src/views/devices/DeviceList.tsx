import type { DeviceRow, Role, SpeakerModel } from '../../apis.ts'
import { Button, Tag } from '../../components/atoms/index.ts'
import { I } from '../../icons.tsx'

export function DeviceList(props: {
  devices: DeviceRow[]
  roles: Role[]
  models: SpeakerModel[]
  selDev: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <aside className="slist">
      {props.devices.map((d) => {
        const r = props.roles.find((x) => x.id === d.roleId)
        const m = props.models.find(
          (x) => x.id === d.speakerModel || x.name === d.speakerModel,
        )
        return (
          <div
            key={d.id}
            className={'li' + (d.id === props.selDev ? ' on' : '')}
            onClick={() => props.onSelect(d.id)}
          >
            <span className={'ic' + (d.running ? ' t' : '')}>
              {m?.imageUrl ? (
                <img className="thumb" src={m.imageUrl} alt="" />
              ) : (
                <I n="speaker" />
              )}
            </span>
            <span className="txt">
              <b>{d.alias}</b>
              <span>
                {d.did} · {r?.name || '未指定角色'}
              </span>
            </span>
            <Tag tone={d.running ? 'accent' : 'neu'}>
              {d.running ? '运行中' : '未启动'}
            </Tag>
          </div>
        )
      })}
      <Button
        icon="plus"
        style={{ justifyContent: 'center', marginTop: 4 }}
        onClick={() => props.onSelect(null)}
      >
        新建
      </Button>
    </aside>
  )
}
