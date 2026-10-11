/* ══ ModelsVoicesView ══ */
import { useMemo, useState } from 'react'
import {
  Button,
  Chip,
  EmptyState,
  ProviderLogo,
} from '../components/atoms/index.ts'
import type { Model, Voice, DeviceRow, Robot } from '../apis.ts'
import type { ModelDraft, VoiceDraft } from './drafts.ts'
import { ModelList } from './models/ModelList.tsx'
import { ModelDetail } from './models/ModelDetail.tsx'
import { ModelForm } from './models/ModelForm.tsx'
import { VoiceList } from './voices/VoiceList.tsx'
import { VoiceDetail } from './voices/VoiceDetail.tsx'
import { VoiceForm } from './voices/VoiceForm.tsx'
import { MODEL_PROVIDERS, TTS_ENGINES, VOICE_PROVIDERS } from '../constants.ts'

export function ModelsVoicesView(props: {
  tab: 'models' | 'voices'
  models: Model[]
  voices: Voice[]
  selModel: string | null
  selVoice: string | null
  modelDraft: ModelDraft | null
  voiceDraft: VoiceDraft | null
  modelEdit: boolean
  voiceEdit: boolean
  selVoiceObj: Voice | null
  devices: DeviceRow[]
  robots: Robot[]
  onSelectModel: (id: string | null) => void
  onDraftModel: (d: ModelDraft | null) => void
  onEditModel: (e: boolean) => void
  onDeleteModel: (id: string) => void
  onSaveModel: () => void
  onSelectVoice: (id: string | null) => void
  onDraftVoice: (d: VoiceDraft | null) => void
  onEditVoice: (e: boolean) => void
  onDeleteVoice: (id: string) => void
  onResetVoice: (id: string) => void
  onSaveVoice: () => void
  usageModel: (id: string) => number
  usageVoice: (id: string) => number
  onNavigate?: (view: string, id: string) => void
}) {
  const {
    tab,
    models,
    voices,
    selModel,
    selVoice,
    modelDraft,
    voiceDraft,
    modelEdit,
    voiceEdit,
    selVoiceObj,
    devices,
    robots,
    onSelectModel,
    onDraftModel,
    onEditModel,
    onDeleteModel,
    onSaveModel,
    onSelectVoice,
    onDraftVoice,
    onEditVoice,
    onDeleteVoice,
    onResetVoice,
    onSaveVoice,
    usageModel,
    usageVoice,
    onNavigate,
  } = props
  const [modelProvider, setModelProvider] = useState('all')
  const [voiceProvider, setVoiceProvider] = useState('all')

  const modelProviderCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of models) {
      map[s.provider] = (map[s.provider] || 0) + 1
    }
    return map
  }, [models])

  const voiceProviderCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of voices) {
      const key = s.builtin ? 'builtin' : s.provider
      map[key] = (map[key] || 0) + 1
    }
    return map
  }, [voices])

  const filteredModels = useMemo(
    () =>
      modelProvider === 'all'
        ? models
        : models.filter((s) => s.provider === modelProvider),
    [models, modelProvider],
  )

  const filteredVoices = useMemo(
    () =>
      voiceProvider === 'all'
        ? voices
        : voices.filter((s) =>
            voiceProvider === 'builtin'
              ? s.builtin
              : !s.builtin && s.provider === voiceProvider,
          ),
    [voices, voiceProvider],
  )
  return (
    <section data-view="settings" className="on">
      {tab === 'models' && (
        <>
          <div className="filters">
            <Chip
              on={modelProvider === 'all'}
              onClick={() => setModelProvider('all')}
            >
              全部模型 {models.length}
            </Chip>
            {Object.entries(modelProviderCounts).map(([prov, count]) => {
              const p = MODEL_PROVIDERS[prov]
              return (
                <Chip
                  key={prov}
                  on={modelProvider === prov}
                  onClick={() => setModelProvider(prov)}
                >
                  {p && <ProviderLogo p={p} size={15} />} {p?.name || prov}{' '}
                  {count}
                </Chip>
              )
            })}
            <span className="sp" />
          </div>
          <div className="split">
            <ModelList
              models={filteredModels}
              selModel={selModel}
              onSelect={onSelectModel}
            />
            <section
              className="sdetail"
              key={'think-' + (selModel || 'new') + (modelEdit ? '-e' : '-r')}
            >
              {models.length === 0 && !modelDraft ? (
                <EmptyState
                  icon="bolt"
                  title="还没有模型"
                  desc="配置模型供应商与端点，作为音箱的「大脑」；配置后可在角色与设备中选择。"
                  action={
                    <Button
                      variant="primary"
                      icon="plus"
                      onClick={() => onSelectModel(null)}
                    >
                      新建
                    </Button>
                  }
                />
              ) : selModel && !modelEdit ? (
                <ModelDetail
                  selModel={selModel}
                  models={models}
                  devices={devices}
                  robots={robots}
                  usageModel={usageModel}
                  onDelete={onDeleteModel}
                  onEdit={() => onEditModel(true)}
                  onNavigate={onNavigate}
                />
              ) : modelDraft ? (
                <ModelForm
                  modelDraft={modelDraft}
                  selModel={selModel}
                  models={models}
                  usageModel={usageModel}
                  onDraft={onDraftModel}
                  onEdit={onEditModel}
                  onSelect={onSelectModel}
                  onSave={onSaveModel}
                />
              ) : null}
            </section>
          </div>
        </>
      )}

      {tab === 'voices' && (
        <>
          <div className="filters">
            <Chip
              on={voiceProvider === 'all'}
              onClick={() => setVoiceProvider('all')}
            >
              全部语音 {voices.length}
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
            <VoiceList
              voices={filteredVoices}
              selVoice={selVoice}
              onSelect={onSelectVoice}
            />
            <section
              className="sdetail"
              key={'voice-' + (selVoice || 'new') + (voiceEdit ? '-e' : '-r')}
            >
              {voices.length === 0 && !voiceDraft ? (
                <EmptyState
                  icon="mic"
                  title="还没有语音"
                  desc="接入第三方语音模型，为对话角色提供音色；每个语音可含多套音色库。"
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
                <VoiceDetail
                  selVoice={selVoice}
                  selVoiceObj={selVoiceObj}
                  voices={voices}
                  devices={devices}
                  robots={robots}
                  usageVoice={usageVoice}
                  onDelete={onDeleteVoice}
                  onReset={onResetVoice}
                  onEdit={() => onEditVoice(true)}
                  onNavigate={onNavigate}
                />
              ) : voiceDraft ? (
                <VoiceForm
                  voiceDraft={voiceDraft}
                  selVoice={selVoice}
                  voices={voices}
                  usageVoice={usageVoice}
                  onDraft={onDraftVoice}
                  onEdit={onEditVoice}
                  onSelect={onSelectVoice}
                  onSave={onSaveVoice}
                  onReset={onResetVoice}
                />
              ) : null}
            </section>
          </div>
        </>
      )}
    </section>
  )
}
