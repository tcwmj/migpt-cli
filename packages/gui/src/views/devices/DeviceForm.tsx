import Select from 'react-select'
import type {
  Account,
  DeviceRow,
  Role,
  Room,
  SpeakerModel,
  ThinkService,
  VoiceService,
} from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button, Field } from '../../components/atoms/index.ts'
import type { DevDraft, DevPullState } from '../drafts.ts'

export function DeviceForm(props: {
  devDraft: DevDraft
  selDev: string | null
  devices: DeviceRow[]
  models: SpeakerModel[]
  accounts: Account[]
  roles: Role[]
  rooms: Room[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  modelPickOpen: boolean
  modelPickQ: string
  devPull: DevPullState
  onDraft: (d: DevDraft | null) => void
  onEdit: (e: boolean) => void
  onSelect: (id: string | null) => void
  onSave: () => void
  onPull: (accountId: string) => void
  onResetPull: () => void
  onPickOpen: (open: boolean) => void
  onPickQ: (q: string) => void
}) {
  const { devDraft, selDev } = props
  const running = props.devices.find((x) => x.id === selDev)?.running
  const model = props.models.find((x) => x.id === devDraft.speakerModel) || null
  const account = props.accounts.find((a) => a.id === devDraft.accountId)

  const thinkOptions = props.thinkSvcs.map((s) => ({
    value: s.id,
    label: s.name + (s.limitReached ? '（限额）' : ''),
  }))
  const thinkValue = thinkOptions.filter((o) =>
    (devDraft.thinkServiceIds || []).includes(o.value),
  )

  return (
    <div className="form-card">
      <h3>
        <I n="speaker" size={17} /> {selDev ? '编辑设备' : '新建设备'}
        <span className="refs">
          {selDev
            ? running
              ? '服务运行中 · 修改绑定后需重启'
              : '服务未启动 · 修改绑定后需重启'
            : '确认设备信息后保存即可接入'}
        </span>
      </h3>
      <div className="desc">
        {selDev
          ? '修改设备配置；已变更的配置需重启设备生效。'
          : '确认从云端带入的设备信息，配置服务后保存。'}
      </div>

      {/* 关联账号 */}
      <div className="grp">
        <h4>关联账号</h4>
        <div className="row">
          <Field label="云端账号">
            <input
              value={
                account ? `${account.name}（${account.miUserId}）` : '未指定'
              }
              disabled
            />
          </Field>
        </div>
      </div>

      {/* 关联设备 */}
      <div className="grp">
        <h4>关联设备</h4>
        <div className="row">
          <Field label="设备名称">
            <input value={devDraft.alias} disabled />
          </Field>
          <Field label="设备 ID">
            <input value={devDraft.did} disabled />
          </Field>
        </div>
        <div className="row">
          <Field label="设备型号">
            <input
              value={
                model
                  ? `${model.name}（${model.did}）`
                  : devDraft.speakerModel || '—'
              }
              disabled
            />
          </Field>
        </div>
      </div>

      {/* 关联服务 */}
      <div className="grp">
        <h4>关联服务</h4>
        <div className="row">
          <div style={{ flex: 1 }}>
            <Field
              label="思考服务"
              tip="按优先级排列，限额已达时自动切换下一个"
            >
              <Select
                isMulti
                options={thinkOptions}
                value={thinkValue}
                placeholder="选择思考服务…"
                noOptionsMessage={() => '无可用服务'}
                onChange={(vals) =>
                  props.onDraft({
                    ...devDraft,
                    thinkServiceIds: vals.map((v) => v.value),
                  })
                }
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: 36,
                    borderColor: 'var(--line)',
                    boxShadow: 'none',
                    '&:hover': { borderColor: 'var(--accent)' },
                  }),
                  multiValue: (base) => ({
                    ...base,
                    backgroundColor: '#e5e7eb',
                    borderRadius: 10,
                  }),
                  multiValueLabel: (base) => ({
                    ...base,
                    fontSize: 13,
                    padding: '2px 6px',
                  }),
                  multiValueRemove: (base) => ({
                    ...base,
                    borderRadius: 10,
                    ':hover': { backgroundColor: '#d1d5db' },
                  }),
                }}
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="语音服务">
              <select
                value={devDraft.voiceId || ''}
                onChange={(e) =>
                  props.onDraft({ ...devDraft, voiceId: e.target.value })
                }
              >
                <option value="">（跟随角色或全局默认）</option>
                {props.voiceSvcs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.isDefault ? ' · 默认' : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* 其他信息 */}
      <div className="grp">
        <h4>其他信息</h4>
        <div className="row">
          <Field label="对话角色">
            <select
              value={devDraft.roleId}
              onChange={(e) =>
                props.onDraft({ ...devDraft, roleId: e.target.value })
              }
            >
              <option value="">未指定</option>
              {props.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="会话群" tip="对话记忆的上下文归属，多台设备可共用">
            <select
              value={devDraft.roomRef}
              onChange={(e) =>
                props.onDraft({ ...devDraft, roomRef: e.target.value })
              }
            >
              <option value="">未指定</option>
              {props.rooms.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="row">
          <Field
            label="连续对话超时（秒）"
            tip="无响应多久自动退出唤醒模式，默认 30 秒"
          >
            <input
              value={devDraft.exitKeepAliveAfter || '30'}
              placeholder="默认 30"
              onChange={(e) =>
                props.onDraft({
                  ...devDraft,
                  exitKeepAliveAfter: e.target.value,
                })
              }
            />
          </Field>
        </div>
      </div>

      {model && !model.consecutive && (
        <div className="notice err">
          <I n="warning" size={15} /> 此型号不支持连续对话（streamResponse
          已禁用）。
        </div>
      )}
      {model && model.consecutive && !model.playingCommand?.length && (
        <div className="notice">
          <I n="warning" size={15} /> 此型号未配置播放检测指令，连续对话将依赖
          Mina 检测播放状态；若出现异常，可在「设备型号」中补充播放检测指令。
        </div>
      )}
      <div className="acts">
        <span className="sp" />
        <Button
          variant="ghost"
          onClick={() =>
            selDev
              ? props.onEdit(false)
              : props.devices.length
                ? props.onSelect(props.devices[0].id)
                : props.onDraft(null)
          }
        >
          取消
        </Button>
        <Button
          variant="primary"
          icon="check"
          onClick={props.onSave}
          disabled={!devDraft.alias || !devDraft.did}
        >
          保存
        </Button>
      </div>
    </div>
  )
}
