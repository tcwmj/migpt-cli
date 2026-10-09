import type { ThinkService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { PROVIDERS, PROVIDER_PRESETS } from '../../constants.ts'
import { Button, Field, Tag } from '../../components/atoms/index.ts'
import type { ThinkDraft } from '../drafts.ts'

export function ThinkServiceForm(props: {
  thinkDraft: ThinkDraft
  selThink: string | null
  thinkSvcs: ThinkService[]
  usageThink: (id: string) => number
  onDraft: (d: ThinkDraft | null) => void
  onEdit: (e: boolean) => void
  onSelect: (id: string | null) => void
  onSave: () => void
  onClearLimitReached?: () => void
}) {
  const {
    thinkDraft,
    selThink,
    thinkSvcs,
    usageThink,
    onDraft,
    onEdit,
    onSelect,
  } = props
  const currentSvc = selThink ? thinkSvcs.find((s) => s.id === selThink) : null
  return (
    <div className="form-card">
      <h3>
        <I n="bolt" size={17} /> {selThink ? '编辑思考服务' : '新建思考服务'}
        <span className="refs">
          {selThink
            ? `被 ${usageThink(selThink)} 台设备引用 · 修改模型 / 温度后热生效`
            : '配置模型供应商与端点，作为音箱的「大脑」'}
        </span>
      </h3>
      <div className="desc">
        {selThink
          ? '修改大脑配置；已绑定设备热生效。'
          : '配置模型供应商与端点，作为音箱的「大脑」。'}
      </div>
      <div className="grp">
        <h4>基本信息</h4>
        <div className="row">
          <Field label="服务名称" required>
            <input
              value={thinkDraft.name}
              placeholder="例如：豆包 Doubao-Seed"
              onChange={(e) => onDraft({ ...thinkDraft, name: e.target.value })}
            />
          </Field>
          <Field label="供应商" required>
            <select
              value={thinkDraft.provider}
              onChange={(e) => {
                const p = e.target.value
                const preset = PROVIDER_PRESETS[p]
                const prev = PROVIDER_PRESETS[thinkDraft.provider]
                onDraft({
                  ...thinkDraft,
                  provider: p,
                  baseUrl: preset?.baseUrl || '',
                  model:
                    thinkDraft.model && thinkDraft.model !== prev?.model
                      ? thinkDraft.model
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
        </div>
      </div>
      <div className="grp">
        <h4>模型配置</h4>
        <div className="row">
          <Field
            label="接口地址"
            tip="选「自定义」时可手动填写；其他供应商自动填充官方地址，可随供应商自动带出"
          >
            {thinkDraft.provider === 'custom' ? (
              <input
                value={thinkDraft.baseUrl}
                placeholder="https://api.example.com/v1"
                onChange={(e) =>
                  onDraft({ ...thinkDraft, baseUrl: e.target.value })
                }
              />
            ) : (
              <input
                value={
                  thinkDraft.baseUrl ||
                  PROVIDER_PRESETS[thinkDraft.provider]?.baseUrl ||
                  ''
                }
                readOnly
                disabled
                placeholder="选择供应商后自动填充"
              />
            )}
          </Field>
          <Field
            label="模型端点"
            required
            tip="切换供应商自动带出示例模型，可修改"
          >
            <input
              value={thinkDraft.model}
              placeholder="ep-xxxxxxxx 或模型名"
              onChange={(e) =>
                onDraft({ ...thinkDraft, model: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="row">
          <Field label="API Key">
            <input
              value={thinkDraft.apiKey}
              placeholder={selThink ? '留空则保留原 Key' : 'ark- 开头的密钥'}
              onChange={(e) =>
                onDraft({ ...thinkDraft, apiKey: e.target.value })
              }
            />
          </Field>
          <Field label="温度" tip="取值范围 0–1，越高回答越发散">
            <input
              value={thinkDraft.temperature}
              onChange={(e) =>
                onDraft({ ...thinkDraft, temperature: e.target.value })
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
              value={thinkDraft.tokenInputUsed ?? ''}
              placeholder="0"
              onChange={(e) =>
                onDraft({ ...thinkDraft, tokenInputUsed: e.target.value })
              }
            />
          </Field>
          <Field label="输出 Token">
            <input
              type="number"
              min="0"
              value={thinkDraft.tokenOutputUsed ?? ''}
              placeholder="0"
              onChange={(e) =>
                onDraft({ ...thinkDraft, tokenOutputUsed: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="row">
          <Field label="合计 Token">
            <input
              type="number"
              min="0"
              value={thinkDraft.tokenUsed ?? ''}
              placeholder="0"
              onChange={(e) =>
                onDraft({ ...thinkDraft, tokenUsed: e.target.value })
              }
            />
          </Field>
          <Field label="Token 上限">
            <input
              type="number"
              min="0"
              value={thinkDraft.tokenLimit ?? ''}
              placeholder="不限"
              onChange={(e) =>
                onDraft({ ...thinkDraft, tokenLimit: e.target.value })
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
            selThink
              ? onEdit(false)
              : thinkSvcs.length
                ? onSelect(thinkSvcs[0].id)
                : onDraft(null)
          }
        >
          取消
        </Button>
        <Button
          variant="primary"
          icon="check"
          onClick={props.onSave}
          disabled={!thinkDraft.name || !thinkDraft.model}
        >
          保存
        </Button>
      </div>
    </div>
  )
}
