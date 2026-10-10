/* ══ 设备：选中/草稿/保存/删除/重启/解绑 + 详情抽屉 + 云端拉取 + 过滤 ══ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from '../apis.ts'
import type { Account, DeviceDetail, DeviceRow } from '../apis.ts'
import type { ConfirmState } from '../ui-types.ts'
import type { DevDraft, DevPullState } from '../views/drafts.ts'
import { errText } from '../components/app/errText.ts'

export function useDevicesCrud(opts: {
  devices: DeviceRow[]
  accounts: Account[]
  query: string
  showToast: (msg: string) => void
  refreshAll: () => void
  setConfirm: (c: ConfirmState) => void
}) {
  const { devices, accounts, query, showToast, refreshAll, setConfirm } = opts
  const [detail, setDetail] = useState<DeviceDetail | null>(null)
  const [, setDrawerBusy] = useState(false)
  const [selDev, setSelDev] = useState<string | null>(null)
  const [devAcctFilter, setDevAcctFilter] = useState('all')
  const [devEdit, setDevEdit] = useState(false)
  const [devDraft, setDevDraft] = useState<DevDraft | null>(null)
  const [devPull, setDevPull] = useState<DevPullState>({
    loading: false,
    err: '',
    list: null,
  })
  const [modelPickQ, setModelPickQ] = useState('')
  const [modelPickOpen, setModelPickOpen] = useState(false)

  const draftOf = (d: DeviceRow): DevDraft => ({
    alias: d.alias,
    did: d.did,
    speakerModel: d.speakerModel || '',
    accountId: d.accountId || '',
    roleId: d.roleId || '',
    thinkServiceIds: d.thinkServiceIds || [],
    voiceId: d.voiceId || '',
    ttsSecret: d.ttsSecret || '',
  })
  const blankDraft = (): DevDraft => ({
    alias: '',
    did: '',
    speakerModel: '',
    accountId: '',
    roleId: '',
    thinkServiceIds: [],
    voiceId: '',
    ttsSecret: '',
  })

  /* 设备页：左列表选中 → 右侧详情/新建（与其他页 split 一致） */
  const selectDev = (id: string | null) => {
    setSelDev(id)
    setDevEdit(id === null)
    if (id) {
      const d = devices.find((x) => x.id === id)
      setDevDraft(d ? draftOf(d) : null)
    } else {
      setDevDraft(blankDraft())
    }
  }

  const saveDeviceForm = async () => {
    if (!devDraft) return
    try {
      if (selDev) {
        await api.saveDevice(selDev, {
          meta: {
            alias: devDraft.alias,
            did: devDraft.did,
            speakerModel: devDraft.speakerModel || undefined,
            accountId: devDraft.accountId || undefined,
            roleId: devDraft.roleId || undefined,
            thinkServiceIds: devDraft.thinkServiceIds.length
              ? devDraft.thinkServiceIds
              : undefined,
            voiceId: devDraft.voiceId || undefined,
            ttsSecret: devDraft.ttsSecret || undefined,
          },
        })
        showToast('设备已更新，需重启设备生效')
        setDevEdit(false)
      } else {
        const res = await api.createDevice({
          alias: devDraft.alias,
          did: devDraft.did,
          speakerModel: devDraft.speakerModel || undefined,
          accountId: devDraft.accountId || undefined,
          roleId: devDraft.roleId || undefined,
          thinkServiceIds: devDraft.thinkServiceIds.length
            ? devDraft.thinkServiceIds
            : undefined,
          voiceId: devDraft.voiceId || undefined,
        })
        showToast('设备已添加，点击「重启设备」使其生效')
        await refreshAll()
        selectDev(res.id)
        return
      }
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }

  const removeDeviceForm = async () => {
    if (!selDev) return
    const name = devices.find((d) => d.id === selDev)?.alias || '该设备'
    setConfirm({
      title: '删除设备',
      msg: `确定删除「${name}」吗？删除后需重新添加才能管理。`,
      onOk: async () => {
        try {
          await api.deleteDevice(selDev)
          setSelDev(null)
          setDevDraft(null)
          setDevEdit(false)
          showToast('设备已删除')
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }

  const restartDevice = async (id: string) => {
    try {
      await api.startDevice(id)
      showToast('已重启设备，账号信息约 1 小时后更新')
      refreshAll()
    } catch (e) {
      showToast((e as Error).message || '重启失败')
    }
  }

  const removeDevice = async (id: string) => {
    try {
      await api.deleteDevice(id)
      setDetail(null)
      showToast('设备已解绑')
      refreshAll()
    } catch (e) {
      showToast((e as Error).message || '解绑失败')
    }
  }

  /* 设备详情抽屉 */
  const openDevice = useCallback(
    async (id: string) => {
      setDrawerBusy(true)
      try {
        const d = await api.getDevice(id)
        setDetail(d)
        setDrawerBusy(false)
      } catch (e) {
        setDrawerBusy(false)
        showToast((e as Error).message || '加载设备详情失败')
      }
    },
    [showToast],
  )
  const closeDrawer = useCallback(() => setDetail(null), [])

  /* 从云端账号拉取音箱设备列表（新建设备 / 三步向导复用） */
  const doPullDev = async (accountId: string) => {
    if (!accountId) return
    setDevPull({ loading: true, err: '', list: null })
    try {
      const r = await api.pullDevices(accountId)
      const list = r.devices || []
      if (!list.length) {
        setDevPull({
          loading: false,
          err: '该账号下未发现音箱设备，请确认小米 ID 与 passToken 正确',
          list: [],
        })
        return
      }
      setDevPull({ loading: false, err: '', list })
    } catch (e) {
      setDevPull({ loading: false, err: errText(e), list: null })
    }
  }
  const resetPull = () => setDevPull({ loading: false, err: '', list: null })

  /* 统一「左列表 + 右详情/新建」：进入页面后默认选中第一个 */
  useEffect(() => {
    if (!selDev && devices.length) {
      const d = devices[0]
      setSelDev(d.id)
      setDevEdit(false)
      setDevDraft(draftOf(d))
    }
  }, [devices]) // eslint-disable-line react-hooks/exhaustive-deps

  const filterDevices = useMemo(() => {
    let list = devices
    if (devAcctFilter !== 'all')
      list = list.filter((d) => d.accountId === devAcctFilter)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((d) => (d.alias + d.did).toLowerCase().includes(q))
    }
    return list
  }, [devices, query, devAcctFilter])

  const devAcctGroups = useMemo(() => {
    const ids: string[] = []
    devices.forEach((d) => {
      if (d.accountId && !ids.includes(d.accountId)) ids.push(d.accountId)
    })
    return ids
      .map((id) => ({
        id,
        name: accounts.find((a) => a.id === id)?.name || id,
      }))
      .filter((g) => !!g.name)
  }, [devices, accounts])

  return {
    detail,
    selDev,
    devDraft,
    devEdit,
    devPull,
    devAcctFilter,
    modelPickQ,
    modelPickOpen,
    filterDevices,
    devAcctGroups,
    setDevDraft,
    setDevEdit,
    setDevAcctFilter,
    setModelPickQ,
    setModelPickOpen,
    selectDev,
    saveDeviceForm,
    removeDeviceForm,
    restartDevice,
    removeDevice,
    openDevice,
    closeDrawer,
    doPullDev,
    resetPull,
  }
}
