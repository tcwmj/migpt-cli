export type WizardDraft = {
  step: number
  accountId: string
  alias: string
  did: string
  model: string
  roleId: string
}

export type WizardSetDraft = (p: Partial<WizardDraft>) => void
