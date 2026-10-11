/* 向导第 5 步：对话角色（人设与对话行为，必填） */
import { useEffect, useState } from 'react'
import { type Robot } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { avatarOf } from '../../utils.ts'
import { Button, EmptyState, Field, TemplatePicker } from '../atoms/index.ts'
import {
  type RobotTemplate,
  composeTemplateSystemTemplate,
} from '@migptgui/contracts'
import type { WizardSetDraft } from './types.ts'

/** 套用模板后的新建角色草稿（含模板带来的播报词与提示词） */
type NewRobotDraft = {
  name: string
  profile: string
  masterName?: string
  masterProfile?: string
  systemTemplate?: string
  templateId?: string
  onEnterAI?: string[]
  onExitAI?: string[]
  onAIAsking?: string[]
  onAIReplied?: string[]
  onAIError?: string[]
}

/** 模板 → 新建草稿（含模板携带的播报词与提示词；无语气段落时回落默认） */
function templateToDraft(t: RobotTemplate): NewRobotDraft {
  const d: NewRobotDraft = {
    name: t.name,
    profile: t.profile,
    masterName: t.masterName,
    systemTemplate: t.systemTemplate ?? composeTemplateSystemTemplate(t),
    templateId: t.id,
  }
  if (t.onEnterAI) d.onEnterAI = t.onEnterAI
  if (t.onExitAI) d.onExitAI = t.onExitAI
  if (t.onAIAsking) d.onAIAsking = t.onAIAsking
  if (t.onAIReplied) d.onAIReplied = t.onAIReplied
  if (t.onAIError) d.onAIError = t.onAIError
  return d
}

