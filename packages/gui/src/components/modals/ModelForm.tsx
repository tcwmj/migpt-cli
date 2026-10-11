import { MODEL_PROVIDERS, PROVIDER_PRESETS } from '../../constants.ts'
import { Field, ProviderPicker } from '../atoms/index.ts'
import type { ModalFormProps } from './types.ts'

export function ModelForm({ v, setV, isEdit }: ModalFormProps) {
  const preset = MODEL_PROVIDERS[v.provider || 'custom']
  const dlId = `model-list-${v.provider || 'custom'}`
  return (
    <>
      <Field row label="模型名称" required>
        <input
          value={v.name || ''}
          placeholder="例如：豆包 Doubao-Seed"
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </Field>
      <Field
        row
        label="供应商"
        required
        hint={
          (preset?.badge ? `${preset.badge} · ` : '') +
          '选择供应商自动带出官方接口地址与示例模型，后续均可修改'
        }
      >
        <ProviderPicker
          providers={MODEL_PROVIDERS}
          value={v.provider || 'custom'}
          onPick={(p) => {
            const pp = PROVIDER_PRESETS[p]
            const pre = PROVIDER_PRESETS[v.provider || '']
            setV({
              ...v,
              provider: p,
              baseUrl: pp?.baseUrl || '',
              model:
                v.model && v.model !== pre?.model ? v.model : pp?.model || '',
            })
          }}
        />
      </Field>
      <Field row label="接口地址" required>
        <input
          value={v.baseUrl || preset?.baseUrl || ''}
          placeholder={
            v.provider === 'custom'
              ? 'https://api.example.com/v1'
              : '选择供应商后自动填充'
          }
          onChange={(e) => setV({ ...v, baseUrl: e.target.value })}
        />
      </Field>
      <Field row label="模型端点" required>
        <input
          value={v.model || ''}
          list={dlId}
          placeholder={
            v.provider === 'custom'
              ? '模型名或 ep-xxxxxxxx'
              : preset?.model || ''
          }
          onChange={(e) => setV({ ...v, model: e.target.value })}
        />
        {!!preset?.models?.length && (
          <datalist id={dlId}>
            {preset.models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        )}
      </Field>
      <Field row label="API Key" required>
        <input
          value={v.apiKey || ''}
          placeholder={
            isEdit ? '留空则保留原 Key' : '以 sk- / ark- 等开头的密钥'
          }
          onChange={(e) => setV({ ...v, apiKey: e.target.value })}
        />
      </Field>
      <Field row label="温度" required>
        <input
          value={v.temperature || '0.7'}
          onChange={(e) => setV({ ...v, temperature: e.target.value })}
        />
      </Field>
    </>
  )
}
