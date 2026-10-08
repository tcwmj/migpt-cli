import { Field } from '../atoms/index.ts'
import type { ModalFormProps } from './types.ts'

export function RoleForm({ v, setV }: ModalFormProps) {
  return (
    <>
      <Field row label="角色名称" required>
        <input
          value={v.name || ''}
          placeholder="例如：深夜电台 DJ"
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </Field>
      <Field label="人设描述">
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
    </>
  )
}
