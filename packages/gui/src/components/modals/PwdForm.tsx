import { I } from '../../icons.tsx'
import { Field } from '../atoms/index.ts'
import type { ModalFormProps } from './types.ts'

export function PwdForm({ v, setV }: ModalFormProps) {
  return (
    <>
      <Field row label="当前密码" required>
        <input
          type="password"
          value={v.old || ''}
          onChange={(e) => setV({ ...v, old: e.target.value })}
        />
      </Field>
      <Field row label="新密码" required>
        <input
          type="password"
          value={v.pwd || ''}
          onChange={(e) => setV({ ...v, pwd: e.target.value })}
        />
      </Field>
      <Field row label="确认新密码" required>
        <input
          type="password"
          value={v.pwd2 || ''}
          onChange={(e) => setV({ ...v, pwd2: e.target.value, err: '' })}
        />
      </Field>
      {v.err && (
        <div className="notice err">
          <I n="warning" size={15} /> {v.err}
        </div>
      )}
    </>
  )
}
