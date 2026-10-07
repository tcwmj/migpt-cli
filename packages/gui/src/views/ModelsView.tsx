/* ══ ModelsView ══ */
import { I } from '../icons.tsx'
import type { DeviceRow, SpeakerModel } from '../apis.ts'
import type { ModelDraft } from './drafts.ts'

export function ModelsView(props: {
  filterModels: SpeakerModel[]
  models: SpeakerModel[]
  selModel: string | null
  modelDraft: ModelDraft | null
  modelEdit: boolean
  devices: DeviceRow[]
  filter: 'all' | 'consec' | 'plain'
  onFilter: (f: 'all' | 'consec' | 'plain') => void
  onSelect: (id: string | null) => void
  onDraft: (d: ModelDraft | null) => void
  onEdit: (e: boolean) => void
  onDelete: (id: string) => void
  onReset: (id: string) => void
  onSave: () => void
}) {
  const {
    filterModels,
    models,
    selModel,
    modelDraft,
    modelEdit,
    devices,
    filter,
    onFilter,
    onSelect,
    onDraft,
    onEdit,
    onDelete,
    onReset,
    onSave,
  } = props
  return (
    <section data-view="models" className="on">
      <div className="filters">
        <span
          className={'chip' + (filter === 'all' ? ' on' : '')}
          onClick={() => onFilter('all')}
        >
          全部型号
        </span>
        <span
          className={'chip' + (filter === 'consec' ? ' on' : '')}
          onClick={() => onFilter('consec')}
        >
          支持连续对话
        </span>
        <span
          className={'chip' + (filter === 'plain' ? ' on' : '')}
          onClick={() => onFilter('plain')}
        >
          无法连续对话
        </span>
        <span className="sp">
          <span className="count">共 {filterModels.length} 个</span>
        </span>
      </div>
      <div className="split">
        <aside className="slist">
          {filterModels.map((m) => (
            <div
              key={m.id}
              className={'li' + (m.id === selModel ? ' on' : '')}
              onClick={() => onSelect(m.id)}
            >
              <span className="ic t">
                {m.imageUrl ? (
                  <img src={m.imageUrl} alt="" className="thumb" />
                ) : (
                  <I n="speaker" />
                )}
              </span>
              <span className="txt">
                <b>{m.name}</b>
                <span>
                  {m.did}
                  {m.desc ? ' · ' + m.desc.slice(0, 18) : ''}
                </span>
              </span>
              {m.builtin ? (
                <span className="tag">内置</span>
              ) : (
                <span className="count">
                  {devices.filter((d) => d.speakerModel === m.id).length} 台
                </span>
              )}
            </div>
          ))}
          <button
            className="btn"
            style={{ justifyContent: 'center', marginTop: 4 }}
            onClick={() => onSelect(null)}
          >
            <I n="plus" /> 新建
          </button>
        </aside>
        <section
          className="sdetail"
          key={'model-' + (selModel || 'new') + (modelEdit ? '-e' : '-r')}
        >
          {filterModels.length === 0 && !modelDraft ? (
            <div className="empty">
              <div className="art">
                <I n="speaker" size={26} />
              </div>
              <b>还没有音箱型号</b>
              <span>
                维护各型号音箱的指令与播放配置；设备关联型号后自动生效。
              </span>
              <button className="btn primary" onClick={() => onSelect(null)}>
                <I n="plus" /> 新建
              </button>
            </div>
          ) : selModel && !modelEdit ? (
            <div className="form-card">
              <h3>
                <I n="speaker" size={17} /> 型号详情
                <span className="refs">
                  {(() => {
                    const used = devices.filter(
                      (d) => d.speakerModel === selModel,
                    )
                    return used.length
                      ? `被 ${used.map((d) => d.alias).join('、')} 关联 · 关联设备重启后生效`
                      : '未被设备关联 · 可在「设备服务」中选择'
                  })()}
                </span>
              </h3>
              <div className="desc">
                该型号的硬件标识与数字指令；召唤词与播报词由对话角色控制，设备关联后重启生效。
              </div>
              {(() => {
                const mm = models.find((m) => m.id === selModel)
                return mm?.imageUrl ? (
                  <div className="model-pic">
                    <img
                      className="fade"
                      src={mm.imageUrl}
                      alt={mm.name}
                      onLoad={(e) => e.currentTarget.classList.add('loaded')}
                      onError={(e) => e.currentTarget.classList.add('loaded')}
                    />
                    <span className="pic-tag">
                      {mm.builtin ? '内置型号' : '自定义型号'}
                    </span>
                  </div>
                ) : null
              })()}
              <div className="ro">
                <div className="grp">
                  <h4>基本信息</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">型号名称</span>
                      <span className="v">
                        {models.find((m) => m.id === selModel)?.name || '—'}
                      </span>
                    </div>
                    <div className="rr">
                      <span className="k">型号标识</span>
                      <span className="v">
                        {models.find((m) => m.id === selModel)?.did || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="rr">
                      <span className="k">说明</span>
                      <span className="v">
                        {models.find((m) => m.id === selModel)?.desc || '—'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>硬件指令</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">播放指令</span>
                      <span className="v cmd-row">
                        {(() => {
                          const m = models.find((x) => x.id === selModel)
                          const arr = m?.ttsCommand?.length
                            ? m.ttsCommand.map(String)
                            : ['', '']
                          return arr
                            .slice(0, 2)
                            .map((c, i) => (
                              <input
                                key={i}
                                className="cmd-input"
                                value={c}
                                disabled
                                placeholder="—"
                              />
                            ))
                        })()}
                      </span>
                    </div>
                    <div className="rr">
                      <span className="k">唤醒命令</span>
                      <span className="v cmd-row">
                        {(() => {
                          const m = models.find((x) => x.id === selModel)
                          const arr = m?.wakeUpCommand?.length
                            ? m.wakeUpCommand.map(String)
                            : ['', '']
                          return arr
                            .slice(0, 2)
                            .map((c, i) => (
                              <input
                                key={i}
                                className="cmd-input"
                                value={c}
                                disabled
                                placeholder="—"
                              />
                            ))
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="rr">
                      <span className="k">播放检测命令</span>
                      <span className="v cmd-row">
                        {(() => {
                          const m = models.find((x) => x.id === selModel)
                          const arr = m?.playingCommand?.length
                            ? m.playingCommand.map(String)
                            : ['', '', '']
                          return arr
                            .slice(0, 3)
                            .map((c, i) => (
                              <input
                                key={i}
                                className="cmd-input"
                                value={c}
                                disabled
                                placeholder="—"
                              />
                            ))
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>连续对话</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">连续对话</span>
                      <span className="v">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={
                              !!models.find((x) => x.id === selModel)
                                ?.consecutive
                            }
                            disabled
                          />
                          <span className="track" />
                        </label>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                {models.find((m) => m.id === selModel)?.builtin && (
                  <button
                    className="btn"
                    onClick={() => onReset(selModel || '')}
                    title="恢复为系统内置默认配置"
                  >
                    <I n="arrow-counter-clockwise" /> 重置默认
                  </button>
                )}
                <button
                  className="btn danger"
                  disabled={!!models.find((m) => m.id === selModel)?.builtin}
                  onClick={() => onDelete(selModel || '')}
                  title={
                    models.find((m) => m.id === selModel)?.builtin
                      ? '系统内置型号不可删除'
                      : ''
                  }
                >
                  <I n="trash" /> 删除
                </button>
                <button className="btn primary" onClick={() => onEdit(true)}>
                  <I n="pencil" /> 编辑
                </button>
              </div>
            </div>
          ) : modelDraft ? (
            <div className="form-card">
              <h3>
                <I n="speaker" size={17} /> {selModel ? '编辑型号' : '新建型号'}
              </h3>
              <div className="desc">
                {selModel
                  ? '修改型号配置；已关联设备重启后生效。'
                  : '维护音箱型号的指令与播放配置；创建后可在「设备服务」中选择。'}
              </div>
              <div className="grp">
                <h4>基本信息</h4>
                <div className="row">
                  <div className="fld">
                    <label>
                      型号名称<span className="req">*</span>
                    </label>
                    <input
                      value={modelDraft.name}
                      placeholder="例如：小米 AI 音箱第一代"
                      onChange={(e) =>
                        onDraft({ ...modelDraft, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="fld">
                    <label>
                      型号标识<span className="req">*</span>
                      <span
                        className="tip"
                        data-tip="硬件型号标识（did 前缀），如 X08E、L05B"
                      >
                        ?
                      </span>
                    </label>
                    <input
                      value={modelDraft.did}
                      placeholder="例如：X08E"
                      onChange={(e) =>
                        onDraft({ ...modelDraft, did: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="fld">
                    <label>简介</label>
                    <input
                      value={modelDraft.desc}
                      placeholder="可选"
                      onChange={(e) =>
                        onDraft({ ...modelDraft, desc: e.target.value })
                      }
                    />
                  </div>
                  <div className="fld">
                    <label>图片地址</label>
                    <input
                      value={modelDraft.imageUrl}
                      placeholder="可选，填写设备图片 URL（http/https）"
                      onChange={(e) =>
                        onDraft({ ...modelDraft, imageUrl: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>硬件指令</h4>
                {(
                  [
                    [
                      '播放指令',
                      'ttsCommand',
                      2,
                      '硬件播放指令数字序列，如 5、1',
                    ],
                    [
                      '唤醒命令',
                      'wakeUpCommand',
                      2,
                      '硬件唤醒命令数字序列，如 5、1',
                    ],
                    [
                      '播放检测命令',
                      'playingCommand',
                      3,
                      '查询播放状态命令数字序列，如 3、1、1（部分型号可留空）',
                    ],
                  ] as [string, keyof ModelDraft, number, string][]
                ).map(([label, key, count, hint]) => (
                  <div className="row" key={key as string}>
                    <div className="fld">
                      <label>
                        {label}
                        <span
                          className="tip"
                          data-tip={`${hint}（${count} 位数字）`}
                        >
                          ?
                        </span>
                      </label>
                      <div className="arr-in">
                        {(modelDraft[key] as string[]).map((v, i) => (
                          <input
                            key={i}
                            className="arr-input"
                            value={v}
                            placeholder={`数字 ${i + 1}`}
                            onChange={(e) =>
                              onDraft({
                                ...modelDraft,
                                [key]: (modelDraft[key] as string[]).map(
                                  (x, j) => (j === i ? e.target.value : x),
                                ),
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grp">
                <h4>连续对话</h4>
                <div className="row">
                  <div className="fld">
                    <label>
                      连续对话
                      <span
                        className="tip"
                        data-tip="启用后音箱可连续对话，无需每次唤醒"
                      >
                        ?
                      </span>
                    </label>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={!!modelDraft.consecutive}
                        onChange={(e) =>
                          onDraft({
                            ...modelDraft,
                            consecutive: e.target.checked,
                          })
                        }
                      />
                      <span className="track" />
                    </label>
                  </div>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <button
                  className="btn ghost"
                  onClick={() =>
                    selModel
                      ? onEdit(false)
                      : models.length
                        ? onSelect(models[0].id)
                        : onDraft(null)
                  }
                >
                  取消
                </button>
                <button
                  className="btn primary"
                  onClick={onSave}
                  disabled={!modelDraft.name || !modelDraft.did}
                >
                  <I n="check" /> 保存
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
}

/* ══ 设备服务 ══ */
