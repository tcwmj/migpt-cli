import type { SpeakerModel } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Field } from '../atoms/index.ts'
import type { DeviceBindFormProps } from './types.ts'

export function DeviceBindForm({
  v,
  setV,
  credentials,
  robots,
  speakerModels,
  conversations,
}: DeviceBindFormProps) {
  const smHint = speakerModelHint(
    v.speakerModel
      ? speakerModels.find((x) => x.id === v.speakerModel)
      : undefined,
  )
  return (
    <>
      <Field row label="所属凭据">
        <select
          value={v.credentialId || ''}
          onChange={(e) => setV({ ...v, credentialId: e.target.value })}
        >
          <option value="">（保持当前）</option>
          {credentials.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} {a.miUserId}
            </option>
          ))}
        </select>
      </Field>
      <Field row label="对话角色" required>
        <select
          value={v.robotId || ''}
          onChange={(e) => setV({ ...v, robotId: e.target.value })}
          required
        >
          <option value="">未设置</option>
          {robots.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        row
        label="音箱型号"
        hint={smHint.text}
        hintTone={smHint.warn ? 'warn' : undefined}
      >
        <select
          value={v.speakerModel || ''}
          onChange={(e) => setV({ ...v, speakerModel: e.target.value })}
        >
          <option value="">（保持当前）</option>
          {speakerModels.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.builtin ? '' : ' · 自定义'}
            </option>
          ))}
        </select>
      </Field>
      <div className="notice">
        <I n="warning" size={15} /> 修改后需重启设备生效。
      </div>
    </>
  )
}

function speakerModelHint(model?: SpeakerModel): {
  text: string
  warn?: boolean
} {
  if (!model) {
    return { text: '切换型号后，播放指令 / 唤醒指令等硬件参数随型号生效' }
  }
  if (!model.continuousDialogue) {
    return { text: '型号不支持连续对话（streamResponse 已禁用）', warn: true }
  }
  return model.playingCommand?.length
    ? { text: '支持连续对话 · 支持播放状态检测' }
    : {
        text: '支持连续对话 · 未配置播放检测指令，将依赖 Mina 检测播放状态；若异常可在「音箱型号」中补充该指令',
      }
}
