/* ══ 数据与认证：会话探测、实体加载、设备轮询与派生统计 ══ */
import { useCallback, useEffect, useState } from 'react'
import * as api from '../apis.ts'
import type {
  Account,
  DeviceRow,
  Role,
  Room,
  SpeakerModel,
  ThinkService,
  VoiceService,
} from '../apis.ts'

export function useAppData(showToast: (msg: string) => void) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [loginErr, setLoginErr] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [thinkSvcs, setThinkSvcs] = useState<ThinkService[]>([])
  const [voiceSvcs, setVoiceSvcs] = useState<VoiceService[]>([])
  const [models, setModels] = useState<SpeakerModel[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [logCount, setLogCount] = useState(0)
  const [loading, setLoading] = useState(true)

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

  /** 登录；返回是否成功（成功后由调用方决定跳转） */
  const login = useCallback(async (u: string, p: string) => {
    setLoginErr('')
    try {
      await api.login(u, p)
      setAuthed(true)
      return true
    } catch (e) {
      const msg = (e as Error).message
      setAuthed(false)
      setLoginErr(
        msg === 'unauthorized'
          ? '用户名或密码错误（初始账号 admin，密码 123456）'
          : msg || '无法连接服务',
      )
      return false
    }
  }, [])

  const logout = useCallback(() => {
    api.logout().catch(() => undefined)
    setAuthed(false)
    setAccounts([])
    setDevices([])
    setRoles([])
    setThinkSvcs([])
    setVoiceSvcs([])
    setModels([])
    setRooms([])
  }, [])

  /* 派生统计 */
  const runningCount = devices.filter((d) => d.running).length
  const builtinModelCount = models.filter((m) => m.builtin).length
  const customModelCount = models.length - builtinModelCount

  return {
    authed,
    loginErr,
    login,
    logout,
    accounts,
    devices,
    roles,
    thinkSvcs,
    voiceSvcs,
    models,
    rooms,
    logCount,
    loading,
    refreshAll,
    runningCount,
    builtinModelCount,
    customModelCount,
  }
}
