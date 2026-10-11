export type WizardDraft = {
  step: number
  credentialId: string
  alias: string
  did: string
  model: string
  robotId: string
  modelIds: string[]
  voiceId: string
}

export type WizardSetDraft = (p: Partial<WizardDraft>) => void

/** 创建结果：供完成页展示，并作为跳转设备服务页的选中目标 */
export type WizardCreated = {
  id: string
  alias: string
  /** 保存后是否顺带启动成功（启动失败不回滚设备，交由设备服务页重试） */
  started: boolean
}
