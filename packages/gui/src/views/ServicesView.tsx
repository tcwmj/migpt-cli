/* ══ ServicesView ══ */
import { I } from '../icons.tsx'
import type { ThinkService, VoiceService } from '../apis.ts'
import type { ThinkDraft, VoiceDraft } from './drafts.ts'
import { ThinkServiceList } from './services/ThinkServiceList.tsx'
import { ThinkServiceDetail } from './services/ThinkServiceDetail.tsx'
import { ThinkServiceForm } from './services/ThinkServiceForm.tsx'
import { VoiceServiceList } from './services/VoiceServiceList.tsx'
import { VoiceServiceDetail } from './services/VoiceServiceDetail.tsx'
import { VoiceServiceForm } from './services/VoiceServiceForm.tsx'

export function ServicesView(props: {
  tab: 'think' | 'voice'
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  selThink: string | null
  selVoice: string | null
  thinkDraft: ThinkDraft | null
  voiceDraft: VoiceDraft | null
  thinkEdit: boolean
  voiceEdit: boolean
  selVoiceObj: VoiceService | null
  onSelectThink: (id: string | null) => void
  onDraftThink: (d: ThinkDraft | null) => void
  onEditThink: (e: boolean) => void
  onDeleteThink: (id: string) => void
  onSaveThink: () => void
  onSelectVoice: (id: string | null) => void
  onDraftVoice: (d: VoiceDraft | null) => void
  onEditVoice: (e: boolean) => void
  onDeleteVoice: (id: string) => void
  onResetVoice: (id: string) => void
  onSaveVoice: () => void
  usageThink: (id: string) => number
  usageVoice: (id: string) => number
}) {
  const {
    tab,
    thinkSvcs,
    voiceSvcs,
    selThink,
    selVoice,
    thinkDraft,
    voiceDraft,
    thinkEdit,
    voiceEdit,
    selVoiceObj,
    onSelectThink,
    onDraftThink,
    onEditThink,
    onDeleteThink,
    onSaveThink,
    onSelectVoice,
    onDraftVoice,
    onEditVoice,
    onDeleteVoice,
    onResetVoice,
    onSaveVoice,
    usageThink,
    usageVoice,
  } = props
  return (
    <section data-view="settings" className="on">
      {tab === 'think' && (
        <>
          <div className="filters">
            <span className="chip on">全部服务</span>
            <span className="sp">
              <span className="count">共 {thinkSvcs.length} 个</span>
            </span>
          </div>
          <div className="split">
            <ThinkServiceList
              services={thinkSvcs}
              selThink={selThink}
              onSelect={onSelectThink}
            />
            <section
              className="sdetail"
              key={'think-' + (selThink || 'new') + (thinkEdit ? '-e' : '-r')}
            >
              {thinkSvcs.length === 0 && !thinkDraft ? (
                <div className="empty">
                  <div className="art">
                    <I n="bolt" size={26} />
                  </div>
                  <b>还没有思考服务</b>
                  <span>
                    配置模型供应商与端点，作为音箱的「大脑」；配置后可在角色与设备中选择。
                  </span>
                  <button
                    className="btn primary"
                    onClick={() => onSelectThink(null)}
                  >
                    <I n="plus" /> 新建
                  </button>
                </div>
              ) : selThink && !thinkEdit ? (
                <ThinkServiceDetail
                  selThink={selThink}
                  thinkSvcs={thinkSvcs}
                  usageThink={usageThink}
                  onDelete={onDeleteThink}
                  onEdit={() => onEditThink(true)}
                />
              ) : thinkDraft ? (
                <ThinkServiceForm
                  thinkDraft={thinkDraft}
                  selThink={selThink}
                  thinkSvcs={thinkSvcs}
                  usageThink={usageThink}
                  onDraft={onDraftThink}
                  onEdit={onEditThink}
                  onSelect={onSelectThink}
                  onSave={onSaveThink}
                />
              ) : null}
            </section>
          </div>
        </>
      )}

      {tab === 'voice' && (
        <>
          <div className="filters">
            <span className="chip on">全部服务</span>
            <span className="sp">
              <span className="count">共 {voiceSvcs.length} 个</span>
            </span>
          </div>
          <div className="split">
            <VoiceServiceList
              services={voiceSvcs}
              selVoice={selVoice}
              onSelect={onSelectVoice}
            />
            <section
              className="sdetail"
              key={'voice-' + (selVoice || 'new') + (voiceEdit ? '-e' : '-r')}
            >
              {voiceSvcs.length === 0 && !voiceDraft ? (
                <div className="empty">
                  <div className="art">
                    <I n="mic" size={26} />
                  </div>
                  <b>还没有语音服务</b>
                  <span>
                    接入第三方语音模型，为对话角色提供音色；每个语音服务可含多套音色库。
                  </span>
                  <button
                    className="btn primary"
                    onClick={() => onSelectVoice(null)}
                  >
                    <I n="plus" /> 新建
                  </button>
                </div>
              ) : selVoice && !voiceEdit ? (
                <VoiceServiceDetail
                  selVoice={selVoice}
                  selVoiceObj={selVoiceObj}
                  voiceSvcs={voiceSvcs}
                  usageVoice={usageVoice}
                  onDelete={onDeleteVoice}
                  onReset={onResetVoice}
                  onEdit={() => onEditVoice(true)}
                />
              ) : voiceDraft ? (
                <VoiceServiceForm
                  voiceDraft={voiceDraft}
                  selVoice={selVoice}
                  voiceSvcs={voiceSvcs}
                  usageVoice={usageVoice}
                  onDraft={onDraftVoice}
                  onEdit={onEditVoice}
                  onSelect={onSelectVoice}
                  onSave={onSaveVoice}
                />
              ) : null}
            </section>
          </div>
        </>
      )}
    </section>
  )
}
