import { VOICE_PROVIDERS } from '../../constants.ts'
import { Field, ProviderPicker } from '../atoms/index.ts'
import type { ModalFormProps } from './types.ts'

export function VoiceForm({ v, setV }: ModalFormProps) {
  const p = VOICE_PROVIDERS[v.provider || 'custom']
  const engine = p?.engine || 'openai'
  const compat = engine === 'openai-compat'
  const dlId = `voice-models-${v.provider || 'custom'}`
  return (
    <>
      <Field row label="服务名称" required>
        <input
          value={v.name || ''}
          placeholder="例如：豆包语音"
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </Field>
      <Field
        row
        label="供应商"
        required
        hint="仅列出可驱动的语音引擎；OpenAI 兼容供应商改「接口地址」即可接入"
      >
        <ProviderPicker
          providers={VOICE_PROVIDERS}
          value={v.provider || 'custom'}
          onPick={(k) => setV({ ...v, provider: k })}
        />
      </Field>
      {v.provider !== 'custom' && (
        <Field row label="音色" hint="留空使用该引擎的默认音色">
          <input
            value={v.timbreId || ''}
            placeholder="选择或输入音色 ID"
            onChange={(e) => setV({ ...v, timbreId: e.target.value })}
          />
        </Field>
      )}
      {engine === 'edge' && (
        <Field row label="访问令牌">
          <input
            value={v.edgeToken || ''}
            placeholder="留空由 Edge 自动获取"
            onChange={(e) => setV({ ...v, edgeToken: e.target.value })}
          />
        </Field>
      )}
      {engine === 'volcano' && (
        <>
          <Field row label="App ID" required>
            <input
              value={v.volcanoAppId || ''}
              placeholder="火山引擎语音合成 App ID"
              onChange={(e) => setV({ ...v, volcanoAppId: e.target.value })}
            />
          </Field>
          <Field row label="访问令牌" required>
            <input
              value={v.volcanoToken || ''}
              placeholder="火山引擎 Access Token"
              onChange={(e) => setV({ ...v, volcanoToken: e.target.value })}
            />
          </Field>
        </>
      )}
      {(engine === 'openai' || compat) && (
        <>
          <Field row label="API Key" required>
            <input
              value={v.openaiKey || ''}
              placeholder="以 sk- 等开头的密钥"
              onChange={(e) => setV({ ...v, openaiKey: e.target.value })}
            />
          </Field>
          <Field
            row
            label={compat ? '语音模型' : '模型'}
            hint={compat ? '留空使用供应商默认语音模型' : '留空使用 tts-1'}
          >
            <input
              value={v.openaiModel || ''}
              list={dlId}
              placeholder={p?.model || 'tts-1'}
              onChange={(e) => setV({ ...v, openaiModel: e.target.value })}
            />
            {!!p?.models?.length && (
              <datalist id={dlId}>
                {p.models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            )}
          </Field>
          <Field
            row
            label="接口地址"
            hint={
              compat
                ? '已自动带出官方 OpenAI 兼容地址'
                : '支持任意 OpenAI 兼容 TTS 端点'
            }
          >
            <input
              value={v.openaiBaseUrl || ''}
              placeholder={p?.baseUrl || 'https://api.openai.com/v1'}
              onChange={(e) => setV({ ...v, openaiBaseUrl: e.target.value })}
            />
          </Field>
        </>
      )}
      {v.provider === 'custom' && (
        <Field
          label="TTS 配置（JSON）"
          hint="高级用法：直接填写 mi-gpt TTSConfig JSON"
        >
          <textarea
            rows={4}
            value={v.customJson || ''}
            placeholder='{"edge":{"trustedToken":"…"}}'
            onChange={(e) => setV({ ...v, customJson: e.target.value })}
          />
        </Field>
      )}
    </>
  )
}
