import type { DeviceRow, SpeakerModel } from '../../apis.ts'
import { Button, Tag } from '../../components/atoms/index.ts'
import { I } from '../../icons.tsx'
import type { DevDraft, DevPullState } from '../drafts.ts'

/** 从云端账号拉取设备列表，点击条目回填草稿 */
export function PullDeviceList(props: {
  devDraft: DevDraft
  devPull: DevPullState
  models: SpeakerModel[]
  devices: DeviceRow[]
  onDraft: (d: DevDraft) => void
  onPull: (accountId: string) => void
}) {
  const { devDraft, devPull } = props
  return (
    <div className="pull-dev">
      <Button
        icon="refresh"
        onClick={() => props.onPull(devDraft.accountId)}
        disabled={!devDraft.accountId || devPull.loading}
      >
        {devPull.loading ? '拉取中…' : '拉取设备列表'}
      </Button>
      {devPull.err && (
        <div className="notice err" style={{ marginTop: 8 }}>
          <I n="warning" size={15} /> {devPull.err}
        </div>
      )}
      {devPull.list && (
        <div className="pick-list" style={{ marginTop: 8 }}>
          {devPull.list.map((d) => {
            const m = props.models.find(
              (x) =>
                x.didPrefix.toLowerCase() === (d.hardware || '').toLowerCase(),
            )
            const bound = !!props.devices.find(
              (x) => x.accountId === devDraft.accountId && x.did === d.miotDID,
            )
            return (
              <div
                className={
                  'pl' +
                  (devDraft.did === d.miotDID ? ' on' : '') +
                  (bound ? ' off' : '')
                }
                key={d.miotDID}
                onClick={() => {
                  if (bound) return
                  props.onDraft({
                    ...devDraft,
                    alias: d.name || d.alias,
                    did: d.miotDID,
                    speakerModel: m ? m.id : devDraft.speakerModel,
                  })
                }}
              >
                <span className="ic">
                  <I n="speaker" />
                </span>
                <span>
                  <b>{d.name || d.alias}</b>
                  <span>
                    {m ? m.name : d.hardware || '未知型号'} ·{' '}
                    {d.presence === 'online' ? '在线' : '离线'}
                  </span>
                </span>
                {bound ? (
                  <Tag tone="neu">已接入</Tag>
                ) : (
                  devDraft.did === d.miotDID && <I n="check" size={18} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
