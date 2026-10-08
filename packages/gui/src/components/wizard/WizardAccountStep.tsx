import { useEffect, useState } from 'react'
import { type Account } from '../../apis.ts'
import { I } from '../../icons.tsx'
import type { WizardSetDraft } from './types.ts'

export function WizardAccountStep(props: {
  active: boolean
  accounts: Account[]
  accountId: string
  setDraft: WizardSetDraft
  onNewAccount: (d: {
    name: string
    miUserId: string
    passToken: string
  }) => Promise<Account>
  onUpdateAccount: (id: string, d: Partial<Account>) => Promise<Account>
}) {
  const { accounts, accountId, setDraft, onNewAccount, onUpdateAccount } = props
  const [newAcct, setNewAcct] = useState(false)
  const [acctEdit, setAcctEdit] = useState(false)
  const [naDraft, setNaDraft] = useState({
    name: '',
    miUserId: '',
    passToken: '',
  })
  const [naBusy, setNaBusy] = useState(false)
  const [naErr, setNaErr] = useState('')
  const selAcct = accounts.find((a) => a.id === accountId)

  // 列表有实体时默认选中第一个；无实体时右侧展示新建表单
  useEffect(() => {
    if (props.active && !accountId && accounts.length)
      setDraft({ accountId: accounts[0].id })
  }, [props.active, accountId, accounts, setDraft])

  const saveAcct = async () => {
    if (naBusy) return
    setNaBusy(true)
    setNaErr('')
    try {
      if (acctEdit && selAcct) {
        await onUpdateAccount(selAcct.id, {
          name: naDraft.name,
          miUserId: naDraft.miUserId,
          ...(naDraft.passToken ? { passToken: naDraft.passToken } : {}),
        })
        setAcctEdit(false)
      } else {
        const created = await onNewAccount(naDraft)
        setDraft({ accountId: created.id })
        setNewAcct(false)
      }
      setNaDraft({ name: '', miUserId: '', passToken: '' })
    } catch (e) {
      setNaErr((e as Error).message || '保存账号失败')
    } finally {
      setNaBusy(false)
    }
  }
  const beginAcctEdit = () => {
    if (!selAcct) return
    setNewAcct(false)
    setAcctEdit(true)
    setNaDraft({
      name: selAcct.name,
      miUserId: selAcct.miUserId,
      passToken: '',
    })
  }
  return (
    <div className={'step' + (props.active ? ' on' : '')}>
      <div className="split wsplit">
        <aside className="slist">
          {accounts.length === 0 && (
            <div className="empty" style={{ padding: '16px' }}>
              <b>还没有云端账号</b>
              <span>请新建一个账号，或在「账号设备」页先接入。</span>
            </div>
          )}
          {accounts.map((a) => (
            <div
              key={a.id}
              className={'li' + (accountId === a.id ? ' on' : '')}
              onClick={() => {
                setDraft({ accountId: a.id })
                setNewAcct(false)
                setAcctEdit(false)
                setNaDraft({ name: '', miUserId: '', passToken: '' })
              }}
            >
              <span className="ic">
                <I n="user" />
              </span>
              <span className="txt">
                <b>{a.name}</b>
                <span>小米 ID {a.miUserId}</span>
              </span>
            </div>
          ))}
          <button
            className="btn"
            style={{ justifyContent: 'center', marginTop: 4 }}
            onClick={() => {
              setNewAcct(true)
              setAcctEdit(false)
              setNaDraft({ name: '', miUserId: '', passToken: '' })
            }}
          >
            <I n="plus" /> 新建
          </button>
        </aside>
        <section className="sdetail">
          {selAcct && !newAcct && !acctEdit ? (
            <div className="form-card">
              <h3>
                <I n="user" size={17} /> 账号详情
              </h3>
              <div className="desc">
                账号信息与凭据状态；凭据仅保存于本机服务端。
              </div>
              <div className="ro">
                <div className="rr">
                  <span className="k">账号名称</span>
                  <span className="v">{selAcct.name || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">小米 ID</span>
                  <span className="v">{selAcct.miUserId || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">passToken</span>
                  <span className="v">
                    {selAcct.passToken ? '已保存' : '未配置'}
                  </span>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <button className="btn primary" onClick={beginAcctEdit}>
                  <I n="pencil" /> 编辑
                </button>
              </div>
            </div>
          ) : (
            <div className="form-card">
              <h3>
                <I n="user" size={17} />{' '}
                {acctEdit && selAcct ? '编辑账号' : '新建云端账号'}
              </h3>
              <div className="desc">
                {acctEdit && selAcct
                  ? '更新名称或凭据；换绑账号后需重启受影响设备。'
                  : '填入小米 ID 与 passToken。凭据仅保存于本机服务端。'}
              </div>
              <div className="fld">
                <label>
                  账号名称<span className="req">*</span>
                </label>
                <input
                  value={naDraft.name}
                  placeholder="例如：默认账号"
                  onChange={(e) =>
                    setNaDraft({ ...naDraft, name: e.target.value })
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
                  value={naDraft.miUserId}
                  placeholder="登录官方 小米账号 › 个人信息 获取，不是手机号或邮箱"
                  onChange={(e) =>
                    setNaDraft({ ...naDraft, miUserId: e.target.value })
                  }
                />
              </div>
              <div className="fld">
                <label>
                  云端会话凭证 passToken
                  <span
                    className="tip"
                    data-tip={
                      acctEdit && selAcct
                        ? '留空则保留原凭据'
                        : '请勿把凭证发送给其他人；异地登录安全验证时，会给出授权链接。'
                    }
                  >
                    ?
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={naDraft.passToken}
                  placeholder={
                    acctEdit && selAcct && selAcct.passToken
                      ? '已保存 · 留空保持不变'
                      : '从米家 / 小爱获取的 token'
                  }
                  onChange={(e) =>
                    setNaDraft({ ...naDraft, passToken: e.target.value })
                  }
                />
              </div>
              {naErr && (
                <div className="notice err">
                  <I n="warning" size={15} /> {naErr}
                </div>
              )}
              <div className="acts">
                <span className="sp" />
                <button
                  className="btn ghost"
                  onClick={() =>
                    acctEdit && selAcct
                      ? (setAcctEdit(false),
                        setNaDraft({
                          name: '',
                          miUserId: '',
                          passToken: '',
                        }))
                      : setNewAcct(false)
                  }
                >
                  取消
                </button>
                <button
                  className="btn primary"
                  disabled={naBusy || !naDraft.name || !naDraft.miUserId}
                  onClick={saveAcct}
                >
                  {naBusy ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
