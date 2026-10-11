import { useEffect, useState } from 'react'
import { type Credential } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button, EmptyState, Field } from '../atoms/index.ts'
import type { WizardSetDraft } from './types.ts'

export function WizardCredentialStep(props: {
  active: boolean
  credentials: Credential[]
  credentialId: string
  setDraft: WizardSetDraft
  onNewAccount: (d: {
    name: string
    miUserId: string
    passToken: string
  }) => Promise<Credential>
  onUpdateAccount: (id: string, d: Partial<Credential>) => Promise<Credential>
}) {
  const { credentials, credentialId, setDraft, onNewAccount, onUpdateAccount } =
    props
  const [newAcct, setNewAcct] = useState(false)
  const [credEdit, setAcctEdit] = useState(false)
  const [naDraft, setNaDraft] = useState({
    name: '',
    miUserId: '',
    passToken: '',
  })
  const [naBusy, setNaBusy] = useState(false)
  const [naErr, setNaErr] = useState('')
  const selAcct = credentials.find((a) => a.id === credentialId)

  // 列表有实体时默认选中第一个；无实体时右侧展示新建表单
  useEffect(() => {
    if (props.active && !credentialId && credentials.length)
      setDraft({ credentialId: credentials[0].id })
  }, [props.active, credentialId, credentials, setDraft])

  const saveAcct = async () => {
    if (naBusy) return
    setNaBusy(true)
    setNaErr('')
    try {
      if (credEdit && selAcct) {
        await onUpdateAccount(selAcct.id, {
          name: naDraft.name,
          miUserId: naDraft.miUserId,
          ...(naDraft.passToken ? { passToken: naDraft.passToken } : {}),
        })
        setAcctEdit(false)
      } else {
        const created = await onNewAccount(naDraft)
        setDraft({ credentialId: created.id })
        setNewAcct(false)
      }
      setNaDraft({ name: '', miUserId: '', passToken: '' })
    } catch (e) {
      setNaErr((e as Error).message || '保存凭据失败')
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
          {credentials.length === 0 && (
            <EmptyState
              title="还没有小米凭据"
              desc="请新建一条凭据，或在「小米凭据」页先接入。"
              style={{ padding: '16px' }}
            />
          )}
          {credentials.map((a) => (
            <div
              key={a.id}
              className={'li' + (credentialId === a.id ? ' on' : '')}
              onClick={() => {
                setDraft({ credentialId: a.id })
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
          <Button
            icon="plus"
            style={{ justifyContent: 'center', marginTop: 4 }}
            onClick={() => {
              setNewAcct(true)
              setAcctEdit(false)
              setNaDraft({ name: '', miUserId: '', passToken: '' })
            }}
          >
            新建
          </Button>
        </aside>
        <section className="sdetail">
          {selAcct && !newAcct && !credEdit ? (
            <div className="form-card">
              <h3>
                <I n="user" size={17} /> 凭据详情
              </h3>
              <div className="desc">
                凭据信息与凭据状态；凭据仅保存于本机服务端。
              </div>
              <div className="ro">
                <div className="rr">
                  <span className="k">凭据名称</span>
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
                <Button variant="primary" icon="pencil" onClick={beginAcctEdit}>
                  编辑
                </Button>
              </div>
            </div>
          ) : (
            <div className="form-card">
              <h3>
                <I n="user" size={17} />{' '}
                {credEdit && selAcct ? '编辑凭据' : '新建小米凭据'}
              </h3>
              <div className="desc">
                {credEdit && selAcct
                  ? '更新名称或凭据；换绑凭据后需重启受影响设备。'
                  : '填入小米 ID 与 passToken。凭据仅保存于本机服务端。'}
              </div>
              <Field label="凭据名称" required>
                <input
                  value={naDraft.name}
                  placeholder="例如：默认凭据"
                  onChange={(e) =>
                    setNaDraft({ ...naDraft, name: e.target.value })
                  }
                />
              </Field>
              <Field
                label="小米 ID"
                required
                tip="登录官方 小米账号 › 个人信息 后获取 小米ID，不是手机号或邮箱。"
              >
                <input
                  value={naDraft.miUserId}
                  placeholder="登录官方 小米账号 › 个人信息 获取，不是手机号或邮箱"
                  onChange={(e) =>
                    setNaDraft({ ...naDraft, miUserId: e.target.value })
                  }
                />
              </Field>
              <Field
                label="云端会话凭证 passToken"
                tip={
                  credEdit && selAcct
                    ? '留空则保留原凭据'
                    : '请勿把凭证发送给其他人；异地登录安全验证时，会给出授权链接。'
                }
              >
                <textarea
                  rows={3}
                  value={naDraft.passToken}
                  placeholder={
                    credEdit && selAcct && selAcct.passToken
                      ? '已保存 · 留空保持不变'
                      : '从米家 / 小爱获取的 token'
                  }
                  onChange={(e) =>
                    setNaDraft({ ...naDraft, passToken: e.target.value })
                  }
                />
              </Field>
              {naErr && (
                <div className="notice err">
                  <I n="warning" size={15} /> {naErr}
                </div>
              )}
              <div className="acts">
                <span className="sp" />
                <Button
                  variant="ghost"
                  onClick={() =>
                    credEdit && selAcct
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
                </Button>
                <Button
                  variant="primary"
                  disabled={naBusy || !naDraft.name || !naDraft.miUserId}
                  onClick={saveAcct}
                >
                  {naBusy ? '保存中…' : '保存'}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
