import { PROVIDERS, PROVIDER_PRESETS } from '../../constants.ts'
import type { ModalFormProps } from './types.ts'

export function ThinkForm({ v, setV, isEdit }: ModalFormProps) {
  return (
    <>
      <div className="fld row">
        <label>
          服务名称<span className="req">*</span>
        </label>
        <input
          value={v.name || ''}
          placeholder="例如：豆包 Doubao-Seed"
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </div>
      <div className="fld row">
        <label>
          供应商<span className="req">*</span>
        </label>
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
      </div>
      <div className="fld row">
        <label>接口地址</label>
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
        <span className="hint">
          选「自定义」时可手动填写；其他供应商自动填充官方地址
        </span>
      </div>
      <div className="fld row">
        <label>
          模型端点<span className="req">*</span>
        </label>
        <input
          value={v.model || ''}
          placeholder="ep-xxxxxxxx 或模型名"
          onChange={(e) => setV({ ...v, model: e.target.value })}
        />
        <span className="hint">切换供应商自动带出示例模型，可修改</span>
      </div>
      <div className="fld row">
        <label>API Key</label>
        <input
          value={v.apiKey || ''}
          placeholder="ark-••••"
          onChange={(e) => setV({ ...v, apiKey: e.target.value })}
        />
        <span className="hint">
          {isEdit ? '留空则保留原 Key' : '仅服务端保存，面板不展示明文'}
        </span>
      </div>
      <div className="fld row">
        <label>温度</label>
        <input
          value={v.temperature || '0.7'}
          onChange={(e) => setV({ ...v, temperature: e.target.value })}
        />
      </div>
    </>
  )
}
