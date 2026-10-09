import type { VoiceService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { VOICE_PROVIDERS } from '../../constants.ts'
import {
  Button,
  Field,
  ProviderPicker,
  Tag,
} from '../../components/atoms/index.ts'
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
  onClearLimitReached?: () => void
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
  const currentSvc = selVoice ? voiceSvcs.find((s) => s.id === selVoice) : null
  const p = VOICE_PROVIDERS[voiceDraft.provider]
  const engine = p?.engine || 'edge'
  const compat = engine === 'openai-compat'
  const dlId = `voice-models-${voiceDraft.provider || 'edge'}`
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
        </div>
        <Field
          label="供应商"
          required
          tip="仅列出可驱动的语音引擎；OpenAI 兼容供应商改「接口地址」即可接入"
        >
          <ProviderPicker
            providers={VOICE_PROVIDERS}
            value={voiceDraft.provider}
            onPick={(k) => onDraft({ ...voiceDraft, provider: k })}
          />
        </Field>
      </div>
      {voiceDraft.provider !== 'custom' && (
        <div className="grp">
          <h4>音色配置</h4>
          <div className="row">
            {(engine === 'openai' || compat) && (
              <Field
                label="接口地址"
                tip={
                  compat
                    ? '已自动带出官方 OpenAI 兼容地址，可改网关'
                    : '支持任意 OpenAI 兼容 TTS 端点'
                }
              >
                <input
                  value={voiceDraft.baseUrl}
                  placeholder={p?.baseUrl || 'https://api.openai.com/v1'}
                  onChange={(e) =>
                    onDraft({ ...voiceDraft, baseUrl: e.target.value })
                  }
                />
              </Field>
            )}
            {(engine === 'openai' || compat) && (
              <Field
                label={compat ? '语音模型' : '模型'}
                tip={
                  compat
                    ? '留空使用供应商默认语音模型'
                    : '留空使用 tts-1，可改任意 OpenAI 兼容模型'
                }
              >
                <>
                  <input
                    value={voiceDraft.model}
                    list={dlId}
                    placeholder={p?.model || 'tts-1'}
                    onChange={(e) =>
                      onDraft({ ...voiceDraft, model: e.target.value })
                    }
                  />
                  {!!p?.models?.length && (
                    <datalist id={dlId}>
                      {p.models.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  )}
                </>
              </Field>
            )}
            {(engine === 'openai' || compat) && (
              <Field label="API Key" required>
                <input
                  value={voiceDraft.token}
                  placeholder="以 sk- 等开头的密钥"
                  onChange={(e) =>
                    onDraft({ ...voiceDraft, token: e.target.value })
                  }
                />
              </Field>
            )}
            <Field label="音色 ID" tip="留空使用该引擎的默认音色">
              <input
                value={voiceDraft.voiceId}
                placeholder="例如：zh-CN-XiaoxiaoNeural"
                onChange={(e) =>
                  onDraft({ ...voiceDraft, voiceId: e.target.value })
                }
              />
            </Field>
            {engine === 'edge' && (
              <Field
                label="访问令牌"
                tip="Edge 大声朗读为免费服务，一般无需填写"
              >
                <input
                  value={voiceDraft.token}
                  placeholder="留空由 Edge 自动获取"
                  onChange={(e) =>
                    onDraft({ ...voiceDraft, token: e.target.value })
                  }
                />
              </Field>
            )}
            {engine === 'volcano' && (
              <Field label="App ID" required>
                <input
                  value={voiceDraft.appId}
                  placeholder="火山引擎语音合成 App ID"
                  onChange={(e) =>
                    onDraft({ ...voiceDraft, appId: e.target.value })
                  }
                />
              </Field>
            )}
            {engine === 'volcano' && (
              <Field label="访问令牌" required>
                <input
                  value={voiceDraft.token}
                  placeholder="火山引擎 Access Token"
                  onChange={(e) =>
                    onDraft({ ...voiceDraft, token: e.target.value })
                  }
                />
              </Field>
            )}
          </div>
        </div>
      )}
      {voiceDraft.provider === 'custom' && (
        <div className="grp">
          <h4>音色配置</h4>
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
        </div>
      )}
      <div className="grp">
        <h4>Token 管理</h4>
        <div className="row">
          <Field label="输入 Token">
            <input
              type="number"
              min="0"
              value={voiceDraft.tokenInputUsed ?? ''}
              placeholder="0"
              onChange={(e) =>
                onDraft({ ...voiceDraft, tokenInputUsed: e.target.value })
              }
            />
          </Field>
          <Field label="输出 Token">
            <input
              type="number"
              min="0"
              value={voiceDraft.tokenOutputUsed ?? ''}
              placeholder="0"
              onChange={(e) =>
                onDraft({ ...voiceDraft, tokenOutputUsed: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="row">
          <Field label="合计 Token">
            <input
              type="number"
              min="0"
              value={voiceDraft.tokenUsed ?? ''}
              placeholder="0"
              onChange={(e) =>
                onDraft({ ...voiceDraft, tokenUsed: e.target.value })
              }
            />
          </Field>
          <Field label="Token 上限">
            <input
              type="number"
              min="0"
              value={voiceDraft.tokenLimit || ''}
              placeholder="不限"
              onChange={(e) =>
                onDraft({ ...voiceDraft, tokenLimit: e.target.value })
              }
            />
          </Field>
        </div>
        {currentSvc?.limitReached && (
          <div className="row">
            <div className="rr">
              <Tag tone="bad">限额已达</Tag>
              {props.onClearLimitReached && (
                <Button variant="ghost" onClick={props.onClearLimitReached}>
                  清除限额标记
                </Button>
              )}
            </div>
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
            (engine === 'volcano' &&
              (!voiceDraft.appId || !voiceDraft.token)) ||
            ((engine === 'openai' || compat) && !voiceDraft.token)
          }
        >
          保存
        </Button>
      </div>
    </div>
  )
}
