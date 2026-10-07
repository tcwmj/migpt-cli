import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from './apis.ts'
import type {
  Account,
  BindingRow,
  DeviceDetail,
  DeviceRow,
  LogEntry,
  PulledDevice,
  Role,
  Room,
  SpeakerModel,
  ThinkService,
  VoiceService,
} from './apis.ts'
import { I, MiLogo } from './icons.tsx'
import {
  PROVIDERS,
  PROVIDER_PRESETS,
  TTS_ENGINES,
  SEARCH_HINT,
  TITLES,
  type View,
} from './constants.ts'
import { coverOf, avatarOf } from './utils.ts'
import heroImg from './assets/speaker-hero-multi.jpg'
import { AccountsView, DevicesView, HomeView, ModelsView, ProfileView, ServicesView } from './views.tsx'

/* ══ 登录页 ══ */
function LoginPage({ onLogin, error }: { onLogin: (u: string, p: string) => Promise<void>; error: string }) {
  const [u, setU] = useState('admin')
  const [p, setP] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = () => {
    setBusy(true)
    Promise.resolve(onLogin(u, p)).finally(() => setBusy(false))
  }
  return (
    <div className="login-page">
      {/* 左：满铺主视觉，标语沉于音箱下方 */}
      <div className="login-hero">
        <img className="login-hero-bg" src={heroImg} alt="" />
        <div className="login-hero-scrim" />
        <div className="mi-brand">
          <MiLogo size={30} />
          <b>MiGPT</b>
        </div>
        <div className="login-hero-inner">
          <h1>多台音箱，一个大脑</h1>
        </div>
      </div>

      {/* 右侧：登录表单 */}
      <div className="login-panel">
        <div className="login-card">
          <h2>MiGPT 控制面板</h2>
          {error && (
            <div className="notice bad">
              <I n="warning" size={15} /> {error}
            </div>
          )}
          <div className="fld ic">
            <label>用户名<span className="req">*</span></label>
            <I n="user" size={15} />
            <input value={u} onChange={(e) => setU(e.target.value)} autoFocus placeholder="请输入用户名" />
          </div>
          <div className="fld ic">
            <label>密码<span className="req">*</span></label>
            <I n="lock" size={15} />
            <input
              type="password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              placeholder="请输入密码"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submit()
                }
              }}
            />
          </div>
          <button
            className="btn primary login-btn"
            disabled={busy || !u || !p}
            onClick={submit}
          >
            <I n="lock" size={15} /> {busy ? '登录中…' : '登录'}
          </button>
        </div>
        <div className="login-foot">v1.12.0 · migpt-server</div>
      </div>
    </div>
  )
}

/* ══ 弹窗表单 ══ */
interface ModalState {
  kind: 'account' | 'think' | 'voice' | 'role' | 'pwd' | 'deviceBind'
  title: string
  desc: string
  payload?: unknown
}

