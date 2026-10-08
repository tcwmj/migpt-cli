import type {
  Account,
  DeviceRow,
  Role,
  Room,
  SpeakerModel,
} from '../../apis.ts'
import { I } from '../../icons.tsx'
import type { DevDraft, DevPullState } from '../drafts.ts'
import { ModelPicker } from './ModelPicker.tsx'
import { PullDeviceList } from './PullDeviceList.tsx'

export function DeviceForm(props: {
  devDraft: DevDraft
  selDev: string | null
  devices: DeviceRow[]
  models: SpeakerModel[]
  accounts: Account[]
  roles: Role[]
  rooms: Room[]
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
  return (
    <div className="form-card">
      <h3>
        <I n="speaker" size={17} /> {selDev ? '编辑设备' : '新建设备'}
        <span className="refs">
          {selDev
            ? running
              ? '服务运行中 · 修改绑定后需重启'
              : '服务未启动 · 修改绑定后需重启'
            : '新建设备：从云端账号拉取选择，保存后立即选中'}
        </span>
      </h3>
      <div className="desc">
        {selDev
          ? '修改设备绑定；已变更的绑定需重启设备生效。'
          : '填入音箱 did 与绑定关系；创建后可重启设备生效。'}
      </div>
      <div className="grp">
        <h4>基本信息</h4>
        <div className="row">
          <div className="fld">
            <label>
              设备名称<span className="req">*</span>
            </label>
            <input
              value={devDraft.alias}
              placeholder="例如：客餐厅音箱"
              onChange={(e) =>
                props.onDraft({ ...devDraft, alias: e.target.value })
              }
            />
          </div>
          <div className="fld">
            <label>
              设备 ID<span className="req">*</span>
              <span
                className="tip"
                data-tip="小爱音箱 ID 或名称。新建时由「云端账号拉取」自动带入；编辑模式可手动修改。"
              >
                ?
              </span>
            </label>
            {selDev ? (
              <input
                value={devDraft.did}
                placeholder="例如：小爱音箱Pro"
                onChange={(e) =>
                  props.onDraft({ ...devDraft, did: e.target.value })
                }
              />
            ) : (
              <div
                className="ro"
                style={{ minHeight: 40, alignItems: 'center' }}
              >
                <span
                  className="v"
                  style={{
                    fontSize: 13.5,
                    color: devDraft.did ? 'var(--ink-1)' : 'var(--ink-3)',
                  }}
                >
                  {devDraft.did || '请先从下方云端账号拉取选择'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grp">
        <h4>设备型号</h4>
        <div className="row">
          <div className="fld">
            <label>
              设备型号
              <span
                className="tip"
                data-tip="输入关键字可搜索型号；选择后自动带入该型号的指令与播放配置（可在「设备型号」维护）。"
              >
                ?
              </span>
            </label>
            <ModelPicker
              models={props.models}
              value={devDraft.speakerModel}
              open={props.modelPickOpen}
              q={props.modelPickQ}
              onOpen={props.onPickOpen}
              onQ={props.onPickQ}
              onPick={(id) => props.onDraft({ ...devDraft, speakerModel: id })}
            />
          </div>
        </div>
      </div>
      <div className="grp">
        <h4>绑定</h4>
        <div className="row">
          <div className="fld">
            <label>云端账号</label>
            <select
              value={devDraft.accountId}
              onChange={(e) => {
                props.onDraft({
                  ...devDraft,
                  accountId: e.target.value,
                  did: '',
                  speakerModel: '',
                })
                props.onResetPull()
              }}
            >
              <option value="">未指定（使用默认账号）</option>
              {props.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}（{a.miUserId}）
                </option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label>
              对话角色
              <span
                className="tip"
                data-tip="选择对话角色后，思考服务与语音服务由角色统一提供，无需在此重复配置。"
              >
                ?
              </span>
            </label>
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
          </div>
        </div>
        {!selDev && (
          <div className="row">
            <div className="fld">
              <label>
                从账号拉取
                <span
                  className="tip"
                  data-tip="从该云端账号自动拉取小爱音箱（凭小米 ID + passToken，无需密码）；点击选择后自动带入名称、设备 ID 与型号。"
                >
                  ?
                </span>
              </label>
              <PullDeviceList
                devDraft={devDraft}
                devPull={props.devPull}
                models={props.models}
                devices={props.devices}
                onDraft={props.onDraft}
                onPull={props.onPull}
              />
            </div>
          </div>
        )}
        <div className="row">
          <div className="fld">
            <label>
              连续对话超时（秒）
              <span
                className="tip"
                data-tip="连续对话中无响应多久自动退出唤醒模式，默认 30 秒"
              >
                ?
              </span>
            </label>
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
          </div>
          <div className="fld">
            <label>
              会话群
              <span
                className="tip"
                data-tip="对话记忆的上下文归属（对应旧版「会话群 chatGroup」），多台设备可共用；可在「会话群」菜单新建"
              >
                ?
              </span>
            </label>
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
          </div>
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
        <button
          className="btn ghost"
          onClick={() =>
            selDev
              ? props.onEdit(false)
              : props.devices.length
                ? props.onSelect(props.devices[0].id)
                : props.onDraft(null)
          }
        >
          取消
        </button>
        <button
          className="btn primary"
          onClick={props.onSave}
          disabled={!devDraft.alias || !devDraft.did}
        >
          <I n="check" /> 保存
        </button>
      </div>
    </div>
  )
}
