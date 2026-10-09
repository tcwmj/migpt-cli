/* ══ ServicesView ══ */
import { useMemo, useState } from 'react'
import {
  Button,
  Chip,
  EmptyState,
  ProviderLogo,
} from '../components/atoms/index.ts'
import type { ThinkService, VoiceService } from '../apis.ts'
import type { ThinkDraft, VoiceDraft } from './drafts.ts'
import { ThinkServiceList } from './services/ThinkServiceList.tsx'
import { ThinkServiceDetail } from './services/ThinkServiceDetail.tsx'
import { ThinkServiceForm } from './services/ThinkServiceForm.tsx'
import { VoiceServiceList } from './services/VoiceServiceList.tsx'
import { VoiceServiceDetail } from './services/VoiceServiceDetail.tsx'
import { VoiceServiceForm } from './services/VoiceServiceForm.tsx'
import { THINK_PROVIDERS, TTS_ENGINES, VOICE_PROVIDERS } from '../constants.ts'

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
  const [thinkProvider, setThinkProvider] = useState('all')
  const [voiceProvider, setVoiceProvider] = useState('all')

  const thinkProviderCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of thinkSvcs) {
      map[s.provider] = (map[s.provider] || 0) + 1
    }
    return map
  }, [thinkSvcs])

  const voiceProviderCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of voiceSvcs) {
      const key = s.builtin ? 'builtin' : s.provider
      map[key] = (map[key] || 0) + 1
    }
    return map
  }, [voiceSvcs])

  const filteredThinkSvcs = useMemo(
    () =>
      thinkProvider === 'all'
        ? thinkSvcs
        : thinkSvcs.filter((s) => s.provider === thinkProvider),
    [thinkSvcs, thinkProvider],
  )

  const filteredVoiceSvcs = useMemo(
    () =>
      voiceProvider === 'all'
        ? voiceSvcs
        : voiceSvcs.filter((s) =>
            voiceProvider === 'builtin'
              ? s.builtin
              : !s.builtin && s.provider === voiceProvider,
          ),
    [voiceSvcs, voiceProvider],
  )
  return (
    <section data-view="settings" className="on">
      {tab === 'think' && (
        <>
          <div className="filters">
            <Chip
              on={thinkProvider === 'all'}
              onClick={() => setThinkProvider('all')}
            >
              全部服务 {thinkSvcs.length}
            </Chip>
            {Object.entries(thinkProviderCounts).map(([prov, count]) => {
              const p = THINK_PROVIDERS[prov]
              return (
                <Chip
                  key={prov}
                  on={thinkProvider === prov}
                  onClick={() => setThinkProvider(prov)}
                >
                  {p && <ProviderLogo p={p} size={15} />} {p?.name || prov}{' '}
                  {count}
                </Chip>
              )
            })}
            <span className="sp" />
          </div>
          <div className="split">
            <ThinkServiceList
              services={filteredThinkSvcs}
              selThink={selThink}
              onSelect={onSelectThink}
            />
            <section
              className="sdetail"
              key={'think-' + (selThink || 'new') + (thinkEdit ? '-e' : '-r')}
            >
              {thinkSvcs.length === 0 && !thinkDraft ? (
                <EmptyState
                  icon="bolt"
                  title="还没有思考服务"
                  desc="配置模型供应商与端点，作为音箱的「大脑」；配置后可在角色与设备中选择。"
                  action={
                    <Button
                      variant="primary"
                      icon="plus"
                      onClick={() => onSelectThink(null)}
                    >
                      新建
                    </Button>
                  }
                />
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
            <Chip
              on={voiceProvider === 'all'}
              onClick={() => setVoiceProvider('all')}
            >
              全部服务 {voiceSvcs.length}
            </Chip>
            {Object.entries(voiceProviderCounts).map(([prov, count]) => {
              const p = prov === 'builtin' ? undefined : VOICE_PROVIDERS[prov]
              return (
                <Chip
                  key={prov}
                  on={voiceProvider === prov}
                  onClick={() => setVoiceProvider(prov)}
                >
                  {p && <ProviderLogo p={p} size={15} />}{' '}
                  {TTS_ENGINES[prov] || prov} {count}
                </Chip>
              )
            })}
            <span className="sp" />
          </div>
          <div className="split">
            <VoiceServiceList
              services={filteredVoiceSvcs}
              selVoice={selVoice}
              onSelect={onSelectVoice}
            />
            <section
              className="sdetail"
              key={'voice-' + (selVoice || 'new') + (voiceEdit ? '-e' : '-r')}
            >
              {voiceSvcs.length === 0 && !voiceDraft ? (
                <EmptyState
                  icon="mic"
                  title="还没有语音服务"
                  desc="接入第三方语音模型，为对话角色提供音色；每个语音服务可含多套音色库。"
                  action={
                    <Button
                      variant="primary"
                      icon="plus"
                      onClick={() => onSelectVoice(null)}
                    >
                      新建
                    </Button>
                  }
                />
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
