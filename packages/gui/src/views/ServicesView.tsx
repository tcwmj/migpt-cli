/* ══ ServicesView ══ */
import { I } from '../icons.tsx'
import type { ThinkService, VoiceService } from '../apis.ts'
import { PROVIDERS, PROVIDER_PRESETS, TTS_ENGINES } from '../constants.ts'
import type { ThinkDraft, VoiceDraft } from './drafts.ts'

export function ServicesView(props: {
  tab: 'think' | 'voice'
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  selThink: string | null
  selVoice: string | null
  thinkDraft: ThinkDraft | null
  voiceDraft: VoiceDraft | null
  thinkEdit: boolean
  voiceEdit: boolean
  selVoiceObj: VoiceService | null
  onSelectThink: (id: string | null) => void
  onDraftThink: (d: ThinkDraft | null) => void
  onEditThink: (e: boolean) => void
  onDeleteThink: (id: string) => void
  onSaveThink: () => void
  onSelectVoice: (id: string | null) => void
  onDraftVoice: (d: VoiceDraft | null) => void
  onEditVoice: (e: boolean) => void
  onDeleteVoice: (id: string) => void
  onResetVoice: (id: string) => void
  onSaveVoice: () => void
  usageThink: (id: string) => number
  usageVoice: (id: string) => number
}) {
  const {
    tab,
    thinkSvcs,
    voiceSvcs,
    selThink,
    selVoice,
    thinkDraft,
    voiceDraft,
    thinkEdit,
    voiceEdit,
    selVoiceObj,
    onSelectThink,
    onDraftThink,
    onEditThink,
    onDeleteThink,
    onSaveThink,
    onSelectVoice,
    onDraftVoice,
    onEditVoice,
    onDeleteVoice,
    onResetVoice,
    onSaveVoice,
    usageThink,
    usageVoice,
  } = props
  return (
    <section data-view="settings" className="on">
      {tab === 'think' && (
        <>
          <div className="filters">
            <span className="chip on">全部服务</span>
            <span className="sp">
              <span className="count">共 {thinkSvcs.length} 个</span>
            </span>
          </div>
          <div className="split">
            <aside className="slist">
              {thinkSvcs.map((s) => (
                <div
                  key={s.id}
                  className={'li' + (s.id === selThink ? ' on' : '')}
                  onClick={() => onSelectThink(s.id)}
                >
                  <span className="ic t">
                    <I n="bolt" />
                  </span>
                  <span className="txt">
                    <b>{s.name}</b>
                    <span>
                      {PROVIDERS[s.provider] || s.provider} · {s.model}
                    </span>
                  </span>
                  {s.isDefault && <span className="tag">默认</span>}
                </div>
              ))}
              <button
                className="btn"
                style={{ justifyContent: 'center', marginTop: 4 }}
                onClick={() => onSelectThink(null)}
              >
                <I n="plus" /> 新建
              </button>
            </aside>
            <section
              className="sdetail"
              key={'think-' + (selThink || 'new') + (thinkEdit ? '-e' : '-r')}
            >
              {thinkSvcs.length === 0 && !thinkDraft ? (
                <div className="empty">
                  <div className="art">
                    <I n="bolt" size={26} />
                  </div>
                  <b>还没有思考服务</b>
                  <span>
                    配置模型供应商与端点，作为音箱的「大脑」；配置后可在角色与设备中选择。
                  </span>
                  <button
                    className="btn primary"
                    onClick={() => onSelectThink(null)}
                  >
                    <I n="plus" /> 新建
                  </button>
                </div>
              ) : selThink && !thinkEdit ? (
                <div className="form-card">
                  <h3>
                    <I n="bolt" size={17} /> 思考服务详情
                    <span className="refs">
                      被 {usageThink(selThink)} 台设备引用 · 修改模型 /
                      温度后热生效
                    </span>
                  </h3>
                  <div className="desc">
                    音箱「大脑」的模型配置；修改后绑定设备热生效。
                  </div>
                  <div className="ro">
                    <div className="grp">
                      <h4>基本信息</h4>
                      <div className="row">
                        <div className="rr">
                          <span className="k">服务名称</span>
                          <span className="v">
                            {thinkSvcs.find((s) => s.id === selThink)?.name ||
                              '—'}
                          </span>
                        </div>
                        <div className="rr">
                          <span className="k">供应商</span>
                          <span className="v">
                            {PROVIDERS[
                              thinkSvcs.find((s) => s.id === selThink)
                                ?.provider || ''
                            ] ||
                              thinkSvcs.find((s) => s.id === selThink)
                                ?.provider ||
                              '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grp">
                      <h4>模型配置</h4>
                      <div className="row">
                        <div className="rr">
                          <span className="k">模型端点</span>
                          <span className="v">
                            {thinkSvcs.find((s) => s.id === selThink)?.model ||
                              '—'}
                          </span>
                        </div>
                        <div className="rr">
                          <span className="k">API Key</span>
                          <span className="v">
                            {thinkSvcs.find((s) => s.id === selThink)?.apiKey
                              ? '已保存'
                              : '未配置'}
                          </span>
                        </div>
                      </div>
                      <div className="row">
                        <div className="rr">
                          <span className="k">温度</span>
                          <span className="v">
                            {thinkSvcs.find((s) => s.id === selThink)
                              ?.temperature ?? 0.7}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="acts">
                    <span className="sp" />
                    <button
                      className="btn danger"
                      onClick={() => onDeleteThink(selThink || '')}
                    >
                      <I n="trash" /> 删除
                    </button>
                    <button
                      className="btn primary"
                      onClick={() => onEditThink(true)}
                    >
                      <I n="pencil" /> 编辑
                    </button>
                  </div>
                </div>
              ) : thinkDraft ? (
                <div className="form-card">
                  <h3>
                    <I n="bolt" size={17} />{' '}
                    {selThink ? '编辑思考服务' : '新建思考服务'}
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
                      <div className="fld">
                        <label>
                          服务名称<span className="req">*</span>
                        </label>
                        <input
                          value={thinkDraft.name}
                          placeholder="例如：豆包 Doubao-Seed"
                          onChange={(e) =>
                            onDraftThink({
                              ...thinkDraft,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="fld">
                        <label>
                          供应商<span className="req">*</span>
                        </label>
                        <select
                          value={thinkDraft.provider}
                          onChange={(e) => {
                            const p = e.target.value
                            const preset = PROVIDER_PRESETS[p]
                            const prev = PROVIDER_PRESETS[thinkDraft.provider]
                            onDraftThink({
                              ...thinkDraft,
                              provider: p,
                              baseUrl: preset?.baseUrl || '',
                              model:
                                thinkDraft.model &&
                                thinkDraft.model !== prev?.model
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
                      </div>
                    </div>
                  </div>
                  <div className="grp">
                    <h4>模型配置</h4>
                    <div className="row">
                      <div className="fld">
                        <label>
                          接口地址
                          <span
                            className="tip"
                            data-tip="选「自定义」时可手动填写；其他供应商自动填充官方地址，可随供应商自动带出"
                          >
                            ?
                          </span>
                        </label>
                        {thinkDraft.provider === 'custom' ? (
                          <input
                            value={thinkDraft.baseUrl}
                            placeholder="https://api.example.com/v1"
                            onChange={(e) =>
                              onDraftThink({
                                ...thinkDraft,
                                baseUrl: e.target.value,
                              })
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
                      </div>
                      <div className="fld">
                        <label>
                          模型端点<span className="req">*</span>
                          <span
                            className="tip"
                            data-tip="切换供应商自动带出示例模型，可修改"
                          >
                            ?
                          </span>
                        </label>
                        <input
                          value={thinkDraft.model}
                          placeholder="ep-xxxxxxxx 或模型名"
                          onChange={(e) =>
                            onDraftThink({
                              ...thinkDraft,
                              model: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="fld">
                        <label>API Key</label>
                        <input
                          value={thinkDraft.apiKey}
                          placeholder={
                            selThink ? '留空则保留原 Key' : 'ark- 开头的密钥'
                          }
                          onChange={(e) =>
                            onDraftThink({
                              ...thinkDraft,
                              apiKey: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="fld">
                        <label>
                          温度
                          <span
                            className="tip"
                            data-tip="取值范围 0–1，越高回答越发散"
                          >
                            ?
                          </span>
                        </label>
                        <input
                          value={thinkDraft.temperature}
                          onChange={(e) =>
                            onDraftThink({
                              ...thinkDraft,
                              temperature: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="acts">
                    <span className="sp" />
                    <button
                      className="btn ghost"
                      onClick={() =>
                        selThink
                          ? onEditThink(false)
                          : thinkSvcs.length
                            ? onSelectThink(thinkSvcs[0].id)
                            : onDraftThink(null)
                      }
                    >
                      取消
                    </button>
                    <button
                      className="btn primary"
                      onClick={onSaveThink}
                      disabled={!thinkDraft.name || !thinkDraft.model}
                    >
                      <I n="check" /> 保存
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </>
      )}

      {tab === 'voice' && (
        <>
          <div className="filters">
            <span className="chip on">全部服务</span>
            <span className="sp">
              <span className="count">共 {voiceSvcs.length} 个</span>
            </span>
          </div>
          <div className="split">
            <aside className="slist">
              {voiceSvcs.map((s) => (
                <div
                  key={s.id}
                  className={'li' + (s.id === selVoice ? ' on' : '')}
                  onClick={() => onSelectVoice(s.id)}
                >
                  <span className="ic v">
                    <I n="mic" />
                  </span>
                  <span className="txt">
                    <b>{s.name}</b>
                    <span>
                      {s.builtin
                        ? 'builtin · 全局默认音色'
                        : (TTS_ENGINES[s.provider] || s.provider) +
                          (s.voiceId ? ' · ' + s.voiceId : '')}
                    </span>
                  </span>
                  {s.builtin ? (
                    <span className="tag">内置</span>
                  ) : s.isDefault ? (
                    <span className="tag">默认</span>
                  ) : null}
                </div>
              ))}
              <button
                className="btn"
                style={{ justifyContent: 'center', marginTop: 4 }}
                onClick={() => onSelectVoice(null)}
              >
                <I n="plus" /> 新建
              </button>
            </aside>
            <section
              className="sdetail"
              key={'voice-' + (selVoice || 'new') + (voiceEdit ? '-e' : '-r')}
            >
              {voiceSvcs.length === 0 && !voiceDraft ? (
                <div className="empty">
                  <div className="art">
                    <I n="mic" size={26} />
                  </div>
                  <b>还没有语音服务</b>
                  <span>
                    接入第三方语音模型，为对话角色提供音色；每个语音服务可含多套音色库。
                  </span>
                  <button
                    className="btn primary"
                    onClick={() => onSelectVoice(null)}
                  >
                    <I n="plus" /> 新建
                  </button>
                </div>
              ) : selVoice && !voiceEdit ? (
                <div className="form-card">
                  <h3>
                    <I n="mic" size={17} /> 语音服务详情
                    <span className="refs">
                      被 {usageVoice(selVoice)} 台设备引用 ·
                      支持热切「把声音换成…」
                    </span>
                  </h3>
                  <div className="desc">
                    为对话角色提供音色的配置；修改后绑定设备支持热切。
                  </div>
                  <div className="ro">
                    <div className="grp">
                      <h4>基本信息</h4>
                      <div className="row">
                        <div className="rr">
                          <span className="k">服务名称</span>
                          <span className="v">
                            {voiceSvcs.find((s) => s.id === selVoice)?.name ||
                              '—'}
                          </span>
                        </div>
                        <div className="rr">
                          <span className="k">供应商</span>
                          <span className="v">
                            {voiceSvcs.find((s) => s.id === selVoice)?.builtin
                              ? '默认语音'
                              : TTS_ENGINES[
                                  voiceSvcs.find((s) => s.id === selVoice)
                                    ?.provider || ''
                                ] ||
                                voiceSvcs.find((s) => s.id === selVoice)
                                  ?.provider ||
                                '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grp">
                      <h4>音色</h4>
                      <div className="row">
                        <div className="rr">
                          <span className="k">音色 ID</span>
                          <span className="v">
                            {voiceSvcs.find((s) => s.id === selVoice)
                              ?.voiceId || '默认音色'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="acts">
                    <span className="sp" />
                    {selVoiceObj?.builtin && (
                      <button
                        className="btn"
                        onClick={() => onResetVoice(selVoice || '')}
                        title="恢复为系统内置默认配置"
                      >
                        <I n="arrow-counter-clockwise" /> 重置默认
                      </button>
                    )}
                    <button
                      className="btn danger"
                      disabled={!!selVoiceObj?.builtin}
                      onClick={() => onDeleteVoice(selVoice || '')}
                      title={selVoiceObj?.builtin ? '内置语音服务不可删除' : ''}
                    >
                      <I n="trash" /> 删除
                    </button>
                    <button
                      className="btn primary"
                      onClick={() => onEditVoice(true)}
                    >
                      <I n="pencil" /> 编辑
                    </button>
                  </div>
                </div>
              ) : voiceDraft ? (
                <div className="form-card">
                  <h3>
                    <I n="mic" size={17} />{' '}
                    {selVoice ? '编辑语音服务' : '新建语音服务'}
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
                      <div className="fld">
                        <label>
                          服务名称<span className="req">*</span>
                        </label>
                        <input
                          value={voiceDraft.name}
                          placeholder="例如：豆包语音"
                          onChange={(e) =>
                            onDraftVoice({
                              ...voiceDraft,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="fld">
                        <label>
                          供应商<span className="req">*</span>
                        </label>
                        <select
                          value={voiceDraft.provider}
                          onChange={(e) =>
                            onDraftVoice({
                              ...voiceDraft,
                              provider: e.target.value,
                            })
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
                      </div>
                    </div>
                  </div>
                  <div className="grp">
                    <h4>音色配置</h4>
                    <div className="row">
                      <div className="fld">
                        <label>
                          音色 ID
                          <span
                            className="tip"
                            data-tip="留空使用该引擎的默认音色"
                          >
                            ?
                          </span>
                        </label>
                        <input
                          value={voiceDraft.voiceId}
                          placeholder="例如：zh-CN-XiaoxiaoNeural"
                          onChange={(e) =>
                            onDraftVoice({
                              ...voiceDraft,
                              voiceId: e.target.value,
                            })
                          }
                        />
                      </div>
                      {voiceDraft.provider === 'edge' && (
                        <div className="fld">
                          <label>
                            访问令牌
                            <span
                              className="tip"
                              data-tip="Edge 大声朗读为免费服务，一般无需填写"
                            >
                              ?
                            </span>
                          </label>
                          <input
                            value={voiceDraft.edgeToken}
                            placeholder="留空由 Edge 自动获取"
                            onChange={(e) =>
                              onDraftVoice({
                                ...voiceDraft,
                                edgeToken: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                      {voiceDraft.provider === 'volcano' && (
                        <div className="fld">
                          <label>
                            App ID<span className="req">*</span>
                          </label>
                          <input
                            value={voiceDraft.volcanoAppId}
                            placeholder="火山引擎语音合成 App ID"
                            onChange={(e) =>
                              onDraftVoice({
                                ...voiceDraft,
                                volcanoAppId: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                      {voiceDraft.provider === 'openai' && (
                        <div className="fld">
                          <label>
                            API Key<span className="req">*</span>
                          </label>
                          <input
                            value={voiceDraft.openaiKey}
                            placeholder="OpenAI API Key"
                            onChange={(e) =>
                              onDraftVoice({
                                ...voiceDraft,
                                openaiKey: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                    {voiceDraft.provider === 'volcano' && (
                      <div className="row">
                        <div className="fld">
                          <label>
                            访问令牌<span className="req">*</span>
                          </label>
                          <input
                            value={voiceDraft.volcanoToken}
                            placeholder="火山引擎 Access Token"
                            onChange={(e) =>
                              onDraftVoice({
                                ...voiceDraft,
                                volcanoToken: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                    {voiceDraft.provider === 'openai' && (
                      <div className="row">
                        <div className="fld">
                          <label>
                            模型
                            <span className="tip" data-tip="留空使用 tts-1">
                              ?
                            </span>
                          </label>
                          <input
                            value={voiceDraft.openaiModel}
                            placeholder="tts-1"
                            onChange={(e) =>
                              onDraftVoice({
                                ...voiceDraft,
                                openaiModel: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="fld">
                          <label>
                            接口地址
                            <span
                              className="tip"
                              data-tip="支持任意 OpenAI 兼容 TTS 端点"
                            >
                              ?
                            </span>
                          </label>
                          <input
                            value={voiceDraft.openaiBaseUrl}
                            placeholder="https://api.openai.com/v1"
                            onChange={(e) =>
                              onDraftVoice({
                                ...voiceDraft,
                                openaiBaseUrl: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                    {voiceDraft.provider === 'custom' && (
                      <div className="row">
                        <div className="fld">
                          <label>
                            TTS 配置（JSON）
                            <span
                              className="tip"
                              data-tip="高级用法：直接填写 mi-gpt TTSConfig JSON"
                            >
                              ?
                            </span>
                          </label>
                          <textarea
                            value={voiceDraft.customJson}
                            placeholder='{"edge":{"trustedToken":"…"}}'
                            onChange={(e) =>
                              onDraftVoice({
                                ...voiceDraft,
                                customJson: e.target.value,
                              })
                            }
                            rows={5}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="acts">
                    <span className="sp" />
                    <button
                      className="btn ghost"
                      onClick={() =>
                        selVoice
                          ? onEditVoice(false)
                          : voiceSvcs.length
                            ? onSelectVoice(voiceSvcs[0].id)
                            : onDraftVoice(null)
                      }
                    >
                      取消
                    </button>
                    <button
                      className="btn primary"
                      onClick={onSaveVoice}
                      disabled={
                        !voiceDraft.name ||
                        (voiceDraft.provider === 'volcano' &&
                          (!voiceDraft.volcanoAppId ||
                            !voiceDraft.volcanoToken)) ||
                        (voiceDraft.provider === 'openai' &&
                          !voiceDraft.openaiKey)
                      }
                    >
                      <I n="check" /> 保存
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </>
      )}
    </section>
  )
}

/* ══ 个人中心 ══ */
