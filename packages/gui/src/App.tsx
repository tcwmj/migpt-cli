import { useEffect, useState, lazy, Suspense } from 'react'
import { type View } from './constants.ts'
import {
  AccountsView,
  DevicesView,
  HomeView,
  SpeakerModelsView,
  ProfileView,
  ModelsVoicesView,
} from './views.tsx'
import { LoginPage } from './components/LoginPage.tsx'
import { ChatLogsView } from './views/ChatLogsView.tsx'
import { SystemLogsView } from './views/SystemLogsView.tsx'
import { ConversationsView } from './views/ConversationsView.tsx'
import { RobotsView } from './views/RobotsView.tsx'
import { Drawer } from './components/Drawer.tsx'
import { ModalShell } from './components/ModalShell.tsx'
import { Wizard } from './components/Wizard.tsx'
import { ConfirmDialog } from './components/app/ConfirmDialog.tsx'
import { LoadingPanel } from './components/app/LoadingPanel.tsx'
import { Sidebar } from './components/app/Sidebar.tsx'
import { Toast } from './components/app/Toast.tsx'
import { TopBar } from './components/app/TopBar.tsx'
import { submitModal } from './components/app/modal-submit.ts'
import { useAccountsCrud } from './hooks/useAccountsCrud.ts'
import { useAppData } from './hooks/useAppData.ts'
import { useConfirm } from './hooks/useConfirm.ts'
import { useDevicesCrud } from './hooks/useDevicesCrud.ts'
import { useSpeakerModelsCrud } from './hooks/useSpeakerModelsCrud.ts'
import { useRobotsConversationsCrud } from './hooks/useRobotsConversationsCrud.ts'
import { useModelsVoicesCrud } from './hooks/useModelsVoicesCrud.ts'
import { useToast } from './hooks/useToast.ts'
import { useWizard } from './hooks/useWizard.ts'
import { useHashRouter, useNav } from './hooks/useHashRouter.ts'
import type { ModalState } from './ui-types.ts'

// 统计页（recharts 等重依赖）路由级懒加载：首屏不加载，访问时才拉取对应 chunk
const StatsView = lazy(() =>
  import('./views/StatsView.tsx').then((m) => ({ default: m.StatsView })),
)

