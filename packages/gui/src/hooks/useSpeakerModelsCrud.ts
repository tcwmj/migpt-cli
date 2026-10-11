/* ══ 音箱型号：选中/草稿/保存/删除/重置 + 过滤与排序 ══ */
import { useEffect, useMemo, useState } from 'react'
import * as api from '../apis.ts'
import type { DeviceRow, SpeakerModel } from '../apis.ts'
import type { ConfirmState } from '../ui-types.ts'
import type { ModelDraft } from '../views/drafts.ts'
import { errText } from '../components/app/errText.ts'

export type ModelFilter = 'all' | 'consec' | 'plain'

/** 内置型号按名称升序在前，自定义型号按创建时间追加尾部 */
function sortModels(list: SpeakerModel[]): SpeakerModel[] {
  const builtin = list
    .filter((m) => m.builtin)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
  const custom = list
    .filter((m) => !m.builtin)
    .sort((a, b) => a.createdAt - b.createdAt)
  return [...builtin, ...custom]
}

export function useModelsCrud(opts: {
  models: SpeakerModel[]
  devices: DeviceRow[]
  query: string
  showToast: (msg: string) => void
  refreshAll: () => void
  setConfirm: (c: ConfirmState) => void
}) {
  const { models, devices, query, showToast, refreshAll, setConfirm } = opts
  const [selModel, setSelModel] = useState<string | null>(null)
  const [modelEdit, setModelEdit] = useState(false)
  const [modelFilter, setModelFilter] = useState<ModelFilter>('all')
  const [modelDraft, setModelDraft] = useState<ModelDraft | null>(null)

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

  const filterModels = useMemo(() => {
    const q = query.toLowerCase()
    const list = models.filter((m) => {
      if (q && !(m.name + m.did).toLowerCase().includes(q)) return false
      if (modelFilter === 'consec' && !m.consecutive) return false
      if (modelFilter === 'plain' && m.consecutive) return false
      return true
    })
    return sortModels(list)
  }, [models, query, modelFilter])

  /* 统一「左列表 + 右详情/新建」：进入页面后默认选中列表第一个 */
  useEffect(() => {
    if (!selModel && filterModels.length) {
      setSelModel(filterModels[0].id)
      setModelEdit(false)
    }
  }, [models, query, modelFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  /* 切换顶部分组后默认选中对应分组列表第一个（与其他菜单页面规则一致） */
  const switchModelFilter = (f: ModelFilter) => {
    setModelFilter(f)
    const q = query.toLowerCase()
    const list = models.filter((m) => {
      if (q && !(m.name + m.did).toLowerCase().includes(q)) return false
      if (f === 'consec' && !m.consecutive) return false
      if (f === 'plain' && m.consecutive) return false
      return true
    })
    const first = sortModels(list)[0]
    if (first) {
      setSelModel(first.id)
      setModelEdit(false)
      setModelDraft(null)
    }
  }

  return {
    selModel,
    modelDraft,
    modelEdit,
    modelFilter,
    filterModels,
    setModelDraft,
    setModelEdit,
    selectModel,
    saveModel,
    delModel,
    resetModel,
    switchModelFilter,
  }
}
