import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from './apis.ts'
import {
  type Account,
  type DeviceDetail,
  type DeviceRow,
  type PulledDevice,
  type Role,
  type Room,
  type SpeakerModel,
  type ThinkService,
  type VoiceService,
} from './apis.ts'
import { I, MiLogo } from './icons.tsx'
import {
  PROVIDER_PRESETS,
  SEARCH_HINT,
  TITLES,
  type View,
} from './constants.ts'
import {
  AccountsView,
  DevicesView,
  HomeView,
  ModelsView,
  ProfileView,
  ServicesView,
} from './views.tsx'
import { LoginPage } from './components/LoginPage.tsx'
import { LogsView } from './views/LogsView.tsx'
import { SysLogsView } from './views/SysLogsView.tsx'
import { RoomsView } from './views/RoomsView.tsx'
import { RolesView } from './views/RolesView.tsx'
import { Drawer } from './components/Drawer.tsx'
import { ModalShell } from './components/ModalShell.tsx'
import { Wizard } from './components/Wizard.tsx'
import type { ModalState } from './ui-types.ts'

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [loginErr, setLoginErr] = useState('')
  const [view, setView] = useState<View>('home')
  const [settingTab, setSettingTab] = useState<'think' | 'voice'>('think')
  const [query, setQuery] = useState('')
  const [sideOff, setSideOff] = useState<boolean>(
    () => localStorage.getItem('migpt-side-off') === '1',
  )
  useEffect(() => {
    localStorage.setItem('migpt-side-off', sideOff ? '1' : '0')
  }, [sideOff])

  const [bannerIdx, setBannerIdx] = useState(0)

  const [selAcct, setSelAcct] = useState<string | null>(null)
  const [acctDraft, setAcctDraft] = useState<{
    name: string
    miUserId: string
    passToken: string
  } | null>(null)
  const [acctEdit, setAcctEdit] = useState(false)
  const [selThink, setSelThink] = useState<string | null>(null)
  const [thinkDraft, setThinkDraft] = useState<{
    name: string
    provider: string
    model: string
    apiKey: string
    temperature: string
    baseUrl: string
  } | null>(null)
  const [thinkEdit, setThinkEdit] = useState(false)
  const [selVoice, setSelVoice] = useState<string | null>(null)
  const [voiceDraft, setVoiceDraft] = useState<{
    name: string
    provider: string
    voiceId: string
    edgeToken: string
    volcanoAppId: string
    volcanoToken: string
    openaiKey: string
    openaiModel: string
    openaiBaseUrl: string
    customJson: string
  } | null>(null)
  const [voiceEdit, setVoiceEdit] = useState(false)
  const [devEdit, setDevEdit] = useState(false)
  const [confirm, setConfirm] = useState<{
    title: string
    msg: string
    danger?: boolean
    onOk: () => void
  } | null>(null)
  const [confirmLeaving, setConfirmLeaving] = useState(false)
  const closeConfirm = (doIt?: boolean) => {
    if (confirmLeaving) return
    setConfirmLeaving(true)
    window.setTimeout(() => {
      const c = confirm
      setConfirm(null)
      setConfirmLeaving(false)
      if (doIt && c) c.onOk()
    }, 200)
  }
  // 统一确认按钮：非危险操作（danger === false）用中性「确认」，删除类操作沿用「删除」
  const confirmNeutral = confirm?.danger === false
  const confirmOkIcon = confirmNeutral ? 'check' : 'trash'
  const confirmOkText = confirmNeutral ? '确认' : '删除'

  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % 5), 5000)
    return () => clearInterval(t)
  }, [])

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
  const selectThink = (id: string | null) => {
    setSelThink(id)
    const s = id ? thinkSvcs.find((x) => x.id === id) : null
    setThinkDraft({
      name: s?.name || '',
      provider: s?.provider || 'doubao',
      model: s?.model || PROVIDER_PRESETS[s?.provider || 'doubao']?.model || '',
      apiKey: '',
      temperature: String(s?.temperature ?? 0.7),
      baseUrl: s?.baseUrl || PROVIDER_PRESETS[s?.provider || '']?.baseUrl || '',
    })
    setThinkEdit(id === null)
  }
  const selectVoice = (id: string | null) => {
    setSelVoice(id)
    const s = id ? voiceSvcs.find((x) => x.id === id) : null
    const tts = s?.tts || {}
    setVoiceDraft({
      name: s?.name || '',
      provider: s?.provider || 'edge',
      voiceId: s?.voiceId || '',
      edgeToken: tts.edge?.trustedToken || '',
      volcanoAppId: tts.volcano?.appId || '',
      volcanoToken: tts.volcano?.accessToken || '',
      openaiKey: tts.openai?.apiKey || '',
      openaiModel: tts.openai?.model || '',
      openaiBaseUrl: tts.openai?.baseUrl || '',
      customJson: s?.tts ? JSON.stringify(s.tts, null, 2) : '',
    })
    setVoiceEdit(id === null)
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
  const delAcct = async (id: string) => {
    const used = accountUsage(id)
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
  const saveThink = async () => {
    if (!thinkDraft) return
    if (!thinkDraft.name || !thinkDraft.model) {
      showToast('服务名称与模型端点必填')
      return
    }
    try {
      const out: Record<string, unknown> = {
        name: thinkDraft.name,
        provider: thinkDraft.provider,
        model: thinkDraft.model,
        temperature: parseFloat(thinkDraft.temperature) || 0.7,
      }
      out.baseUrl =
        thinkDraft.baseUrl ||
        PROVIDER_PRESETS[thinkDraft.provider]?.baseUrl ||
        ''
      if (thinkDraft.apiKey) out.apiKey = thinkDraft.apiKey
      if (selThink) {
        await api.updateThinkService(selThink, out)
        showToast('思考服务已保存，绑定设备热生效')
        setThinkEdit(false)
      } else {
        const created = await api.createThinkService(out)
        showToast('思考服务已创建')
        await refreshAll()
        selectThink(created.id)
        return
      }
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }
  const delThink = async (id: string) => {
    const roleRefs = roles.filter((r) => r.thinkServiceId === id)
    if (roleRefs.length) {
      showToast(
        `该思考服务正被对话角色「${roleRefs.map((r) => r.name).join('、')}」引用，请先解除引用`,
      )
      return
    }
    const name = thinkSvcs.find((s) => s.id === id)?.name || '该服务'
    setConfirm({
      title: '删除思考服务',
      msg: `确定删除「${name}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteThinkService(id)
          showToast('服务已删除')
          setSelThink(null)
          setThinkDraft(null)
          setThinkEdit(false)
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }
  const saveVoice = async () => {
    if (!voiceDraft) return
    try {
      const out: Record<string, unknown> = {
        name: voiceDraft.name,
        provider: voiceDraft.provider,
      }
      if (voiceDraft.voiceId) out.voiceId = voiceDraft.voiceId
      const tts: Record<string, unknown> = {}
      if (voiceDraft.provider === 'edge') {
        tts.edge = voiceDraft.edgeToken
          ? { trustedToken: voiceDraft.edgeToken }
          : {}
      } else if (voiceDraft.provider === 'volcano') {
        if (!voiceDraft.volcanoAppId || !voiceDraft.volcanoToken) {
          showToast('火山引擎需填写 App ID 与访问令牌')
          return
        }
        tts.volcano = {
          appId: voiceDraft.volcanoAppId,
          accessToken: voiceDraft.volcanoToken,
        }
      } else if (voiceDraft.provider === 'openai') {
        if (!voiceDraft.openaiKey) {
          showToast('OpenAI TTS 需填写 API Key')
          return
        }
        tts.openai = {
          apiKey: voiceDraft.openaiKey,
          ...(voiceDraft.openaiModel ? { model: voiceDraft.openaiModel } : {}),
          ...(voiceDraft.openaiBaseUrl
            ? { baseUrl: voiceDraft.openaiBaseUrl }
            : {}),
        }
      } else if (voiceDraft.provider === 'custom') {
        try {
          const j = JSON.parse(voiceDraft.customJson || '{}')
          Object.assign(tts, j)
        } catch {
          showToast('自定义 TTS 配置不是合法 JSON')
          return
        }
      }
      if (Object.keys(tts).length) out.tts = tts as never
      if (selVoice) {
        await api.updateVoiceService(selVoice, out)
        showToast('语音服务已保存，绑定设备支持热切')
        setVoiceEdit(false)
      } else {
        const created = await api.createVoiceService(out)
        showToast('语音服务已创建')
        await refreshAll()
        selectVoice(created.id)
        return
      }
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }
  const delVoice = async (id: string) => {
    if (voiceSvcs.find((v) => v.id === id)?.builtin) {
      showToast('内置语音服务不可删除')
      return
    }
    const roleRefs = roles.filter((r) => r.voiceId === id)
    if (roleRefs.length) {
      showToast(
        `该语音服务正被对话角色「${roleRefs.map((r) => r.name).join('、')}」引用，请先解除引用`,
      )
      return
    }
    const name = voiceSvcs.find((s) => s.id === id)?.name || '该服务'
    setConfirm({
      title: '删除语音服务',
      msg: `确定删除「${name}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteVoiceService(id)
          showToast('服务已删除')
          setSelVoice(null)
          setVoiceDraft(null)
          setVoiceEdit(false)
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }

  const [accounts, setAccounts] = useState<Account[]>([])
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [thinkSvcs, setThinkSvcs] = useState<ThinkService[]>([])
  const [voiceSvcs, setVoiceSvcs] = useState<VoiceService[]>([])
  const [models, setModels] = useState<SpeakerModel[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [logCount, setLogCount] = useState(0)
  const [loading, setLoading] = useState(true)

  /* ── 型号管理（音箱的「硬件身份」配置）──────────────────────── */
  const [selModel, setSelModel] = useState<string | null>(null)
  const [modelEdit, setModelEdit] = useState(false)
  const [modelFilter, setModelFilter] = useState<'all' | 'consec' | 'plain'>(
    'all',
  )
  const [modelDraft, setModelDraft] = useState<{
    name: string
    did: string
    desc: string
    imageUrl: string
    ttsCommand: string[]
    wakeUpCommand: string[]
    playingCommand: string[]
    consecutive: boolean
  } | null>(null)
  const selectModel = (id: string | null) => {
    setSelModel(id)
    setModelEdit(false)
    if (!id) {
      setModelDraft({
        name: '',
        did: '',
        desc: '',
        imageUrl: '',
        ttsCommand: ['', ''],
        wakeUpCommand: ['', ''],
        playingCommand: ['', '', ''],
        consecutive: true,
      })
      return
    }
    const m = models.find((x) => x.id === id)
    setModelDraft(
      m
        ? {
            name: m.name,
            did: m.did,
            desc: m.desc || '',
            imageUrl: m.imageUrl || '',
            ttsCommand: (m.ttsCommand || []).map(String),
            wakeUpCommand: (m.wakeUpCommand || []).map(String),
            playingCommand: (m.playingCommand || []).map(String),
            consecutive: m.consecutive ?? true,
          }
        : null,
    )
  }
  const saveModel = async () => {
    if (!modelDraft || !modelDraft.name.trim() || !modelDraft.did.trim()) {
      showToast('名称与型号标识必填')
      return
    }
    try {
      const toNums = (arr: string[]): number[] =>
        arr.map(Number).filter((n) => Number.isFinite(n))
      const out = {
        name: modelDraft.name.trim(),
        did: modelDraft.did.trim(),
        desc: modelDraft.desc.trim(),
        imageUrl: modelDraft.imageUrl.trim(),
        ttsCommand: toNums(modelDraft.ttsCommand),
        wakeUpCommand: toNums(modelDraft.wakeUpCommand),
        playingCommand: toNums(modelDraft.playingCommand),
        consecutive: modelDraft.consecutive,
      }
      if (selModel) {
        await api.updateSpeakerModel(selModel, out)
        showToast('型号已保存，绑定设备重启后生效')
        setModelEdit(false)
      } else {
        const created = await api.createSpeakerModel(out)
        showToast('型号已创建')
        await refreshAll()
        selectModel(created.id)
        return
      }
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }
  const delModel = async (id: string) => {
    const target = models.find((m) => m.id === id)
    if (target?.builtin) {
      showToast('系统内置型号不可删除')
      return
    }
    const refDevs = devices.filter(
      (d) => d.speakerModel === id || d.speakerModel === target?.name,
    )
    if (refDevs.length) {
      showToast(
        `该型号正被设备「${refDevs.map((d) => d.alias).join('、')}」引用，请先解除引用`,
      )
      return
    }
    const name = target?.name || '该型号'
    setConfirm({
      title: '删除音箱型号',
      msg: `确定删除「${name}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteSpeakerModel(id)
          showToast('型号已删除')
          setSelModel(null)
          setModelDraft(null)
          setModelEdit(false)
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }
  /** 重置内置型号为系统默认值（仅 builtin 项显示入口；二次确认后恢复官方默认配置） */
  const resetModel = (id: string) => {
    const target = models.find((m) => m.id === id)
    if (!target?.builtin) return
    setConfirm({
      title: '重置型号默认值',
      msg: `确定将「${target.name}」恢复为系统内置默认配置吗？你的修改将被覆盖。`,
      danger: false,
      onOk: async () => {
        try {
          await api.resetSpeakerModel(id)
          showToast('已恢复为系统内置默认配置')
          setModelDraft(null)
          setModelEdit(false)
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }
  /** 重置内置语音服务为系统默认（仅 builtin 项显示入口；二次确认） */
  const resetVoice = (id: string) => {
    const target = voiceSvcs.find((v) => v.id === id)
    if (!target?.builtin) return
    setConfirm({
      title: '重置语音服务默认值',
      msg: `确定将「${target.name}」恢复为系统内置默认配置吗？你的修改将被覆盖。`,
      danger: false,
      onOk: async () => {
        try {
          await api.resetVoiceService(id)
          showToast('已恢复为系统内置默认配置')
          setVoiceDraft(null)
          setVoiceEdit(false)
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }
  /* 统一「左列表 + 右详情/新建」：进入页面后默认选中列表第一个（列表为排序后的 filterModels） */
  useEffect(() => {
    if (!selModel && filterModels.length) {
      setSelModel(filterModels[0].id)
      setModelEdit(false)
    }
  }, [models, query, modelFilter]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!selThink && thinkSvcs.length) {
      setSelThink(thinkSvcs[0].id)
      const s = thinkSvcs[0]
      setThinkEdit(false)
      setThinkDraft({
        name: s.name,
        provider: s.provider,
        model: s.model || PROVIDER_PRESETS[s.provider]?.model || '',
        apiKey: '',
        temperature: String(s.temperature ?? 0.7),
        baseUrl: s.baseUrl || PROVIDER_PRESETS[s.provider]?.baseUrl || '',
      })
    }
  }, [thinkSvcs]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selVoice && voiceSvcs.length) {
      setSelVoice(voiceSvcs[0].id)
      const s = voiceSvcs[0]
      setVoiceEdit(false)
      setVoiceDraft({
        name: s.name,
        provider: s.provider,
        voiceId: s.voiceId || '',
        edgeToken: s.tts?.edge?.trustedToken || '',
        volcanoAppId: s.tts?.volcano?.appId || '',
        volcanoToken: s.tts?.volcano?.accessToken || '',
        openaiKey: s.tts?.openai?.apiKey || '',
        openaiModel: s.tts?.openai?.model || '',
        openaiBaseUrl: s.tts?.openai?.baseUrl || '',
        customJson: s.tts ? JSON.stringify(s.tts, null, 2) : '',
      })
    }
  }, [voiceSvcs]) // eslint-disable-line react-hooks/exhaustive-deps

  const [detail, setDetail] = useState<DeviceDetail | null>(null)
  const [, setDrawerBusy] = useState(false)
  const [selDev, setSelDev] = useState<string | null>(null)
  const [devAcctFilter, setDevAcctFilter] = useState('all')
  const [devDraft, setDevDraft] = useState<{
    alias: string
    did: string
    speakerModel: string
    accountId: string
    roleId: string
    thinkServiceId: string
    voiceOverrideId: string
    ttsSecret: string
    exitKeepAliveAfter: string
    roomRef: string
  } | null>(null)

  const [modal, setModal] = useState<ModalState | null>(null)
  const [modelPickQ, setModelPickQ] = useState('')
  const [modelPickOpen, setModelPickOpen] = useState(false)
  const [devPull, setDevPull] = useState<{
    loading: boolean
    err: string
    list: PulledDevice[] | null
  }>({
    loading: false,
    err: '',
    list: null,
  })
  const [wizard, setWizard] = useState<null | {
    step: number
    accountId: string
    alias: string
    did: string
    model: string
    roleId: string
  }>(null)

  useEffect(() => {
    if (!selDev && devices.length) {
      const d = devices[0]
      setSelDev(d.id)
      setDevEdit(false)
      setDevDraft({
        alias: d.alias,
        did: d.did,
        speakerModel: d.speakerModel || '',
        accountId: d.accountId || '',
        roleId: d.roleId || '',
        thinkServiceId: d.thinkServiceId || '',
        voiceOverrideId: d.voiceOverrideId || '',
        ttsSecret: d.ttsSecret || '',
        exitKeepAliveAfter: String(d.exitKeepAliveAfter ?? 30),
        roomRef: d.roomRef || '',
      })
    }
  }, [devices]) // eslint-disable-line react-hooks/exhaustive-deps

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      const [d, a, r, t, v, m, rm, l] = await Promise.all([
        api.listDevices(),
        api.getAccounts(),
        api.getRoles(),
        api.getThinkServices(),
        api.getVoiceServices(),
        api.getSpeakerModels(),
        api.getRooms(),
        api
          .getLogs(500)
          .then((x) => x.total)
          .catch(() => 0),
      ])
      setDevices(d)
      setAccounts(a)
      setRoles(r)
      setThinkSvcs(t)
      setVoiceSvcs(v)
      setModels(m)
      setRooms(rm)
      setLogCount(l)
      setLoading(false)
    } catch (e) {
      setLoading(false)
      const msg = (e as Error).message
      if (msg === 'unauthorized') {
        setAuthed(false)
      } else {
        showToast(msg || '加载失败')
      }
    }
  }, [showToast])

  /* 会话探测：Cookie 为 httpOnly，前端无法直接判断登录态，需向服务端查询 */
  useEffect(() => {
    api
      .checkSession()
      .then(setAuthed)
      .catch(() => setAuthed(false))
  }, [])

  /* 认证探测 */
  useEffect(() => {
    if (!authed) return
    refreshAll().catch(() => undefined)
  }, [authed, refreshAll])

  /* 设备运行状态 10s 轮询（静默，不触发全局 loading） */
  useEffect(() => {
    if (!authed) return
    const t = window.setInterval(async () => {
      try {
        const d = await api.listDevices()
        setDevices(d)
      } catch {
        /* 轮询失败静默，下一轮重试 */
      }
    }, 10000)
    return () => window.clearInterval(t)
  }, [authed])

  const doLogin = async (u: string, p: string) => {
    setLoginErr('')
    try {
      await api.login(u, p)
      setAuthed(true)
      setView('home')
    } catch (e) {
      const msg = (e as Error).message
      setAuthed(false)
      if (msg === 'unauthorized') {
        setLoginErr('用户名或密码错误（初始账号 admin，密码 123456）')
      } else {
        setLoginErr(msg || '无法连接服务')
      }
    }
  }

  const doLogout = () => {
    api.logout().catch(() => undefined)
    setAuthed(false)
    setAccounts([])
    setDevices([])
    setRoles([])
    setThinkSvcs([])
    setVoiceSvcs([])
    setModels([])
    setRooms([])
  }

  /* 派生统计 */
  const runningCount = devices.filter((d) => d.running).length
  const builtinModelCount = models.filter((m) => m.builtin).length
  const customModelCount = models.length - builtinModelCount
  const selVoiceObj = selVoice
    ? (voiceSvcs.find((s) => s.id === selVoice) ?? null)
    : null

  /* 服务被引用数（设备直接引用 + 通过角色间接引用） */
  const thinkUsage = useCallback(
    (id: string) => {
      const roleIds = new Set(
        roles.filter((r) => r.thinkServiceId === id).map((r) => r.id),
      )
      return devices.filter(
        (d) => d.thinkServiceId === id || (d.roleId && roleIds.has(d.roleId)),
      ).length
    },
    [devices, roles],
  )
  const voiceUsage = useCallback(
    (id: string) => {
      const roleIds = new Set(
        roles.filter((r) => r.voiceId === id).map((r) => r.id),
      )
      return devices.filter(
        (d) => d.voiceOverrideId === id || (d.roleId && roleIds.has(d.roleId)),
      ).length
    },
    [devices, roles],
  )
  const roleUsage = useCallback(
    (id: string) => devices.filter((d) => d.roleId === id).map((d) => d.alias),
    [devices],
  )
  const accountUsage = useCallback(
    (id: string) =>
      devices.filter((d) => d.accountId === id).map((d) => d.alias),
    [devices],
  )
  const roomUsage = useCallback(
    (id: string) => devices.filter((d) => d.roomRef === id).map((d) => d.alias),
    [devices],
  )

  /* 设备抽屉 */
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

  /* 设备页：左列表选中 → 右侧详情/新建（与其他页 split 一致） */
  const selectDev = (id: string | null) => {
    setSelDev(id)
    setDevEdit(id === null)
    if (id) {
      const d = devices.find((x) => x.id === id)
      setDevDraft(
        d
          ? {
              alias: d.alias,
              did: d.did,
              speakerModel: d.speakerModel || '',
              accountId: d.accountId || '',
              roleId: d.roleId || '',
              thinkServiceId: d.thinkServiceId || '',
              voiceOverrideId: d.voiceOverrideId || '',
              ttsSecret: d.ttsSecret || '',
              exitKeepAliveAfter: String(d.exitKeepAliveAfter ?? 30),
              roomRef: d.roomRef || '',
            }
          : null,
      )
    } else {
      setDevDraft({
        alias: '',
        did: '',
        speakerModel: '',
        accountId: '',
        roleId: '',
        thinkServiceId: '',
        voiceOverrideId: '',
        ttsSecret: '',
        exitKeepAliveAfter: '30',
        roomRef: '',
      })
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
            thinkServiceId: devDraft.thinkServiceId || undefined,
            voiceOverrideId: devDraft.voiceOverrideId || undefined,
            exitKeepAliveAfter:
              parseInt(devDraft.exitKeepAliveAfter || '30', 10) || 30,
            roomRef: devDraft.roomRef || undefined,
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
          thinkServiceId: devDraft.thinkServiceId || undefined,
          voiceOverrideId: devDraft.voiceOverrideId || undefined,
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

  /* 通用错误处理（409 删除保护等） */
  const errText = (e: unknown) => {
    const err = e as Error & { refs?: { roles?: string[]; devices?: string[] } }
    if (err.refs) {
      const parts: string[] = []
      if (err.refs.devices?.length)
        parts.push('被设备引用：' + err.refs.devices.join('、'))
      if (err.refs.roles?.length)
        parts.push('被角色引用：' + err.refs.roles.join('、'))
      return err.message + (parts.length ? '（' + parts.join('；') + '）' : '')
    }
    return err.message || '操作失败'
  }

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

  /* 账号设备：账号详情页展示该账号下云端设备列表（独立于 devPull，按账号缓存） */
  const [acctDevs, setAcctDevs] = useState<
    Record<string, { loading: boolean; err: string; list: PulledDevice[] }>
  >({})
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
  useEffect(() => {
    if (selAcct && !acctDevs[selAcct]) void loadAcctDevs(selAcct)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selAcct])

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
  const filterAccounts = useMemo(() => {
    if (!query) return accounts
    const q = query.toLowerCase()
    return accounts.filter((a) =>
      (a.name + a.miUserId).toLowerCase().includes(q),
    )
  }, [accounts, query])
  const filterRoles = useMemo(() => {
    if (!query) return roles
    const q = query.toLowerCase()
    return roles.filter((r) => r.name.toLowerCase().includes(q))
  }, [roles, query])
  const filterRooms = useMemo(() => {
    if (!query) return rooms
    const q = query.toLowerCase()
    return rooms.filter((rm) =>
      (rm.name + (rm.description || '')).toLowerCase().includes(q),
    )
  }, [rooms, query])
  const filterModels = useMemo(() => {
    const q = query.toLowerCase()
    const list = models.filter((m) => {
      if (q && !(m.name + m.did).toLowerCase().includes(q)) return false
      if (modelFilter === 'consec' && !m.consecutive) return false
      if (modelFilter === 'plain' && m.consecutive) return false
      return true
    })
    // 内置型号按名称升序在前，自定义型号按创建时间追加尾部
    const builtin = list
      .filter((m) => m.builtin)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    const custom = list
      .filter((m) => !m.builtin)
      .sort((a, b) => a.createdAt - b.createdAt)
    return [...builtin, ...custom]
  }, [models, query, modelFilter])

  /* 切换顶部分组后默认选中对应分组列表第一个（与其他菜单页面规则一致） */
  const switchModelFilter = (f: 'all' | 'consec' | 'plain') => {
    setModelFilter(f)
    const q = query.toLowerCase()
    const list = models.filter((m) => {
      if (q && !(m.name + m.did).toLowerCase().includes(q)) return false
      if (f === 'consec' && !m.consecutive) return false
      if (f === 'plain' && m.consecutive) return false
      return true
    })
    const builtin = list
      .filter((m) => m.builtin)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    const custom = list
      .filter((m) => !m.builtin)
      .sort((a, b) => a.createdAt - a.createdAt)
    const first = [...builtin, ...custom][0]
    if (first) {
      setSelModel(first.id)
      setModelEdit(false)
      setModelDraft(null)
    }
  }

  /* ══ 渲染 ══ */
  // 会话探测中：先不渲染，避免登录页闪烁
  if (authed === null) {
    return null
  }
  if (!authed) {
    return <LoginPage onLogin={doLogin} error={loginErr} />
  }

  return (
    <div className={'app' + (sideOff ? ' off' : '')}>
      {/* 侧栏 */}
      <aside className={'side' + (sideOff ? ' off' : '')}>
        <div className="brand">
          <span className="mark">
            <MiLogo size={22} />
          </span>
          <span className="brand-txt">
            <b>MiGPT 控制面板</b>
          </span>
        </div>
        <nav>
          {(
            [
              'home',
              'think',
              'voice',
              'roles',
              'accounts',
              'devices',
              'rooms',
              'models',
              'logs',
              'syslogs',
            ] as View[]
          ).map((v) => (
            <a
              key={v}
              data-label={TITLES[v]}
              className={view === v ? 'on' : ''}
              onClick={() => {
                setView(v)
                if (v === 'think') setSettingTab('think')
                if (v === 'voice') setSettingTab('voice')
                setQuery('')
              }}
            >
              <I
                n={
                  v === 'home'
                    ? 'home'
                    : v === 'accounts'
                      ? 'user'
                      : v === 'devices'
                        ? 'speaker'
                        : v === 'roles'
                          ? 'chat'
                          : v === 'logs'
                            ? 'log'
                            : v === 'syslogs'
                              ? 'terminal'
                              : v === 'think'
                                ? 'bolt'
                                : v === 'voice'
                                  ? 'mic'
                                  : v === 'rooms'
                                    ? 'users'
                                    : 'gear'
                }
              />
              <span className="label">{TITLES[v]}</span>
            </a>
          ))}
        </nav>
        <div className="foot">
          <div className="user-card" onClick={() => setView('profile')}>
            <span className="avatar">A</span>
            <span className="foot-txt">
              <b>admin</b>
              <span>点击进入个人中心 ›</span>
            </span>
          </div>
        </div>
        <button
          className={'side-toggle' + (sideOff ? ' off' : '')}
          title={sideOff ? '展开侧栏' : '收起侧栏'}
          onClick={() => setSideOff(!sideOff)}
          aria-label={sideOff ? '展开侧栏' : '收起侧栏'}
        >
          <svg viewBox="0 0 12 24" className="tri" aria-hidden="true">
            <path
              d={sideOff ? 'M10 12 L3.6 1 L3.6 23 Z' : 'M3.6 12 L10 1 L10 23 Z'}
            />
          </svg>
        </button>
      </aside>

      <div className="main">
        <header className="top">
          <h1>{TITLES[view]}</h1>
          <label className="search">
            <I n="search" />
            <input
              placeholder={SEARCH_HINT[view] || '搜索…'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span className="sp" />
          <div className="top-right">
            <div className="srv" title="migpt-server 服务状态">
              <span className="dot" />
              <span>服务运行中</span>
              <em>v{__APP_VERSION__}</em>
            </div>
          </div>
        </header>

        <div className="body">
          {loading && view !== 'devices' && view !== 'home' && (
            <div className="panel">
              <div className="loading">
                <div style={{ width: '100%' }}>
                  <div className="skel" />
                  <div className="skel" />
                  <div className="skel" />
                </div>
              </div>
            </div>
          )}

          {view === 'home' && (
            <HomeView
              bannerIdx={bannerIdx}
              onBanner={setBannerIdx}
              accounts={accounts}
              devices={devices}
              roles={roles}
              thinkSvcs={thinkSvcs}
              voiceSvcs={voiceSvcs}
              models={models}
              runningCount={runningCount}
              logCount={logCount}
              builtinModelCount={builtinModelCount}
              customModelCount={customModelCount}
              onNav={setView}
              onOpenThink={() => {
                setSettingTab('think')
                setView('think')
              }}
              onOpenVoice={() => {
                setSettingTab('voice')
                setView('voice')
              }}
              onStartWizard={() =>
                setWizard({
                  step: 0,
                  accountId: '',
                  alias: '',
                  did: '',
                  model: '',
                  roleId: '',
                })
              }
            />
          )}

          {view === 'accounts' && (
            <AccountsView
              filterAccounts={filterAccounts}
              accounts={accounts}
              selAcct={selAcct}
              acctDraft={acctDraft}
              acctEdit={acctEdit}
              acctDevs={acctDevs}
              devices={devices}
              models={models}
              onSelect={selectAcct}
              onDraft={setAcctDraft}
              onEdit={setAcctEdit}
              onDelete={delAcct}
              onSave={saveAcct}
              onRefreshDevs={loadAcctDevs}
              usage={accountUsage}
            />
          )}

          {view === 'models' && (
            <ModelsView
              filterModels={filterModels}
              models={models}
              selModel={selModel}
              modelDraft={modelDraft}
              modelEdit={modelEdit}
              devices={devices}
              filter={modelFilter}
              onFilter={switchModelFilter}
              onSelect={selectModel}
              onDraft={setModelDraft}
              onEdit={setModelEdit}
              onDelete={delModel}
              onReset={resetModel}
              onSave={saveModel}
            />
          )}

          {view === 'devices' && (
            <DevicesView
              filterDevices={filterDevices}
              devices={devices}
              selDev={selDev}
              devDraft={devDraft}
              devEdit={devEdit}
              devPull={devPull}
              devAcctFilter={devAcctFilter}
              devAcctGroups={devAcctGroups}
              modelPickOpen={modelPickOpen}
              modelPickQ={modelPickQ}
              models={models}
              roles={roles}
              accounts={accounts}
              rooms={rooms}
              onSelect={selectDev}
              onDraft={setDevDraft}
              onEdit={setDevEdit}
              onDelete={removeDeviceForm}
              onSave={saveDeviceForm}
              onRestart={restartDevice}
              onPull={doPullDev}
              onResetPull={() =>
                setDevPull({ loading: false, err: '', list: null })
              }
              onDevAcctFilter={(f, firstId) => {
                setDevAcctFilter(f)
                selectDev(firstId)
              }}
              onPickOpen={setModelPickOpen}
              onPickQ={setModelPickQ}
            />
          )}

          {view === 'rooms' && (
            <RoomsView
              rooms={filterRooms}
              allRooms={rooms}
              devices={devices}
              onSave={async (r) => {
                try {
                  await api.updateRoom(r.id, r)
                  showToast('会话群已保存，关联设备重启后生效')
                  refreshAll()
                } catch (e) {
                  showToast(errText(e))
                }
              }}
              onCreate={async (r) => {
                try {
                  const c = await api.createRoom(r)
                  showToast('会话群已创建')
                  await refreshAll()
                  return c
                } catch (e) {
                  showToast(errText(e))
                  return null
                }
              }}
              onDelete={async (id) => {
                if (roomUsage(id).length) {
                  showToast(
                    `该会话群正被设备「${roomUsage(id).join('、')}」引用，请先解除设备绑定`,
                  )
                  return
                }
                const r = rooms.find((x) => x.id === id)
                setConfirm({
                  title: '删除会话群',
                  msg: `确定删除「${r?.name || '该会话群'}」吗？删除后不可恢复。`,
                  onOk: async () => {
                    try {
                      await api.deleteRoom(id)
                      showToast('会话群已删除')
                      refreshAll()
                    } catch (e) {
                      showToast(errText(e))
                    }
                  },
                })
              }}
            />
          )}

          {view === 'roles' && (
            <RolesView
              roles={filterRoles}
              allRoles={roles}
              thinkSvcs={thinkSvcs}
              voiceSvcs={voiceSvcs}
              roleUsage={roleUsage}
              onSave={async (r) => {
                try {
                  await api.updateRole(r.id, r)
                  showToast('角色已保存，人设与模型热生效')
                  refreshAll()
                } catch (e) {
                  showToast(errText(e))
                }
              }}
              onCreate={async (r) => {
                try {
                  const c = await api.createRole(r)
                  showToast('角色已创建')
                  await refreshAll()
                  return c
                } catch (e) {
                  showToast(errText(e))
                  return null
                }
              }}
              onDelete={async (id) => {
                if (roleUsage(id).length) {
                  showToast(
                    `该角色正被 ${roleUsage(id).length} 台设备引用（${roleUsage(id).join('、')}），请先解除设备绑定`,
                  )
                  return
                }
                const r = roles.find((x) => x.id === id)
                setConfirm({
                  title: '删除对话角色',
                  msg: `确定删除「${r?.name || '该角色'}」吗？删除后不可恢复。`,
                  onOk: async () => {
                    try {
                      await api.deleteRole(id)
                      showToast('角色已删除')
                      refreshAll()
                    } catch (e) {
                      showToast(errText(e))
                    }
                  },
                })
              }}
            />
          )}

          {view === 'logs' && <LogsView devices={devices} models={models} />}
          {view === 'syslogs' && (
            <SysLogsView query={query} onToast={showToast} />
          )}

          {(view === 'settings' || view === 'think' || view === 'voice') && (
            <ServicesView
              tab={settingTab}
              thinkSvcs={thinkSvcs}
              voiceSvcs={voiceSvcs}
              selThink={selThink}
              selVoice={selVoice}
              thinkDraft={thinkDraft}
              voiceDraft={voiceDraft}
              thinkEdit={thinkEdit}
              voiceEdit={voiceEdit}
              selVoiceObj={selVoiceObj}
              onSelectThink={selectThink}
              onDraftThink={setThinkDraft}
              onEditThink={setThinkEdit}
              onDeleteThink={delThink}
              onSaveThink={saveThink}
              onSelectVoice={selectVoice}
              onDraftVoice={setVoiceDraft}
              onEditVoice={setVoiceEdit}
              onDeleteVoice={delVoice}
              onResetVoice={resetVoice}
              onSaveVoice={saveVoice}
              usageThink={thinkUsage}
              usageVoice={voiceUsage}
            />
          )}

          {view === 'profile' && (
            <ProfileView
              onPwd={() =>
                setModal({
                  kind: 'pwd',
                  title: '修改登录密码',
                  desc: '默认密码为部署时设定；修改后立即生效。',
                })
              }
              onLogout={doLogout}
            />
          )}
        </div>
      </div>

      {/* 设备详情抽屉 */}
      {detail && (
        <Drawer
          detail={detail}
          running={devices.find((x) => x.id === detail.meta.id)?.running}
          roles={roles}
          thinkSvcs={thinkSvcs}
          voiceSvcs={voiceSvcs}
          accounts={accounts}
          models={models}
          rooms={rooms}
          onClose={closeDrawer}
          onRestart={() => restartDevice(detail.meta.id)}
          onRemove={async () => {
            if (
              !window.confirm(
                `解绑设备「${detail.meta.alias}」？此操作不可撤销。`,
              )
            )
              return
            await removeDevice(detail.meta.id)
          }}
          onEdit={() =>
            setModal({
              kind: 'deviceBind',
              title: '编辑绑定',
              desc: '修改这台音箱的角色与服务绑定；换绑账号 / 唤醒词需重启设备。',
              payload: detail.meta,
            })
          }
        />
      )}

      {/* 弹窗 */}
      {modal && (
        <ModalShell
          modal={modal}
          accounts={accounts}
          roles={roles}
          thinkSvcs={thinkSvcs}
          voiceSvcs={voiceSvcs}
          models={models}
          rooms={rooms}
          onClose={() => setModal(null)}
          onDone={async (values) => {
            const m = modal
            setModal(null)
            try {
              if (m.kind === 'account') {
                const payload = (m.payload || {}) as Account
                if (payload.id) {
                  await api.updateAccount(
                    payload.id,
                    values as Partial<Account>,
                  )
                  showToast('账号已更新，换绑账号需重启受影响设备')
                } else {
                  await api.createAccount(values as Partial<Account>)
                  showToast('账号已连接')
                }
                refreshAll()
              } else if (m.kind === 'think') {
                const payload = (m.payload || {}) as ThinkService
                if (payload.id) {
                  await api.updateThinkService(
                    payload.id,
                    values as Partial<ThinkService>,
                  )
                  showToast('思考服务已更新，热生效')
                } else {
                  await api.createThinkService(values as Partial<ThinkService>)
                  showToast('思考服务已创建')
                }
                refreshAll()
              } else if (m.kind === 'voice') {
                const payload = (m.payload || {}) as VoiceService
                if (payload.id) {
                  await api.updateVoiceService(
                    payload.id,
                    values as Partial<VoiceService>,
                  )
                  showToast('语音服务已更新，音色热切')
                } else {
                  await api.createVoiceService(values as Partial<VoiceService>)
                  showToast('语音服务已创建')
                }
                refreshAll()
              } else if (m.kind === 'role') {
                const payload = (m.payload || {}) as Role
                if (payload.id) {
                  await api.updateRole(payload.id, values as Partial<Role>)
                  showToast('角色已保存，人设热生效')
                } else {
                  await api.createRole(values as Partial<Role>)
                  showToast('角色已创建')
                }
                refreshAll()
              } else if (m.kind === 'pwd') {
                await api.changeAuth(
                  'admin',
                  (values as { old: string }).old,
                  'admin',
                  (values as { pwd: string }).pwd,
                )
                showToast('密码已修改，下次登录生效')
              } else if (m.kind === 'deviceBind') {
                const meta = (m.payload || {}) as api.DeviceMeta
                await api.saveDevice(meta.id, {
                  meta: values as Partial<api.DeviceMeta>,
                })
                showToast('绑定已更新，需重启设备生效')
                refreshAll()
                if (detail) openDevice(meta.id)
              }
            } catch (e) {
              showToast(errText(e))
            }
          }}
        />
      )}

      {/* 三步向导 */}
      {wizard && (
        <Wizard
          step={wizard.step}
          accounts={accounts}
          roles={roles}
          models={models}
          thinkSvcs={thinkSvcs}
          voiceSvcs={voiceSvcs}
          draft={wizard}
          setDraft={(p) => setWizard({ ...wizard, ...p })}
          onClose={() => setWizard(null)}
          onNewAccount={async (d) => {
            const created = await api.createAccount(d)
            await refreshAll()
            return created
          }}
          onUpdateAccount={async (id, d) => {
            const u = await api.updateAccount(id, d as Partial<Account>)
            await refreshAll()
            return u
          }}
          onNewRole={async (d) => {
            const created = await api.createRole(d)
            await refreshAll()
            return created
          }}
          onUpdateRole={async (id, d) => {
            const u = await api.updateRole(id, d as Partial<Role>)
            await refreshAll()
            return u
          }}
          devices={devices}
          onFinish={async () => {
            try {
              const created = await api.createDevice({
                alias: wizard.alias,
                did: wizard.did,
                speakerModel: wizard.model || undefined,
                roleId: wizard.roleId || undefined,
                accountId: wizard.accountId || undefined,
              })
              await api.startDevice(created.id)
              showToast('设备已添加并启动')
              setWizard(null)
              refreshAll()
            } catch (e) {
              showToast(errText(e))
            }
          }}
        />
      )}

      {/* 删除确认 */}
      {confirm && (
        <>
          <div
            className={'scrim on' + (confirmLeaving ? ' closing' : '')}
            onClick={() => closeConfirm()}
          />
          <div className={'modal on' + (confirmLeaving ? ' closing' : '')}>
            <h3>
              <I n={confirmOkIcon} size={18} /> {confirm.title}
            </h3>
            <div className="desc">{confirm.msg}</div>
            <div className="acts">
              <span className="sp" />
              <button className="btn ghost" onClick={() => closeConfirm()}>
                取消
              </button>
              <button
                className={'btn' + (confirm.danger === false ? '' : ' danger')}
                onClick={() => closeConfirm(true)}
              >
                <I n={confirmOkIcon} /> {confirmOkText}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      <div className={'toast' + (toast ? ' on' : '')}>
        <I n="check" size={15} />
        <span>
          <b>{toast}</b>
        </span>
      </div>
    </div>
  )
}

/* ══ 角色视图 ══ */
