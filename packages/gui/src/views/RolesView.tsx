/* ══ RolesView ══ */
import { useEffect, useState } from 'react'
import { type Role, type Room, type DeviceRow } from '../apis.ts'
import { Button, Chip, EmptyState } from '../components/atoms/index.ts'
import { RoleDetail } from './roles/RoleDetail.tsx'
import { RoleEditForm } from './roles/RoleEditForm.tsx'
import { RoleList } from './roles/RoleList.tsx'

export function RolesView(props: {
  roles: Role[]
  allRoles: Role[]
  rooms: Room[]
  devices: DeviceRow[]
  roleUsage: (id: string) => string[]
  onSave: (r: Role) => void
  onCreate: (r: Partial<Role>) => Promise<Role | null> | void
  onDelete: (id: string) => void
  onReset: (id: string) => void
  onNavigate?: (view: string, id: string) => void
}) {
  const [selId, setSelId] = useState<string | null>(props.roles[0]?.id || null)
  const sel = props.allRoles.find((r) => r.id === selId) || null
  const [draft, setDraft] = useState<Role | null>(sel)
  const [edit, setEdit] = useState(false)
  const [creating, setCreating] = useState(false)
  const blankRole = (): Role => ({
    id: '',
    name: '',
    profile: '',
    callAIKeywords: [],
    wakeUpKeywords: ['小爱同学'],
    exitKeywords: [],
    checkInterval: 1000,
    checkTTSStatusAfter: 3000,
    exitKeepAliveAfter: 30,
    roomRef: '',
    onEnterAI: [],
    onExitAI: [],
    onAIAsking: [],
    onAIReplied: [],
    onAIError: [],
  })
  useEffect(() => {
    setSelId((s) => s || props.roles[0]?.id || null)
  }, [props.roles])
  useEffect(() => {
    if (!creating) setDraft(sel)
  }, [selId, creating]) // eslint-disable-line react-hooks/exhaustive-deps

  const setF = (k: keyof Role, v: unknown) =>
    draft && setDraft({ ...draft, [k]: v })
  const usage = sel ? props.roleUsage(sel.id) : []

  const selectRole = (id: string) => {
    setSelId(id)
    setCreating(false)
    setEdit(false)
  }
  const startCreate = () => {
    setSelId(null)
    setCreating(true)
    setEdit(true)
    setDraft(blankRole())
  }
  const cancelEdit = () => {
    if (creating) {
      setCreating(false)
      setEdit(false)
      if (!sel) setSelId(props.roles[0]?.id || null)
      else setDraft(sel)
    } else {
      setEdit(false)
    }
  }
  const doSave = async () => {
    if (!draft) return
    if (creating) {
      const c = await props.onCreate({ ...draft })
      if (c?.id) {
        setSelId(c.id)
        setCreating(false)
        setEdit(false)
      }
    } else {
      props.onSave(draft)
      setEdit(false)
    }
  }

  if (props.roles.length === 0) {
    return (
      <section data-view="roles" className="on">
        <div className="panel">
          <EmptyState
            icon="chat"
            title="还没有对话角色"
            desc="创建角色后，可在设备向导中为每台音箱选择角色性格。"
            action={
              <Button variant="primary" icon="plus" onClick={startCreate}>
                新建
              </Button>
            }
          />
        </div>
      </section>
    )
  }

  return (
    <section data-view="roles" className="on">
      <div className="filters">
        <Chip on>全部角色 {props.roles.length}</Chip>
        <span className="sp" />
      </div>
      <div className="roles">
        <RoleList
          roles={props.roles}
          selId={selId}
          onSelect={selectRole}
          onCreate={startCreate}
        />
        {sel && !edit && !creating && (
          <RoleDetail
            key={'role-r-' + sel.id}
            role={sel}
            usage={usage}
            rooms={props.rooms}
            devices={props.devices}
            onEdit={() => setEdit(true)}
            onDelete={() => props.onDelete(sel.id)}
            onReset={() => props.onReset(sel.id)}
            onNavigate={props.onNavigate}
          />
        )}
        {draft && (edit || creating) && (
          <RoleEditForm
            key={'role-e-' + (creating ? 'new' : sel?.id || 'new')}
            draft={draft}
            creating={creating}
            usage={usage}
            rooms={props.rooms}
            setF={setF}
            onCancel={cancelEdit}
            onSave={doSave}
          />
        )}
      </div>
    </section>
  )
}