export function App() {
  const { toast, leaving, showToast } = useToast()
  const {
    authed,
    loginErr,
    login,
    logout,
    accounts,
    devices,
    robots,
    models,
    voices,
    speakerModels,
    conversations,
    logCount,
    loading,
    refreshAll,
    runningCount,
    builtinSpeakerModelCount,
    customSpeakerModelCount,
  } = useAppData(showToast)

  /* ── 视图与顶栏/侧栏的 UI 状态 ── */
  const [view, setView] = useState<View>('home')
  const [settingTab, setSettingTab] = useState<'models' | 'voices'>('models')
  const [query, setQuery] = useState('')
  const [sideOff, setSideOff] = useState<boolean>(
    () => localStorage.getItem('migpt-side-off') === '1',
  )

  // 窄屏（≤1180px）自动进入侧栏「图标轨道」收起态（Ant Design Pro 同款实践）：
  // 走统一的 .app.off 样式——品牌文字隐藏、图标居中、悬浮显示菜单名 tooltip，
  // 不会像纯 CSS 媒体查询那样只压宽度导致标题折行。
  // narrow 与用户手动偏好分离：不写 localStorage，回到宽屏自动恢复用户原设置。
  const [narrow, setNarrow] = useState<boolean>(
    () => window.matchMedia('(max-width: 1180px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1180px)')
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const sideCollapsed = sideOff || narrow

  // Hash 路由同步：视图状态与 URL hash 双向绑定
  useHashRouter(view, setView, setSettingTab)
  const nav = useNav(setView, setSettingTab, setQuery)
  useEffect(() => {
    localStorage.setItem('migpt-side-off', sideOff ? '1' : '0')
  }, [sideOff])

  const [modal, setModal] = useState<ModalState | null>(null)

  /* ── 业务 Hook ── */
  const { confirm, confirmLeaving, setConfirm, closeConfirm } = useConfirm()
  const acct = useAccountsCrud({
    accounts,
    devices,
    query,
    showToast,
    refreshAll,
    setConfirm,
  })
  const svc = useModelsVoicesCrud({
    devices,
    robots,
    models,
    voices,
    showToast,
    refreshAll,
    setConfirm,
  })
  const speakerModelCtl = useSpeakerModelsCrud({
    models: speakerModels,
    devices,
    query,
    showToast,
    refreshAll,
    setConfirm,
  })
  const dev = useDevicesCrud({
    devices,
    accounts,
    query,
    showToast,
    refreshAll,
    setConfirm,
  })
  const rr = useRobotsConversationsCrud({
    robots,
    conversations,
    devices,
    query,
    showToast,
    refreshAll,
    setConfirm,
  })
  const wz = useWizard({ showToast, refreshAll })

  const detail = dev.detail
  const wizard = wz.wizard

  // 导航处理函数：跳转到指定视图并选中实体
  const handleNavigate = (view: string, id: string) => {
    setView(view as View)
    // 根据视图类型选中对应实体
    switch (view) {
      case 'devices':
        dev.selectDev(id)
        break
      case 'robots':
        // RobotsView 会自动选中第一个，需要手动设置
        // 这里通过 URL hash 触发选择
        window.location.hash = `#robots/${id}`
        break
      case 'conversations':
        window.location.hash = `#conversations/${id}`
        break
      case 'models':
        setSettingTab('models')
        svc.selectModel(id)
        break
      case 'voices':
        setSettingTab('voices')
        svc.selectVoice(id)
        break
      case 'accounts':
        acct.selectAcct(id)
        break
      case 'speaker-models':
        speakerModelCtl.selectModel(id)
        break
    }
  }

  /* ══ 渲染 ══ */
  // 会话探测中：先不渲染，避免登录页闪烁
  if (authed === null) {
    return null
  }
  if (!authed) {
    return (
      <LoginPage
        onLogin={async (u, p) => {
          const ok = await login(u, p)
          if (ok) setView('home')
        }}
        error={loginErr}
      />
    )
  }

  return (
    <div className={'app' + (sideCollapsed ? ' off' : '')}>
      <Sidebar
        view={view}
        sideOff={sideCollapsed}
        onNav={nav}
        onProfile={() => setView('profile')}
        onToggle={() => setSideOff(!sideOff)}
      />

      <div className="main">
        <TopBar view={view} query={query} onQuery={setQuery} />

        <div className="body">
          {loading && view !== 'devices' && view !== 'home' && <LoadingPanel />}

          {view === 'home' && (
            <HomeView
              accounts={accounts}
              devices={devices}
              robots={robots}
              conversations={conversations}
              models={models}
              voices={voices}
              speakerModels={speakerModels}
              runningCount={runningCount}
              builtinSpeakerModelCount={builtinSpeakerModelCount}
              customSpeakerModelCount={customSpeakerModelCount}
              logCount={logCount}
              onNav={setView}
              onOpenModel={() => {
                setSettingTab('models')
                setView('models')
              }}
              onOpenVoice={() => {
                setSettingTab('voices')
                setView('voices')
              }}
              onStartWizard={wz.startWizard}
            />
          )}

          {view === 'accounts' && (
            <AccountsView
              filterAccounts={acct.filterAccounts}
              accounts={accounts}
              selAcct={acct.selAcct}
              acctDraft={acct.acctDraft}
              acctEdit={acct.acctEdit}
              acctDevs={acct.acctDevs}
              devices={devices}
              speakerModels={speakerModels}
              onSelect={acct.selectAcct}
              onDraft={acct.setAcctDraft}
              onEdit={acct.setAcctEdit}
              onDelete={acct.delAcct}
              onSave={acct.saveAcct}
              onRefreshDevs={acct.loadAcctDevs}
              onGoToDevice={(d) => {
                const mm = speakerModels.find(
                  (m) =>
                    m.id === d.hardware ||
                    m.name === d.hardware ||
                    (m.didPrefix &&
                      d.hardware &&
                      d.hardware.startsWith(m.didPrefix)),
                )
                dev.selectDev(null)
                dev.setDevDraft({
                  alias: d.alias,
                  did: d.did,
                  speakerModel: mm?.id || '',
                  accountId: d.accountId,
                  robotId: '',
                  modelIds: [],
                  voiceId: '',
                  ttsSecret: '',
                })
                setView('devices')
              }}
              usage={acct.usage}
            />
          )}

          {view === 'speaker-models' && (
            <SpeakerModelsView
              filterModels={speakerModelCtl.filterModels}
              models={speakerModels}
              selModel={speakerModelCtl.selModel}
              modelDraft={speakerModelCtl.modelDraft}
              modelEdit={speakerModelCtl.modelEdit}
              devices={devices}
              filter={speakerModelCtl.modelFilter}
              onFilter={speakerModelCtl.switchModelFilter}
              onSelect={speakerModelCtl.selectModel}
              onDraft={speakerModelCtl.setSpeakerModelDraft}
              onEdit={speakerModelCtl.setModelEdit}
              onDelete={speakerModelCtl.delModel}
              onReset={speakerModelCtl.resetModel}
              onSave={speakerModelCtl.saveModel}
            />
          )}

          {view === 'devices' && (
            <DevicesView
              filterDevices={dev.filterDevices}
              devices={devices}
              selDev={dev.selDev}
              devDraft={dev.devDraft}
              devEdit={dev.devEdit}
              devPull={dev.devPull}
              devAcctFilter={dev.devAcctFilter}
              devAcctGroups={dev.devAcctGroups}
              modelPickOpen={dev.modelPickOpen}
              modelPickQ={dev.modelPickQ}
              models={models}
              robots={robots}
              accounts={accounts}
              conversations={conversations}
              speakerModels={speakerModels}
              voices={voices}
              onSelect={dev.selectDev}
              onDraft={dev.setDevDraft}
              onEdit={dev.setDevEdit}
              onDelete={dev.removeDeviceForm}
              onSave={dev.saveDeviceForm}
              onRestart={dev.restartDevice}
              onPull={dev.doPullDev}
              onResetPull={dev.resetPull}
              onDevAcctFilter={(f, firstId) => {
                dev.setDevAcctFilter(f)
                dev.selectDev(firstId)
              }}
              onPickOpen={dev.setModelPickOpen}
              onPickQ={dev.setModelPickQ}
              onNavigate={handleNavigate}
            />
          )}

          {view === 'conversations' && (
            <ConversationsView
              conversations={rr.filterRooms}
              allRooms={conversations}
              devices={devices}
              robots={robots}
              onSave={rr.saveRoom}
              onCreate={rr.createConversation}
              onDelete={rr.delRoom}
              onReset={rr.resetConversation}
              onNavigate={handleNavigate}
            />
          )}

          {view === 'robots' && (
            <RobotsView
              robots={rr.filterRobots}
              allRobots={robots}
              conversations={conversations}
              devices={devices}
              robotUsage={rr.robotUsage}
              onSave={rr.saveRobot}
              onCreate={rr.createRobot}
              onDelete={rr.delRobot}
              onReset={rr.resetRobot}
              onNavigate={handleNavigate}
            />
          )}

          {view === 'chat-logs' && (
            <ChatLogsView devices={devices} models={speakerModels} />
          )}
          {view === 'system-logs' && (
            <SystemLogsView query={query} onToast={showToast} />
          )}

          {view === 'stats' && (
            <Suspense fallback={<LoadingPanel />}>
              <StatsView onNavigate={setView} />
            </Suspense>
          )}

          {(view === 'settings' || view === 'models' || view === 'voices') && (
            <ModelsVoicesView
              tab={settingTab}
              models={models}
              voices={voices}
              selModel={svc.selModel}
              selVoice={svc.selVoice}
              modelDraft={svc.modelDraft}
              voiceDraft={svc.voiceDraft}
              modelEdit={svc.modelEdit}
              voiceEdit={svc.voiceEdit}
              selVoiceObj={svc.selVoiceObj}
              devices={devices}
              robots={robots}
              onSelectModel={svc.selectModel}
              onDraftModel={svc.setModelDraft}
              onEditModel={svc.setModelEdit}
              onDeleteModel={svc.delModel}
              onSaveModel={svc.saveModel}
              onSelectVoice={svc.selectVoice}
              onDraftVoice={svc.setVoiceDraft}
              onEditVoice={svc.setVoiceEdit}
              onDeleteVoice={svc.delVoice}
              onResetVoice={svc.resetVoice}
              onSaveVoice={svc.saveVoice}
              usageModel={svc.usageModel}
              usageVoice={svc.usageVoice}
              onNavigate={handleNavigate}
            />
          )}

          {view === 'profile' && (
            <ProfileView
              onPwd={() =>
                setModal({
                  kind: 'pwd',
                  title: '修改登录密码',
                  desc: '默认密码为部署时设定；修改后立即生效。',
                })
              }
              onLogout={logout}
            />
          )}
        </div>
      </div>

      {/* 设备详情抽屉 */}
      {detail && (
        <Drawer
          detail={detail}
          running={devices.find((x) => x.id === detail.meta.id)?.running}
          robots={robots}
          models={models}
          voices={voices}
          accounts={accounts}
          speakerModels={speakerModels}
          conversations={conversations}
          onClose={dev.closeDrawer}
          onRestart={() => dev.restartDevice(detail.meta.id)}
          onRemove={async () => {
            if (
              !window.confirm(
                `解绑设备「${detail.meta.alias}」？此操作不可撤销。`,
              )
            )
              return
            await dev.removeDevice(detail.meta.id)
          }}
          onEdit={() =>
            setModal({
              kind: 'deviceBind',
              title: '编辑绑定',
              desc: '修改这台音箱的角色与模型/语音绑定；换绑账号 / 唤醒词需重启设备。',
              payload: detail.meta,
            })
          }
        />
      )}

      {/* 弹窗 */}
      {modal && (
        <ModalShell
          modal={modal}
          accounts={accounts}
          robots={robots}
          models={models}
          voices={voices}
          speakerModels={speakerModels}
          conversations={conversations}
          onClose={() => setModal(null)}
          onDone={(values) => {
            const m = modal
            setModal(null)
            void submitModal({
              modal: m,
              values,
              showToast,
              refreshAll,
              openDevice: dev.openDevice,
              detailOpen: !!dev.detail,
            })
          }}
        />
      )}

      {/* 三步向导 */}
      {wizard && (
        <Wizard
          step={wizard.step}
          accounts={accounts}
          robots={robots}
          models={models}
          speakerModels={speakerModels}
          voices={voices}
          draft={wizard}
          setDraft={wz.setDraft}
          onClose={wz.closeWizard}
          onNewAccount={wz.newAccount}
          onUpdateAccount={wz.updateAccount}
          onNewRobot={wz.newRobot}
          onUpdateRobot={wz.updateRobot}
          devices={devices}
          onFinish={wz.finish}
        />
      )}

      {/* 删除 / 重置确认 */}
      {confirm && (
        <ConfirmDialog
          confirm={confirm}
          leaving={confirmLeaving}
          onClose={closeConfirm}
        />
      )}

      <Toast toast={toast} leaving={leaving} />
    </div>
  )
}
