import { Field } from '../atoms/index.ts'
import type { ModalFormProps } from './types.ts'

export function AccountForm({ v, setV, isEdit }: ModalFormProps) {
  return (
    <>
      <Field row label="账号名称" required>
        <input
          value={v.name || ''}
          placeholder="例如：默认账号"
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </Field>
      <Field
        row
        label="小米 ID"
        required
        hint="登录官方 小米账号 › 个人信息 后获取 小米ID，不是手机号或邮箱。"
      >
        <input
          value={v.miUserId || ''}
          placeholder="例如：1234567890"
          onChange={(e) => setV({ ...v, miUserId: e.target.value })}
        />
      </Field>
      <Field
        label="passToken"
        hint={
          isEdit ? '留空则保留原凭据' : '异地登录安全验证时，会给出授权链接'
        }
      >
        <textarea
          rows={4}
          value={v.passToken || ''}
          placeholder={
            isEdit && v.passToken
              ? '已保存 · 留空保持不变'
              : '从米家 / 小爱获取的 token'
          }
          onChange={(e) => setV({ ...v, passToken: e.target.value })}
        />
      </Field>
    </>
  )
}
