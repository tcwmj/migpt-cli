/* ══ 页面组件桶文件：实际实现按页面拆分在 ./views/* ══
   对外仍从 './views.tsx' 导入，保持既有引用不变。 */
export { HomeView } from './views/HomeView.tsx'
export { AccountsView } from './views/AccountsView.tsx'
export { ModelsView } from './views/ModelsView.tsx'
export { DevicesView } from './views/DevicesView.tsx'
export { ServicesView } from './views/ServicesView.tsx'
export { ProfileView } from './views/ProfileView.tsx'
export type {
  AccountDraft,
  ThinkDraft,
  VoiceDraft,
  ModelDraft,
  DevDraft,
  DevPullState,
  AcctDevState,
} from './views/drafts.ts'
