import type { Model } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { MODEL_PROVIDERS, PROVIDER_PRESETS } from '../../constants.ts'
import {
  Button,
  Field,
  ProviderPicker,
  Tag,
} from '../../components/atoms/index.ts'
import type { ModelDraft } from '../drafts.ts'

export function ModelForm(props: {
  modelDraft: ModelDraft
  selModel: string | null
  models: Model[]
  usageModel: (id: string) => number
  onDraft: (d: ModelDraft | null) => void
  onEdit: (e: boolean) => void
  onSelect: (id: string | null) => void
  onSave: () => void
  onClearLimitReached?: () => void
}) {
  const {
    modelDraft,
    selModel,
    models,
    usageModel,
    onDraft,
    onEdit,
    onSelect,
  } = props
  const currentSvc = selModel ? models.find((s) => s.id === selModel) : null
  const preset = MODEL_PROVIDERS[modelDraft.provider]
  const dlId = `model-list-${modelDraft.provider || 'custom'}`
  return (
    <div className="form-card">
      <h3>
        <I n="bolt" size={17} /> {selModel ? '编辑模型' : '新建模型'}
        <span className="refs">
          {selModel
            ? `被 ${usageModel(selModel)} 台设备引用 · 修改模型 / 温度后热生效`
            : '配置模型供应商与端点，作为音箱的「大脑」'}
        </span>
      </h3>
      <div className="desc">
        {selModel
          ? '修改大脑配置；已绑定设备热生效。'
          : '配置模型供应商与端点，作为音箱的「大脑」。'}
      </div>
      <div className="grp">
        <h4>基本信息</h4>
        <div className="row">
          <Field label="模型名称" required>
            <input
              value={modelDraft.name}
              placeholder="例如：豆包 Doubao-Seed"
              onChange={(e) => onDraft({ ...modelDraft, name: e.target.value })}
            />
          </Field>
        </div>
      </div>
      <div className="grp">
        <h4>模型配置</h4>
        <div className="row">
          <Field
            label="供应商"
            required
            tip={
              (preset?.badge ? `${preset.badge}；` : '') +
              '选择供应商自动带出官方接口地址与示例模型，后续均可修改'
            }
          >
            <ProviderPicker
              providers={MODEL_PROVIDERS}
              value={modelDraft.provider}
              onPick={(p) => {
                const pp = PROVIDER_PRESETS[p]
                const pre = PROVIDER_PRESETS[modelDraft.provider]
                onDraft({
                  ...modelDraft,
                  provider: p,
                  baseUrl: pp?.baseUrl || '',
                  model:
                    modelDraft.model && modelDraft.model !== pre?.model
                      ? modelDraft.model
                      : pp?.model || '',
                })
              }}
            />
          </Field>
          <Field
            label="接口地址"
            required
            tip="已按供应商自动填充官方地址，如有代理 / 网关可自行修改"
          >
            <input
              value={
                modelDraft.baseUrl ||
                PROVIDER_PRESETS[modelDraft.provider]?.baseUrl ||
                ''
              }
              placeholder={
                modelDraft.provider === 'custom'
                  ? 'https://api.example.com/v1'
                  : '选择供应商后自动填充'
              }
              onChange={(e) =>
                onDraft({ ...modelDraft, baseUrl: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="row">
          <Field
            label="模型端点"
            required
            tip="切换供应商自动带出示例模型，可输入任意模型名"
          >
            <>
              <input
                value={modelDraft.model}
                list={dlId}
                placeholder={
                  modelDraft.provider === 'custom'
                    ? '模型名或 ep-xxxxxxxx'
                    : preset?.model || ''
                }
                onChange={(e) =>
                  onDraft({ ...modelDraft, model: e.target.value })
                }
              />
              {!!preset?.models?.length && (
                <datalist id={dlId}>
                  {preset.models.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              )}
            </>
          </Field>
          <Field label="API Key" required>
            <input
              value={modelDraft.apiKey}
              placeholder={
                currentSvc?.hasApiKey
                  ? '已配置 · 留空保持不变'
                  : '以 sk- / ark- 等开头的密钥'
              }
              onChange={(e) =>
                onDraft({ ...modelDraft, apiKey: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="row">
          <Field label="温度" required tip="取值范围 0–1，越高回答越发散">
            <input
              value={modelDraft.temperature}
              onChange={(e) =>
                onDraft({ ...modelDraft, temperature: e.target.value })
              }
            />
          </Field>
        </div>
      </div>
      <div className="grp">
        <h4>Token 管理</h4>
        <div className="row">
          <Field label="输入 Token">
            <input
              type="number"
              min="0"
              value={modelDraft.inputTokensUsed ?? ''}
              placeholder="0"
              onChange={(e) =>
                onDraft({ ...modelDraft, inputTokensUsed: e.target.value })
              }
            />
          </Field>
          <Field label="输出 Token">
            <input
              type="number"
              min="0"
              value={modelDraft.outputTokensUsed ?? ''}
              placeholder="0"
              onChange={(e) =>
                onDraft({ ...modelDraft, outputTokensUsed: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="row">
          <Field label="合计 Token">
            <input
              type="number"
              min="0"
              value={modelDraft.totalTokensUsed ?? ''}
              placeholder="0"
              onChange={(e) =>
                onDraft({ ...modelDraft, totalTokensUsed: e.target.value })
              }
            />
          </Field>
          <Field label="Token 上限">
            <input
              type="number"
              min="0"
              value={modelDraft.tokenLimit || ''}
              placeholder="不限"
              onChange={(e) =>
                onDraft({ ...modelDraft, tokenLimit: e.target.value })
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
            selModel
              ? onEdit(false)
              : models.length
                ? onSelect(models[0].id)
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
            !modelDraft.name ||
            !modelDraft.provider ||
            !(
              modelDraft.baseUrl ||
              PROVIDER_PRESETS[modelDraft.provider]?.baseUrl
            ) ||
            !modelDraft.model ||
            !modelDraft.temperature ||
            (!selModel && !modelDraft.apiKey)
          }
        >
          保存
        </Button>
      </div>
    </div>
  )
}