/* ══ 主应用 ══ */
export function App() {
  const [authed, setAuthed] = useState<boolean>(!!api.getAuthHeader())
  const [loginErr, setLoginErr] = useState('')
  const [view, setView] = useState<View>('home')
  const [settingTab, setSettingTab] = useState<'think' | 'voice'>('think')
  const [query, setQuery] = useState('')
  const [sideOff, setSideOff] = useState<boolean>(() => localStorage.getItem('migpt-side-off') === '1')
  useEffect(() => {
    localStorage.setItem('migpt-side-off', sideOff ? '1' : '0')
  }, [sideOff])

  const [bannerIdx, setBannerIdx] = useState(0)

  const [selAcct, setSelAcct] = useState<string | null>(null)
  const [acctDraft, setAcctDraft] = useState<{ name: string; miUserId: string; passToken: string } | null>(null)
  const [acctEdit, setAcctEdit] = useState(false)
  const [selThink, setSelThink] = useState<string | null>(null)
  const [thinkDraft, setThinkDraft] = useState<{ name: string; provider: string; model: string; apiKey: string; temperature: string; baseUrl: string } | null>(null)
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
  const [confirm, setConfirm] = useState<{ title: string; msg: string; onOk: () => void } | null>(null)
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

  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % 5), 5000)
    return () => clearInterval(t)
  }, [])

  const selectAcct = (id: string | null) => {
    setSelAcct(id)
    const a = id ? accounts.find((x) => x.id === id) : null
    setAcctDraft({ name: a?.name || '', miUserId: a?.miUserId || '', passToken: '' })
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
        await api.updateAccount(selAcct, { name: acctDraft.name, miUserId: acctDraft.miUserId, ...(acctDraft.passToken ? { passToken: acctDraft.passToken } : {}) })
        showToast('账号已保存，换绑账号需重启受影响设备')
        setAcctEdit(false)
      } else {
        const created = await api.createAccount({ name: acctDraft.name, miUserId: acctDraft.miUserId, passToken: acctDraft.passToken })
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
      showToast(`该账号正被 ${used.length} 台设备引用（${used.join('、')}），请先解除设备绑定`)
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
      const out: Record<string, unknown> = { name: thinkDraft.name, provider: thinkDraft.provider, model: thinkDraft.model, temperature: parseFloat(thinkDraft.temperature) || 0.7 }
      out.baseUrl = thinkDraft.baseUrl || PROVIDER_PRESETS[thinkDraft.provider]?.baseUrl || ''
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
      showToast(`该思考服务正被对话角色「${roleRefs.map((r) => r.name).join('、')}」引用，请先解除引用`)
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
      const out: Record<string, unknown> = { name: voiceDraft.name, provider: voiceDraft.provider }
      if (voiceDraft.voiceId) out.voiceId = voiceDraft.voiceId
      const tts: Record<string, unknown> = {}
      if (voiceDraft.provider === 'edge') {
        tts.edge = voiceDraft.edgeToken ? { trustedToken: voiceDraft.edgeToken } : {}
      } else if (voiceDraft.provider === 'volcano') {
        if (!voiceDraft.volcanoAppId || !voiceDraft.volcanoToken) {
          showToast('火山引擎需填写 App ID 与访问令牌')
          return
        }
        tts.volcano = { appId: voiceDraft.volcanoAppId, accessToken: voiceDraft.volcanoToken }
      } else if (voiceDraft.provider === 'openai') {
        if (!voiceDraft.openaiKey) {
          showToast('OpenAI TTS 需填写 API Key')
          return
        }
        tts.openai = {
          apiKey: voiceDraft.openaiKey,
          ...(voiceDraft.openaiModel ? { model: voiceDraft.openaiModel } : {}),
          ...(voiceDraft.openaiBaseUrl ? { baseUrl: voiceDraft.openaiBaseUrl } : {}),
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
      showToast(`该语音服务正被对话角色「${roleRefs.map((r) => r.name).join('、')}」引用，请先解除引用`)
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
  const [modelFilter, setModelFilter] = useState<'all' | 'consec' | 'plain'>('all')
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
        name: '', did: '', desc: '', imageUrl: '',
        ttsCommand: ['', ''], wakeUpCommand: ['', ''], playingCommand: ['', '', ''],
        consecutive: true,
      })
      return
    }
    const m = models.find((x) => x.id === id)
    setModelDraft(
      m
        ? {
            name: m.name, did: m.did, desc: m.desc || '', imageUrl: m.imageUrl || '',
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
      const toNums = (arr: string[]): number[] => arr.map(Number).filter((n) => Number.isFinite(n))
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
    const refDevs = devices.filter((d) => d.speakerModel === id || d.speakerModel === target?.name)
    if (refDevs.length) {
      showToast(`该型号正被设备「${refDevs.map((d) => d.alias).join('、')}」引用，请先解除引用`)
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
      setAcctDraft({ name: accounts[0].name, miUserId: accounts[0].miUserId, passToken: '' })
    }
  }, [accounts]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selThink && thinkSvcs.length) {
      setSelThink(thinkSvcs[0].id)
      const s = thinkSvcs[0]
      setThinkEdit(false)
      setThinkDraft({ name: s.name, provider: s.provider, model: s.model || PROVIDER_PRESETS[s.provider]?.model || '', apiKey: '', temperature: String(s.temperature ?? 0.7), baseUrl: s.baseUrl || PROVIDER_PRESETS[s.provider]?.baseUrl || '' })
    }
  }, [thinkSvcs]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selVoice && voiceSvcs.length) {
      setSelVoice(voiceSvcs[0].id)
      const s = voiceSvcs[0]
      setVoiceEdit(false)
      setVoiceDraft({ name: s.name, provider: s.provider, voiceId: s.voiceId || '', edgeToken: s.tts?.edge?.trustedToken || '', volcanoAppId: s.tts?.volcano?.appId || '', volcanoToken: s.tts?.volcano?.accessToken || '', openaiKey: s.tts?.openai?.apiKey || '', openaiModel: s.tts?.openai?.model || '', openaiBaseUrl: s.tts?.openai?.baseUrl || '', customJson: s.tts ? JSON.stringify(s.tts, null, 2) : '' })
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
  const [devPull, setDevPull] = useState<{ loading: boolean; err: string; list: PulledDevice[] | null }>({
    loading: false,
    err: '',
    list: null,
  })
  const [wizard, setWizard] = useState<null | { step: number; accountId: string; alias: string; did: string; model: string; roleId: string }>(null)

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
        api.getLogs(500).then((x) => x.total).catch(() => 0),
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
        api.clearAuth()
        setAuthed(false)
      } else {
        showToast(msg || '加载失败')
      }
    }
  }, [showToast])

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
    api.setAuth(u, p)
    try {
      await api.getStatusAll()
      setAuthed(true)
      setView('home')
    } catch (e) {
      const msg = (e as Error).message
      if (msg === 'unauthorized') {
        api.clearAuth()
        setLoginErr('用户名或密码错误（初始账号 admin，密码 123456）')
      } else {
        api.clearAuth()
        setLoginErr(msg || '无法连接服务')
      }
    }
  }

  const doLogout = () => {
    api.clearAuth()
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
  const selVoiceObj = selVoice ? voiceSvcs.find((s) => s.id === selVoice) : null

  /* 服务被引用数（设备直接引用 + 通过角色间接引用） */
  const thinkUsage = useCallback(
    (id: string) => {
      const roleIds = new Set(roles.filter((r) => r.thinkServiceId === id).map((r) => r.id))
      return devices.filter((d) => d.thinkServiceId === id || (d.roleId && roleIds.has(d.roleId))).length
    },
    [devices, roles],
  )
  const voiceUsage = useCallback(
    (id: string) => {
      const roleIds = new Set(roles.filter((r) => r.voiceId === id).map((r) => r.id))
      return devices.filter((d) => d.voiceOverrideId === id || (d.roleId && roleIds.has(d.roleId))).length
    },
    [devices, roles],
  )
  const roleUsage = useCallback(
    (id: string) => devices.filter((d) => d.roleId === id).map((d) => d.alias),
    [devices],
  )
  const accountUsage = useCallback(
    (id: string) => devices.filter((d) => d.accountId === id).map((d) => d.alias),
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
      setDevDraft({ alias: '', did: '', speakerModel: '', accountId: '', roleId: '', thinkServiceId: '', voiceOverrideId: '', ttsSecret: '', exitKeepAliveAfter: '30', roomRef: '' })
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
            exitKeepAliveAfter: parseInt(devDraft.exitKeepAliveAfter || '30', 10) || 30,
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
      if (err.refs.devices?.length) parts.push('被设备引用：' + err.refs.devices.join('、'))
      if (err.refs.roles?.length) parts.push('被角色引用：' + err.refs.roles.join('、'))
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
        setDevPull({ loading: false, err: '该账号下未发现音箱设备，请确认小米 ID 与 passToken 正确', list: [] })
        return
      }
      setDevPull({ loading: false, err: '', list })
    } catch (e) {
      setDevPull({ loading: false, err: errText(e), list: null })
    }
  }

  /* 账号设备：账号详情页展示该账号下云端设备列表（独立于 devPull，按账号缓存） */
  const [acctDevs, setAcctDevs] = useState<Record<string, { loading: boolean; err: string; list: Array<{ name?: string; alias?: string; deviceID?: string; miotDID?: string; hardware?: string; presence?: string }> }>>({})
  const loadAcctDevs = async (accountId: string) => {
    setAcctDevs((m) => ({ ...m, [accountId]: { loading: true, err: '', list: m[accountId]?.list || [] } }))
    try {
      const r = await api.pullDevices(accountId)
      setAcctDevs((m) => ({ ...m, [accountId]: { loading: false, err: '', list: r.devices || [] } }))
    } catch (e) {
      setAcctDevs((m) => ({ ...m, [accountId]: { loading: false, err: errText(e), list: [] } }))
    }
  }
  useEffect(() => {
    if (selAcct && !acctDevs[selAcct]) void loadAcctDevs(selAcct)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selAcct])

  const filterDevices = useMemo(() => {
    let list = devices
    if (devAcctFilter !== 'all') list = list.filter((d) => d.accountId === devAcctFilter)
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
      .map((id) => ({ id, name: accounts.find((a) => a.id === id)?.name || id }))
      .filter((g) => !!g.name)
  }, [devices, accounts])
  const filterAccounts = useMemo(() => {
    if (!query) return accounts
    const q = query.toLowerCase()
    return accounts.filter((a) => (a.name + a.miUserId).toLowerCase().includes(q))
  }, [accounts, query])
  const filterRoles = useMemo(() => {
    if (!query) return roles
    const q = query.toLowerCase()
    return roles.filter((r) => r.name.toLowerCase().includes(q))
  }, [roles, query])
  const filterRooms = useMemo(() => {
    if (!query) return rooms
    const q = query.toLowerCase()
    return rooms.filter((rm) => (rm.name + (rm.description || '')).toLowerCase().includes(q))
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
    const builtin = list.filter((m) => m.builtin).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    const custom = list.filter((m) => !m.builtin).sort((a, b) => a.createdAt - b.createdAt)
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
    const builtin = list.filter((m) => m.builtin).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    const custom = list.filter((m) => !m.builtin).sort((a, b) => a.createdAt - a.createdAt)
    const first = [...builtin, ...custom][0]
    if (first) {
      setSelModel(first.id)
      setModelEdit(false)
      setModelDraft(null)
    }
  }

  /* ══ 渲染 ══ */
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
          {(['home', 'think', 'voice', 'roles', 'accounts', 'devices', 'rooms', 'models', 'logs', 'syslogs'] as View[]).map((v) => (
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
              <I n={v === 'home' ? 'home' : v === 'accounts' ? 'user' : v === 'devices' ? 'speaker' : v === 'roles' ? 'chat' : v === 'logs' ? 'log' : v === 'syslogs' ? 'terminal' : v === 'think' ? 'bolt' : v === 'voice' ? 'mic' : v === 'rooms' ? 'users' : 'gear'} />
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
            <path d={sideOff ? 'M10 12 L3.6 1 L3.6 23 Z' : 'M3.6 12 L10 1 L10 23 Z'} />
          </svg>
        </button>
      </aside>

      <div className="main">
        <header className="top">
          <h1>{TITLES[view]}</h1>
          <label className="search">
            <I n="search" />
            <input placeholder={SEARCH_HINT[view] || '搜索…'} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <span className="sp" />
          <div className="top-right">
            <div className="srv" title="migpt-server 服务状态">
              <span className="dot" />
              <span>服务运行中</span>
              <em>v1.12.0</em>
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
              onOpenThink={() => { setSettingTab('think'); setView('think') }}
              onOpenVoice={() => { setSettingTab('voice'); setView('voice') }}
              onStartWizard={() => setWizard({ step: 0, accountId: '', alias: '', did: '', model: '', roleId: '' })}
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
              onResetPull={() => setDevPull({ loading: false, err: '', list: null })}
              onDevAcctFilter={(f, firstId) => { setDevAcctFilter(f); selectDev(firstId) }}
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
                  showToast(`该会话群正被设备「${roomUsage(id).join('、')}」引用，请先解除设备绑定`)
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

          {view === 'roles' && <RolesView roles={filterRoles} allRoles={roles} thinkSvcs={thinkSvcs} voiceSvcs={voiceSvcs} roleUsage={roleUsage} onSave={async (r) => { try { await api.updateRole(r.id, r); showToast('角色已保存，人设与模型热生效'); refreshAll() } catch (e) { showToast(errText(e)) } }} onCreate={async (r) => { try { const c = await api.createRole(r); showToast('角色已创建'); await refreshAll(); return c } catch (e) { showToast(errText(e)); return null } }} onDelete={async (id) => { if (roleUsage(id).length) { showToast(`该角色正被 ${roleUsage(id).length} 台设备引用（${roleUsage(id).join('、')}），请先解除设备绑定`); return } const r = roles.find((x) => x.id === id); setConfirm({ title: '删除对话角色', msg: `确定删除「${r?.name || '该角色'}」吗？删除后不可恢复。`, onOk: async () => { try { await api.deleteRole(id); showToast('角色已删除'); refreshAll() } catch (e) { showToast(errText(e)) } } }) }} />}

          {view === 'logs' && <LogsView devices={devices} models={models} />}
          {view === 'syslogs' && <SysLogsView query={query} onToast={showToast} />}

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
              onSaveVoice={saveVoice}
              usageThink={thinkUsage}
              usageVoice={voiceUsage}
            />
          )}

          {view === 'profile' && (
            <ProfileView
              onPwd={() => setPwdModal(true)}
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
            if (!window.confirm(`解绑设备「${detail.meta.alias}」？此操作不可撤销。`)) return
            await removeDevice(detail.meta.id)
          }}
          onEdit={() => setModal({ kind: 'deviceBind', title: '编辑绑定', desc: '修改这台音箱的角色与服务绑定；换绑账号 / 唤醒词需重启设备。', payload: detail.meta })}
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
                await api.updateAccount(payload.id, values as Partial<Account>)
                showToast('账号已更新，换绑账号需重启受影响设备')
              } else {
                await api.createAccount(values as Partial<Account>)
                showToast('账号已连接')
              }
              refreshAll()
            } else if (m.kind === 'think') {
              const payload = (m.payload || {}) as ThinkService
              if (payload.id) {
                await api.updateThinkService(payload.id, values as Partial<ThinkService>)
                showToast('思考服务已更新，热生效')
              } else {
                await api.createThinkService(values as Partial<ThinkService>)
                showToast('思考服务已创建')
              }
              refreshAll()
            } else if (m.kind === 'voice') {
              const payload = (m.payload || {}) as VoiceService
              if (payload.id) {
                await api.updateVoiceService(payload.id, values as Partial<VoiceService>)
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
              await api.changeAuth('admin', (values as { old: string }).old, 'admin', (values as { pwd: string }).pwd)
              showToast('密码已修改，下次登录生效')
            } else if (m.kind === 'deviceBind') {
              const meta = (m.payload || {}) as api.DeviceMeta
              await api.saveDevice(meta.id, { meta: values as Partial<api.DeviceMeta> })
              showToast('绑定已更新，需重启设备生效')
              refreshAll()
              if (detail) openDevice(meta.id)
            }
          } catch (e) {
            showToast(errText(e))
          }
        }} />
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
          <div className={'scrim on' + (confirmLeaving ? ' closing' : '')} onClick={() => closeConfirm()} />
          <div className={'modal on' + (confirmLeaving ? ' closing' : '')}>
            <h3>
              <I n="trash" size={18} /> {confirm.title}
            </h3>
            <div className="desc">{confirm.msg}</div>
            <div className="acts">
              <span className="sp" />
              <button className="btn ghost" onClick={() => closeConfirm()}>
                取消
              </button>
              <button className="btn danger" onClick={() => closeConfirm(true)}>
                <I n="trash" /> 删除
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
function LogsView(props: { devices: DeviceRow[]; models: SpeakerModel[] }) {
  const [logs, setLogs] = useState<LogEntry[] | null>(null)
  const [devFilter, setDevFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState<'all' | 'user' | 'ai' | 'system'>('all')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    setBusy(true)
    api
      .getLogs(300)
      .then((r) => setLogs(r.logs))
      .catch(() => setLogs([]))
      .finally(() => setBusy(false))
  }, [])
  useEffect(load, [load])
  const list = useMemo(() => {
    if (!logs) return null
    return logs.filter(
      (l) =>
        (devFilter === 'all' || l.deviceId === devFilter) &&
        (kindFilter === 'all' || l.kind === kindFilter),
    )
  }, [logs, devFilter, kindFilter])
  const kindLabel = { user: '用户提问', ai: '设备回复', system: '设备日志' } as const
  const deviceById = (id: string) => props.devices.find((d) => d.id === id)
  const selDevName = devFilter === 'all' ? '全部设备' : deviceById(devFilter)?.alias || devFilter
  return (
    <section data-view="logs" className="on">
      <div className="split">
        <aside className="slist">
          <div className="filters">
            <span className={'chip' + (devFilter === 'all' ? ' on' : '')} onClick={() => setDevFilter('all')}>
              全部设备
            </span>
            <span className="sp">
              <span className="count">共 {props.devices.length} 台</span>
            </span>
          </div>
          {props.devices.map((d) => {
            const m = props.models.find((x) => x.id === d.speakerModel || x.name === d.speakerModel)
            return (
              <div key={d.id} className={'li' + (devFilter === d.id ? ' on' : '')} onClick={() => setDevFilter(d.id)}>
                <span className="ic">
                  {m?.imageUrl ? <img className="thumb" src={m.imageUrl} alt="" /> : <I n="speaker" />}
                </span>
                <span className="txt">
                  <b>{d.alias}</b>
                  <span>{d.did}</span>
                </span>
                <span className="count">{logs ? logs.filter((l) => l.deviceId === d.id).length : 0} 条</span>
              </div>
            )
          })}
        </aside>
        <section className="sdetail" key={'logs-' + devFilter + '-' + kindFilter}>
          <div className="filters">
            <span className={'chip' + (kindFilter === 'all' ? ' on' : '')} onClick={() => setKindFilter('all')}>
              全部对话
            </span>
            <span className={'chip' + (kindFilter === 'user' ? ' on' : '')} onClick={() => setKindFilter('user')}>
              用户提问
            </span>
            <span className={'chip' + (kindFilter === 'ai' ? ' on' : '')} onClick={() => setKindFilter('ai')}>
              设备回复
            </span>
            <span className={'chip' + (kindFilter === 'system' ? ' on' : '')} onClick={() => setKindFilter('system')}>
              设备日志
            </span>
            <span className="sp" />
            <button className="icon-btn" title="刷新" disabled={busy} onClick={load}>
              <I n="refresh" size={16} />
            </button>
          </div>

          {list === null ? (
            <div className="panel">
              <div className="loading">
                <div className="skel" />
                <div className="skel" />
                <div className="skel" />
              </div>
            </div>
          ) : list.length === 0 ? (
            <div className="panel">
              <div className="empty">
                <div className="art">
                  <I n="log" size={26} />
                </div>
                <b>{logs && logs.length === 0 ? '还没有对话记录' : '没有符合条件的记录'}</b>
                <span>
                  {logs && logs.length === 0
                    ? '唤醒音箱开始对话后，这里会按时间记录每台音箱的问答，方便你复盘每次交互。'
                    : '换一个筛选条件，或点击右上角刷新。'}
                </span>
              </div>
            </div>
          ) : (
            <div className="logs">
              {list.map((l, i) => (
                <LogRow
                  key={i}
                  l={l}
                  multi={l.text.includes('\n')}
                  devName={selDevName}
                  kindLabel={kindLabel[l.kind]}
                  onToggle={(open) => {
                    setExpanded((prev) => {
                      const next = new Set(prev)
                      if (open) next.add(i)
                      else next.delete(i)
                      return next
                    })
                  }}
                  open={expanded.has(i)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function LogRow(props: {
  l: { time: string; kind: 'user' | 'ai' | 'system'; text: string }
  multi: boolean
  open: boolean
  devName: string
  kindLabel: string
  onToggle: (open: boolean) => void
}) {
  const { l, multi, open, devName, kindLabel, onToggle } = props
  return (
    <div
      className={'log' + (l.kind === 'user' ? ' q' : l.kind === 'ai' ? ' a' : '') + (multi ? ' expandable' : '') + (open ? ' open' : '')}
      onClick={multi ? () => onToggle(!open) : undefined}
      title={multi && !open ? '点击展开查看完整内容' : undefined}
    >
      <span className="t">{l.time || '--'}</span>
      <span className="who">
        <span className="tag accent">{devName}</span>
        <em className={'k k-' + l.kind}>{kindLabel}</em>
      </span>
      <span className="txt">{l.text}</span>
      {multi && (
        <span className="more">
          <I n={open ? 'up' : 'down'} size={12} />
        </span>
      )}
    </div>
  )
}

function SysLogsView(props: { query?: string; onToast?: (msg: string) => void }) {
  const [lines, setLines] = useState<string[] | null>(null)
  const [live, setLive] = useState(true)
  const [askClear, setAskClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const load = useCallback(() => {
    api
      .getSystemLogs(400)
      .then((r) => {
        setLines(r.lines)
      })
      .catch(() => setLines([]))
  }, [])
  useEffect(() => {
    load()
    if (!live) return
    const t = window.setInterval(load, 2000)
    return () => window.clearInterval(t)
  }, [load, live])
  useEffect(() => {
    const el = boxRef.current
    if (el && lines) el.scrollTop = el.scrollHeight
  }, [lines])
  const q = (props.query || '').trim().toLowerCase()
  const shown = useMemo(
    () => (lines ? lines.filter((l) => !q || l.toLowerCase().includes(q)) : null),
    [lines, q],
  )
  const levelOf = (line: string) =>
    /\[ERROR\]/.test(line) ? 'err' : /\[WARN\]/.test(line) ? 'warn' : 'info'
  return (
    <section data-view="syslogs" className="on">
      <div className="syslog">
        <div className="filters">
          <label className="switch-inline" title="开启后每 2 秒自动刷新最新日志；关闭即暂停实时日志，保留当前画面">
            <span className="k">自动刷新</span>
            <span className="switch">
              <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
              <span className="track" />
            </span>
          </label>
          <span className="sp" />
          <button className="btn ghost danger" onClick={() => setAskClear(true)} disabled={clearing}>
            <I n="trash" /> 清理日志
          </button>
          <button className="btn" onClick={() => api.downloadSystemLogs()}>
            <I n="download" /> 下载日志
          </button>
        </div>
        <div className="syslog-box" ref={boxRef}>
          {shown === null ? (
            <div className="syslog-empty">正在加载日志…</div>
          ) : shown.length === 0 ? (
            <div className="syslog-empty">{q ? '没有匹配的日志行' : '暂无系统日志'}</div>
          ) : (
            shown.map((l, i) => (
              <div className={'syslog-line ' + levelOf(l)} key={i}>
                {l}
              </div>
            ))
          )}
        </div>
      </div>
      {askClear && (
        <>
          <div className="scrim on" onClick={() => setAskClear(false)} />
          <div className="modal on">
            <h3>
              <I n="trash" size={18} /> 清理系统日志
            </h3>
            <div className="desc">
              将删除全部历史日志数据，并清空实时日志内容，此操作无法恢复。是否继续？
            </div>
            <div className="acts">
              <span className="sp" />
              <button className="btn ghost" onClick={() => setAskClear(false)}>
                取消
              </button>
              <button
                className="btn danger"
                disabled={clearing}
                onClick={async () => {
                  setClearing(true)
                  try {
                    await api.clearSystemLogs()
                    setLines([])
                    setAskClear(false)
                    props.onToast?.('系统日志已清理')
                  } catch (e) {
                    props.onToast?.(e instanceof Error ? e.message : String(e))
                  } finally {
                    setClearing(false)
                  }
                }}
              >
                <I n="trash" /> 清理
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function RoomsView(props: {
  rooms: Room[]
  allRooms: Room[]
  devices: DeviceRow[]
  onSave: (r: Room) => void
  onCreate: (r: Partial<Room>) => Promise<Room | null> | void
  onDelete: (id: string) => void
}) {
  const [selId, setSelId] = useState<string | null>(props.rooms[0]?.id || null)
  const sel = props.allRooms.find((r) => r.id === selId) || null
  const [draft, setDraft] = useState<{ name: string; description: string }>({ name: sel?.name || '', description: sel?.description || '' })
  const [edit, setEdit] = useState(false)
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    setDraft({ name: sel?.name || '', description: sel?.description || '' })
    setEdit(false)
  }, [selId, sel?.name, sel?.description])
  const startCreate = () => {
    setSelId(null)
    setDraft({ name: '', description: '' })
    setEdit(true)
    setCreating(true)
  }
  const cancel = () => {
    if (creating) {
      setCreating(false)
      setEdit(false)
      if (props.allRooms.length) setSelId(props.allRooms[0].id)
      else setDraft({ name: '', description: '' })
      return
    }
    setEdit(false)
    setDraft({ name: sel?.name || '', description: sel?.description || '' })
  }
  const save = async () => {
    const name = draft.name.trim()
    if (!name) {
      window.alert('会话群名称必填')
      return
    }
    if (creating) {
      const created = await props.onCreate({ name, description: draft.description.trim() || undefined })
      if (created) {
        setCreating(false)
        setEdit(false)
        setSelId(created.id)
      }
      return
    }
    if (sel) {
      props.onSave({ ...sel, name, description: draft.description.trim() || undefined })
      setEdit(false)
    }
  }
  return (
    <section data-view="rooms" className="on">
      <div className="filters">
        <span className="chip on">全部会话群</span>
        <span className="sp">
          <span className="count">共 {props.rooms.length} 个</span>
        </span>
      </div>
      <div className="split">
        <aside className="slist">
          {props.rooms.map((r) => {
            const used = props.devices.filter((d) => d.roomRef === r.id).length
            return (
              <div key={r.id} className={'li' + (r.id === selId ? ' on' : '')} onClick={() => { setSelId(r.id); setEdit(false) }}>
                <span className="ic">
                  <I n="users" />
                </span>
                <span className="txt">
                  <b>{r.name}</b>
                  <span>{r.description || '无描述'}</span>
                </span>
                {used ? <span className="tag accent">{used} 台共用</span> : <span className="tag neu">未关联</span>}
              </div>
            )
          })}
          <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={startCreate}>
            <I n="plus" /> 新建
          </button>
        </aside>
        <section className="sdetail" key={'room-' + (selId || 'new') + (edit ? '-e' : '-r')}>
          {props.rooms.length === 0 && !creating ? (
            <div className="empty">
              <div className="art">
                <I n="users" size={26} />
              </div>
              <b>还没有会话群</b>
              <span>会话群是对话记忆的上下文归属，多台设备可共用同一会话群；创建后在「设备服务」中关联。</span>
              <button className="btn primary" onClick={startCreate}>
                <I n="plus" /> 新建
              </button>
            </div>
          ) : edit ? (
            <div className="form-card">
              <h3>
                <I n="users" size={17} /> {creating ? '新建会话群' : '编辑会话群'}
              </h3>
              <div className="desc">{creating ? '创建后可到「设备服务」中为音箱关联此会话群。' : '修改会话群信息；关联设备重启后生效。'}</div>
              <div className="grp">
                <h4>基本信息</h4>
                <div className="row">
                  <div className="fld">
                    <label>会话群名称<span className="req">*</span></label>
                    <input value={draft.name} placeholder="例如：客厅会话" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </div>
                  <div className="fld">
                    <label>会话群描述</label>
                    <input value={draft.description} placeholder="例如：家庭日常闲聊场景" onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <button className="btn ghost" onClick={cancel}>
                  取消
                </button>
                <button className="btn primary" onClick={save} disabled={!draft.name.trim()}>
                  <I n="check" /> 保存
                </button>
              </div>
            </div>
          ) : sel ? (
            <div className="form-card">
              <h3>
                <I n="users" size={17} /> 会话群详情
                <span className="refs">多台设备共用同一会话群，共享对话记忆；变更后需重启关联设备生效。</span>
              </h3>
              <div className="desc">对话记忆的上下文归属；被设备引用后删除前需先解绑。</div>
              <div className="ro">
                <div className="grp">
                  <h4>基本信息</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">会话群名称</span>
                      <span className="v">{sel.name}</span>
                    </div>
                    <div className="rr">
                      <span className="k">会话群描述</span>
                      <span className="v">{sel.description || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>关联设备</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">关联设备</span>
                      <span className="v">
                        {(() => {
                          const used = props.devices.filter((d) => d.roomRef === sel.id)
                          return used.length ? used.map((d) => d.alias).join('、') : '未关联'
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <button className="btn danger" onClick={() => props.onDelete(sel.id)}>
                  <I n="trash" /> 删除
                </button>
                <button className="btn primary" onClick={() => { setDraft({ name: sel.name, description: sel.description || '' }); setEdit(true) }}>
                  <I n="pencil" /> 编辑
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
}

function RolesView(props: {
  roles: Role[]
  allRoles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  roleUsage: (id: string) => string[]
  onSave: (r: Role) => void
  onCreate: (r: Partial<Role>) => Promise<Role | null> | void
  onDelete: (id: string) => void
}) {
  const [selId, setSelId] = useState<string | null>(props.roles[0]?.id || null)
  const sel = props.allRoles.find((r) => r.id === selId) || null
  const [draft, setDraft] = useState<Role | null>(sel)
  const [edit, setEdit] = useState(false)
  const [creating, setCreating] = useState(false)
  const thinkDefault = props.thinkSvcs.find((s) => s.isDefault)
  const voiceDefault = props.voiceSvcs.find((s) => s.isDefault)
  const blankRole = (): Role => ({
    id: '',
    name: '',
    profile: '',
    callAIKeywords: [],
    wakeUpKeywords: ['小爱同学'],
    exitKeywords: [],
    checkContinueKeywords: [],
    checkNotContinueKeywords: [],
    exitKeepAliveAfter: 30,
    onEnterAI: [],
    onExitAI: [],
    onAIAsking: [],
    onAIReplied: [],
    onAIError: [],
  })
  useEffect(() => {
    setSelId((s) => s || props.roles[0]?.id || null)
  }, [props.roles])
  useEffect(() => {
    if (!creating) setDraft(sel)
  }, [selId, creating]) // eslint-disable-line react-hooks/exhaustive-deps

  const setF = (k: keyof Role, v: unknown) => draft && setDraft({ ...draft, [k]: v })
  const usage = sel ? props.roleUsage(sel.id) : []

  const selectRole = (id: string) => {
    setSelId(id)
    setCreating(false)
    setEdit(false)
  }
  const startCreate = () => {
    setSelId(null)
    setCreating(true)
    setEdit(true)
    setDraft(blankRole())
  }
  const cancelEdit = () => {
    if (creating) {
      setCreating(false)
      setEdit(false)
      if (!sel) setSelId(props.roles[0]?.id || null)
      else setDraft(sel)
    } else {
      setEdit(false)
    }
  }
  const doSave = async () => {
    if (!draft) return
    if (creating) {
      const c = await props.onCreate({ ...draft })
      if (c?.id) {
        setSelId(c.id)
        setCreating(false)
        setEdit(false)
      }
    } else {
      props.onSave(draft)
      setEdit(false)
    }
  }

  if (props.roles.length === 0) {
    return (
      <section data-view="roles" className="on">
        <div className="panel">
          <div className="empty">
            <div className="art">
              <I n="chat" size={26} />
            </div>
            <b>还没有对话角色</b>
            <span>创建角色后，可在设备向导中为每台音箱选择人设。</span>
            <button className="btn primary" onClick={startCreate}>
              <I n="plus" /> 新建
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section data-view="roles" className="on">
      <div className="filters">
        <span className="chip on">全部角色</span>
        <span className="sp">
          <span className="count">共 {props.roles.length} 个</span>
        </span>
      </div>
      <div className="roles">
        <div className="rlist">
          {props.roles.map((r) => (
            <div className={'r' + (r.id === selId ? ' on' : '')} key={r.id} onClick={() => selectRole(r.id)}>
              <img src={avatarOf(r.name)} alt={r.name} />
              <span>
                <b>{r.name}</b>
                <span>{r.profile?.slice(0, 18) || '未填写人设'}</span>
              </span>
            </div>
          ))}
          <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={startCreate}>
            <I n="plus" /> 新建
          </button>
        </div>
        {sel && !edit && !creating && (
          <div className="rform rview" key={'role-r-' + sel.id}>
            <h3>
              <I n="chat" size={17} /> 角色详情
              <span className="refs">
                本角色被 {usage.length} 台设备引用{usage.length ? '（' + usage.join(' · ') + '）' : ''}。人设与模型热生效；修改唤醒词需重启设备。
              </span>
            </h3>
            <div className="ro">
              <div className="grp">
                <h4>基本信息</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">角色名称</span>
                    <span className="v">{sel.name || '—'}</span>
                  </div>
                </div>
                <div className="row">
                  <div className="rr">
                    <span className="k">人设描述</span>
                    <span className="v">{sel.profile || '未填写'}</span>
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>模型服务</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">思考服务</span>
                    <span className="v">{props.thinkSvcs.find((s) => s.id === sel.thinkServiceId)?.name || '跟随全局默认'}</span>
                  </div>
                  <div className="rr">
                    <span className="k">语音服务</span>
                    <span className="v">{props.voiceSvcs.find((s) => s.id === sel.voiceId)?.name || '跟随全局默认'}</span>
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>单次对话</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">调用关键词</span>
                    <span className="v">{(sel.callAIKeywords || []).join('、') || '—'}</span>
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>连续对话</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">唤醒关键词</span>
                    <span className="v">{(sel.wakeUpKeywords || []).join('、') || '小爱同学'}</span>
                  </div>
                  <div className="rr">
                    <span className="k">退出关键词</span>
                    <span className="v">{(sel.exitKeywords || []).join('、') || '—'}</span>
                  </div>
                </div>
                <div className="row">
                  <div className="rr">
                    <span className="k">自动退出时间</span>
                    <span className="v">{sel.exitKeepAliveAfter ?? 30} 秒无响应退出</span>
                  </div>
                </div>
                <div className="row">
                  <div className="rr">
                    <span className="k">继续对话检测</span>
                    <span className="v">{(sel.checkContinueKeywords || []).join('、') || '—'}</span>
                  </div>
                  <div className="rr">
                    <span className="k">停止对话检测</span>
                    <span className="v">{(sel.checkNotContinueKeywords || []).join('、') || '—'}</span>
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>提示语</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">进入 AI</span>
                    <span className="v">{(sel.onEnterAI || []).join('、') || '关闭'}</span>
                  </div>
                  <div className="rr">
                    <span className="k">退出 AI</span>
                    <span className="v">{(sel.onExitAI || []).join('、') || '关闭'}</span>
                  </div>
                </div>
                <div className="row">
                  <div className="rr">
                    <span className="k">AI 思考中</span>
                    <span className="v">{(sel.onAIAsking || []).join('、') || '关闭'}</span>
                  </div>
                  <div className="rr">
                    <span className="k">AI 回答完毕</span>
                    <span className="v">{(sel.onAIReplied || []).join('、') || '关闭'}</span>
                  </div>
                </div>
                <div className="row">
                  <div className="rr">
                    <span className="k">AI 出错</span>
                    <span className="v">{(sel.onAIError || []).join('、') || '关闭'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="acts">
              <span className="sp" />
              <button className="btn danger" onClick={() => props.onDelete(sel.id)}>
                <I n="trash" /> 删除
              </button>
              <button className="btn primary" onClick={() => setEdit(true)}>
                <I n="pencil" /> 编辑
              </button>
            </div>
          </div>
        )}
        {draft && (edit || creating) && (
          <div className="rform redit" key={'role-e-' + (creating ? 'new' : sel?.id || 'new')}>
            <h3>
              <I n="chat" size={17} /> {creating ? '新建角色' : '编辑角色'}
              <span className="refs">
                本角色被 {usage.length} 台设备引用{usage.length ? '（' + usage.join(' · ') + '）' : ''}。人设与模型热生效；修改唤醒词需重启设备。
              </span>
            </h3>
            <div className="grp">
              <h4>基本信息</h4>
              <div className="row">
                <div className="fld">
                  <label>角色名称<span className="req">*</span></label>
                  <input value={draft.name} onChange={(e) => setF('name', e.target.value)} />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>人设描述<span className="tip" data-tip="供思考服务理解人格 · 热生效">?</span></label>
                  <textarea value={draft.profile} onChange={(e) => setF('profile', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="grp">
              <h4>模型服务</h4>
              <div className="row">
                <div className="fld">
                  <label>思考服务</label>
                  <select value={draft.thinkServiceId || ''} onChange={(e) => setF('thinkServiceId', e.target.value || undefined)}>
                    <option value="">（跟随全局默认：{thinkDefault?.name || '未设置'}）</option>
                    {props.thinkSvcs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                        {o.isDefault ? ' · 默认' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld">
                  <label>语音服务</label>
                  <select value={draft.voiceId || ''} onChange={(e) => setF('voiceId', e.target.value || undefined)}>
                    <option value="">（跟随全局默认：{voiceDefault?.name || '未设置'}）</option>
                    {props.voiceSvcs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                        {o.isDefault ? ' · 默认' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="grp">
              <h4>单次对话</h4>
              <div className="row">
                <div className="fld">
                  <label>调用关键词<span className="tip" data-tip="每次提问都需以「小爱同学 + 调用词」开头，不会进入连续对话">?</span></label>
                  <input
                    value={(draft.callAIKeywords || []).join('、')}
                    onChange={(e) => setF('callAIKeywords', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
              </div>
            </div>
            <div className="grp">
              <h4>连续对话</h4>
              <div className="row">
                <div className="fld">
                  <label>唤醒关键词<span className="tip" data-tip="唤醒后免唤醒词连续对话 · 修改后需重启绑定该设备的设备">?</span></label>
                  <input
                    value={(draft.wakeUpKeywords || []).join('、')}
                    onChange={(e) => setF('wakeUpKeywords', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
                <div className="fld">
                  <label>退出关键词<span className="tip" data-tip="说出退出词即结束连续对话；留空时用唤醒词再唤回或等待超时">?</span></label>
                  <input
                    value={(draft.exitKeywords || []).join('、')}
                    onChange={(e) => setF('exitKeywords', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>自动退出时间<span className="tip" data-tip="连续对话中无响应超过该秒数自动退出，默认 30 秒">?</span></label>
                  <input value={String(draft.exitKeepAliveAfter ?? 30)} placeholder="默认 30" onChange={(e) => setF('exitKeepAliveAfter', parseInt(e.target.value || '30', 10) || 30)} />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>继续对话检测<span className="tip" data-tip="说出继续词可保持连续对话；超时退出后再说出可重新进入">?</span></label>
                  <input
                    value={(draft.checkContinueKeywords || []).join('、')}
                    onChange={(e) => setF('checkContinueKeywords', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
                <div className="fld">
                  <label>停止对话检测<span className="tip" data-tip="说出停止词立即结束连续对话，等效于退出关键词">?</span></label>
                  <input
                    value={(draft.checkNotContinueKeywords || []).join('、')}
                    onChange={(e) => setF('checkNotContinueKeywords', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
              </div>
            </div>
            <div className="grp">
              <h4>提示语</h4>
              <div className="row">
                <div className="fld">
                  <label>进入 AI<span className="tip" data-tip="进入连续对话时播报，留空即关闭该提示">?</span></label>
                  <input
                    value={(draft.onEnterAI || []).join('、')}
                    onChange={(e) => setF('onEnterAI', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
                <div className="fld">
                  <label>退出 AI<span className="tip" data-tip="退出连续对话时播报，留空即关闭">?</span></label>
                  <input
                    value={(draft.onExitAI || []).join('、')}
                    onChange={(e) => setF('onExitAI', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>AI 思考中<span className="tip" data-tip="AI 开始回答前的过渡语，留空即关闭">?</span></label>
                  <input
                    value={(draft.onAIAsking || []).join('、')}
                    onChange={(e) => setF('onAIAsking', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
                <div className="fld">
                  <label>AI 回答完毕<span className="tip" data-tip="AI 回答结束后的收尾语，留空即关闭">?</span></label>
                  <input
                    value={(draft.onAIReplied || []).join('、')}
                    onChange={(e) => setF('onAIReplied', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>AI 出错<span className="tip" data-tip="AI 回答异常时播报，留空即关闭">?</span></label>
                  <input
                    value={(draft.onAIError || []).join('、')}
                    onChange={(e) => setF('onAIError', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
              </div>
            </div>
            <div className="acts">
              <span className="sp" />
              <button className="btn ghost" onClick={cancelEdit}>
                取消
              </button>
              <button className="btn primary" onClick={doSave} disabled={!draft.name}>
                <I n="check" /> 保存
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ══ 设备详情抽屉 ══ */
function Drawer(props: {
  detail: DeviceDetail
  running?: boolean
  roles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  accounts: Account[]
  models: SpeakerModel[]
  rooms: Room[]
  onClose: () => void
  onRestart: () => void
  onRemove: () => void
  onEdit: () => void
}) {
  const { detail, models } = props
  const [closing, setClosing] = useState(false)
  const close = (after?: () => void) => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      if (after) after()
      else props.onClose()
    }, 200)
  }
  const m = detail.meta
  const rows: BindingRow[] = detail.bindings?.rows || []
  const rowIcon = (key: BindingRow['key']) => (key === 'account' ? 'user' : key === 'role' ? 'chat' : key === 'think' ? 'bolt' : 'mic')
  const rowType = (key: BindingRow['key']) => (key === 'think' ? ' t' : key === 'voice' ? ' v' : '')
  const srcClass = (s: BindingRow['source']) => (s === 'device' ? ' ovr' : s === 'global' ? ' glb' : '')
  return (
    <>
      <div className={'scrim on' + (closing ? ' closing' : '')} style={{ zIndex: 55 }} onClick={() => close()} />
      <aside className={'drawer on' + (closing ? ' closing' : '')}>
        <div className="dh">
          <span className="cover" style={{ backgroundImage: `url(${coverOf(m.alias, m.did)})` }} />
          <span>
            <b>{m.alias}</b>
            <span>
              {(() => { const r = m.speakerModel; const mm = r ? models.find((x) => x.id === r || x.name === r) : null; return (mm ? mm.name : r || '智能音箱') + ' · ' + m.did })()}
            </span>
          </span>
          <button className="icon-btn x" onClick={() => close()}>
            <I n="x" />
          </button>
        </div>
        <div className="db">
          <div>
            <h4>
              <I n="lock" size={14} /> 绑定链 · 优先级：设备指定 &gt; 角色指定 &gt; 全局默认
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {rows.map((r) => (
                <div className="bind-row" key={r.key}>
                  <span className={'ic' + rowType(r.key)}>
                    <I n={rowIcon(r.key)} size={15} />
                  </span>
                  <span className="lbl">
                    <b>{r.label}</b>
                    <span>{r.detail || ''}</span>
                  </span>
                  <span className="to">→</span>
                  <span className="val">{r.name}</span>
                  <span className={'src' + srcClass(r.source)}>{r.sourceLabel}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4>
              <I n="info" size={14} /> 关键参数
            </h4>
            <div className="kv" style={{ marginTop: 10 }}>
              <div className="kr">
                <span className="k">did</span>
                <span className="vv">{m.did}</span>
              </div>
              <div className="kr">
                <span className="k">型号</span>
                <span className="vv">{(() => { const r = m.speakerModel; const mm = r ? models.find((x) => x.id === r || x.name === r) : null; return mm ? `${mm.name}（${mm.did}）` : r || '—' })()}</span>
              </div>
              <div className="kr">
                <span className="k">所属账号</span>
                <span className="vv">{props.accounts.find((a) => a.id === m.accountId)?.name || '未绑定'}</span>
              </div>
              <div className="kr">
                <span className="k">服务状态</span>
                <span className="vv">{props.running ? '运行中' : '未启动'}</span>
              </div>
              <div className="kr">
                <span className="k">连续对话</span>
                <span className="vv">
                  {(() => {
                    const mm = m.speakerModel ? models.find((x) => x.id === m.speakerModel || x.name === m.speakerModel) : null
                    if (!mm) return '—'
                    if (!mm.consecutive) return '未启用（型号不支持）'
                    return mm.playingCommand?.length ? '启用 · 支持播放状态检测' : '启用 · 依赖 Mina 检测播放状态'
                  })()}
                </span>
              </div>
              <div className="kr">
                <span className="k">对话超时</span>
                <span className="vv">{m.exitKeepAliveAfter ?? 30} 秒无响应退出</span>
              </div>
              <div className="kr">
                <span className="k">会话群</span>
                <span className="vv">{(() => { const rm = m.roomRef ? props.rooms.find((x) => x.id === m.roomRef) : null; return rm ? `${rm.name}${rm.description ? ' · ' + rm.description : ''}` : (m.roomName ? m.roomName : '—') })()}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="acts">
          <button className="btn ghost" onClick={() => close(props.onEdit)}>
            <I n="pencil" /> 编辑绑定
          </button>
          <button className="btn danger" onClick={() => close(props.onRemove)}>
            <I n="trash" /> 解绑设备
          </button>
          <span className="sp" />
          <button className="btn primary" onClick={() => close(props.onRestart)}>
            <I n="refresh" /> 重启设备
          </button>
        </div>
      </aside>
    </>
  )
}

/* ══ 弹窗外壳 ══ */
function ModalShell(props: {
  modal: ModalState
  accounts: Account[]
  roles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  models: SpeakerModel[]
  rooms: Room[]
  onClose: () => void
  onDone: (values: Record<string, unknown>) => void
}) {
  const [v, setV] = useState<Record<string, string>>(() => {
    const p = (props.modal.payload || {}) as Record<string, unknown>
    const init: Record<string, string> = {}
    if (props.modal.kind === 'account') {
      init.name = (p.name as string) || ''
      init.miUserId = (p.miUserId as string) || ''
      init.passToken = ''
    } else if (props.modal.kind === 'think') {
      init.name = (p.name as string) || ''
      init.provider = (p.provider as string) || 'doubao'
      init.model = (p.model as string) || PROVIDER_PRESETS[init.provider]?.model || ''
      init.apiKey = ''
      init.temperature = String((p.temperature as number) ?? 0.7)
      init.baseUrl = (p.baseUrl as string) || PROVIDER_PRESETS[init.provider]?.baseUrl || ''
    } else if (props.modal.kind === 'voice') {
      init.name = (p.name as string) || ''
      init.provider = (p.provider as string) || 'edge'
      init.voiceId = (p.voiceId as string) || ''
      const tts = (p.tts as Record<string, any>) || {}
      init.edgeToken = tts.edge?.trustedToken || ''
      init.volcanoAppId = tts.volcano?.appId || ''
      init.volcanoToken = tts.volcano?.accessToken || ''
      init.openaiKey = tts.openai?.apiKey || ''
      init.openaiModel = tts.openai?.model || ''
      init.openaiBaseUrl = tts.openai?.baseUrl || ''
    } else if (props.modal.kind === 'role') {
      init.name = (p.name as string) || ''
      init.profile = (p.profile as string) || ''
    } else if (props.modal.kind === 'deviceBind') {
      init.accountId = (p.accountId as string) || ''
      init.roleId = (p.roleId as string) || ''
      init.thinkServiceId = (p.thinkServiceId as string) || ''
      init.voiceOverrideId = (p.voiceOverrideId as string) || ''
      init.speakerModel = (p.speakerModel as string) || ''
      init.exitKeepAliveAfter = String((p.exitKeepAliveAfter as number) ?? 30)
      init.roomRef = (p.roomRef as string) || ''
    }
    return init
  })
  const { modal } = props
  const [closing, setClosing] = useState(false)
  const close = (after?: () => void) => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      if (after) after()
      else props.onClose()
    }, 200)
  }
  const isEdit = !!(modal.payload as { id?: string })?.id
  const submit = () => {
    if (closing) return
    let out: Record<string, unknown> = {}
    if (modal.kind === 'account') {
      out = { name: v.name, miUserId: v.miUserId, passToken: v.passToken }
    } else if (modal.kind === 'think') {
      out = { name: v.name, provider: v.provider, model: v.model, temperature: parseFloat(v.temperature) || 0.7 }
      out.baseUrl = v.baseUrl || PROVIDER_PRESETS[v.provider]?.baseUrl || ''
      if (v.apiKey) out.apiKey = v.apiKey
    } else if (modal.kind === 'voice') {
      out = { name: v.name, provider: v.provider }
      if (v.voiceId) out.voiceId = v.voiceId
      const tts: Record<string, unknown> = {}
      if (v.provider === 'edge') {
        tts.edge = v.edgeToken ? { trustedToken: v.edgeToken } : {}
      } else if (v.provider === 'volcano') {
        if (!v.volcanoAppId || !v.volcanoToken) {
          setV({ ...v, err: '火山引擎需填写 App ID 与访问令牌' })
          return
        }
        tts.volcano = { appId: v.volcanoAppId, accessToken: v.volcanoToken }
      } else if (v.provider === 'openai') {
        if (!v.openaiKey) {
          setV({ ...v, err: 'OpenAI TTS 需填写 API Key' })
          return
        }
        tts.openai = {
          apiKey: v.openaiKey,
          ...(v.openaiModel ? { model: v.openaiModel } : {}),
          ...(v.openaiBaseUrl ? { baseUrl: v.openaiBaseUrl } : {}),
        }
      } else if (v.provider === 'custom') {
        try {
          const j = JSON.parse(v.customJson || '{}')
          Object.assign(tts, j)
        } catch {
          setV({ ...v, err: '自定义 TTS 配置不是合法 JSON' })
          return
        }
      }
      if (Object.keys(tts).length) out.tts = tts as never
    } else if (modal.kind === 'role') {
      out = { name: v.name, profile: v.profile }
    } else if (modal.kind === 'pwd') {
      if (!v.old) {
        setV({ ...v, err: '请输入当前密码' })
        return
      }
      if (!v.pwd) {
        setV({ ...v, err: '请输入新密码' })
        return
      }
      if (v.pwd !== v.pwd2) {
        setV({ ...v, err: '两次输入的新密码不一致' })
        return
      }
      out = { old: v.old, pwd: v.pwd }
    } else if (modal.kind === 'deviceBind') {
      out = {
        roleId: v.roleId || undefined,
        accountId: v.accountId || undefined,
        thinkServiceId: v.thinkServiceId || undefined,
        voiceOverrideId: v.voiceOverrideId || undefined,
        speakerModel: v.speakerModel || undefined,
        exitKeepAliveAfter: parseInt(v.exitKeepAliveAfter || '30', 10) || 30,
        roomRef: v.roomRef || undefined,
      }
    }
    close(() => props.onDone(out))
  }
  return (
    <>
      <div className={'scrim on' + (closing ? ' closing' : '')} onClick={() => close()} />
      <div className={'modal on' + (closing ? ' closing' : '')}>
        <h3>
          <I n={modal.kind === 'pwd' ? 'lock' : modal.kind === 'think' ? 'bolt' : modal.kind === 'voice' ? 'mic' : modal.kind === 'role' ? 'chat' : 'user'} size={18} /> {modal.title}
        </h3>
        <div className="desc">{modal.desc}</div>

        {modal.kind === 'account' && (
          <>
            <div className="fld row">
              <label>账号名称<span className="req">*</span></label>
              <input value={v.name || ''} placeholder="例如：默认账号" onChange={(e) => setV({ ...v, name: e.target.value })} />
            </div>
            <div className="fld row">
              <label>小米 ID<span className="req">*</span></label>
              <input value={v.miUserId || ''} placeholder="例如：1234567890" onChange={(e) => setV({ ...v, miUserId: e.target.value })} />
              <span className="hint">登录官方 小米账号 › 个人信息 后获取 小米ID，不是手机号或邮箱。</span>
            </div>
            <div className="fld">
              <label>passToken</label>
              <textarea rows={4} value={v.passToken || ''} placeholder={isEdit && v.passToken ? '已保存 · 留空保持不变' : '从米家 / 小爱获取的 token'} onChange={(e) => setV({ ...v, passToken: e.target.value })} />
              <span className="hint">{isEdit ? '留空则保留原凭据' : '异地登录安全验证时，会给出授权链接'}</span>
            </div>
          </>
        )}

        {modal.kind === 'think' && (
          <>
            <div className="fld row">
              <label>服务名称<span className="req">*</span></label>
              <input value={v.name || ''} placeholder="例如：豆包 Doubao-Seed" onChange={(e) => setV({ ...v, name: e.target.value })} />
            </div>
            <div className="fld row">
              <label>供应商<span className="req">*</span></label>
              <select
                value={v.provider || 'doubao'}
                onChange={(e) => {
                  const p = e.target.value
                  const preset = PROVIDER_PRESETS[p]
                  const prev = PROVIDER_PRESETS[v.provider || '']
                  setV({ ...v, provider: p, baseUrl: preset?.baseUrl || '', model: v.model && v.model !== prev?.model ? v.model : preset?.model || '' })
                }}
              >
                {Object.entries(PROVIDERS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fld row">
              <label>接口地址</label>
              {v.provider === 'custom' ? (
                <input value={v.baseUrl || ''} placeholder="https://api.example.com/v1" onChange={(e) => setV({ ...v, baseUrl: e.target.value })} />
              ) : (
                <input value={v.baseUrl || PROVIDER_PRESETS[v.provider || '']?.baseUrl || ''} readOnly disabled placeholder="选择供应商后自动填充" />
              )}
              <span className="hint">选「自定义」时可手动填写；其他供应商自动填充官方地址</span>
            </div>
            <div className="fld row">
              <label>模型端点<span className="req">*</span></label>
              <input value={v.model || ''} placeholder="ep-xxxxxxxx 或模型名" onChange={(e) => setV({ ...v, model: e.target.value })} />
              <span className="hint">切换供应商自动带出示例模型，可修改</span>
            </div>
            <div className="fld row">
              <label>API Key</label>
              <input value={v.apiKey || ''} placeholder="ark-••••" onChange={(e) => setV({ ...v, apiKey: e.target.value })} />
              <span className="hint">{isEdit ? '留空则保留原 Key' : '仅服务端保存，面板不展示明文'}</span>
            </div>
            <div className="fld row">
              <label>温度</label>
              <input value={v.temperature || '0.7'} onChange={(e) => setV({ ...v, temperature: e.target.value })} />
            </div>
          </>
        )}

        {modal.kind === 'voice' && (
          <>
            <div className="fld row">
              <label>服务名称<span className="req">*</span></label>
              <input value={v.name || ''} placeholder="例如：豆包语音" onChange={(e) => setV({ ...v, name: e.target.value })} />
            </div>
            <div className="fld row">
              <label>供应商<span className="req">*</span></label>
              <select value={v.provider || 'edge'} onChange={(e) => setV({ ...v, provider: e.target.value })}>
                {Object.entries(TTS_ENGINES)
                  .filter(([k]) => k !== 'builtin')
                  .map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
            <div className="fld row">
              <label>音色</label>
              <input value={v.voiceId || ''} placeholder="选择或输入音色 ID" onChange={(e) => setV({ ...v, voiceId: e.target.value })} />
              <span className="hint">留空使用该引擎的默认音色</span>
            </div>
            {v.provider === 'edge' && (
              <div className="fld row">
                <label>访问令牌</label>
                <input value={v.edgeToken || ''} placeholder="留空由 Edge 自动获取" onChange={(e) => setV({ ...v, edgeToken: e.target.value })} />
              </div>
            )}
            {v.provider === 'volcano' && (
              <>
                <div className="fld row">
                  <label>App ID<span className="req">*</span></label>
                  <input value={v.volcanoAppId || ''} placeholder="火山引擎语音合成 App ID" onChange={(e) => setV({ ...v, volcanoAppId: e.target.value })} />
                </div>
                <div className="fld row">
                  <label>访问令牌<span className="req">*</span></label>
                  <input value={v.volcanoToken || ''} placeholder="火山引擎 Access Token" onChange={(e) => setV({ ...v, volcanoToken: e.target.value })} />
                </div>
              </>
            )}
            {v.provider === 'openai' && (
              <>
                <div className="fld row">
                  <label>API Key<span className="req">*</span></label>
                  <input value={v.openaiKey || ''} placeholder="OpenAI API Key" onChange={(e) => setV({ ...v, openaiKey: e.target.value })} />
                </div>
                <div className="fld row">
                  <label>模型</label>
                  <input value={v.openaiModel || ''} placeholder="tts-1" onChange={(e) => setV({ ...v, openaiModel: e.target.value })} />
                </div>
                <div className="fld row">
                  <label>接口地址</label>
                  <input value={v.openaiBaseUrl || ''} placeholder="https://api.openai.com/v1" onChange={(e) => setV({ ...v, openaiBaseUrl: e.target.value })} />
                </div>
              </>
            )}
            {v.provider === 'custom' && (
              <div className="fld">
                <label>TTS 配置（JSON）</label>
                <textarea rows={4} value={v.customJson || ''} placeholder='{"edge":{"trustedToken":"…"}}' onChange={(e) => setV({ ...v, customJson: e.target.value })} />
                <span className="hint">高级用法：直接填写 mi-gpt TTSConfig JSON</span>
              </div>
            )}
          </>
        )}

        {modal.kind === 'role' && (
          <>
            <div className="fld row">
              <label>角色名称<span className="req">*</span></label>
              <input value={v.name || ''} placeholder="例如：深夜电台 DJ" onChange={(e) => setV({ ...v, name: e.target.value })} />
            </div>
            <div className="fld">
              <label>人设描述</label>
              <textarea
                style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-m)', padding: '8px 12px', font: 'inherit', minHeight: 76 }}
                value={v.profile || ''}
                placeholder="你是谁、怎么说话、回答风格"
                onChange={(e) => setV({ ...v, profile: e.target.value })}
              />
            </div>
          </>
        )}

        {modal.kind === 'pwd' && (
          <>
            <div className="fld row">
              <label>当前密码<span className="req">*</span></label>
              <input type="password" value={v.old || ''} onChange={(e) => setV({ ...v, old: e.target.value })} />
            </div>
            <div className="fld row">
              <label>新密码<span className="req">*</span></label>
              <input type="password" value={v.pwd || ''} onChange={(e) => setV({ ...v, pwd: e.target.value })} />
            </div>
            <div className="fld row">
              <label>确认新密码<span className="req">*</span></label>
              <input type="password" value={v.pwd2 || ''} onChange={(e) => setV({ ...v, pwd2: e.target.value, err: '' })} />
            </div>
            {v.err && (
              <div className="notice err">
                <I n="warning" size={15} /> {v.err}
              </div>
            )}
          </>
        )}

        {modal.kind === 'deviceBind' && (
          <>
            {modal.title === '变更生效说明' ? (
              <div className="notice">
                <I n="warning" size={15} /> 换绑账号、修改唤醒词或 did 必须重启设备；角色内容、思考服务（模型 / 温度）热生效；语音服务支持热切。
              </div>
            ) : (
              <>
                <div className="fld row">
                  <label>所属账号</label>
                  <select value={v.accountId || ''} onChange={(e) => setV({ ...v, accountId: e.target.value })}>
                    <option value="">（保持当前）</option>
                    {props.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} {a.miUserId}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld row">
                  <label>对话角色</label>
                  <select value={v.roleId || ''} onChange={(e) => setV({ ...v, roleId: e.target.value })}>
                    <option value="">（保持当前）</option>
                    {props.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld row">
                  <label>思考服务</label>
                  <select value={v.thinkServiceId || ''} onChange={(e) => setV({ ...v, thinkServiceId: e.target.value })}>
                    <option value="">（继承角色 / 全局默认）</option>
                    {props.thinkSvcs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.isDefault ? ' · 默认' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld row">
                  <label>语音服务（设备覆盖）</label>
                  <select value={v.voiceOverrideId || ''} onChange={(e) => setV({ ...v, voiceOverrideId: e.target.value })}>
                    <option value="">（继承角色 / 全局默认）</option>
                    {props.voiceSvcs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.isDefault ? ' · 默认' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld row">
                  <label>设备型号</label>
                  <select value={v.speakerModel || ''} onChange={(e) => setV({ ...v, speakerModel: e.target.value })}>
                    <option value="">（保持当前）</option>
                    {props.models.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.builtin ? '' : ' · 自定义'}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const mm = v.speakerModel ? props.models.find((x) => x.id === v.speakerModel) : null
                    if (!mm) return <span className="hint">切换型号后，播放指令 / 唤醒指令等硬件参数随型号生效</span>
                    if (!mm.consecutive) {
                      return <span className="hint warn">型号不支持连续对话（streamResponse 已禁用）</span>
                    }
                    return mm.playingCommand?.length ? (
                      <span className="hint">支持连续对话 · 支持播放状态检测</span>
                    ) : (
                      <span className="hint">支持连续对话 · 未配置播放检测指令，将依赖 Mina 检测播放状态；若异常可在「设备型号」中补充该指令</span>
                    )
                  })()}
                </div>
                <div className="fld row">
                  <label>连续对话超时（秒）</label>
                  <input value={v.exitKeepAliveAfter || '30'} placeholder="默认 30" onChange={(e) => setV({ ...v, exitKeepAliveAfter: e.target.value })} />
                  <span className="hint">连续对话中无响应多久自动退出唤醒模式，默认 30 秒</span>
                </div>
                <div className="fld row">
                  <label>会话群</label>
                  <select value={v.roomRef || ''} onChange={(e) => setV({ ...v, roomRef: e.target.value })}>
                    <option value="">（保持当前）</option>
                    {props.rooms.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name}
                      </option>
                    ))}
                  </select>
                  <span className="hint">对话记忆的上下文归属（对应旧版「会话群 chatGroup」），多台设备可共用；可在「会话群」菜单新建</span>
                </div>
                <div className="notice">
                  <I n="warning" size={15} /> 修改后需重启设备生效。
                </div>
              </>
            )}
          </>
        )}

        <div className="acts">
          <button className="btn" onClick={() => close()}>
            取消
          </button>
          <button className="btn primary" onClick={submit}>
            {modal.kind === 'deviceBind' && modal.title === '变更生效说明' ? '知道了' : '确定'}
          </button>
        </div>
      </div>
    </>
  )
}

/* ══ 三步向导 ══ */
function Wizard(props: {
  step: number
  accounts: Account[]
  roles: Role[]
  models: SpeakerModel[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  devices: { id: string; alias: string; did: string; accountId?: string }[]
  draft: { step: number; accountId: string; alias: string; did: string; model: string; roleId: string }
  setDraft: (p: Partial<{ step: number; accountId: string; alias: string; did: string; model: string; roleId: string }>) => void
  onClose: () => void
  onFinish: () => void
  onNewAccount: (d: { name: string; miUserId: string; passToken: string }) => Promise<Account>
  onUpdateAccount: (id: string, d: Partial<Account>) => Promise<Account>
  onNewRole: (d: { name: string; profile?: string }) => Promise<Role>
  onUpdateRole: (id: string, d: Partial<Role>) => Promise<Role>
}) {
  const { draft } = props
  const [closing, setClosing] = useState(false)
  const close = (after?: () => void) => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      if (after) after()
      props.onClose()
    }, 200)
  }
  const [pulling, setPulling] = useState(false)
  const [pullErr, setPullErr] = useState('')
  const [pulled, setPulled] = useState<PulledDevice[] | null>(null)
  const [newAcct, setNewAcct] = useState(false)
  const [acctEdit, setAcctEdit] = useState(false)
  const [naDraft, setNaDraft] = useState({ name: '', miUserId: '', passToken: '' })
  const [naBusy, setNaBusy] = useState(false)
  const [naErr, setNaErr] = useState('')
  const [newRole, setNewRole] = useState(false)
  const [roleEdit, setRoleEdit] = useState(false)
  const [nrDraft, setNrDraft] = useState<{ name: string; profile: string; thinkServiceId?: string; voiceId?: string }>({ name: '', profile: '' })
  const [nrBusy, setNrBusy] = useState(false)
  const [nrErr, setNrErr] = useState('')
  const step = draft.step
  const selAcct = props.accounts.find((a) => a.id === draft.accountId)
  const selRole = props.roles.find((r) => r.id === draft.roleId)
  const load = useCallback((accountId: string) => {
    if (!accountId) return
    setPulling(true)
    setPullErr('')
    setPulled(null)
    api
      .pullDevices(accountId)
      .then((r) => {
        const list = r.devices || []
        setPulled(list)
        if (!list.length) setPullErr('该账号下未发现音箱设备，请确认小米 ID 与 passToken 正确')
      })
      .catch((e) => setPullErr((e as Error).message || '拉取设备失败'))
      .finally(() => setPulling(false))
  }, [])
  useEffect(() => {
    if (step === 1 && draft.accountId) load(draft.accountId)
  }, [step, draft.accountId, load])
  // 列表有实体时默认选中第一个；无实体时右侧展示新建表单
  useEffect(() => {
    if (step === 0 && !draft.accountId && props.accounts.length) props.setDraft({ accountId: props.accounts[0].id })
  }, [step, draft.accountId, props.accounts, props.setDraft])
  useEffect(() => {
    if (step === 2 && !draft.roleId && props.roles.length) props.setDraft({ roleId: props.roles[0].id })
  }, [step, draft.roleId, props.roles, props.setDraft])
  // 设备拉取完成且有设备时，默认选中第一台
  useEffect(() => {
    if (step === 1 && pulled && pulled.length > 0 && !draft.did) {
      const d = pulled[0]
      const m = modelOf(d.hardware)
      props.setDraft({ alias: d.name || d.alias, did: d.miotDID, model: m ? m.id : draft.model })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pulled, draft.did])
  const saveAcct = async () => {
    if (naBusy) return
    setNaBusy(true)
    setNaErr('')
    try {
      if (acctEdit && selAcct) {
        await props.onUpdateAccount(selAcct.id, { name: naDraft.name, miUserId: naDraft.miUserId, ...(naDraft.passToken ? { passToken: naDraft.passToken } : {}) })
        setAcctEdit(false)
      } else {
        const created = await props.onNewAccount(naDraft)
        props.setDraft({ accountId: created.id })
        setNewAcct(false)
      }
      setNaDraft({ name: '', miUserId: '', passToken: '' })
    } catch (e) {
      setNaErr((e as Error).message || '保存账号失败')
    } finally {
      setNaBusy(false)
    }
  }
  const saveRole = async () => {
    if (nrBusy) return
    setNrBusy(true)
    setNrErr('')
    try {
      const body: Record<string, unknown> = { name: nrDraft.name, profile: nrDraft.profile }
      if (nrDraft.thinkServiceId) body.thinkServiceId = nrDraft.thinkServiceId
      if (nrDraft.voiceId) body.voiceId = nrDraft.voiceId
      if (roleEdit && selRole) {
        await props.onUpdateRole(selRole.id, body)
        setRoleEdit(false)
      } else {
        const created = await props.onNewRole(body)
        props.setDraft({ roleId: created.id })
        setNewRole(false)
      }
      setNrDraft({ name: '', profile: '' })
    } catch (e) {
      setNrErr((e as Error).message || '保存角色失败')
    } finally {
      setNrBusy(false)
    }
  }
  const beginAcctEdit = () => {
    if (!selAcct) return
    setNewAcct(false)
    setAcctEdit(true)
    setNaDraft({ name: selAcct.name, miUserId: selAcct.miUserId, passToken: '' })
  }
  const beginRoleEdit = () => {
    if (!selRole) return
    setNewRole(false)
    setRoleEdit(true)
    setNrDraft({ name: selRole.name, profile: selRole.profile || '', thinkServiceId: selRole.thinkServiceId, voiceId: selRole.voiceId })
  }
  const canNext =
    (step === 0 && !!draft.accountId) ||
    (step === 1 && !!draft.did && !pullErr) ||
    step === 2
  const finish = () => {
    if (closing) return
    if (step === 2) close(props.onFinish)
    else if (canNext) props.setDraft({ step: step + 1 })
  }
  const modelOf = (hardware: string) =>
    props.models.find((x) => {
      const a = (x.did || '').toLowerCase()
      const b = (hardware || '').toLowerCase()
      return a === b || a.startsWith(b) || b.startsWith(a)
    })
  const WSTEP = [
    { n: '1', t: '连接账号', s: '读取设备' },
    { n: '2', t: '选择设备', s: '确认型号' },
    { n: '3', t: '对话服务', s: '保存并启动' },
  ]
  return (
    <div className={'wizard on' + (closing ? ' closing' : '')}>
      <div className="wiz">
        <div className="wh">
          <div className="wtitle">
            <b>设备连接向导</b>
          </div>
          <div className="wsteps">
            {WSTEP.map((it, i) => (
              <div key={i} className={'wstep' + (step === i ? ' on' : i < step ? ' done' : '')}>
                <span className="wno">{i < step ? <I n="check" size={13} /> : it.n}</span>
                <span className="wt">
                  <b>{it.t}（{it.s}）</b>
                </span>
              </div>
            ))}
          </div>
          <button className="icon-btn" onClick={() => close()}>
            <I n="x" />
          </button>
        </div>
        <div className="wb">
          <div className={'step' + (step === 0 ? ' on' : '')}>
            <div className="split wsplit">
              <aside className="slist">
                {props.accounts.length === 0 && (
                  <div className="empty" style={{ padding: '16px' }}>
                    <b>还没有云端账号</b>
                    <span>请新建一个账号，或在「账号设备」页先接入。</span>
                  </div>
                )}
                {props.accounts.map((a) => (
                  <div key={a.id} className={'li' + (draft.accountId === a.id ? ' on' : '')} onClick={() => { props.setDraft({ accountId: a.id }); setNewAcct(false); setAcctEdit(false); setNaDraft({ name: '', miUserId: '', passToken: '' }) }}>
                    <span className="ic">
                      <I n="user" />
                    </span>
                    <span className="txt">
                      <b>{a.name}</b>
                      <span>小米 ID {a.miUserId}</span>
                    </span>
                  </div>
                ))}
                <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => { setNewAcct(true); setAcctEdit(false); setNaDraft({ name: '', miUserId: '', passToken: '' }) }}>
                  <I n="plus" /> 新建
                </button>
              </aside>
              <section className="sdetail">
                {selAcct && !newAcct && !acctEdit ? (
                  <div className="form-card">
                    <h3>
                      <I n="user" size={17} /> 账号详情
                    </h3>
                    <div className="desc">账号信息与凭据状态；凭据仅保存于本机服务端。</div>
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
                        <span className="v">{selAcct.passToken ? '已保存' : '未配置'}</span>
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
                      <I n="user" size={17} /> {acctEdit && selAcct ? '编辑账号' : '新建云端账号'}
                    </h3>
                    <div className="desc">{acctEdit && selAcct ? '更新名称或凭据；换绑账号后需重启受影响设备。' : '填入小米 ID 与 passToken。凭据仅保存于本机服务端。'}</div>
                    <div className="fld">
                      <label>账号名称<span className="req">*</span></label>
                      <input value={naDraft.name} placeholder="例如：默认账号" onChange={(e) => setNaDraft({ ...naDraft, name: e.target.value })} />
                    </div>
                    <div className="fld">
                      <label>小米 ID<span className="req">*</span><span className="tip" data-tip="登录官方 小米账号 › 个人信息 后获取 小米ID，不是手机号或邮箱。">?</span></label>
                      <input value={naDraft.miUserId} placeholder="登录官方 小米账号 › 个人信息 获取，不是手机号或邮箱" onChange={(e) => setNaDraft({ ...naDraft, miUserId: e.target.value })} />
                    </div>
                    <div className="fld">
                      <label>云端会话凭证 passToken<span className="tip" data-tip={acctEdit && selAcct ? '留空则保留原凭据' : '请勿把凭证发送给其他人；异地登录安全验证时，会给出授权链接。'}>?</span></label>
                      <textarea rows={3} value={naDraft.passToken} placeholder={acctEdit && selAcct && selAcct.passToken ? '已保存 · 留空保持不变' : '从米家 / 小爱获取的 token'} onChange={(e) => setNaDraft({ ...naDraft, passToken: e.target.value })} />
                    </div>
                    {naErr && (
                      <div className="notice err">
                        <I n="warning" size={15} /> {naErr}
                      </div>
                    )}
                    <div className="acts">
                      <span className="sp" />
                      <button className="btn ghost" onClick={() => (acctEdit && selAcct ? (setAcctEdit(false), setNaDraft({ name: '', miUserId: '', passToken: '' })) : setNewAcct(false))}>
                        取消
                      </button>
                      <button className="btn primary" disabled={naBusy || !naDraft.name || !naDraft.miUserId} onClick={saveAcct}>
                        {naBusy ? '保存中…' : '保存'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
          <div className={'step' + (step === 1 ? ' on' : '')}>
            <div className="split wsplit">
              <aside className="slist">
                {!selAcct ? (
                  <div className="empty" style={{ padding: '16px' }}>
                    <b>请先选择云端账号</b>
                    <span>回到上一步选择或新建账号。</span>
                  </div>
                ) : (
                  <>
                    <div className="filters" style={{ margin: '0 0 8px' }}>
                      <span className="chip on">{selAcct.name}</span>
                    </div>
                    {pulling && <div className="hint">正在从小米云端拉取设备…</div>}
                    {pullErr && (
                      <div className="empty" style={{ padding: '16px' }}>
                        <b>未获取到设备信息</b>
                      </div>
                    )}
                    {pulled && pulled.length > 0 ? (
                      pulled.map((d) => {
                        const m = modelOf(d.hardware)
                        const bound = !!props.devices.find((x) => x.accountId === selAcct.id && x.did === d.miotDID)
                        return (
                          <div
                            key={d.miotDID}
                            className={'li' + (draft.did === d.miotDID ? ' on' : '') + (bound ? ' off' : '')}
                            onClick={() => {
                              if (bound) return
                              props.setDraft({ alias: d.name || d.alias, did: d.miotDID, model: m ? m.id : draft.model })
                            }}
                          >
                            <span className="ic">
                              {m?.imageUrl ? <img className="thumb" src={m.imageUrl} alt="" /> : <I n="speaker" />}
                            </span>
                            <span className="txt">
                              <b>{d.name || d.alias}</b>
                              <span>{m ? m.name : d.hardware || '未知型号'}</span>
                            </span>
                            {bound ? <span className="tag neu">已接入</span> : <span className={'tag' + (d.presence === 'online' ? ' accent' : ' neu')}>{d.presence === 'online' ? '在线' : '离线'}</span>}
                          </div>
                        )
                      })
                    ) : (
                      pulled !== null && !pulling && (
                        <div className="empty" style={{ padding: '16px' }}>
                          <b>未发现音箱设备</b>
                          <span>请确认小米 ID 与 passToken 正确。</span>
                        </div>
                      )
                    )}
                  </>
                )}
              </aside>
              <section className="sdetail">
                {pullErr ? (
                  <div className="form-card err-card">
                    <h3>
                      <I n="warning" size={17} /> 设备拉取失败
                    </h3>
                    <div className="notice err">{pullErr}</div>
                    <div className="desc">返回上一步检查小米 ID 与 passToken，或到「账号设备」页更新凭据后重试。</div>
                  </div>
                ) : draft.did ? (
                  <div className="form-card">
                    <h3>
                      <I n="speaker" size={17} /> 设备详情
                    </h3>
                    <div className="desc">设备 ID 与型号由云端自动识别。</div>
                    <div className="ro">
                      {(() => {
                        const hw = (pulled || []).find((x) => x.miotDID === draft.did)?.hardware
                        const m = modelOf(hw)
                        return m?.imageUrl ? (
                          <div className="model-pic">
                            <img className="fade" src={m.imageUrl} alt={m.name} onLoad={(e) => e.currentTarget.classList.add('loaded')} onError={(e) => e.currentTarget.classList.add('loaded')} />
                            <span className="pic-tag">{m.builtin ? '内置型号' : '自定义型号'}</span>
                          </div>
                        ) : null
                      })()}
                      <div className="rr2">
                        <div className="rr">
                          <span className="k">设备名称</span>
                          <span className="v">{draft.alias || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">设备 ID</span>
                          <span className="v">{draft.did || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">设备型号</span>
                          <span className="v">{modelOf((pulled || []).find((x) => x.miotDID === draft.did)?.hardware || '')?.name || '待型号映射核对'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">设备状态</span>
                          <span className="v">{(pulled || []).find((x) => x.miotDID === draft.did)?.presence === 'online' ? '在线' : '离线'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty">
                    <div className="art">
                      <I n="speaker" size={26} />
                    </div>
                    <b>选择要接入的设备</b>
                    <span>从左侧列表选择一台音箱；设备 ID 与型号自动识别。</span>
                  </div>
                )}
              </section>
            </div>
          </div>
          <div className={'step' + (step === 2 ? ' on' : '')}>
            <div className="split wsplit">
              <aside className="slist">
                {props.roles.length === 0 && (
                  <div className="empty" style={{ padding: '16px' }}>
                    <b>还没有对话角色</b>
                    <span>请新建一个角色，或到「对话角色」页先创建。</span>
                  </div>
                )}
                {props.roles.map((r) => (
                  <div key={r.id} className={'li' + (draft.roleId === r.id ? ' on' : '')} onClick={() => { props.setDraft({ roleId: r.id }); setNewRole(false); setRoleEdit(false); setNrDraft({ name: '', profile: '' }) }}>
                    <img className="pavatar" src={avatarOf(r.name)} alt={r.name} />
                    <span className="txt">
                      <b>{r.name}</b>
                      <span>{r.profile?.slice(0, 24) || '未填写人设'}</span>
                    </span>
                  </div>
                ))}
                <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => { setNewRole(true); setRoleEdit(false); setNrDraft({ name: '', profile: '' }) }}>
                  <I n="plus" /> 新建
                </button>
              </aside>
              <section className="sdetail">
                {selRole && !newRole && !roleEdit ? (
                  <div className="form-card">
                    <h3>
                      <I n="user" size={17} /> 角色详情
                    </h3>
                    <div className="desc">思考服务与语音服务由角色统一提供；人设与模型热生效。</div>
                    <div className="ro">
                      <div className="rr">
                        <span className="k">角色名称</span>
                        <span className="v">{selRole.name || '—'}</span>
                      </div>
                      <div className="rr">
                        <span className="k">人设描述</span>
                        <span className="v" style={{ whiteSpace: 'pre-wrap' }}>{selRole.profile || '—'}</span>
                      </div>
                      <div className="rr">
                        <span className="k">思考服务</span>
                        <span className="v">{props.thinkSvcs.find((s) => s.id === selRole.thinkServiceId)?.name || '跟随全局默认'}</span>
                      </div>
                      <div className="rr">
                        <span className="k">语音服务</span>
                        <span className="v">{props.voiceSvcs.find((s) => s.id === selRole.voiceId)?.name || '跟随全局默认'}</span>
                      </div>
                    </div>
                    <div className="acts">
                      <span className="sp" />
                      <button className="btn primary" onClick={beginRoleEdit}>
                        <I n="pencil" /> 编辑
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="form-card">
                    <h3>
                      <I n="user" size={17} /> {roleEdit && selRole ? '编辑角色' : '新建对话角色'}
                    </h3>
                    <div className="desc">{roleEdit && selRole ? '更新角色信息；服务留空则跟随全局默认。' : '角色名称必填；思考服务与语音服务可选，留空则跟随全局默认。'}</div>
                    <div className="fld">
                      <label>角色名称<span className="req">*</span></label>
                      <input value={nrDraft.name} placeholder="例如：小爱同学" onChange={(e) => setNrDraft({ ...nrDraft, name: e.target.value })} />
                    </div>
                    <div className="fld">
                      <label>人设描述</label>
                      <textarea rows={4} value={nrDraft.profile} placeholder="例如：你叫小爱，是这家人的智能助手…" onChange={(e) => setNrDraft({ ...nrDraft, profile: e.target.value })} />
                    </div>
                    <div className="fld">
                      <label>思考服务</label>
                      <select value={nrDraft.thinkServiceId || ''} onChange={(e) => setNrDraft({ ...nrDraft, thinkServiceId: e.target.value || undefined })}>
                        <option value="">跟随全局默认</option>
                        {props.thinkSvcs.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="fld">
                      <label>语音服务</label>
                      <select value={nrDraft.voiceId || ''} onChange={(e) => setNrDraft({ ...nrDraft, voiceId: e.target.value || undefined })}>
                        <option value="">跟随全局默认</option>
                        {props.voiceSvcs.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    {nrErr && (
                      <div className="notice err">
                        <I n="warning" size={15} /> {nrErr}
                      </div>
                    )}
                    <div className="acts">
                      <span className="sp" />
                      <button className="btn ghost" onClick={() => (roleEdit && selRole ? (setRoleEdit(false), setNrDraft({ name: '', profile: '' })) : setNewRole(false))}>
                        取消
                      </button>
                      <button className="btn primary" disabled={nrBusy || !nrDraft.name} onClick={saveRole}>
                        {nrBusy ? '保存中…' : '保存'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
        <div className="wf">
          <button className="btn ghost" disabled={step === 0} onClick={() => props.setDraft({ step: step - 1 })}>
            <I n="arrowL" /> 上一步
          </button>
          <div className="r">
            <button className="btn" onClick={() => close()}>
              取消
            </button>
            <button className="btn primary" disabled={!canNext && step < 2} onClick={finish}>
              {step === 2 ? '完成' : '下一步'} <I n="arrowR" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
