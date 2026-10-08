import { TTS_ENGINES } from '../../constants.ts'
import { Field } from '../atoms/index.ts'
import type { ModalFormProps } from './types.ts'

export function VoiceForm({ v, setV }: ModalFormProps) {
  return (
    <>
      <Field row label="服务名称" required>
        <input
          value={v.name || ''}
          placeholder="例如：豆包语音"
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </Field>
      <Field row label="供应商" required>
        <select
          value={v.provider || 'edge'}
          onChange={(e) => setV({ ...v, provider: e.target.value })}
        >
          {Object.entries(TTS_ENGINES)
            .filter(([k]) => k !== 'builtin')
            .map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
        </select>
      </Field>
      <Field row label="音色" hint="留空使用该引擎的默认音色">
        <input
          value={v.voiceId || ''}
          placeholder="选择或输入音色 ID"
          onChange={(e) => setV({ ...v, voiceId: e.target.value })}
        />
      </Field>
      {v.provider === 'edge' && (
        <Field row label="访问令牌">
          <input
            value={v.edgeToken || ''}
            placeholder="留空由 Edge 自动获取"
            onChange={(e) => setV({ ...v, edgeToken: e.target.value })}
          />
        </Field>
      )}
      {v.provider === 'volcano' && (
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
      {v.provider === 'openai' && (
        <>
          <Field row label="API Key" required>
            <input
              value={v.openaiKey || ''}
              placeholder="OpenAI API Key"
              onChange={(e) => setV({ ...v, openaiKey: e.target.value })}
            />
          </Field>
          <Field row label="模型">
            <input
              value={v.openaiModel || ''}
              placeholder="tts-1"
              onChange={(e) => setV({ ...v, openaiModel: e.target.value })}
            />
          </Field>
          <Field row label="接口地址">
            <input
              value={v.openaiBaseUrl || ''}
              placeholder="https://api.openai.com/v1"
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
