import type { SpeakerModel } from '../../apis.ts'
import { I } from '../../icons.tsx'
import type { DeviceBindFormProps } from './types.ts'

export function DeviceBindForm({
  v,
  setV,
  accounts,
  roles,
  thinkSvcs,
  voiceSvcs,
  models,
  rooms,
}: DeviceBindFormProps) {
  return (
    <>
      <div className="fld row">
        <label>所属账号</label>
        <select
          value={v.accountId || ''}
          onChange={(e) => setV({ ...v, accountId: e.target.value })}
        >
          <option value="">（保持当前）</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} {a.miUserId}
            </option>
          ))}
        </select>
      </div>
      <div className="fld row">
        <label>对话角色</label>
        <select
          value={v.roleId || ''}
          onChange={(e) => setV({ ...v, roleId: e.target.value })}
        >
          <option value="">（保持当前）</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="fld row">
        <label>思考服务</label>
        <select
          value={v.thinkServiceId || ''}
          onChange={(e) => setV({ ...v, thinkServiceId: e.target.value })}
        >
          <option value="">（继承角色 / 全局默认）</option>
          {thinkSvcs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.isDefault ? ' · 默认' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="fld row">
        <label>语音服务（设备覆盖）</label>
        <select
          value={v.voiceOverrideId || ''}
          onChange={(e) => setV({ ...v, voiceOverrideId: e.target.value })}
        >
          <option value="">（继承角色 / 全局默认）</option>
          {voiceSvcs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.isDefault ? ' · 默认' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="fld row">
        <label>设备型号</label>
        <select
          value={v.speakerModel || ''}
          onChange={(e) => setV({ ...v, speakerModel: e.target.value })}
        >
          <option value="">（保持当前）</option>
          {models.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.builtin ? '' : ' · 自定义'}
            </option>
          ))}
        </select>
        <SpeakerModelHint
          model={
            v.speakerModel
              ? models.find((x) => x.id === v.speakerModel)
              : undefined
          }
        />
      </div>
      <div className="fld row">
        <label>连续对话超时（秒）</label>
        <input
          value={v.exitKeepAliveAfter || '30'}
          placeholder="默认 30"
          onChange={(e) => setV({ ...v, exitKeepAliveAfter: e.target.value })}
        />
        <span className="hint">
          连续对话中无响应多久自动退出唤醒模式，默认 30 秒
        </span>
      </div>
      <div className="fld row">
        <label>会话群</label>
        <select
          value={v.roomRef || ''}
          onChange={(e) => setV({ ...v, roomRef: e.target.value })}
        >
          <option value="">（保持当前）</option>
          {rooms.map((rm) => (
            <option key={rm.id} value={rm.id}>
              {rm.name}
            </option>
          ))}
        </select>
        <span className="hint">
          对话记忆的上下文归属（对应旧版「会话群
          chatGroup」），多台设备可共用；可在「会话群」菜单新建
        </span>
      </div>
      <div className="notice">
        <I n="warning" size={15} /> 修改后需重启设备生效。
      </div>
    </>
  )
}

function SpeakerModelHint({ model }: { model?: SpeakerModel }) {
  if (!model) {
    return (
      <span className="hint">
        切换型号后，播放指令 / 唤醒指令等硬件参数随型号生效
      </span>
    )
  }
  if (!model.consecutive) {
    return (
      <span className="hint warn">
        型号不支持连续对话（streamResponse 已禁用）
      </span>
    )
  }
  return model.playingCommand?.length ? (
    <span className="hint">支持连续对话 · 支持播放状态检测</span>
  ) : (
    <span className="hint">
      支持连续对话 · 未配置播放检测指令，将依赖 Mina
      检测播放状态；若异常可在「设备型号」中补充该指令
    </span>
  )
}
