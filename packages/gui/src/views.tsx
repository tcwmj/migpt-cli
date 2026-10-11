/* ══ 页面组件桶文件：实际实现按页面拆分在 ./views/* ══
   对外仍从 './views.tsx' 导入，保持既有引用不变。 */
export { HomeView } from './views/HomeView.tsx'
export { CredentialsView } from './views/CredentialsView.tsx'
export { SpeakerModelsView } from './views/SpeakerModelsView.tsx'
export { DevicesView } from './views/DevicesView.tsx'
export { ModelsVoicesView } from './views/ModelsVoicesView.tsx'
export { ProfileView } from './views/ProfileView.tsx'
export type {
  AccountDraft,
  ModelDraft,
  VoiceDraft,
  SpeakerModelDraft,
  DevDraft,
  DevPullState,
  CredDevState,
} from './views/drafts.ts'