/** 角色侧栏列表：选中态与「新建」入口 */
function RobotSidebar(props: {
  robots: Robot[]
  robotId: string
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  return (
    <aside className="slist">
      {props.robots.length === 0 && (
        <EmptyState
          title="还没有对话角色"
          desc="请新建一个角色，或到「对话角色」页先创建。"
          style={{ padding: '16px' }}
        />
      )}
      {props.robots.map((r) => (
        <div
          key={r.id}
          className={'li' + (props.robotId === r.id ? ' on' : '')}
          onClick={() => props.onSelect(r.id)}
        >
          <img className="pavatar" src={avatarOf(r.name)} alt={r.name} />
          <span className="txt">
            <b>{r.name}</b>
            <span>{r.profile?.slice(0, 24) || '未填写角色性格'}</span>
          </span>
          {props.robotId === r.id && (
            <span className="wchk">
              <I n="check" size={15} />
            </span>
          )}
        </div>
      ))}
      <Button
        icon="plus"
        style={{ justifyContent: 'center', marginTop: 4 }}
        onClick={props.onCreate}
      >
        新建
      </Button>
    </aside>
  )
}

export function WizardRobotStep(props: {
  active: boolean
  robots: Robot[]
  robotId: string
  setDraft: WizardSetDraft
  onNewRobot: (d: Partial<Robot> & { name: string }) => Promise<Robot>
  onUpdateRobot: (id: string, d: Partial<Robot>) => Promise<Robot>
}) {
  const { robots, robotId, setDraft, onNewRobot, onUpdateRobot } = props
  const [newRobot, setNewRobot] = useState(false)
  /** 新建角色第一步：模板选择（选完或跳过后进入表单） */
  const [picking, setPicking] = useState(false)
  const [robotEdit, setRobotEdit] = useState(false)
  const [nrDraft, setNrDraft] = useState<NewRobotDraft>({
    name: '',
    profile: '',
  })
  const [nrBusy, setNrBusy] = useState(false)
  const [nrErr, setNrErr] = useState('')
  const selRobot = robots.find((r) => r.id === robotId)

  /** 选中模板：预填称呼、人设、播报词与提示词 */
  const pickTemplate = (t: RobotTemplate) => {
    setNrDraft(templateToDraft(t))
    setPicking(false)
  }

  // 列表有实体时默认选中第一个；无实体时右侧展示新建表单
  useEffect(() => {
    if (props.active && !robotId && robots.length)
      setDraft({ robotId: robots[0].id })
  }, [props.active, robotId, robots, setDraft])

  const saveRobot = async () => {
    if (nrBusy) return
    setNrBusy(true)
    setNrErr('')
    try {
      const body: NewRobotDraft & {
        name: string
        profile: string
      } = { name: nrDraft.name, profile: nrDraft.profile }
      if (nrDraft.masterName) body.masterName = nrDraft.masterName
      if (nrDraft.masterProfile) body.masterProfile = nrDraft.masterProfile
      if (nrDraft.systemTemplate !== undefined)
        body.systemTemplate = nrDraft.systemTemplate
      if (nrDraft.templateId) body.templateId = nrDraft.templateId
      // 模板携带的播报词：仅在新建时下发（编辑既有角色不覆盖用户已调好的词）
      if (!robotEdit) {
        if (nrDraft.onEnterAI) body.onEnterAI = nrDraft.onEnterAI
        if (nrDraft.onExitAI) body.onExitAI = nrDraft.onExitAI
        if (nrDraft.onAIAsking) body.onAIAsking = nrDraft.onAIAsking
        if (nrDraft.onAIReplied) body.onAIReplied = nrDraft.onAIReplied
        if (nrDraft.onAIError) body.onAIError = nrDraft.onAIError
      }
      if (robotEdit && selRobot) {
        await onUpdateRobot(selRobot.id, body)
        setRobotEdit(false)
      } else {
        const created = await onNewRobot(body)
        setDraft({ robotId: created.id })
        setNewRobot(false)
      }
      setNrDraft({ name: '', profile: '' })
    } catch (e) {
      setNrErr((e as Error).message || '保存角色失败')
    } finally {
      setNrBusy(false)
    }
  }
  const beginRobotEdit = () => {
    if (!selRobot) return
    setNewRobot(false)
    setRobotEdit(true)
    setNrDraft({
      name: selRobot.name,
      profile: selRobot.profile || '',
      masterName: selRobot.masterName || '',
      masterProfile: selRobot.masterProfile || '',
      systemTemplate: selRobot.systemTemplate,
      templateId: selRobot.templateId,
    })
  }
  /** 选中侧栏角色：切回详情态 */
  const selectRobot = (id: string) => {
    setDraft({ robotId: id })
    setNewRobot(false)
    setPicking(false)
    setRobotEdit(false)
    setNrDraft({ name: '', profile: '' })
  }
  /** 点「新建」：先进模板选择态 */
  const beginCreate = () => {
    setNewRobot(true)
    setPicking(true)
    setRobotEdit(false)
    setNrDraft({ name: '', profile: '' })
  }
  return (
    <div className={'step' + (props.active ? ' on' : '')}>
      <div className="split wsplit">
        <RobotSidebar
          robots={robots}
          robotId={robotId}
          onSelect={selectRobot}
          onCreate={beginCreate}
        />
        <section className="sdetail">
          {newRobot && picking ? (
            <div className="form-card">
              <h3>
                <I n="user" size={17} /> 新建对话角色
              </h3>
              <div className="desc">选一个模板作为起点，之后都能改。</div>
              <TemplatePicker
                compact
                bare
                onPick={pickTemplate}
                onSkip={() => setPicking(false)}
              />
            </div>
          ) : selRobot && !newRobot && !robotEdit ? (
            <div className="form-card">
              <h3>
                <I n="user" size={17} /> 角色详情
              </h3>
              <div className="desc">角色性格热生效；修改唤醒词需重启设备。</div>
              <div className="ro">
                <div className="rr">
                  <span className="k">角色称呼</span>
                  <span className="v">{selRobot.name || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">称呼我为</span>
                  <span className="v">{selRobot.masterName || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">角色性格</span>
                  <span className="v" style={{ whiteSpace: 'pre-wrap' }}>
                    {selRobot.profile || '—'}
                  </span>
                </div>
                <div className="rr">
                  <span className="k">我的信息</span>
                  <span className="v" style={{ whiteSpace: 'pre-wrap' }}>
                    {selRobot.masterProfile || '—'}
                  </span>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <Button
                  variant="primary"
                  icon="pencil"
                  onClick={beginRobotEdit}
                >
                  编辑
                </Button>
              </div>
            </div>
          ) : (
            <div className="form-card">
              <h3>
                <I n="user" size={17} />{' '}
                {robotEdit && selRobot ? '编辑角色' : '新建对话角色'}
              </h3>
              <div className="desc">
                {robotEdit && selRobot ? '更新角色信息。' : '角色称呼必填。'}
              </div>
              <div className="row">
                <Field label="角色称呼" required>
                  <input
                    value={nrDraft.name}
                    placeholder="例如：小爱同学"
                    onChange={(e) =>
                      setNrDraft({ ...nrDraft, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="称呼我为" tip="如：主人、老大、朋友等">
                  <input
                    value={nrDraft.masterName || ''}
                    placeholder="例如：主人"
                    onChange={(e) =>
                      setNrDraft({ ...nrDraft, masterName: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="row">
                <Field label="角色性格">
                  <textarea
                    rows={4}
                    value={nrDraft.profile}
                    placeholder="例如：你叫小爱，是这家人的智能助手…"
                    onChange={(e) =>
                      setNrDraft({ ...nrDraft, profile: e.target.value })
                    }
                  />
                </Field>
                <Field label="我的信息" tip="供角色了解你的背景信息">
                  <textarea
                    rows={4}
                    value={nrDraft.masterProfile || ''}
                    placeholder="例如：性别：男 性格：善良正直 其他：总是舍己为人"
                    onChange={(e) =>
                      setNrDraft({ ...nrDraft, masterProfile: e.target.value })
                    }
                  />
                </Field>
              </div>
              {nrErr && (
                <div className="notice err">
                  <I n="warning" size={15} /> {nrErr}
                </div>
              )}
              <div className="acts">
                <span className="sp" />
                <Button
                  variant="ghost"
                  onClick={() =>
                    robotEdit && selRobot
                      ? (setRobotEdit(false),
                        setNrDraft({ name: '', profile: '' }))
                      : setNewRobot(false)
                  }
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  disabled={nrBusy || !nrDraft.name}
                  onClick={saveRobot}
                >
                  {nrBusy ? '保存中…' : '保存'}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
