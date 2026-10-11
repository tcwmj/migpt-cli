/* ══ RobotsView ══ */
import { useEffect, useState } from 'react'
import { type Robot, type Conversation, type DeviceRow } from '../apis.ts'
import { Button, Chip, EmptyState } from '../components/atoms/index.ts'
import { RobotDetail } from './robots/RobotDetail.tsx'
import { RobotEditForm } from './robots/RobotEditForm.tsx'
import { RobotList } from './robots/RobotList.tsx'

export function RobotsView(props: {
  robots: Robot[]
  allRobots: Robot[]
  conversations: Conversation[]
  devices: DeviceRow[]
  robotUsage: (id: string) => string[]
  onSave: (r: Robot) => void
  onCreate: (r: Partial<Robot>) => Promise<Robot | null> | void
  onDelete: (id: string) => void
  onReset: (id: string) => void
  onNavigate?: (view: string, id: string) => void
}) {
  const [selId, setSelId] = useState<string | null>(props.robots[0]?.id || null)
  const sel = props.allRobots.find((r) => r.id === selId) || null
  const [draft, setDraft] = useState<Robot | null>(sel)
  const [edit, setEdit] = useState(false)
  const [creating, setCreating] = useState(false)
  const blankRobot = (): Robot => ({
    id: '',
    name: '',
    profile: '',
    callAIKeywords: [],
    wakeUpKeywords: ['小爱同学'],
    exitKeywords: [],
    checkInterval: 1000,
    checkTTSStatusAfter: 3000,
    exitKeepAliveAfter: 30,
    conversationId: '',
    onEnterAI: [],
    onExitAI: [],
    onAIAsking: [],
    onAIReplied: [],
    onAIError: [],
    createdAt: Date.now(),
  })
  useEffect(() => {
    setSelId((s) => s || props.robots[0]?.id || null)
  }, [props.robots])
  useEffect(() => {
    if (!creating) setDraft(sel)
  }, [selId, creating]) // eslint-disable-line react-hooks/exhaustive-deps

  const setF = (k: keyof Robot, v: unknown) =>
    draft && setDraft({ ...draft, [k]: v })
  const usage = sel ? props.robotUsage(sel.id) : []

  const selectRobot = (id: string) => {
    setSelId(id)
    setCreating(false)
    setEdit(false)
  }
  const startCreate = () => {
    setSelId(null)
    setCreating(true)
    setEdit(true)
    setDraft(blankRobot())
  }
  const cancelEdit = () => {
    if (creating) {
      setCreating(false)
      setEdit(false)
      if (!sel) setSelId(props.robots[0]?.id || null)
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

  if (props.robots.length === 0) {
    return (
      <section data-view="robots" className="on">
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
    <section data-view="robots" className="on">
      <div className="filters">
        <Chip on>全部角色 {props.robots.length}</Chip>
        <span className="sp" />
      </div>
      <div className="robots">
        <RobotList
          robots={props.robots}
          selId={selId}
          onSelect={selectRobot}
          onCreate={startCreate}
        />
        {sel && !edit && !creating && (
          <RobotDetail
            key={'robot-r-' + sel.id}
            robot={sel}
            usage={usage}
            conversations={props.conversations}
            devices={props.devices}
            onEdit={() => setEdit(true)}
            onDelete={() => props.onDelete(sel.id)}
            onReset={() => props.onReset(sel.id)}
            onNavigate={props.onNavigate}
          />
        )}
        {draft && (edit || creating) && (
          <RobotEditForm
            key={'robot-e-' + (creating ? 'new' : sel?.id || 'new')}
            draft={draft}
            creating={creating}
            usage={usage}
            conversations={props.conversations}
            setF={setF}
            onCancel={cancelEdit}
            onSave={doSave}
          />
        )}
      </div>
    </section>
  )
}
