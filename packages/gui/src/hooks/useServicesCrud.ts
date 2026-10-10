/* ══ 思考服务与语音服务：选中/草稿/保存/删除/重置 ══ */
import { useCallback, useEffect, useState } from 'react'
import * as api from '../apis.ts'
import type { DeviceRow, Role, ThinkService, VoiceService } from '../apis.ts'
import {
  PROVIDER_PRESETS,
  buildVoiceTts,
  voiceFormFromTts,
} from '../constants.ts'
import type { ThinkDraft, VoiceDraft } from '../views/drafts.ts'
import type { ConfirmState } from '../ui-types.ts'
import { errText } from '../components/app/errText.ts'

/** 草稿 Token 字段 → 提交值：清空 / 未填一律按 0 提交（用量清零、上限视为未设置） */
function tokenNum(s: string | undefined): number {
  if (s == null || s === '') return 0
  return parseInt(s, 10) || 0
}

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
      provider: s?.provider || 'custom',
      model: s?.model || PROVIDER_PRESETS[s?.provider || 'custom']?.model || '',
      apiKey: '',
      temperature: String(s?.temperature ?? 0.7),
      baseUrl: s?.baseUrl || PROVIDER_PRESETS[s?.provider || '']?.baseUrl || '',
      tokenInputUsed: s?.tokenInputUsed != null ? String(s.tokenInputUsed) : '',
      tokenOutputUsed:
        s?.tokenOutputUsed != null ? String(s.tokenOutputUsed) : '',
      tokenUsed: s?.tokenUsed != null ? String(s.tokenUsed) : '',
      tokenLimit: s?.tokenLimit != null ? String(s.tokenLimit) : '',
    })
    setThinkEdit(id === null)
  }

  const selectVoice = (id: string | null) => {
    setSelVoice(id)
    const s = id ? voiceSvcs.find((x) => x.id === id) : null
    setVoiceDraft({
      ...voiceFormFromTts(s),
      name: s?.name || '',
      voiceId: s?.voiceId || '',
      ...(id
        ? {}
        : {
            tokenInputUsed: '',
            tokenOutputUsed: '',
            tokenUsed: '',
            tokenLimit: '',
          }),
    })
    setVoiceEdit(id === null)
  }

  const saveThink = async () => {
    if (!thinkDraft) return
    const baseUrl =
      thinkDraft.baseUrl || PROVIDER_PRESETS[thinkDraft.provider]?.baseUrl || ''
    // 模型配置全必填；编辑时 API Key 留空表示沿用已存密钥
    if (
      !thinkDraft.name ||
      !thinkDraft.provider ||
      !baseUrl ||
      !thinkDraft.model ||
      !thinkDraft.temperature ||
      (!selThink && !thinkDraft.apiKey)
    ) {
      showToast(
        selThink
          ? '服务名称、接口地址、模型端点与温度必填'
          : '服务名称、接口地址、模型端点、API Key 与温度必填',
      )
      return
    }
    try {
      const out: Record<string, unknown> = {
        name: thinkDraft.name,
        provider: thinkDraft.provider,
        model: thinkDraft.model,
        temperature: parseFloat(thinkDraft.temperature) || 0.7,
      }
      out.baseUrl = baseUrl
      if (thinkDraft.apiKey) out.apiKey = thinkDraft.apiKey
      // Token 用量：清空即归零（上限 0 由详情页呈现为「未设置」）
      out.tokenInputUsed = tokenNum(thinkDraft.tokenInputUsed)
      out.tokenOutputUsed = tokenNum(thinkDraft.tokenOutputUsed)
      out.tokenUsed = tokenNum(thinkDraft.tokenUsed)
      out.tokenLimit = tokenNum(thinkDraft.tokenLimit)
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
    const devRefs = devices.filter((d) =>
      (d.thinkServiceIds || []).includes(id),
    )
    if (devRefs.length) {
      showToast(
        `该思考服务正被设备「${devRefs.map((d) => d.alias).join('、')}」引用，请先解除引用`,
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
      const { tts, err } = buildVoiceTts(voiceDraft)
      if (err) {
        showToast(err)
        return
      }
      if (Object.keys(tts).length) out.tts = tts as never
      // Token 用量：清空即归零（上限 0 由详情页呈现为「未设置」）
      out.tokenInputUsed = tokenNum(voiceDraft.tokenInputUsed)
      out.tokenOutputUsed = tokenNum(voiceDraft.tokenOutputUsed)
      out.tokenUsed = tokenNum(voiceDraft.tokenUsed)
      out.tokenLimit = tokenNum(voiceDraft.tokenLimit)
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
    const devRefs = devices.filter((d) => d.voiceId === id)
    if (devRefs.length) {
      showToast(
        `该语音服务正被设备「${devRefs.map((d) => d.alias).join('、')}」引用，请先解除引用`,
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

  /* 服务被引用数（设备直接引用） */
  const usageThink = useCallback(
    (id: string) =>
      devices.filter((d) => (d.thinkServiceIds || []).includes(id)).length,
    [devices],
  )
  const usageVoice = useCallback(
    (id: string) => devices.filter((d) => d.voiceId === id).length,
    [devices],
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
        ...voiceFormFromTts(s),
        name: s.name,
        voiceId: s.voiceId || '',
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
