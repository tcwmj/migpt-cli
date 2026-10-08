import { I } from '../../icons.tsx'
import type { ModalFormProps } from './types.ts'

export function PwdForm({ v, setV }: ModalFormProps) {
  return (
    <>
      <div className="fld row">
        <label>
          当前密码<span className="req">*</span>
        </label>
        <input
          type="password"
          value={v.old || ''}
          onChange={(e) => setV({ ...v, old: e.target.value })}
        />
      </div>
      <div className="fld row">
        <label>
          新密码<span className="req">*</span>
        </label>
        <input
          type="password"
          value={v.pwd || ''}
          onChange={(e) => setV({ ...v, pwd: e.target.value })}
        />
      </div>
      <div className="fld row">
        <label>
          确认新密码<span className="req">*</span>
        </label>
        <input
          type="password"
          value={v.pwd2 || ''}
          onChange={(e) => setV({ ...v, pwd2: e.target.value, err: '' })}
        />
      </div>
      {v.err && (
        <div className="notice err">
          <I n="warning" size={15} /> {v.err}
        </div>
      )}
    </>
  )
}
