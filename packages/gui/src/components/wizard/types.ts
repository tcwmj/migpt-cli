export type WizardDraft = {
  step: number
  accountId: string
  alias: string
  did: string
  model: string
  robotId: string
  modelIds: string[]
  voiceId: string
}

export type WizardSetDraft = (p: Partial<WizardDraft>) => void
