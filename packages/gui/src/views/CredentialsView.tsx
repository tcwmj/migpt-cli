/* ══ CredentialsView ══ */
import { I } from '../icons.tsx'
import {
  Button,
  Chip,
  EmptyState,
  Field,
  Tag,
} from '../components/atoms/index.ts'
import type { Credential, DeviceRow, SpeakerModel } from '../apis.ts'
import type { AccountDraft, CredDevState } from './drafts.ts'

export function CredentialsView(props: {
  filterCredentials: Credential[]
  credentials: Credential[]
  selAcct: string | null
  credDraft: AccountDraft | null
  credEdit: boolean
  credDevs: Record<string, CredDevState>
  devices: DeviceRow[]
  speakerModels: SpeakerModel[]
  onSelect: (id: string | null) => void
  onDraft: (d: AccountDraft | null) => void
  onEdit: (e: boolean) => void
  onDelete: (id: string) => void
  onSave: () => void
  onRefreshDevs: (id: string) => void
  onGoToDevice: (d: {
    credentialId: string
    did: string
    alias: string
    hardware: string
  }) => void
  usage: (id: string) => string[]
}) {
  const {
    filterCredentials,
    credentials,
    selAcct,
    credDraft,
    credEdit,
    credDevs,
    devices,
    speakerModels,
    onSelect,
    onDraft,
    onEdit,
    onDelete,
    onSave,
    onRefreshDevs,
    usage,
  } = props
  return (
    <section data-view="credentials" className="on">
      <div className="filters">
        <Chip on>全部凭据 {credentials.length}</Chip>
        <span className="sp" />
      </div>
      <div className="split">
        <aside className="slist">
          {filterCredentials.map((a) => (
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
                  {a.miUserId} · {a === credentials[0] ? '默认' : '备用'}
                </span>
              </span>
              <span
                className="badge"
                title={`已接入数/设备总数：${usage(a.id).length}/${credDevs[a.id]?.list?.length ?? '—'}`}
              >
                {usage(a.id).length}/{credDevs[a.id]?.list?.length ?? '—'}
              </span>
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
          key={'cred-' + (selAcct || 'new') + (credEdit ? '-e' : '-r')}
        >
          {filterCredentials.length === 0 && !credDraft ? (
            <EmptyState
              icon="user"
              title="还没有小米凭据"
              desc="一条凭据管理一个家庭；添加后将可在设备向导中直接选择。"
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
          ) : selAcct && !credEdit ? (
            <div className="form-card rform">
              <h3>
                <I n="user" size={17} /> 凭据详情
              </h3>
              <div className="desc">
                凭据信息与凭据状态；凭据仅保存于本机服务端。
              </div>
              <div className="ro">
                <div className="grp">
                  <h4>基本信息</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">凭据名称</span>
                      <span className="v">
                        {credentials.find((a) => a.id === selAcct)?.name || '—'}
                      </span>
                    </div>
                    <div className="rr">
                      <span className="k">小米 ID</span>
                      <span className="v">
                        {credentials.find((a) => a.id === selAcct)?.miUserId ||
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
                        {credentials.find((a) => a.id === selAcct)?.hasPassToken
                          ? '已配置'
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
              <h3 className="cred-dev">
                <I n="speaker" size={17} /> 凭据设备
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
                const st = selAcct ? credDevs[selAcct] : undefined
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
                    <div className="dev-pull empty">该凭据下暂无音箱设备</div>
                  )
                return (
                  <div className="dev-pull">
                    {st.list.map((d) => {
                      const mm = speakerModels.find(
                        (m) =>
                          m.id === d.hardware ||
                          m.name === d.hardware ||
                          (m.didPrefix &&
                            d.hardware &&
                            d.hardware.startsWith(m.didPrefix)),
                      )
                      const bound = devices.find(
                        (x) =>
                          x.credentialId === selAcct && x.did === d.miotDID,
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
                          <Tag
                            tone={d.presence === 'online' ? 'accent' : 'neu'}
                          >
                            {d.presence === 'online' ? '在线' : '离线'}
                          </Tag>
                          {bound ? (
                            <Tag tone="accent">已接入</Tag>
                          ) : (
                            <Tag
                              tone="neu"
                              className="go-integrate"
                              onClick={() =>
                                props.onGoToDevice({
                                  credentialId: selAcct!,
                                  did: d.miotDID,
                                  alias: d.alias || d.name,
                                  hardware: d.hardware,
                                })
                              }
                            >
                              去接入
                            </Tag>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              <div className="acts">
                <span className="sp" />
                <Button
                  variant="danger"
                  icon="trash"
                  onClick={() => selAcct && onDelete(selAcct)}
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
          ) : credDraft ? (
            <div className="form-card">
              <h3>
                <I n="user" size={17} /> {selAcct ? '编辑凭据' : '新建小米凭据'}
              </h3>
              <div className="desc">
                {selAcct
                  ? '更新名称或凭据；换绑凭据后需重启受影响设备。'
                  : '填入小米 ID 与 passToken。凭据仅保存于本机服务端。'}
              </div>
              <div className="grp">
                <h4>基本信息</h4>
                <div className="row">
                  <Field label="凭据名称" required>
                    <input
                      value={credDraft.name}
                      placeholder="例如：默认凭据"
                      onChange={(e) =>
                        onDraft({ ...credDraft, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="小米 ID"
                    required
                    tip="登录官方 小米账号 › 个人信息 后获取 小米ID，不是手机号或邮箱。"
                  >
                    <input
                      value={credDraft.miUserId}
                      placeholder="例如：1234567890"
                      onChange={(e) =>
                        onDraft({ ...credDraft, miUserId: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
              <div className="grp">
                <h4>凭据</h4>
                <div className="row">
                  <Field
                    label="passToken"
                    required
                    tip={
                      selAcct
                        ? '留空则保留原凭据'
                        : '异地登录安全验证时，会给出授权链接'
                    }
                  >
                    <textarea
                      rows={4}
                      value={credDraft.passToken}
                      placeholder={
                        credentials.find((a) => a.id === selAcct)?.hasPassToken
                          ? '已配置 · 留空保持不变'
                          : '从米家 / 小爱获取的 token'
                      }
                      onChange={(e) =>
                        onDraft({ ...credDraft, passToken: e.target.value })
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
                    selAcct
                      ? onEdit(false)
                      : credentials.length
                        ? onSelect(credentials[0].id)
                        : onDraft(null)
                  }
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  icon="check"
                  onClick={onSave}
                  disabled={
                    !credDraft.name ||
                    !credDraft.miUserId ||
                    (!credDraft.passToken &&
                      !credentials.find((a) => a.id === selAcct)?.hasPassToken)
                  }
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

/* ══ 音箱型号 ══ */
