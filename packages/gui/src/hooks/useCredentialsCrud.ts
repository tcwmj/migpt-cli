/* ══ 小米凭据：选中/草稿/保存/删除 + 凭据下云端设备拉取 + 过滤 ══ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from '../apis.ts'
import type { Credential, DeviceRow } from '../apis.ts'
import type { AccountDraft, CredDevState } from '../views/drafts.ts'
import type { ConfirmState } from '../ui-types.ts'
import { errText } from '../components/app/errText.ts'

export function useCredentialsCrud(opts: {
  credentials: Credential[]
  devices: DeviceRow[]
  query: string
  showToast: (msg: string) => void
  refreshAll: () => void
  setConfirm: (c: ConfirmState) => void
}) {
  const { credentials, devices, query, showToast, refreshAll, setConfirm } =
    opts
  const [selAcct, setSelAcct] = useState<string | null>(null)
  const [credDraft, setAcctDraft] = useState<AccountDraft | null>(null)
  const [credEdit, setAcctEdit] = useState(false)
  /* 凭据详情页展示该凭据下云端设备列表（独立于设备页拉取，按凭据缓存） */
  const [credDevs, setAcctDevs] = useState<Record<string, CredDevState>>({})

  const selectAcct = (id: string | null) => {
    setSelAcct(id)
    const a = id ? credentials.find((x) => x.id === id) : null
    setAcctDraft({
      name: a?.name || '',
      miUserId: a?.miUserId || '',
      passToken: '',
    })
    setAcctEdit(id === null)
  }

  const saveAcct = async () => {
    if (!credDraft) return
    const hasExistingToken = selAcct
      ? credentials.find((a) => a.id === selAcct)?.hasPassToken
      : false
    if (!credDraft.name || !credDraft.miUserId) {
      showToast('凭据名称与小米 ID 必填')
      return
    }
    if (!credDraft.passToken && !hasExistingToken) {
      showToast('passToken 必填')
      return
    }
    try {
      if (selAcct) {
        await api.updateCredential(selAcct, {
          name: credDraft.name,
          miUserId: credDraft.miUserId,
          ...(credDraft.passToken ? { passToken: credDraft.passToken } : {}),
        })
        showToast('凭据已保存，换绑凭据需重启受影响设备')
        setAcctEdit(false)
      } else {
        const created = await api.createCredential({
          name: credDraft.name,
          miUserId: credDraft.miUserId,
          passToken: credDraft.passToken,
        })
        showToast('凭据已创建')
        await refreshAll()
        selectAcct(created.id)
        return
      }
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }

  /** 凭据被哪些设备引用（别名列表） */
  const usage = useCallback(
    (id: string) =>
      devices.filter((d) => d.credentialId === id).map((d) => d.alias),
    [devices],
  )

  const delAcct = async (id: string) => {
    const used = usage(id)
    if (used.length) {
      showToast(
        `该凭据正被 ${used.length} 台设备引用（${used.join('、')}），请先解除设备绑定`,
      )
      return
    }
    const name = credentials.find((a) => a.id === id)?.name || '该凭据'
    setConfirm({
      title: '删除小米凭据',
      msg: `确定删除「${name}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteCredential(id)
          showToast('凭据已删除')
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

  const loadAcctDevs = async (credentialId: string) => {
    setAcctDevs((m) => ({
      ...m,
      [credentialId]: {
        loading: true,
        err: '',
        list: m[credentialId]?.list || [],
      },
    }))
    try {
      const r = await api.pullDevices(credentialId)
      setAcctDevs((m) => ({
        ...m,
        [credentialId]: { loading: false, err: '', list: r.devices || [] },
      }))
    } catch (e) {
      setAcctDevs((m) => ({
        ...m,
        [credentialId]: { loading: false, err: errText(e), list: [] },
      }))
    }
  }

  const filterCredentials = useMemo(() => {
    if (!query) return credentials
    const q = query.toLowerCase()
    return credentials.filter((a) =>
      (a.name + a.miUserId).toLowerCase().includes(q),
    )
  }, [credentials, query])

  /* 统一「左列表 + 右详情/新建」：进入页面后默认选中第一个 */
  useEffect(() => {
    if (!selAcct && credentials.length) {
      setSelAcct(credentials[0].id)
      setAcctEdit(false)
      setAcctDraft({
        name: credentials[0].name,
        miUserId: credentials[0].miUserId,
        passToken: '',
      })
    }
  }, [credentials]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selAcct && !credDevs[selAcct]) void loadAcctDevs(selAcct)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selAcct])

  return {
    selAcct,
    credDraft,
    credEdit,
    credDevs,
    filterCredentials,
    setAcctDraft,
    setAcctEdit,
    selectAcct,
    saveAcct,
    delAcct,
    loadAcctDevs,
    usage,
  }
}
