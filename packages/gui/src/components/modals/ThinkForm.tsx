import { PROVIDERS, PROVIDER_PRESETS } from '../../constants.ts'
import { Field } from '../atoms/index.ts'
import type { ModalFormProps } from './types.ts'

export function ThinkForm({ v, setV, isEdit }: ModalFormProps) {
  return (
    <>
      <Field row label="服务名称" required>
        <input
          value={v.name || ''}
          placeholder="例如：豆包 Doubao-Seed"
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </Field>
      <Field row label="供应商" required>
        <select
          value={v.provider || 'doubao'}
          onChange={(e) => {
            const p = e.target.value
            const preset = PROVIDER_PRESETS[p]
            const prev = PROVIDER_PRESETS[v.provider || '']
            setV({
              ...v,
              provider: p,
              baseUrl: preset?.baseUrl || '',
              model:
                v.model && v.model !== prev?.model
                  ? v.model
                  : preset?.model || '',
            })
          }}
        >
          {Object.entries(PROVIDERS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        row
        label="接口地址"
        hint="选「自定义」时可手动填写；其他供应商自动填充官方地址"
      >
        {v.provider === 'custom' ? (
          <input
            value={v.baseUrl || ''}
            placeholder="https://api.example.com/v1"
            onChange={(e) => setV({ ...v, baseUrl: e.target.value })}
          />
        ) : (
          <input
            value={
              v.baseUrl || PROVIDER_PRESETS[v.provider || '']?.baseUrl || ''
            }
            readOnly
            disabled
            placeholder="选择供应商后自动填充"
          />
        )}
      </Field>
      <Field
        row
        label="模型端点"
        required
        hint="切换供应商自动带出示例模型，可修改"
      >
        <input
          value={v.model || ''}
          placeholder="ep-xxxxxxxx 或模型名"
          onChange={(e) => setV({ ...v, model: e.target.value })}
        />
      </Field>
      <Field
        row
        label="API Key"
        hint={isEdit ? '留空则保留原 Key' : '仅服务端保存，面板不展示明文'}
      >
        <input
          value={v.apiKey || ''}
          placeholder="ark-••••"
          onChange={(e) => setV({ ...v, apiKey: e.target.value })}
        />
      </Field>
      <Field row label="温度">
        <input
          value={v.temperature || '0.7'}
          onChange={(e) => setV({ ...v, temperature: e.target.value })}
        />
      </Field>
    </>
  )
}