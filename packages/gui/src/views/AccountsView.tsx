/* ══ AccountsView ══ */
import { I } from '../icons.tsx'
import type { Account, DeviceRow, SpeakerModel } from '../apis.ts'
import type { AccountDraft, AcctDevState } from './drafts.ts'

export function AccountsView(props: {
  filterAccounts: Account[]
  accounts: Account[]
  selAcct: string | null
  acctDraft: AccountDraft | null
  acctEdit: boolean
  acctDevs: Record<string, AcctDevState>
  devices: DeviceRow[]
  models: SpeakerModel[]
  onSelect: (id: string | null) => void
  onDraft: (d: AccountDraft | null) => void
  onEdit: (e: boolean) => void
  onDelete: (id: string) => void
  onSave: () => void
  onRefreshDevs: (id: string) => void
  usage: (id: string) => string[]
}) {
  const {
    filterAccounts,
    accounts,
    selAcct,
    acctDraft,
    acctEdit,
    acctDevs,
    devices,
    models,
    onSelect,
    onDraft,
    onEdit,
    onDelete,
    onSave,
    onRefreshDevs,
    usage,
  } = props
  return (
    <section data-view="accounts" className="on">
      <div className="filters">
        <span className="chip on">全部账号</span>
        <span className="sp">
          <span className="count">共 {accounts.length} 个</span>
        </span>
      </div>
      <div className="split">
        <aside className="slist">
          {filterAccounts.map((a) => (
            <div
              key={a.id}
              className={'li' + (a.id === selAcct ? ' on' : '')}
              onClick={() => onSelect(a.id)}
            >
              <span className="ic">
                <I n="user" />
              </span>
              <span className="txt">
                <b>{a.name}</b>
                <span>
                  {a.miUserId} · {a === accounts[0] ? '默认' : '备用'}
                </span>
              </span>
              <span
                className="badge"
                title={`已接入数/设备总数：${usage(a.id).length}/${acctDevs[a.id]?.list?.length ?? '—'}`}
              >
                {usage(a.id).length}/{acctDevs[a.id]?.list?.length ?? '—'}
              </span>
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
          key={'acct-' + (selAcct || 'new') + (acctEdit ? '-e' : '-r')}
        >
          {filterAccounts.length === 0 && !acctDraft ? (
            <div className="empty">
              <div className="art">
                <I n="user" size={26} />
              </div>
              <b>还没有云端账号</b>
              <span>
                一个账号管理一个家庭；添加后将可在设备向导中直接选择。
              </span>
              <button className="btn primary" onClick={() => onSelect(null)}>
                <I n="plus" /> 新建
              </button>
            </div>
          ) : selAcct && !acctEdit ? (
            <div className="form-card rform">
              <h3>
                <I n="user" size={17} /> 账号详情
              </h3>
              <div className="desc">
                账号信息与凭据状态；凭据仅保存于本机服务端。
              </div>
              <div className="ro">
                <div className="grp">
                  <h4>基本信息</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">账号名称</span>
                      <span className="v">
                        {accounts.find((a) => a.id === selAcct)?.name || '—'}
                      </span>
                    </div>
                    <div className="rr">
                      <span className="k">小米 ID</span>
                      <span className="v">
                        {accounts.find((a) => a.id === selAcct)?.miUserId ||
                          '—'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>凭据</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">passToken</span>
                      <span className="v">
                        {accounts.find((a) => a.id === selAcct)?.passToken
                          ? '已保存'
                          : '未配置'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>关联设备</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">关联设备</span>
                      <span className="v">
                        {usage(selAcct || '').length} 台
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="acct-dev">
                <I n="speaker" size={17} /> 账号设备
                <span className="sp" />
                <button
                  className="icbtn"
                  title="刷新设备"
                  onClick={() => selAcct && onRefreshDevs(selAcct)}
                >
                  <I n="refresh" size={15} />
                </button>
              </h3>
              {(() => {
                const st = selAcct ? acctDevs[selAcct] : undefined
                if (!st || st.loading)
                  return (
                    <div className="dev-pull loading">
                      <span className="spin" /> 正在从云端读取设备…
                    </div>
                  )
                if (st.err)
                  return (
                    <div className="dev-pull err">
                      <I n="warn" size={15} />
                      {st.err}
                    </div>
                  )
                if (!st.list.length)
                  return (
                    <div className="dev-pull empty">该账号下暂无音箱设备</div>
                  )
                return (
                  <div className="dev-pull">
                    {st.list.map((d) => {
                      const mm = models.find(
                        (m) =>
                          m.id === d.hardware ||
                          m.name === d.hardware ||
                          (m.did && d.hardware && d.hardware.startsWith(m.did)),
                      )
                      const bound = devices.find(
                        (x) => x.accountId === selAcct && x.did === d.miotDID,
                      )
                      return (
                        <div className="pd-row" key={d.miotDID || d.deviceID}>
                          <span className="ic t">
                            {mm?.imageUrl ? (
                              <img src={mm.imageUrl} alt="" className="thumb" />
                            ) : (
                              <I n="speaker" />
                            )}
                          </span>
                          <span className="txt">
                            <b>{d.alias || d.name}</b>
                            <span>
                              {mm?.name && mm.name !== d.hardware
                                ? mm.name + ' · '
                                : ''}
                              {d.hardware || '未知型号'}
                              {d.miotDID ? ' · ' + d.miotDID : ''}
                            </span>
                          </span>
                          <span
                            className={
                              'tag' +
                              (d.presence === 'online' ? ' accent' : ' neu')
                            }
                          >
                            {d.presence === 'online' ? '在线' : '离线'}
                          </span>
                          <span
                            className={'tag' + (bound ? ' accent' : ' neu')}
                          >
                            {bound ? '已接入' : '未接入'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              <div className="acts">
                <span className="sp" />
                <button
                  className="btn danger"
                  onClick={() => selAcct && onDelete(selAcct)}
                >
                  <I n="trash" /> 删除
                </button>
                <button className="btn primary" onClick={() => onEdit(true)}>
                  <I n="pencil" /> 编辑
                </button>
              </div>
            </div>
          ) : acctDraft ? (
            <div className="form-card">
              <h3>
                <I n="user" size={17} /> {selAcct ? '编辑账号' : '新建云端账号'}
              </h3>
              <div className="desc">
                {selAcct
                  ? '更新名称或凭据；换绑账号后需重启受影响设备。'
                  : '填入小米 ID 与 passToken。凭据仅保存于本机服务端。'}
              </div>
              <div className="grp">
                <h4>基本信息</h4>
                <div className="row">
                  <div className="fld">
                    <label>
                      账号名称<span className="req">*</span>
                    </label>
                    <input
                      value={acctDraft.name}
                      placeholder="例如：默认账号"
                      onChange={(e) =>
                        onDraft({ ...acctDraft, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="fld">
                    <label>
                      小米 ID<span className="req">*</span>
                      <span
                        className="tip"
                        data-tip="登录官方 小米账号 › 个人信息 后获取 小米ID，不是手机号或邮箱。"
                      >
                        ?
                      </span>
                    </label>
                    <input
                      value={acctDraft.miUserId}
                      placeholder="例如：1234567890"
                      onChange={(e) =>
                        onDraft({ ...acctDraft, miUserId: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>凭据</h4>
                <div className="row">
                  <div className="fld">
                    <label>
                      passToken
                      <span
                        className="tip"
                        data-tip={
                          selAcct
                            ? '留空则保留原凭据'
                            : '异地登录安全验证时，会给出授权链接'
                        }
                      >
                        ?
                      </span>
                    </label>
                    <textarea
                      rows={4}
                      value={acctDraft.passToken}
                      placeholder={
                        accounts.find((a) => a.id === selAcct)?.passToken
                          ? '已保存 · 留空保持不变'
                          : '从米家 / 小爱获取的 token'
                      }
                      onChange={(e) =>
                        onDraft({ ...acctDraft, passToken: e.target.value })
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
                    selAcct
                      ? onEdit(false)
                      : accounts.length
                        ? onSelect(accounts[0].id)
                        : onDraft(null)
                  }
                >
                  取消
                </button>
                <button
                  className="btn primary"
                  onClick={onSave}
                  disabled={!acctDraft.name || !acctDraft.miUserId}
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

/* ══ 设备型号 ══ */
