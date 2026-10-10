import { Field } from '../atoms/index.ts'
import type { RobotFormProps } from './types.ts'

export function RobotForm({ v, setV }: RobotFormProps) {
  return (
    <>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Field row label="角色称呼" required>
            <input
              value={v.name || ''}
              placeholder="例如：深夜电台 DJ"
              onChange={(e) => setV({ ...v, name: e.target.value })}
            />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field row label="称呼我为" tip="如：主人、老大、朋友等">
            <input
              value={v.masterName || ''}
              placeholder="例如：主人"
              onChange={(e) => setV({ ...v, masterName: e.target.value })}
            />
          </Field>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Field label="角色性格">
            <textarea
              style={{
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-m)',
                padding: '8px 12px',
                font: 'inherit',
                minHeight: 76,
              }}
              value={v.profile || ''}
              placeholder="你是谁、怎么说话、回答风格"
              onChange={(e) => setV({ ...v, profile: e.target.value })}
            />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="我的信息" tip="供角色了解你的背景信息">
            <textarea
              style={{
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-m)',
                padding: '8px 12px',
                font: 'inherit',
                minHeight: 76,
              }}
              value={v.masterProfile || ''}
              placeholder="例如：性别：男 性格：善良正直 其他：总是舍己为人"
              onChange={(e) => setV({ ...v, masterProfile: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </>
  )
}
