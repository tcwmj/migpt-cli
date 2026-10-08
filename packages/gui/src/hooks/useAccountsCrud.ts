/* ══ 云端账号：选中/草稿/保存/删除 + 账号下云端设备拉取 + 过滤 ══ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from '../apis.ts'
import type { Account, DeviceRow } from '../apis.ts'
import type { AccountDraft, AcctDevState } from '../views/drafts.ts'
import type { ConfirmState } from '../ui-types.ts'
import { errText } from '../components/app/errText.ts'

export function useAccountsCrud(opts: {
  accounts: Account[]
  devices: DeviceRow[]
  query: string
  showToast: (msg: string) => void
  refreshAll: () => void
  setConfirm: (c: ConfirmState) => void
}) {
  const { accounts, devices, query, showToast, refreshAll, setConfirm } = opts
  const [selAcct, setSelAcct] = useState<string | null>(null)
  const [acctDraft, setAcctDraft] = useState<AccountDraft | null>(null)
  const [acctEdit, setAcctEdit] = useState(false)
  /* 账号详情页展示该账号下云端设备列表（独立于设备页拉取，按账号缓存） */
  const [acctDevs, setAcctDevs] = useState<Record<string, AcctDevState>>({})

  const selectAcct = (id: string | null) => {
    setSelAcct(id)
    const a = id ? accounts.find((x) => x.id === id) : null
    setAcctDraft({
      name: a?.name || '',
      miUserId: a?.miUserId || '',
      passToken: '',
    })
    setAcctEdit(id === null)
  }

  const saveAcct = async () => {
    if (!acctDraft) return
    if (!acctDraft.name || !acctDraft.miUserId) {
      showToast('账号名称与小米 ID 必填')
      return
    }
    try {
      if (selAcct) {
        await api.updateAccount(selAcct, {
          name: acctDraft.name,
          miUserId: acctDraft.miUserId,
          ...(acctDraft.passToken ? { passToken: acctDraft.passToken } : {}),
        })
        showToast('账号已保存，换绑账号需重启受影响设备')
        setAcctEdit(false)
      } else {
        const created = await api.createAccount({
          name: acctDraft.name,
          miUserId: acctDraft.miUserId,
          passToken: acctDraft.passToken,
        })
        showToast('账号已创建')
        await refreshAll()
        selectAcct(created.id)
        return
      }
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }

  /** 账号被哪些设备引用（别名列表） */
  const usage = useCallback(
    (id: string) =>
      devices.filter((d) => d.accountId === id).map((d) => d.alias),
    [devices],
  )

  const delAcct = async (id: string) => {
    const used = usage(id)
    if (used.length) {
      showToast(
        `该账号正被 ${used.length} 台设备引用（${used.join('、')}），请先解除设备绑定`,
      )
      return
    }
    const name = accounts.find((a) => a.id === id)?.name || '该账号'
    setConfirm({
      title: '删除云端账号',
      msg: `确定删除「${name}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteAccount(id)
          showToast('账号已删除')
          setSelAcct(null)
          setAcctDraft(null)
          setAcctEdit(false)
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }

  const loadAcctDevs = async (accountId: string) => {
    setAcctDevs((m) => ({
      ...m,
      [accountId]: { loading: true, err: '', list: m[accountId]?.list || [] },
    }))
    try {
      const r = await api.pullDevices(accountId)
      setAcctDevs((m) => ({
        ...m,
        [accountId]: { loading: false, err: '', list: r.devices || [] },
      }))
    } catch (e) {
      setAcctDevs((m) => ({
        ...m,
        [accountId]: { loading: false, err: errText(e), list: [] },
      }))
    }
  }

  const filterAccounts = useMemo(() => {
    if (!query) return accounts
    const q = query.toLowerCase()
    return accounts.filter((a) =>
      (a.name + a.miUserId).toLowerCase().includes(q),
    )
  }, [accounts, query])

  /* 统一「左列表 + 右详情/新建」：进入页面后默认选中第一个 */
  useEffect(() => {
    if (!selAcct && accounts.length) {
      setSelAcct(accounts[0].id)
      setAcctEdit(false)
      setAcctDraft({
        name: accounts[0].name,
        miUserId: accounts[0].miUserId,
        passToken: '',
      })
    }
  }, [accounts]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selAcct && !acctDevs[selAcct]) void loadAcctDevs(selAcct)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selAcct])

  return {
    selAcct,
    acctDraft,
    acctEdit,
    acctDevs,
    filterAccounts,
    setAcctDraft,
    setAcctEdit,
    selectAcct,
    saveAcct,
    delAcct,
    loadAcctDevs,
    usage,
  }
}
