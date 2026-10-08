import type { VoiceService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { TTS_ENGINES } from '../../constants.ts'
import { Button, Field } from '../../components/atoms/index.ts'
import type { VoiceDraft } from '../drafts.ts'

export function VoiceServiceForm(props: {
  voiceDraft: VoiceDraft
  selVoice: string | null
  voiceSvcs: VoiceService[]
  usageVoice: (id: string) => number
  onDraft: (d: VoiceDraft | null) => void
  onEdit: (e: boolean) => void
  onSelect: (id: string | null) => void
  onSave: () => void
}) {
  const {
    voiceDraft,
    selVoice,
    voiceSvcs,
    usageVoice,
    onDraft,
    onEdit,
    onSelect,
  } = props
  return (
    <div className="form-card">
      <h3>
        <I n="mic" size={17} /> {selVoice ? '编辑语音服务' : '新建语音服务'}
        <span className="refs">
          {selVoice
            ? `被 ${usageVoice(selVoice)} 台设备引用 · 支持热切「把声音换成…」`
            : '接入第三方语音模型，为对话角色提供音色'}
        </span>
      </h3>
      <div className="desc">
        {selVoice
          ? '修改音色配置；已绑定设备支持热切。'
          : '接入第三方语音模型，为对话角色提供音色。'}
      </div>
      <div className="grp">
        <h4>基本信息</h4>
        <div className="row">
          <Field label="服务名称" required>
            <input
              value={voiceDraft.name}
              placeholder="例如：豆包语音"
              onChange={(e) => onDraft({ ...voiceDraft, name: e.target.value })}
            />
          </Field>
          <Field label="供应商" required>
            <select
              value={voiceDraft.provider}
              onChange={(e) =>
                onDraft({ ...voiceDraft, provider: e.target.value })
              }
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
        </div>
      </div>
      <div className="grp">
        <h4>音色配置</h4>
        <div className="row">
          <Field label="音色 ID" tip="留空使用该引擎的默认音色">
            <input
              value={voiceDraft.voiceId}
              placeholder="例如：zh-CN-XiaoxiaoNeural"
              onChange={(e) =>
                onDraft({ ...voiceDraft, voiceId: e.target.value })
              }
            />
          </Field>
          {voiceDraft.provider === 'edge' && (
            <Field label="访问令牌" tip="Edge 大声朗读为免费服务，一般无需填写">
              <input
                value={voiceDraft.edgeToken}
                placeholder="留空由 Edge 自动获取"
                onChange={(e) =>
                  onDraft({ ...voiceDraft, edgeToken: e.target.value })
                }
              />
            </Field>
          )}
          {voiceDraft.provider === 'volcano' && (
            <Field label="App ID" required>
              <input
                value={voiceDraft.volcanoAppId}
                placeholder="火山引擎语音合成 App ID"
                onChange={(e) =>
                  onDraft({ ...voiceDraft, volcanoAppId: e.target.value })
                }
              />
            </Field>
          )}
          {voiceDraft.provider === 'openai' && (
            <Field label="API Key" required>
              <input
                value={voiceDraft.openaiKey}
                placeholder="OpenAI API Key"
                onChange={(e) =>
                  onDraft({ ...voiceDraft, openaiKey: e.target.value })
                }
              />
            </Field>
          )}
        </div>
        {voiceDraft.provider === 'volcano' && (
          <div className="row">
            <Field label="访问令牌" required>
              <input
                value={voiceDraft.volcanoToken}
                placeholder="火山引擎 Access Token"
                onChange={(e) =>
                  onDraft({ ...voiceDraft, volcanoToken: e.target.value })
                }
              />
            </Field>
          </div>
        )}
        {voiceDraft.provider === 'openai' && (
          <div className="row">
            <Field label="模型" tip="留空使用 tts-1">
              <input
                value={voiceDraft.openaiModel}
                placeholder="tts-1"
                onChange={(e) =>
                  onDraft({ ...voiceDraft, openaiModel: e.target.value })
                }
              />
            </Field>
            <Field label="接口地址" tip="支持任意 OpenAI 兼容 TTS 端点">
              <input
                value={voiceDraft.openaiBaseUrl}
                placeholder="https://api.openai.com/v1"
                onChange={(e) =>
                  onDraft({ ...voiceDraft, openaiBaseUrl: e.target.value })
                }
              />
            </Field>
          </div>
        )}
        {voiceDraft.provider === 'custom' && (
          <div className="row">
            <Field
              label="TTS 配置（JSON）"
              tip="高级用法：直接填写 mi-gpt TTSConfig JSON"
            >
              <textarea
                value={voiceDraft.customJson}
                placeholder='{"edge":{"trustedToken":"…"}}'
                onChange={(e) =>
                  onDraft({ ...voiceDraft, customJson: e.target.value })
                }
                rows={5}
              />
            </Field>
          </div>
        )}
      </div>
      <div className="acts">
        <span className="sp" />
        <Button
          variant="ghost"
          onClick={() =>
            selVoice
              ? onEdit(false)
              : voiceSvcs.length
                ? onSelect(voiceSvcs[0].id)
                : onDraft(null)
          }
        >
          取消
        </Button>
        <Button
          variant="primary"
          icon="check"
          onClick={props.onSave}
          disabled={
            !voiceDraft.name ||
            (voiceDraft.provider === 'volcano' &&
              (!voiceDraft.volcanoAppId || !voiceDraft.volcanoToken)) ||
            (voiceDraft.provider === 'openai' && !voiceDraft.openaiKey)
          }
        >
          保存
        </Button>
      </div>
    </div>
  )
}
