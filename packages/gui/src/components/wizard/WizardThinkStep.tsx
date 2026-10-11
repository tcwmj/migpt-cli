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
  }, [props.active, models, modelIds, setDraft])

  const toggle = (id: string) =>
    setDraft({
      modelIds: modelIds.includes(id)
        ? modelIds.filter((x) => x !== id)
        : [...modelIds, id],
    })
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
                onClick={() => toggle(s.id)}
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
          ) : (
            <div className="form-card">
              <h3>
                <I n="bolt" size={17} /> 已选思考服务
                <span className="refs">
                  {selected.length
                    ? `共 ${selected.length} 个 · 第 1 个最优先`
                    : '未选择'}
                </span>
              </h3>
              <div className="desc">
                按顺序组成 failover 链：某个服务限额已达时自动切换下一个。
              </div>
              {selected.length ? (
                <div className="sel-list">
                  {selected.map((s, i) => {
                    const p = MODEL_PROVIDERS[s.provider]
                    return (
                      <div className="si" key={s.id}>
                        <span className="no">{i + 1}</span>
                        <span className="txt">
                          <b>{s.name}</b>
                          <span>
                            {(p?.name || s.provider) + ' · ' + s.model}
                          </span>
                        </span>
                        {s.limitReached && <Tag tone="bad">限额</Tag>}
                        <span className="ops">
                          <button
                            className="icon-btn"
                            title="提高优先级"
                            disabled={i === 0}
                            onClick={() => move(s.id, -1)}
                          >
                            <I n="up" size={15} />
                          </button>
                          <button
                            className="icon-btn"
                            title="降低优先级"
                            disabled={i === selected.length - 1}
                            onClick={() => move(s.id, 1)}
                          >
                            <I n="down" size={15} />
                          </button>
                          <button
                            className="icon-btn"
                            title="移除"
                            onClick={() => toggle(s.id)}
                          >
                            <I n="x" size={15} />
                          </button>
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  icon="bolt"
                  title="还没有选择思考服务"
                  desc="从左侧列表点击选择，可多选并调整优先级。"
                  action={
                    <Button
                      variant="primary"
                      icon="plus"
                      onClick={() => {
                        setForm(blankThink())
                        setErr('')
                      }}
                    >
                      新建
                    </Button>
                  }
                />
              )}
              <div className="acts">
                <span className="sp" />
                <Button
                  icon="plus"
                  onClick={() => {
                    setForm(blankThink())
                    setErr('')
                  }}
                >
                  新建思考服务
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
