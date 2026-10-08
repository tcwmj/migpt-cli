import { TTS_ENGINES } from '../../constants.ts'
import type { ModalFormProps } from './types.ts'

export function VoiceForm({ v, setV }: ModalFormProps) {
  return (
    <>
      <div className="fld row">
        <label>
          服务名称<span className="req">*</span>
        </label>
        <input
          value={v.name || ''}
          placeholder="例如：豆包语音"
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </div>
      <div className="fld row">
        <label>
          供应商<span className="req">*</span>
        </label>
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
      </div>
      <div className="fld row">
        <label>音色</label>
        <input
          value={v.voiceId || ''}
          placeholder="选择或输入音色 ID"
          onChange={(e) => setV({ ...v, voiceId: e.target.value })}
        />
        <span className="hint">留空使用该引擎的默认音色</span>
      </div>
      {v.provider === 'edge' && (
        <div className="fld row">
          <label>访问令牌</label>
          <input
            value={v.edgeToken || ''}
            placeholder="留空由 Edge 自动获取"
            onChange={(e) => setV({ ...v, edgeToken: e.target.value })}
          />
        </div>
      )}
      {v.provider === 'volcano' && (
        <>
          <div className="fld row">
            <label>
              App ID<span className="req">*</span>
            </label>
            <input
              value={v.volcanoAppId || ''}
              placeholder="火山引擎语音合成 App ID"
              onChange={(e) => setV({ ...v, volcanoAppId: e.target.value })}
            />
          </div>
          <div className="fld row">
            <label>
              访问令牌<span className="req">*</span>
            </label>
            <input
              value={v.volcanoToken || ''}
              placeholder="火山引擎 Access Token"
              onChange={(e) => setV({ ...v, volcanoToken: e.target.value })}
            />
          </div>
        </>
      )}
      {v.provider === 'openai' && (
        <>
          <div className="fld row">
            <label>
              API Key<span className="req">*</span>
            </label>
            <input
              value={v.openaiKey || ''}
              placeholder="OpenAI API Key"
              onChange={(e) => setV({ ...v, openaiKey: e.target.value })}
            />
          </div>
          <div className="fld row">
            <label>模型</label>
            <input
              value={v.openaiModel || ''}
              placeholder="tts-1"
              onChange={(e) => setV({ ...v, openaiModel: e.target.value })}
            />
          </div>
          <div className="fld row">
            <label>接口地址</label>
            <input
              value={v.openaiBaseUrl || ''}
              placeholder="https://api.openai.com/v1"
              onChange={(e) => setV({ ...v, openaiBaseUrl: e.target.value })}
            />
          </div>
        </>
      )}
      {v.provider === 'custom' && (
        <div className="fld">
          <label>TTS 配置（JSON）</label>
          <textarea
            rows={4}
            value={v.customJson || ''}
            placeholder='{"edge":{"trustedToken":"…"}}'
            onChange={(e) => setV({ ...v, customJson: e.target.value })}
          />
          <span className="hint">高级用法：直接填写 mi-gpt TTSConfig JSON</span>
        </div>
      )}
    </>
  )
}
