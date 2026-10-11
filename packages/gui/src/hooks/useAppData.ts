/* ══ 数据与认证：React Query 驱动的会话探测、实体加载与设备轮询 ══ */
import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../apis.ts'
import type {
  Account,
  DeviceRow,
  Robot,
  Conversation,
  SpeakerModel,
  Model,
  Voice,
} from '../apis.ts'

/** React Query 统一 key 前缀，便于全局失效 */
export const queryKeys = {
  session: ['session'] as const,
  devices: ['devices'] as const,
  accounts: ['accounts'] as const,
  robots: ['robots'] as const,
  models: ['models'] as const,
  voices: ['voices'] as const,
  speakerModels: ['speaker-models'] as const,
  conversations: ['conversations'] as const,
  logs: ['logs'] as const,
}

export function useAppData(showToast: (msg: string) => void) {
  const qc = useQueryClient()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [loginErr, setLoginErr] = useState('')

  /* ── 会话探测 ── */
  const sessionQ = useQuery({
    queryKey: queryKeys.session,
    queryFn: api.checkSession,
    staleTime: Infinity,
    retry: false,
  })

  // 首次会话结果写入 authed；网络错误（后端未启动）也视为未登录，展示登录页
  useEffect(() => {
    if (authed === null && sessionQ.isSuccess) {
      setAuthed(sessionQ.data)
    }
    if (authed === null && sessionQ.isError) {
      setAuthed(false)
      const msg = (sessionQ.error as Error).message
      if (
        msg === 'Failed to fetch' ||
        msg.includes('NetworkError') ||
        msg.includes('fetch')
      ) {
        setLoginErr('无法连接到服务器，请确认后端服务已启动')
      }
    }
  }, [
    authed,
    sessionQ.isSuccess,
    sessionQ.isError,
    sessionQ.data,
    sessionQ.error,
  ])

  const enabled = !!authed

  /* ── 实体查询：authed 后才启用，共享 staleTime/retry ── */
  const devicesQ = useQuery({
    queryKey: queryKeys.devices,
    queryFn: api.listDevices,
    enabled,
    refetchInterval: 10_000,
  })
  const accountsQ = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: api.getAccounts,
    enabled,
  })
  const robotsQ = useQuery({
    queryKey: queryKeys.robots,
    queryFn: api.getRobots,
    enabled,
  })
  const modelQ = useQuery({
    queryKey: queryKeys.models,
    queryFn: api.getModels,
    enabled,
  })
  const voiceQ = useQuery({
    queryKey: queryKeys.voices,
    queryFn: api.getVoices,
    enabled,
  })
  const modelsQ = useQuery({
    queryKey: queryKeys.speakerModels,
    queryFn: api.getSpeakerModels,
    enabled,
  })
  const roomsQ = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: api.getConversations,
    enabled,
  })
  const logsQ = useQuery({
    queryKey: queryKeys.logs,
    queryFn: () => api.getLogs(500).then((x) => x.total),
    enabled,
  })

  /* ── 任一查询 401 → 登出 ── */
  const queries = [
    devicesQ,
    accountsQ,
    robotsQ,
    modelQ,
    voiceQ,
    modelsQ,
    roomsQ,
  ]
  const hasUnauthorized = queries.some(
    (q) => q.error && (q.error as Error).message === 'unauthorized',
  )
  useEffect(() => {
    if (hasUnauthorized) setAuthed(false)
  }, [hasUnauthorized])

  /* ── 刷新全部 ── */
  const refreshAll = useCallback(() => {
    return qc.invalidateQueries({
      predicate: (q) => q.queryKey[0] !== 'session',
    })
  }, [qc])

  /* ── 登录 ── */
  const login = useCallback(
    async (u: string, p: string) => {
      setLoginErr('')
      try {
        await api.login(u, p)
        setAuthed(true)
        qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'session' })
        return true
      } catch (e) {
        const msg = (e as Error).message
        setAuthed(false)
        if (msg === 'unauthorized') {
          setLoginErr('用户名或密码错误（初始账号 admin，密码 123456）')
        } else if (
          msg === 'Failed to fetch' ||
          msg.includes('NetworkError') ||
          msg.includes('fetch')
        ) {
          setLoginErr('无法连接到服务器，请确认后端服务已启动')
        } else {
          setLoginErr(msg || '登录失败，请稍后重试')
        }
        return false
      }
    },
    [qc],
  )

  /* ── 登出 ── */
  const logout = useCallback(() => {
    api.logout().catch(() => undefined)
    setAuthed(false)
    qc.clear()
  }, [qc])

  /* ── 派生数据 ── */
  const devices = devicesQ.data ?? []
  const speakerModels = modelsQ.data ?? []
  const runningCount = devices.filter((d) => d.running).length
  const builtinSpeakerModelCount = speakerModels.filter((m) => m.builtin).length
  const customSpeakerModelCount =
    speakerModels.length - builtinSpeakerModelCount
  const loading = queries.some((q) => q.isLoading)

  return {
    authed,
    loginErr,
    login,
    logout,
    accounts: accountsQ.data ?? ([] as Account[]),
    devices,
    robots: robotsQ.data ?? ([] as Robot[]),
    models: modelQ.data ?? ([] as Model[]),
    voices: voiceQ.data ?? ([] as Voice[]),
    speakerModels,
    conversations: roomsQ.data ?? ([] as Conversation[]),
    logCount: logsQ.data ?? 0,
    loading,
    refreshAll,
    runningCount,
    builtinSpeakerModelCount,
    customSpeakerModelCount,
  }
}
