/* ══ 思考服务与语音服务：选中/草稿/保存/删除/重置 ══ */
import { useCallback, useEffect, useState } from 'react'
import * as api from '../apis.ts'
import type { DeviceRow, Role, ThinkService, VoiceService } from '../apis.ts'
import { PROVIDER_PRESETS } from '../constants.ts'
import type { ThinkDraft, VoiceDraft } from '../views/drafts.ts'
import type { ConfirmState } from '../ui-types.ts'
import { errText } from '../components/app/errText.ts'

export function useServicesCrud(opts: {
  devices: DeviceRow[]
  roles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  showToast: (msg: string) => void
  refreshAll: () => void
  setConfirm: (c: ConfirmState) => void
}) {
  const {
    devices,
    roles,
    thinkSvcs,
    voiceSvcs,
    showToast,
    refreshAll,
    setConfirm,
  } = opts
  const [selThink, setSelThink] = useState<string | null>(null)
  const [thinkDraft, setThinkDraft] = useState<ThinkDraft | null>(null)
  const [thinkEdit, setThinkEdit] = useState(false)
  const [selVoice, setSelVoice] = useState<string | null>(null)
  const [voiceDraft, setVoiceDraft] = useState<VoiceDraft | null>(null)
  const [voiceEdit, setVoiceEdit] = useState(false)

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

  const selVoiceObj = selVoice
    ? (voiceSvcs.find((s) => s.id === selVoice) ?? null)
    : null

  /* 服务被引用数（设备直接引用 + 通过角色间接引用） */
  const usageThink = useCallback(
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
  const usageVoice = useCallback(
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

  /* 统一「左列表 + 右详情/新建」：进入页面后默认选中第一个 */
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

  return {
    selThink,
    thinkDraft,
    thinkEdit,
    selVoice,
    voiceDraft,
    voiceEdit,
    selVoiceObj,
    setThinkDraft,
    setThinkEdit,
    setVoiceDraft,
    setVoiceEdit,
    selectThink,
    saveThink,
    delThink,
    selectVoice,
    saveVoice,
    delVoice,
    resetVoice,
    usageThink,
    usageVoice,
  }
}
