/* ══ SpeakerModelsView ══ */
import { useMemo } from 'react'
import { I } from '../icons.tsx'
import {
  Button,
  Chip,
  EmptyState,
  Field,
  Switch,
  Tag,
} from '../components/atoms/index.ts'
import type { DeviceRow, SpeakerModel } from '../apis.ts'
import type { SpeakerModelDraft } from './drafts.ts'

export function SpeakerModelsView(props: {
  filterModels: SpeakerModel[]
  models: SpeakerModel[]
  selModel: string | null
  modelDraft: SpeakerModelDraft | null
  modelEdit: boolean
  devices: DeviceRow[]
  filter: 'all' | 'consec' | 'plain'
  onFilter: (f: 'all' | 'consec' | 'plain') => void
  onSelect: (id: string | null) => void
  onDraft: (d: SpeakerModelDraft | null) => void
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
  const filterCounts = useMemo(
    () => ({
      all: models.length,
      consec: models.filter((m) => m.continuousDialogue).length,
      plain: models.filter((m) => !m.continuousDialogue).length,
    }),
    [models],
  )
  return (
    <section data-view="models" className="on">
      <div className="filters">
        <Chip on={filter === 'all'} onClick={() => onFilter('all')}>
          全部型号 {filterCounts.all}
        </Chip>
        <Chip on={filter === 'consec'} onClick={() => onFilter('consec')}>
          支持连续对话 {filterCounts.consec}
        </Chip>
        <Chip on={filter === 'plain'} onClick={() => onFilter('plain')}>
          无法连续对话 {filterCounts.plain}
        </Chip>
        <span className="sp" />
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
                  {m.didPrefix}
                  {m.description ? ' · ' + m.description.slice(0, 18) : ''}
                </span>
              </span>
              {m.builtin ? (
                <Tag>内置</Tag>
              ) : (
                <span className="count">
                  {devices.filter((d) => d.speakerModel === m.id).length} 台
                </span>
              )}
            </div>
          ))}
          <Button
            style={{ justifyContent: 'center', marginTop: 4 }}
            icon="plus"
            onClick={() => onSelect(null)}
          >
            新建
          </Button>
        </aside>
        <section
          className="sdetail"
          key={'model-' + (selModel || 'new') + (modelEdit ? '-e' : '-r')}
        >
          {filterModels.length === 0 && !modelDraft ? (
            <EmptyState
              icon="speaker"
              title="还没有音箱型号"
              desc="维护各型号音箱的指令与播放配置；设备关联型号后自动生效。"
              action={
                <Button
                  variant="primary"
                  icon="plus"
                  onClick={() => onSelect(null)}
                >
                  新建
                </Button>
              }
            />
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
                        {models.find((m) => m.id === selModel)?.didPrefix ||
                          '—'}
                      </span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="rr">
                      <span className="k">说明</span>
                      <span className="v">
                        {models.find((m) => m.id === selModel)?.description ||
                          '—'}
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
                        <Switch
                          checked={
                            !!models.find((x) => x.id === selModel)
                              ?.continuousDialogue
                          }
                          disabled
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                {models.find((m) => m.id === selModel)?.builtin && (
                  <Button
                    icon="arrow-counter-clockwise"
                    onClick={() => onReset(selModel || '')}
                    title="恢复为系统内置默认配置"
                  >
                    重置
                  </Button>
                )}
                <Button
                  variant="danger"
                  icon="trash"
                  disabled={!!models.find((m) => m.id === selModel)?.builtin}
                  onClick={() => onDelete(selModel || '')}
                  title={
                    models.find((m) => m.id === selModel)?.builtin
                      ? '系统内置型号不可删除'
                      : ''
                  }
                >
                  删除
                </Button>
                <Button
                  variant="primary"
                  icon="pencil"
                  onClick={() => onEdit(true)}
                >
                  编辑
                </Button>
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
                  <Field label="型号名称" required>
                    <input
                      value={modelDraft.name}
                      placeholder="例如：小米 AI 音箱第一代"
                      onChange={(e) =>
                        onDraft({ ...modelDraft, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="型号标识"
                    required
                    tip="硬件型号标识（did 前缀），如 X08E、L05B"
                  >
                    <input
                      value={modelDraft.didPrefix}
                      placeholder="例如：X08E"
                      onChange={(e) =>
                        onDraft({ ...modelDraft, didPrefix: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="row">
                  <Field label="简介">
                    <input
                      value={modelDraft.description}
                      placeholder="可选"
                      onChange={(e) =>
                        onDraft({ ...modelDraft, description: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="图片地址">
                    <input
                      value={modelDraft.imageUrl}
                      placeholder="可选，填写设备图片 URL（http/https）"
                      onChange={(e) =>
                        onDraft({ ...modelDraft, imageUrl: e.target.value })
                      }
                    />
                  </Field>
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
                  ] as [string, keyof SpeakerModelDraft, number, string][]
                ).map(([label, key, count, hint]) => (
                  <div className="row" key={key as string}>
                    <Field label={label} tip={`${hint}（${count} 位数字）`}>
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
                    </Field>
                  </div>
                ))}
              </div>
              <div className="grp">
                <h4>连续对话</h4>
                <div className="row">
                  <Field
                    label="连续对话"
                    tip="启用后音箱可连续对话，无需每次唤醒"
                  >
                    <Switch
                      checked={!!modelDraft.continuousDialogue}
                      onChange={(continuousDialogue) =>
                        onDraft({ ...modelDraft, continuousDialogue })
                      }
                    />
                  </Field>
                </div>
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
                  onClick={onSave}
                  disabled={!modelDraft.name || !modelDraft.didPrefix}
                >
                  保存
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
}

/* ══ 设备服务 ══ */
