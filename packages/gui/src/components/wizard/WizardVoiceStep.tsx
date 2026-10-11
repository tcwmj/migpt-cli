/* 向导第 4 步：语音服务（单选，决定音箱发音音色，绑定后支持热切） */
import { useEffect, useRef, useState } from 'react'
import { type Voice } from '../../apis.ts'
import { I } from '../../icons.tsx'
import {
  TTS_ENGINES,
  VOICE_PROVIDERS,
  voiceFormFromTts,
} from '../../constants.ts'
import { Button, EmptyState, ProviderLogo, Tag } from '../atoms/index.ts'
import { VoiceForm } from '../../views/voices/VoiceForm.tsx'
import type { VoiceDraft } from '../../views/drafts.ts'
import type { WizardSetDraft } from './types.ts'

/** 新建草稿：统一语音表单字段，切换供应商自动收敛必填项 */
const blankVoice = (): VoiceDraft => ({
  ...voiceFormFromTts(null),
  name: '',
  timbreId: '',
})

export function WizardVoiceStep(props: {
  active: boolean
  voices: Voice[]
  voiceId: string
  setDraft: WizardSetDraft
  onNewVoice: (d: VoiceDraft) => Promise<Voice>
}) {
  const { voices, voiceId, setDraft, onNewVoice } = props
  const [form, setForm] = useState<VoiceDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const sel = voices.find((v) => v.id === voiceId)

  // 进入本步且有可用服务时预选第一个（通常为内置默认语音）；每次进入只补一次
  const prefilled = useRef(false)
  useEffect(() => {
    if (!props.active) {
      prefilled.current = false
      return
    }
    if (prefilled.current || !voices.length) return
    prefilled.current = true
    if (!voiceId) setDraft({ voiceId: voices[0].id })
  }, [props.active, voices, voiceId, setDraft])

  const saveVoice = async () => {
    if (!form || busy) return
    setBusy(true)
    setErr('')
    try {
      const created = await onNewVoice(form)
      setDraft({ voiceId: created.id })
      setForm(null)
    } catch (e) {
      setErr((e as Error).message || '保存语音服务失败')
    } finally {
      setBusy(false)
    }
  }
  const openForm = () => {
    setForm(blankVoice())
    setErr('')
  }

  return (
    <div className={'step' + (props.active ? ' on' : '')}>
      <div className="split wsplit">
        <aside className="slist">
          {voices.length === 0 && (
            <EmptyState
              icon="mic"
              title="还没有语音服务"
              desc="新建一个语音服务，为音箱提供音色。"
              style={{ padding: '16px' }}
            />
          )}
          {voices.map((s) => {
            const p = s.builtin ? undefined : VOICE_PROVIDERS[s.provider]
            return (
              <div
                key={s.id}
                className={'li' + (s.id === voiceId ? ' on' : '')}
                onClick={() => setDraft({ voiceId: s.id })}
              >
                {p ? (
                  <span className="ic v pv">
                    <ProviderLogo p={p} size={20} />
                  </span>
                ) : (
                  <span className="ic v">
                    <I n="mic" />
                  </span>
                )}
                <span className="txt">
                  <b>{s.name}</b>
                  <span>
                    {s.builtin
                      ? '小米内置音色'
                      : (TTS_ENGINES[s.provider] || s.provider) +
                        (s.timbreId ? ' · ' + s.timbreId : '')}
                  </span>
                </span>
                {s.builtin ? <Tag tone="builtin">内置</Tag> : null}
                {s.id === voiceId && (
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
            onClick={openForm}
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
              <VoiceForm
                voiceDraft={form}
                selVoice={null}
                voices={voices}
                usageVoice={() => 0}
                onDraft={setForm}
                onEdit={() => undefined}
                onSelect={(id) => {
                  setForm(null)
                  setErr('')
                  if (id) setDraft({ voiceId: id })
                }}
                onSave={saveVoice}
              />
            </>
          ) : sel ? (
            <div className="form-card">
              <h3>
                <I n="mic" size={17} /> 语音服务详情
                {sel.builtin && <Tag tone="builtin">内置</Tag>}
              </h3>
              <div className="desc">
                决定音箱的发音音色；绑定设备后支持热切。
              </div>
              <div className="ro">
                <div className="rr">
                  <span className="k">服务名称</span>
                  <span className="v">{sel.name || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">供应商</span>
                  <span className="v">
                    {sel.builtin
                      ? '小米内置'
                      : TTS_ENGINES[sel.provider] || sel.provider}
                  </span>
                </div>
                <div className="rr">
                  <span className="k">音色</span>
                  <span className="v">{sel.timbreId || '引擎默认音色'}</span>
                </div>
                <div className="rr">
                  <span className="k">凭据</span>
                  <span className="v">
                    {sel.builtin
                      ? '无需配置'
                      : sel.hasTtsToken
                        ? '已配置'
                        : '未配置'}
                  </span>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <Button icon="plus" onClick={openForm}>
                  新建语音服务
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="mic"
              title="选择语音服务"
              desc="从左侧列表选择一套音色；也可新建第三方语音。"
              action={
                <Button variant="primary" icon="plus" onClick={openForm}>
                  新建
                </Button>
              }
            />
          )}
        </section>
      </div>
    </div>
  )
}
