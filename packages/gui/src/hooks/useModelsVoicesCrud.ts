/* ══ 模型与语音：选中/草稿/保存/删除/重置 ══ */
import { useCallback, useEffect, useState } from 'react'
import * as api from '../apis.ts'
import type { DeviceRow, Robot, Model, Voice } from '../apis.ts'
import {
  PROVIDER_PRESETS,
  buildVoiceTts,
  voiceFormFromTts,
} from '../constants.ts'
import type { ModelDraft, VoiceDraft } from '../views/drafts.ts'
import type { ConfirmState } from '../ui-types.ts'
import { errText } from '../components/app/errText.ts'

/** 草稿 Token 字段 → 提交值：清空 / 未填一律按 0 提交（用量清零、上限视为未设置） */
function tokenNum(s: string | undefined): number {
  if (s == null || s === '') return 0
  return parseInt(s, 10) || 0
}

export function useModelsVoicesCrud(opts: {
  devices: DeviceRow[]
  robots: Robot[]
  models: Model[]
  voices: Voice[]
  showToast: (msg: string) => void
  refreshAll: () => void
  setConfirm: (c: ConfirmState) => void
}) {
  const { devices, robots, models, voices, showToast, refreshAll, setConfirm } =
    opts
  const [selModel, setSelThink] = useState<string | null>(null)
  const [modelDraft, setModelDraft] = useState<ModelDraft | null>(null)
  const [modelEdit, setModelEdit] = useState(false)
  const [selVoice, setSelVoice] = useState<string | null>(null)
  const [voiceDraft, setVoiceDraft] = useState<VoiceDraft | null>(null)
  const [voiceEdit, setVoiceEdit] = useState(false)

  const selectModel = (id: string | null) => {
    setSelThink(id)
    const s = id ? models.find((x) => x.id === id) : null
    setModelDraft({
      name: s?.name || '',
      provider: s?.provider || 'custom',
      model: s?.model || PROVIDER_PRESETS[s?.provider || 'custom']?.model || '',
      apiKey: '',
      temperature: String(s?.temperature ?? 0.7),
      baseUrl: s?.baseUrl || PROVIDER_PRESETS[s?.provider || '']?.baseUrl || '',
      inputTokensUsed:
        s?.inputTokensUsed != null ? String(s.inputTokensUsed) : '',
      outputTokensUsed:
        s?.outputTokensUsed != null ? String(s.outputTokensUsed) : '',
      totalTokensUsed:
        s?.totalTokensUsed != null ? String(s.totalTokensUsed) : '',
      tokenLimit: s?.tokenLimit != null ? String(s.tokenLimit) : '',
    })
    setModelEdit(id === null)
  }

  const selectVoice = (id: string | null) => {
    setSelVoice(id)
    const s = id ? voices.find((x) => x.id === id) : null
    setVoiceDraft({
      ...voiceFormFromTts(s),
      name: s?.name || '',
      timbreId: s?.timbreId || '',
    })
    setVoiceEdit(id === null)
  }

  const saveModel = async () => {
    if (!modelDraft) return
    const baseUrl =
      modelDraft.baseUrl || PROVIDER_PRESETS[modelDraft.provider]?.baseUrl || ''
    // 模型配置全必填；编辑时 API Key 留空表示沿用已存密钥
    if (
      !modelDraft.name ||
      !modelDraft.provider ||
      !baseUrl ||
      !modelDraft.model ||
      !modelDraft.temperature ||
      (!selModel && !modelDraft.apiKey)
    ) {
      showToast(
        selModel
          ? '模型名称、接口地址、模型端点与温度必填'
          : '模型名称、接口地址、模型端点、API Key 与温度必填',
      )
      return
    }
    try {
      const out: Record<string, unknown> = {
        name: modelDraft.name,
        provider: modelDraft.provider,
        model: modelDraft.model,
        temperature: parseFloat(modelDraft.temperature) || 0.7,
      }
      out.baseUrl = baseUrl
      if (modelDraft.apiKey) out.apiKey = modelDraft.apiKey
      // Token 用量：清空即归零（上限 0 由详情页呈现为「未设置」）
      out.inputTokensUsed = tokenNum(modelDraft.inputTokensUsed)
      out.outputTokensUsed = tokenNum(modelDraft.outputTokensUsed)
      out.totalTokensUsed = tokenNum(modelDraft.totalTokensUsed)
      out.tokenLimit = tokenNum(modelDraft.tokenLimit)
      if (selModel) {
        await api.updateModel(selModel, out)
        showToast('模型已保存，绑定设备热生效')
        setModelEdit(false)
      } else {
        const created = await api.createModel(out)
        showToast('模型已创建')
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
    const devRefs = devices.filter((d) => (d.modelIds || []).includes(id))
    if (devRefs.length) {
      showToast(
        `该模型正被设备「${devRefs.map((d) => d.alias).join('、')}」引用，请先解除引用`,
      )
      return
    }
    const name = models.find((s) => s.id === id)?.name || '该模型'
    setConfirm({
      title: '删除模型',
      msg: `确定删除「${name}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteModel(id)
          showToast('服务已删除')
          setSelThink(null)
          setModelDraft(null)
          setModelEdit(false)
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
      if (voiceDraft.timbreId) out.timbreId = voiceDraft.timbreId
      const { tts, err } = buildVoiceTts(voiceDraft)
      if (err) {
        showToast(err)
        return
      }
      if (Object.keys(tts).length) out.tts = tts as never
      if (selVoice) {
        await api.updateVoice(selVoice, out)
        showToast('语音已保存，绑定设备支持热切')
        setVoiceEdit(false)
      } else {
        const created = await api.createVoice(out)
        showToast('语音已创建')
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
    if (voices.find((v) => v.id === id)?.builtin) {
      showToast('内置语音不可删除')
      return
    }
    const devRefs = devices.filter((d) => d.voiceId === id)
    if (devRefs.length) {
      showToast(
        `该语音正被设备「${devRefs.map((d) => d.alias).join('、')}」引用，请先解除引用`,
      )
      return
    }
    const name = voices.find((s) => s.id === id)?.name || '该语音'
    setConfirm({
      title: '删除语音',
      msg: `确定删除「${name}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteVoice(id)
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

  /** 重置内置语音为系统默认（仅 builtin 项显示入口；二次确认） */
  const resetVoice = (id: string) => {
    const target = voices.find((v) => v.id === id)
    if (!target?.builtin) return
    setConfirm({
      title: '重置语音默认值',
      msg: `确定将「${target.name}」恢复为系统内置默认配置吗？你的修改将被覆盖。`,
      danger: false,
      onOk: async () => {
        try {
          await api.resetVoice(id)
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
    ? (voices.find((s) => s.id === selVoice) ?? null)
    : null

  /* 模型/语音被引用数（设备直接引用） */
  const usageModel = useCallback(
    (id: string) =>
      devices.filter((d) => (d.modelIds || []).includes(id)).length,
    [devices],
  )
  const usageVoice = useCallback(
    (id: string) => devices.filter((d) => d.voiceId === id).length,
    [devices],
  )

  /* 统一「左列表 + 右详情/新建」：进入页面后默认选中第一个 */
  useEffect(() => {
    if (!selModel && models.length) {
      setSelThink(models[0].id)
      const s = models[0]
      setModelEdit(false)
      setModelDraft({
        name: s.name,
        provider: s.provider,
        model: s.model || PROVIDER_PRESETS[s.provider]?.model || '',
        apiKey: '',
        temperature: String(s.temperature ?? 0.7),
        baseUrl: s.baseUrl || PROVIDER_PRESETS[s.provider]?.baseUrl || '',
      })
    }
  }, [models]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selVoice && voices.length) {
      setSelVoice(voices[0].id)
      const s = voices[0]
      setVoiceEdit(false)
      setVoiceDraft({
        ...voiceFormFromTts(s),
        name: s.name,
        timbreId: s.timbreId || '',
      })
    }
  }, [voices]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    selModel,
    modelDraft,
    modelEdit,
    selVoice,
    voiceDraft,
    voiceEdit,
    selVoiceObj,
    setModelDraft,
    setModelEdit,
    setVoiceDraft,
    setVoiceEdit,
    selectModel,
    saveModel,
    delModel,
    selectVoice,
    saveVoice,
    delVoice,
    resetVoice,
    usageModel,
    usageVoice,
  }
}
