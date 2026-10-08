import type { Role } from '../../apis.ts'
import { Button } from '../../components/atoms/index.ts'
import { avatarOf } from '../../utils.ts'

export function RoleList(props: {
  roles: Role[]
  selId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  return (
    <div className="rlist">
      {props.roles.map((r) => (
        <div
          className={'r' + (r.id === props.selId ? ' on' : '')}
          key={r.id}
          onClick={() => props.onSelect(r.id)}
        >
          <img src={avatarOf(r.name)} alt={r.name} />
          <span>
            <b>{r.name}</b>
            <span>{r.profile?.slice(0, 18) || '未填写人设'}</span>
          </span>
        </div>
      ))}
      <Button
        style={{ justifyContent: 'center', marginTop: 4 }}
        icon="plus"
        onClick={props.onCreate}
      >
        新建
      </Button>
    </div>
  )
}
