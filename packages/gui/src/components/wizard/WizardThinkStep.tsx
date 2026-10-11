/* 向导第 3 步：思考服务（有序多选，第一个最优先，限额已达时按序 failover） */
import { useEffect, useRef, useState } from 'react'
import { type Model } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { MODEL_PROVIDERS, PROVIDER_PRESETS } from '../../constants.ts'
import { Button, EmptyState, ProviderLogo, Tag } from '../atoms/index.ts'
import { ModelForm } from '../../views/models/ModelForm.tsx'
import type { ModelDraft } from '../../views/drafts.ts'
import type { WizardSetDraft } from './types.ts'

/** 新建草稿：默认自定义供应商，切换供应商后由表单自动带出地址与模型 */
const blankThink = (): ModelDraft => ({
  name: '',
  provider: 'custom',
  model: PROVIDER_PRESETS['custom']?.model || '',
  apiKey: '',
  temperature: '0.7',
  baseUrl: PROVIDER_PRESETS['custom']?.baseUrl || '',
})

export function WizardThinkStep(props: {
  active: boolean
  models: Model[]
  modelIds: string[]
  setDraft: WizardSetDraft
  onNewThink: (d: ModelDraft) => Promise<Model>
}) {
  const { models, modelIds, setDraft, onNewThink } = props
  const [form, setForm] = useState<ModelDraft | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // 进入本步且有可用服务时预选第一个，避免用户漏选导致无法进入下一步；
  // 每次进入只补一次，用户主动清空后不再回补
  const prefilled = useRef(false)
  useEffect(() => {
    if (!props.active) {
      prefilled.current = false
      return
    }
    if (prefilled.current || !models.length) return
    prefilled.current = true
    if (!modelIds.length) setDraft({ modelIds: [models[0].id] })
    if (!selectedId) setSelectedId(models[0].id)
  }, [props.active, models, modelIds, setDraft, selectedId])

  const toggle = (id: string) => {
    setDraft({
      modelIds: modelIds.includes(id)
        ? modelIds.filter((x) => x !== id)
        : [...modelIds, id],
    })
    setSelectedId(id)
  }

  /** 调整优先级：dir = -1 上移（更优先），1 下移 */
  const move = (id: string, dir: -1 | 1) => {
    const i = modelIds.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= modelIds.length) return
    const next = [...modelIds]
    next[i] = modelIds[j]
    next[j] = modelIds[i]
    setDraft({ modelIds: next })
  }

  const saveThink = async () => {
    if (!form || busy) return
    setBusy(true)
    setErr('')
    try {
      const created = await onNewThink(form)
      setDraft({ modelIds: [...modelIds, created.id] })
      setSelectedId(created.id)
      setForm(null)
    } catch (e) {
      setErr((e as Error).message || '保存思考服务失败')
    } finally {
      setBusy(false)
    }
  }

  // 按 modelIds 顺序还原已选项（顺序即优先级）
  const selected = modelIds
    .map((id) => models.find((m) => m.id === id))
    .filter((m): m is Model => !!m)

  const selectedModel = selectedId
    ? models.find((m) => m.id === selectedId)
    : null

  return (
    <div className={'step' + (props.active ? ' on' : '')}>
      <div className="split wsplit">
        <aside className="slist">
          {models.length === 0 && (
            <EmptyState
              icon="bolt"
              title="还没有思考服务"
              desc="新建一个模型服务，作为音箱的「大脑」。"
              style={{ padding: '16px' }}
            />
          )}
          {models.map((s) => {
            const on = modelIds.includes(s.id)
            const p = MODEL_PROVIDERS[s.provider]
            return (
              <div
                key={s.id}
                className={'li' + (on ? ' on' : '')}
                onClick={() => {
                  toggle(s.id)
                  setSelectedId(s.id)
                }}
              >
                {p ? (
                  <span className="ic t pv">
                    <ProviderLogo p={p} size={20} />
                  </span>
                ) : (
                  <span className="ic t">
                    <I n="bolt" />
                  </span>
                )}
                <span className="txt">
                  <b>{s.name}</b>
                  <span>{(p?.name || s.provider) + ' · ' + s.model}</span>
                </span>
                {s.limitReached && <Tag tone="bad">限额</Tag>}
                {on && (
                  <span className="wchk">
                    <I n="check" size={15} />
                  </span>
                )}
              </div>
            )
          })}
          <Button
            icon="plus"
            style={{ justifyContent: 'center', marginTop: 4 }}
            onClick={() => {
              setForm(blankThink())
              setErr('')
            }}
          >
            新建
          </Button>
        </aside>
        <section className="sdetail">
          {form ? (
            <>
              {err && (
                <div className="notice err">
                  <I n="warning" size={15} /> {err}
                </div>
              )}
              <ModelForm
                modelDraft={form}
                selModel={null}
                models={models}
                usageModel={() => 0}
                onDraft={setForm}
                onEdit={() => undefined}
                onSelect={() => {
                  setForm(null)
                  setErr('')
                }}
                onSave={saveThink}
              />
            </>
          ) : selectedModel ? (
            <div className="form-card">
              <h3>
                <I n="bolt" size={17} /> 思考服务详情
              </h3>
              <div className="desc">
                点击左侧列表项切换选中状态（多选）；按顺序组成 failover 链。
              </div>
              <div className="ro">
                <div className="rr">
                  <span className="k">服务名称</span>
                  <span className="v">{selectedModel.name || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">供应商</span>
                  <span className="v">
                    {MODEL_PROVIDERS[selectedModel.provider]?.name ||
                      selectedModel.provider}
                  </span>
                </div>
                <div className="rr">
                  <span className="k">模型</span>
                  <span className="v">{selectedModel.model || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">接口地址</span>
                  <span className="v">{selectedModel.baseUrl || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">温度</span>
                  <span className="v">{selectedModel.temperature ?? 0.7}</span>
                </div>
                <div className="rr">
                  <span className="k">API Key</span>
                  <span className="v">
                    {selectedModel.hasApiKey ? '已配置' : '未配置'}
                  </span>
                </div>
                {selectedModel.limitReached && (
                  <div className="rr">
                    <span className="k">状态</span>
                    <span className="v">
                      <Tag tone="bad">限额已达</Tag>
                    </span>
                  </div>
                )}
              </div>
              <div className="acts">
                <span className="sp" />
                <Button
                  variant="primary"
                  icon="pencil"
                  onClick={() => {
                    setForm({
                      name: selectedModel.name,
                      provider: selectedModel.provider,
                      model: selectedModel.model || '',
                      apiKey: '',
                      temperature: String(selectedModel.temperature ?? 0.7),
                      baseUrl: selectedModel.baseUrl || '',
                    })
                    setErr('')
                  }}
                >
                  编辑
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="bolt"
              title="选择思考服务"
              desc="从左侧列表点击选择，可多选并调整优先级。"
            />
          )}
        </section>
      </div>
    </div>
  )
}
