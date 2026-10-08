import type { Role } from '../../apis.ts'
import { I } from '../../icons.tsx'
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
      <button
        className="btn"
        style={{ justifyContent: 'center', marginTop: 4 }}
        onClick={props.onCreate}
      >
        <I n="plus" /> 新建
      </button>
    </div>
  )
}
