export type WizardDraft = {
  step: number
  accountId: string
  alias: string
  did: string
  model: string
  roleId: string
  thinkServiceIds: string[]
  voiceId: string
}

export type WizardSetDraft = (p: Partial<WizardDraft>) => void
