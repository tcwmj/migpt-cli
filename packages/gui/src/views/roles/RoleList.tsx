import type { Role } from '../../apis.ts'
import { Button, Tag } from '../../components/atoms/index.ts'
import { I } from '../../icons.tsx'

export function RoleList(props: {
  roles: Role[]
  selId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  // 内置在前、自建在后（与型号/语音列表的呈现约定一致）
  const sorted = [...props.roles].sort(
    (a, b) => Number(!!b.builtin) - Number(!!a.builtin),
  )
  return (
    <div className="rlist">
      {sorted.map((r) => (
        <div
          className={'r' + (r.id === props.selId ? ' on' : '')}
          key={r.id}
          onClick={() => props.onSelect(r.id)}
        >
          <span className="ic">
            <I n="user" />
          </span>
          <span className="txt">
            <b>{r.name}</b>
            <span>{r.profile?.slice(0, 18) || '未填写角色性格'}</span>
          </span>
          {r.builtin ? <Tag>内置</Tag> : null}
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
