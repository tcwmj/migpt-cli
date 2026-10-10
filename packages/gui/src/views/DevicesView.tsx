/* ══ DevicesView ══ */
import { Button, Chip, EmptyState } from '../components/atoms/index.ts'
import type {
  Account,
  DeviceRow,
  Role,
  Room,
  SpeakerModel,
  ThinkService,
  VoiceService,
} from '../apis.ts'
import type { DevDraft, DevPullState } from './drafts.ts'
import { DeviceDetail } from './devices/DeviceDetail.tsx'
import { DeviceForm } from './devices/DeviceForm.tsx'
import { DeviceList } from './devices/DeviceList.tsx'

export function DevicesView(props: {
  filterDevices: DeviceRow[]
  devices: DeviceRow[]
  selDev: string | null
  devDraft: DevDraft | null
  devEdit: boolean
  devPull: DevPullState
  devAcctFilter: string
  devAcctGroups: { id: string; name: string }[]
  modelPickOpen: boolean
  modelPickQ: string
  models: SpeakerModel[]
  roles: Role[]
  accounts: Account[]
  rooms: Room[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  onSelect: (id: string | null) => void
  onDraft: (d: DevDraft | null) => void
  onEdit: (e: boolean) => void
  onDelete: () => void
  onSave: () => void
  onRestart: (id: string) => void
  onPull: (accountId: string) => void
  onResetPull: () => void
  onDevAcctFilter: (f: string, firstId: string | null) => void
  onPickOpen: (open: boolean) => void
  onPickQ: (q: string) => void
  onNavigate?: (view: string, id: string) => void
}) {
  const {
    filterDevices,
    devices,
    selDev,
    devDraft,
    devEdit,
    devAcctFilter,
    devAcctGroups,
    models,
    roles,
    accounts,
    rooms,
    onSelect,
    onDraft,
    onEdit,
    onDelete,
    onSave,
    onRestart,
    onDevAcctFilter,
  } = props
  return (
    <section data-view="devices" className="on">
      <div className="filters">
        <Chip
          on={devAcctFilter === 'all'}
          onClick={() =>
            onDevAcctFilter(
              'all',
              filterDevices.length ? filterDevices[0].id : null,
            )
          }
        >
          全部设备 {filterDevices.length}
        </Chip>
        {devAcctGroups.map((g) => (
          <Chip
            key={g.id}
            on={devAcctFilter === g.id}
            onClick={() =>
              onDevAcctFilter(
                g.id,
                devices.find((d) => d.accountId === g.id)?.id || null,
              )
            }
          >
            {g.name} {devices.filter((d) => d.accountId === g.id).length}
          </Chip>
        ))}
        <span className="sp" />
      </div>
      <div className="split">
        <DeviceList
          devices={filterDevices}
          roles={roles}
          models={models}
          selDev={selDev}
          onSelect={onSelect}
        />
        <section
          className="sdetail"
          key={'dev-' + (selDev || 'new') + (devEdit ? '-e' : '-r')}
        >
          {filterDevices.length === 0 && !devDraft ? (
            <EmptyState
              icon="speaker"
              title="还没有绑定设备"
              desc="请前往「云端账号」页面，通过「去接入」按钮添加设备。"
            />
          ) : selDev && !devEdit ? (
            <DeviceDetail
              selDev={selDev}
              devices={devices}
              models={models}
              accounts={accounts}
              roles={roles}
              thinkSvcs={props.thinkSvcs}
              voiceSvcs={props.voiceSvcs}
              onRestart={onRestart}
              onDelete={onDelete}
              onEdit={() => onEdit(true)}
              onNavigate={props.onNavigate}
            />
          ) : devDraft ? (
            <DeviceForm
              devDraft={devDraft}
              selDev={selDev}
              devices={devices}
              models={models}
              accounts={accounts}
              roles={roles}
              rooms={rooms}
              thinkSvcs={props.thinkSvcs}
              voiceSvcs={props.voiceSvcs}
              modelPickOpen={props.modelPickOpen}
              modelPickQ={props.modelPickQ}
              devPull={props.devPull}
              onDraft={onDraft}
              onEdit={onEdit}
              onSelect={onSelect}
              onSave={onSave}
              onPull={props.onPull}
              onResetPull={props.onResetPull}
              onPickOpen={props.onPickOpen}
              onPickQ={props.onPickQ}
            />
          ) : null}
        </section>
      </div>
    </section>
  )
}
