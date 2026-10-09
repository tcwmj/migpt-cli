import { useEffect, useState } from 'react'
import { type View } from './constants.ts'
import {
  AccountsView,
  DevicesView,
  HomeView,
  ModelsView,
  ProfileView,
  ServicesView,
} from './views.tsx'
import { LoginPage } from './components/LoginPage.tsx'
import { LogsView } from './views/LogsView.tsx'
import { SysLogsView } from './views/SysLogsView.tsx'
import { RoomsView } from './views/RoomsView.tsx'
import { RolesView } from './views/RolesView.tsx'
import { StatsView } from './views/StatsView.tsx'
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
import { useModelsCrud } from './hooks/useModelsCrud.ts'
import { useRolesRoomsCrud } from './hooks/useRolesRoomsCrud.ts'
import { useServicesCrud } from './hooks/useServicesCrud.ts'
import { useToast } from './hooks/useToast.ts'
import { useWizard } from './hooks/useWizard.ts'
import { useHashRouter, useNav } from './hooks/useHashRouter.ts'
import type { ModalState } from './ui-types.ts'

export function App() {
  const { toast, leaving, showToast } = useToast()
  const {
    authed,
    loginErr,
    login,
    logout,
    accounts,
    devices,
    roles,
    thinkSvcs,
    voiceSvcs,
    models,
    rooms,
    logCount,
    loading,
    refreshAll,
    runningCount,
    builtinModelCount,
    customModelCount,
  } = useAppData(showToast)

  /* ── 视图与顶栏/侧栏的 UI 状态 ── */
  const [view, setView] = useState<View>('home')
  const [settingTab, setSettingTab] = useState<'think' | 'voice'>('think')
  const [query, setQuery] = useState('')
  const [sideOff, setSideOff] = useState<boolean>(
    () => localStorage.getItem('migpt-side-off') === '1',
  )

  // Hash 路由同步：视图状态与 URL hash 双向绑定
  useHashRouter(view, setView)
  const nav = useNav(setView, setSettingTab, setQuery)
  useEffect(() => {
    localStorage.setItem('migpt-side-off', sideOff ? '1' : '0')
  }, [sideOff])

  const [bannerIdx, setBannerIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % 5), 5000)
    return () => clearInterval(t)
  }, [])

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
  const svc = useServicesCrud({
    devices,
    roles,
    thinkSvcs,
    voiceSvcs,
    showToast,
    refreshAll,
    setConfirm,
  })
  const model = useModelsCrud({
    models,
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
  const rr = useRolesRoomsCrud({
    roles,
    rooms,
    devices,
    query,
    showToast,
    refreshAll,
    setConfirm,
  })
  const wz = useWizard({ showToast, refreshAll })

  const detail = dev.detail
  const wizard = wz.wizard

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
    <div className={'app' + (sideOff ? ' off' : '')}>
      <Sidebar
        view={view}
        sideOff={sideOff}
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
              bannerIdx={bannerIdx}
              onBanner={setBannerIdx}
              accounts={accounts}
              devices={devices}
              roles={roles}
              rooms={rooms}
              thinkSvcs={thinkSvcs}
              voiceSvcs={voiceSvcs}
              models={models}
              runningCount={runningCount}
              builtinModelCount={builtinModelCount}
              customModelCount={customModelCount}
              logCount={logCount}
              onNav={setView}
              onOpenThink={() => {
                setSettingTab('think')
                setView('think')
              }}
              onOpenVoice={() => {
                setSettingTab('voice')
                setView('voice')
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
              models={models}
              onSelect={acct.selectAcct}
              onDraft={acct.setAcctDraft}
              onEdit={acct.setAcctEdit}
              onDelete={acct.delAcct}
              onSave={acct.saveAcct}
              onRefreshDevs={acct.loadAcctDevs}
              onGoToDevice={(d) => {
                const mm = models.find(
                  (m) =>
                    m.id === d.hardware ||
                    m.name === d.hardware ||
                    (m.did && d.hardware && d.hardware.startsWith(m.did)),
                )
                dev.selectDev(null)
                dev.setDevDraft({
                  alias: d.alias,
                  did: d.did,
                  speakerModel: mm?.id || '',
                  accountId: d.accountId,
                  roleId: '',
                  thinkServiceIds: [],
                  voiceId: '',
                  ttsSecret: '',
                  exitKeepAliveAfter: '30',
                  roomRef: '',
                })
                setView('devices')
              }}
              usage={acct.usage}
            />
          )}

          {view === 'models' && (
            <ModelsView
              filterModels={model.filterModels}
              models={models}
              selModel={model.selModel}
              modelDraft={model.modelDraft}
              modelEdit={model.modelEdit}
              devices={devices}
              filter={model.modelFilter}
              onFilter={model.switchModelFilter}
              onSelect={model.selectModel}
              onDraft={model.setModelDraft}
              onEdit={model.setModelEdit}
              onDelete={model.delModel}
              onReset={model.resetModel}
              onSave={model.saveModel}
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
              roles={roles}
              accounts={accounts}
              rooms={rooms}
              thinkSvcs={thinkSvcs}
              voiceSvcs={voiceSvcs}
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
            />
          )}

          {view === 'rooms' && (
            <RoomsView
              rooms={rr.filterRooms}
              allRooms={rooms}
              devices={devices}
              onSave={rr.saveRoom}
              onCreate={rr.createRoom}
              onDelete={rr.delRoom}
            />
          )}

          {view === 'roles' && (
            <RolesView
              roles={rr.filterRoles}
              allRoles={roles}
              roleUsage={rr.roleUsage}
              onSave={rr.saveRole}
              onCreate={rr.createRole}
              onDelete={rr.delRole}
            />
          )}

          {view === 'logs' && <LogsView devices={devices} models={models} />}
          {view === 'syslogs' && (
            <SysLogsView query={query} onToast={showToast} />
          )}

          {view === 'stats' && <StatsView onNavigate={setView} />}

          {(view === 'settings' || view === 'think' || view === 'voice') && (
            <ServicesView
              tab={settingTab}
              thinkSvcs={thinkSvcs}
              voiceSvcs={voiceSvcs}
              selThink={svc.selThink}
              selVoice={svc.selVoice}
              thinkDraft={svc.thinkDraft}
              voiceDraft={svc.voiceDraft}
              thinkEdit={svc.thinkEdit}
              voiceEdit={svc.voiceEdit}
              selVoiceObj={svc.selVoiceObj}
              onSelectThink={svc.selectThink}
              onDraftThink={svc.setThinkDraft}
              onEditThink={svc.setThinkEdit}
              onDeleteThink={svc.delThink}
              onSaveThink={svc.saveThink}
              onSelectVoice={svc.selectVoice}
              onDraftVoice={svc.setVoiceDraft}
              onEditVoice={svc.setVoiceEdit}
              onDeleteVoice={svc.delVoice}
              onResetVoice={svc.resetVoice}
              onSaveVoice={svc.saveVoice}
              usageThink={svc.usageThink}
              usageVoice={svc.usageVoice}
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
          roles={roles}
          thinkSvcs={thinkSvcs}
          voiceSvcs={voiceSvcs}
          accounts={accounts}
          models={models}
          rooms={rooms}
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
              desc: '修改这台音箱的角色与服务绑定；换绑账号 / 唤醒词需重启设备。',
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
          roles={roles}
          thinkSvcs={thinkSvcs}
          voiceSvcs={voiceSvcs}
          models={models}
          rooms={rooms}
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
          roles={roles}
          models={models}
          draft={wizard}
          setDraft={wz.setDraft}
          onClose={wz.closeWizard}
          onNewAccount={wz.newAccount}
          onUpdateAccount={wz.updateAccount}
          onNewRole={wz.newRole}
          onUpdateRole={wz.updateRole}
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

      <Toast msg={toast} leaving={leaving} />
    </div>
  )
}
