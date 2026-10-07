/* ══ DevicesView ══ */
import { I } from '../icons.tsx'
import type { Account, DeviceRow, Role, Room, SpeakerModel } from '../apis.ts'
import type { DevDraft, DevPullState } from './drafts.ts'

export function DevicesView(props: {
  filterDevices: DeviceRow[]
  devices: DeviceRow[]
  selDev: string | null
  devDraft: DevDraft | null
  devEdit: boolean
  devPull: DevPullState
  devAcctFilter: string
  devAcctGroups: { id: string; name: string }[]
  modelPickOpen: boolean
  modelPickQ: string
  models: SpeakerModel[]
  roles: Role[]
  accounts: Account[]
  rooms: Room[]
  onSelect: (id: string | null) => void
  onDraft: (d: DevDraft | null) => void
  onEdit: (e: boolean) => void
  onDelete: () => void
  onSave: () => void
  onRestart: (id: string) => void
  onPull: (accountId: string) => void
  onResetPull: () => void
  onDevAcctFilter: (f: string, firstId: string | null) => void
  onPickOpen: (open: boolean) => void
  onPickQ: (q: string) => void
}) {
  const {
    filterDevices,
    devices,
    selDev,
    devDraft,
    devEdit,
    devPull,
    devAcctFilter,
    devAcctGroups,
    modelPickOpen,
    modelPickQ,
    models,
    roles,
    accounts,
    rooms,
    onSelect,
    onDraft,
    onEdit,
    onDelete,
    onSave,
    onRestart,
    onPull,
    onResetPull,
    onDevAcctFilter,
    onPickOpen,
    onPickQ,
  } = props
  return (
    <section data-view="devices" className="on">
      <div className="filters">
        <span
          className={'chip' + (devAcctFilter === 'all' ? ' on' : '')}
          onClick={() =>
            onDevAcctFilter(
              'all',
              filterDevices.length ? filterDevices[0].id : null,
            )
          }
        >
          全部设备
        </span>
        {devAcctGroups.map((g) => (
          <span
            key={g.id}
            className={'chip' + (devAcctFilter === g.id ? ' on' : '')}
            onClick={() =>
              onDevAcctFilter(
                g.id,
                devices.find((d) => d.accountId === g.id)?.id || null,
              )
            }
          >
            {g.name}
          </span>
        ))}
        <span className="sp">
          <span className="count">共 {filterDevices.length} 台</span>
        </span>
      </div>
      <div className="split">
        <aside className="slist">
          {filterDevices.map((d) => {
            const r = roles.find((x) => x.id === d.roleId)
            return (
              <div
                key={d.id}
                className={'li' + (d.id === selDev ? ' on' : '')}
                onClick={() => onSelect(d.id)}
              >
                <span className={'ic' + (d.running ? ' t' : '')}>
                  {(() => {
                    const m = models.find(
                      (x) =>
                        x.id === d.speakerModel || x.name === d.speakerModel,
                    )
                    return m?.imageUrl ? (
                      <img className="thumb" src={m.imageUrl} alt="" />
                    ) : (
                      <I n="speaker" />
                    )
                  })()}
                </span>
                <span className="txt">
                  <b>{d.alias}</b>
                  <span>
                    {d.did} · {r?.name || '未指定角色'}
                  </span>
                </span>
                <span className={'tag' + (d.running ? ' accent' : ' neu')}>
                  {d.running ? '运行中' : '未启动'}
                </span>
              </div>
            )
          })}
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
          key={'dev-' + (selDev || 'new') + (devEdit ? '-e' : '-r')}
        >
          {filterDevices.length === 0 && !devDraft ? (
            <div className="empty">
              <div className="art">
                <I n="speaker" size={26} />
              </div>
              <b>还没有绑定设备</b>
              <span>
                先在「账号设备」接入小米账号，再通过三步向导把音箱绑定到角色与思考服务。
              </span>
              <button className="btn primary" onClick={() => onSelect(null)}>
                <I n="plus" /> 新建
              </button>
            </div>
          ) : selDev && !devEdit ? (
            <div className="form-card">
              <h3>
                <I n="speaker" size={17} /> 设备详情
                <span className="refs">
                  {devices.find((x) => x.id === selDev)?.running
                    ? '服务运行中 · 变更绑定后需重启'
                    : '服务未启动 · 变更绑定后需重启'}
                </span>
              </h3>
              <div className="desc">
                设备绑定信息；变更绑定后需重启设备生效。
              </div>
              <div className="ro">
                {(() => {
                  const ref = devices.find((x) => x.id === selDev)?.speakerModel
                  const m = ref
                    ? models.find((x) => x.id === ref || x.name === ref)
                    : null
                  return m?.imageUrl ? (
                    <div className="model-pic">
                      <img src={m.imageUrl} alt={m.name} />
                      <span className="pic-tag">
                        {m.builtin ? '内置型号' : '自定义型号'}
                      </span>
                    </div>
                  ) : null
                })()}
                <div className="grp">
                  <h4>基本信息</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">设备名称</span>
                      <span className="v">
                        {devices.find((x) => x.id === selDev)?.alias || '—'}
                      </span>
                    </div>
                    <div className="rr">
                      <span className="k">设备 ID</span>
                      <span className="v">
                        {devices.find((x) => x.id === selDev)?.did || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="rr">
                      <span className="k">设备型号</span>
                      <span className="v">
                        {(() => {
                          const ref = devices.find(
                            (x) => x.id === selDev,
                          )?.speakerModel
                          const m = ref
                            ? models.find((x) => x.id === ref || x.name === ref)
                            : null
                          return m ? `${m.name}（${m.did}）` : ref || '—'
                        })()}
                      </span>
                    </div>
                    <div className="rr">
                      <span className="k">服务状态</span>
                      <span className="v">
                        {(() => {
                          const d = devices.find((x) => x.id === selDev)
                          return d ? (
                            <span
                              className={
                                'tag' + (d.running ? ' accent' : ' neu')
                              }
                            >
                              {d.running ? '运行中' : '未启动'}
                            </span>
                          ) : (
                            '—'
                          )
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>型号指令</h4>
                  <div className="row">
                    {(() => {
                      const ref = devices.find(
                        (x) => x.id === selDev,
                      )?.speakerModel
                      const m = ref
                        ? models.find((x) => x.id === ref || x.name === ref)
                        : null
                      if (!m) return null
                      return (
                        <div className="rr">
                          <span className="k">型号指令</span>
                          <span className="v">
                            {[
                              m.ttsCommand?.length
                                ? `播放指令：${m.ttsCommand.join('、')}`
                                : null,
                              m.wakeUpCommand?.length
                                ? `唤醒命令：${m.wakeUpCommand.join('、')}`
                                : null,
                              m.playingCommand?.length
                                ? `播放检测命令：${m.playingCommand.join('、')}`
                                : null,
                              m.consecutive
                                ? '连续对话已启用'
                                : '连续对话未启用',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                </div>
                <div className="grp">
                  <h4>绑定</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">云端账号</span>
                      <span className="v">
                        {accounts.find(
                          (a) =>
                            a.id ===
                            devices.find((x) => x.id === selDev)?.accountId,
                        )?.name || '默认账号'}
                      </span>
                    </div>
                    <div className="rr">
                      <span className="k">对话角色</span>
                      <span className="v">
                        {roles.find(
                          (r) =>
                            r.id ===
                            devices.find((x) => x.id === selDev)?.roleId,
                        )?.name || '未指定'}
                      </span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="rr">
                      <span className="k">服务绑定</span>
                      <span className="v">
                        思考服务 · 语音服务 由对话角色统一提供
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>连续对话</h4>
                  {(() => {
                    const ref = devices.find(
                      (x) => x.id === selDev,
                    )?.speakerModel
                    const m = ref
                      ? models.find((x) => x.id === ref || x.name === ref)
                      : null
                    const meta = devices.find((x) => x.id === selDev)
                    if (!m && !meta) return null
                    return (
                      <>
                        <div className="row">
                          <div className="rr">
                            <span className="k">连续对话</span>
                            <span className="v">
                              {(() => {
                                if (!m) return '—'
                                if (!m.consecutive)
                                  return '未启用（型号不支持）'
                                return m.playingCommand?.length
                                  ? '启用 · 支持播放状态检测'
                                  : '启用 · 依赖 Mina 检测播放状态'
                              })()}
                            </span>
                          </div>
                          <div className="rr">
                            <span className="k">对话超时</span>
                            <span className="v">
                              {meta?.exitKeepAliveAfter ?? 30} 秒无响应退出
                            </span>
                          </div>
                        </div>
                        <div className="row">
                          <div className="rr">
                            <span className="k">会话群</span>
                            <span className="v">
                              {(() => {
                                const meta = devices.find(
                                  (x) => x.id === selDev,
                                )
                                if (!meta?.roomRef) return '—'
                                const rm = rooms.find(
                                  (x) => x.id === meta.roomRef,
                                )
                                return rm
                                  ? `${rm.name}${rm.description ? ' · ' + rm.description : ''}`
                                  : meta.roomRef
                              })()}
                            </span>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <button
                  className="btn ghost"
                  onClick={() => onRestart(selDev || '')}
                >
                  <I n="restart" />{' '}
                  {devices.find((x) => x.id === selDev)?.running
                    ? '重启'
                    : '启动'}
                </button>
                <button className="btn danger" onClick={onDelete}>
                  <I n="trash" /> 删除
                </button>
                <button className="btn primary" onClick={() => onEdit(true)}>
                  <I n="pencil" /> 编辑
                </button>
              </div>
            </div>
          ) : devDraft ? (
            <div className="form-card">
              <h3>
                <I n="speaker" size={17} /> {selDev ? '编辑设备' : '新建设备'}
                <span className="refs">
                  {selDev
                    ? devices.find((x) => x.id === selDev)?.running
                      ? '服务运行中 · 修改绑定后需重启'
                      : '服务未启动 · 修改绑定后需重启'
                    : '新建设备：从云端账号拉取选择，保存后立即选中'}
                </span>
              </h3>
              <div className="desc">
                {selDev
                  ? '修改设备绑定；已变更的绑定需重启设备生效。'
                  : '填入音箱 did 与绑定关系；创建后可重启设备生效。'}
              </div>
              <div className="grp">
                <h4>基本信息</h4>
                <div className="row">
                  <div className="fld">
                    <label>
                      设备名称<span className="req">*</span>
                    </label>
                    <input
                      value={devDraft.alias}
                      placeholder="例如：客餐厅音箱"
                      onChange={(e) =>
                        onDraft({ ...devDraft, alias: e.target.value })
                      }
                    />
                  </div>
                  <div className="fld">
                    <label>
                      设备 ID<span className="req">*</span>
                      <span
                        className="tip"
                        data-tip="小爱音箱 ID 或名称。新建时由「云端账号拉取」自动带入；编辑模式可手动修改。"
                      >
                        ?
                      </span>
                    </label>
                    {selDev ? (
                      <input
                        value={devDraft.did}
                        placeholder="例如：小爱音箱Pro"
                        onChange={(e) =>
                          onDraft({ ...devDraft, did: e.target.value })
                        }
                      />
                    ) : (
                      <div
                        className="ro"
                        style={{ minHeight: 40, alignItems: 'center' }}
                      >
                        <span
                          className="v"
                          style={{
                            fontSize: 13.5,
                            color: devDraft.did
                              ? 'var(--ink-1)'
                              : 'var(--ink-3)',
                          }}
                        >
                          {devDraft.did || '请先从下方云端账号拉取选择'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>设备型号</h4>
                <div className="row">
                  <div className="fld">
                    <label>
                      设备型号
                      <span
                        className="tip"
                        data-tip="输入关键字可搜索型号；选择后自动带入该型号的指令与播放配置（可在「设备型号」维护）。"
                      >
                        ?
                      </span>
                    </label>
                    <div className="model-pick">
                      <input
                        value={
                          modelPickOpen
                            ? modelPickQ
                            : (() => {
                                const m = models.find(
                                  (x) => x.id === devDraft.speakerModel,
                                )
                                return m ? `${m.name}（${m.did}）` : ''
                              })()
                        }
                        placeholder="输入关键字搜索型号…"
                        onMouseDown={() => {
                          if (!modelPickOpen) onPickOpen(true)
                        }}
                        onFocus={() => onPickOpen(true)}
                        onBlur={() => setTimeout(() => onPickOpen(false), 150)}
                        onChange={(e) => onPickQ(e.target.value)}
                      />
                      {modelPickOpen && (
                        <div className="model-pick-list">
                          {(() => {
                            const q = modelPickQ.trim().toLowerCase()
                            const sorted = [...models]
                              .sort((a, b) => {
                                if (!!a.builtin !== !!b.builtin)
                                  return a.builtin ? -1 : 1
                                if (a.builtin && b.builtin)
                                  return a.name.localeCompare(
                                    b.name,
                                    'zh-Hans-CN',
                                  )
                                return (a.createdAt || 0) - (b.createdAt || 0)
                              })
                              .filter(
                                (m) =>
                                  !q ||
                                  m.name.toLowerCase().includes(q) ||
                                  m.did.toLowerCase().includes(q) ||
                                  m.id.includes(q),
                              )
                            return sorted.length ? (
                              sorted.map((m) => (
                                <div
                                  key={m.id}
                                  className={
                                    'pick-li' +
                                    (devDraft.speakerModel === m.id
                                      ? ' on'
                                      : '')
                                  }
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    onDraft({ ...devDraft, speakerModel: m.id })
                                    onPickOpen(false)
                                    onPickQ('')
                                  }}
                                >
                                  {m.imageUrl ? (
                                    <img src={m.imageUrl} alt="" />
                                  ) : (
                                    <span className="ph" />
                                  )}
                                  <span>
                                    {m.name}（{m.did}）
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="pick-empty">未找到匹配型号</div>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                    {(() => {
                      const m = models.find(
                        (x) => x.id === devDraft.speakerModel,
                      )
                      if (!m) return null
                      return (
                        <div className="fld-tags">
                          <span>
                            <b>播放指令</b>
                            {m.ttsCommand?.length
                              ? m.ttsCommand.join('、')
                              : '—'}
                          </span>
                          <span>
                            <b>唤醒命令</b>
                            {m.wakeUpCommand?.length
                              ? m.wakeUpCommand.join('、')
                              : '—'}
                          </span>
                          <span>
                            <b>播放检测命令</b>
                            {m.playingCommand?.length
                              ? m.playingCommand.join('、')
                              : '—'}
                          </span>
                          <span>
                            <b>连续对话</b>
                            {m.consecutive ? '已启用' : '未启用'}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>绑定</h4>
                <div className="row">
                  <div className="fld">
                    <label>云端账号</label>
                    <select
                      value={devDraft.accountId}
                      onChange={(e) => {
                        onDraft({
                          ...devDraft,
                          accountId: e.target.value,
                          did: '',
                          speakerModel: '',
                        })
                        onResetPull()
                      }}
                    >
                      <option value="">未指定（使用默认账号）</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}（{a.miUserId}）
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fld">
                    <label>
                      对话角色
                      <span
                        className="tip"
                        data-tip="选择对话角色后，思考服务与语音服务由角色统一提供，无需在此重复配置。"
                      >
                        ?
                      </span>
                    </label>
                    <select
                      value={devDraft.roleId}
                      onChange={(e) =>
                        onDraft({ ...devDraft, roleId: e.target.value })
                      }
                    >
                      <option value="">未指定</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {!selDev && (
                  <div className="row">
                    <div className="fld">
                      <label>
                        从账号拉取
                        <span
                          className="tip"
                          data-tip="从该云端账号自动拉取小爱音箱（凭小米 ID + passToken，无需密码）；点击选择后自动带入名称、设备 ID 与型号。"
                        >
                          ?
                        </span>
                      </label>
                      <div className="pull-dev">
                        <button
                          className="btn"
                          onClick={() => onPull(devDraft.accountId)}
                          disabled={!devDraft.accountId || devPull.loading}
                        >
                          <I n="refresh" />{' '}
                          {devPull.loading ? '拉取中…' : '拉取设备列表'}
                        </button>
                        {devPull.err && (
                          <div className="notice err" style={{ marginTop: 8 }}>
                            <I n="warning" size={15} /> {devPull.err}
                          </div>
                        )}
                        {devPull.list && (
                          <div className="pick-list" style={{ marginTop: 8 }}>
                            {devPull.list.map((d) => {
                              const m = models.find(
                                (x) =>
                                  x.did.toLowerCase() ===
                                  (d.hardware || '').toLowerCase(),
                              )
                              const bound = !!devices.find(
                                (x) =>
                                  x.accountId === devDraft.accountId &&
                                  x.did === d.miotDID,
                              )
                              return (
                                <div
                                  className={
                                    'pl' +
                                    (devDraft.did === d.miotDID ? ' on' : '') +
                                    (bound ? ' off' : '')
                                  }
                                  key={d.miotDID}
                                  onClick={() => {
                                    if (bound) return
                                    onDraft({
                                      ...devDraft,
                                      alias: d.name || d.alias,
                                      did: d.miotDID,
                                      speakerModel: m
                                        ? m.id
                                        : devDraft.speakerModel,
                                    })
                                  }}
                                >
                                  <span className="ic">
                                    <I n="speaker" />
                                  </span>
                                  <span>
                                    <b>{d.name || d.alias}</b>
                                    <span>
                                      {m ? m.name : d.hardware || '未知型号'} ·{' '}
                                      {d.presence === 'online'
                                        ? '在线'
                                        : '离线'}
                                    </span>
                                  </span>
                                  {bound ? (
                                    <span className="tag neu">已接入</span>
                                  ) : (
                                    devDraft.did === d.miotDID && (
                                      <I n="check" size={18} />
                                    )
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="row">
                  <div className="fld">
                    <label>
                      连续对话超时（秒）
                      <span
                        className="tip"
                        data-tip="连续对话中无响应多久自动退出唤醒模式，默认 30 秒"
                      >
                        ?
                      </span>
                    </label>
                    <input
                      value={devDraft.exitKeepAliveAfter || '30'}
                      placeholder="默认 30"
                      onChange={(e) =>
                        onDraft({
                          ...devDraft,
                          exitKeepAliveAfter: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="fld">
                    <label>
                      会话群
                      <span
                        className="tip"
                        data-tip="对话记忆的上下文归属（对应旧版「会话群 chatGroup」），多台设备可共用；可在「会话群」菜单新建"
                      >
                        ?
                      </span>
                    </label>
                    <select
                      value={devDraft.roomRef}
                      onChange={(e) =>
                        onDraft({ ...devDraft, roomRef: e.target.value })
                      }
                    >
                      <option value="">未指定</option>
                      {rooms.map((rm) => (
                        <option key={rm.id} value={rm.id}>
                          {rm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {(() => {
                const m = models.find((x) => x.id === devDraft.speakerModel)
                if (!m) return null
                if (!m.consecutive) {
                  return (
                    <div className="notice err">
                      <I n="warning" size={15} />{' '}
                      此型号不支持连续对话（streamResponse 已禁用）。
                    </div>
                  )
                }
                if (!m.playingCommand?.length) {
                  return (
                    <div className="notice">
                      <I n="warning" size={15} />{' '}
                      此型号未配置播放检测指令，连续对话将依赖 Mina
                      检测播放状态；若出现异常，可在「设备型号」中补充播放检测指令。
                    </div>
                  )
                }
                return null
              })()}
              <div className="acts">
                <span className="sp" />
                <button
                  className="btn ghost"
                  onClick={() =>
                    selDev
                      ? onEdit(false)
                      : devices.length
                        ? onSelect(devices[0].id)
                        : onDraft(null)
                  }
                >
                  取消
                </button>
                <button
                  className="btn primary"
                  onClick={onSave}
                  disabled={!devDraft.alias || !devDraft.did}
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

/* ══ 思考服务 / 语音服务（settings/think/voice 共用，按 tab 切换） ══ */
