import { useCallback, useEffect, useState } from 'react'
import * as api from '../../apis.ts'
import {
  type Credential,
  type CloudDevice,
  type SpeakerModel,
} from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Chip, EmptyState, Tag } from '../atoms/index.ts'
import type { WizardSetDraft } from './types.ts'

export function WizardDeviceStep(props: {
  active: boolean
  credentialId: string
  selAcct: Credential | undefined
  speakerModels: SpeakerModel[]
  devices: { id: string; alias: string; did: string; credentialId?: string }[]
  did: string
  alias: string
  model: string
  setDraft: WizardSetDraft
  pullErr: string
  setPullErr: (e: string) => void
}) {
  const { credentialId, selAcct, speakerModels, devices, did, setDraft } = props
  const { setPullErr } = props
  const [pulling, setPulling] = useState(false)
  const [pulled, setPulled] = useState<CloudDevice[] | null>(null)
  const pullErr = props.pullErr

  const modelOf = (hardware: string) =>
    speakerModels.find((x) => {
      const a = (x.didPrefix || '').toLowerCase()
      const b = (hardware || '').toLowerCase()
      return a === b || a.startsWith(b) || b.startsWith(a)
    })
  const load = useCallback(
    (id: string) => {
      if (!id) return
      setPulling(true)
      setPullErr('')
      setPulled(null)
      api
        .pullDevices(id)
        .then((r) => {
          const list = r.devices || []
          setPulled(list)
          if (!list.length)
            setPullErr(
              '该凭据下未发现音箱设备，请确认小米 ID 与 passToken 正确',
            )
        })
        .catch((e) => setPullErr((e as Error).message || '拉取设备失败'))
        .finally(() => setPulling(false))
    },
    [setPullErr],
  )
  useEffect(() => {
    if (props.active && credentialId) load(credentialId)
  }, [props.active, credentialId, load])
  // 设备拉取完成后，默认选中第一台未接入的设备；如果全部已接入则不选中
  useEffect(() => {
    if (props.active && pulled && pulled.length > 0 && !did) {
      // 找到第一台未接入的设备
      const unboundDevice = pulled.find(
        (d) =>
          !devices.find(
            (x) => x.credentialId === selAcct?.id && x.did === d.miotDID,
          ),
      )
      if (unboundDevice) {
        const m = modelOf(unboundDevice.hardware)
        setDraft({
          alias: unboundDevice.name || unboundDevice.alias,
          did: unboundDevice.miotDID,
          model: m ? m.id : props.model,
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.active, pulled, did])
  return (
    <div className={'step' + (props.active ? ' on' : '')}>
      <div className="split wsplit">
        <aside className="slist">
          {!selAcct ? (
            <EmptyState
              title="请先选择小米凭据"
              desc="回到上一步选择或新建凭据。"
              style={{ padding: '16px' }}
            />
          ) : (
            <>
              <div className="filters" style={{ margin: '0 0 8px' }}>
                <Chip on>{selAcct.name}</Chip>
              </div>
              {pulling && <div className="hint">正在从小米云端拉取设备…</div>}
              {pullErr && (
                <EmptyState
                  title="未获取到设备信息"
                  style={{ padding: '16px' }}
                />
              )}
              {pulled && pulled.length > 0
                ? pulled.map((d) => {
                    const m = modelOf(d.hardware)
                    const bound = !!devices.find(
                      (x) =>
                        x.credentialId === selAcct.id && x.did === d.miotDID,
                    )
                    return (
                      <div
                        key={d.miotDID}
                        className={
                          'li' +
                          (did === d.miotDID ? ' on' : '') +
                          (bound ? ' off' : '')
                        }
                        onClick={() => {
                          if (bound) return
                          setDraft({
                            alias: d.name || d.alias,
                            did: d.miotDID,
                            model: m ? m.id : props.model,
                          })
                        }}
                      >
                        <span className="ic">
                          {m?.imageUrl ? (
                            <img className="thumb" src={m.imageUrl} alt="" />
                          ) : (
                            <I n="speaker" />
                          )}
                        </span>
                        <span className="txt">
                          <b>{d.name || d.alias}</b>
                          <span>{m ? m.name : d.hardware || '未知型号'}</span>
                        </span>
                        {bound ? (
                          <Tag tone="neu">已接入</Tag>
                        ) : (
                          <Tag
                            tone={d.presence === 'online' ? 'accent' : 'neu'}
                          >
                            {d.presence === 'online' ? '在线' : '离线'}
                          </Tag>
                        )}
                      </div>
                    )
                  })
                : pulled !== null &&
                  !pulling && (
                    <EmptyState
                      title="未发现音箱设备"
                      desc="请确认小米 ID 与 passToken 正确。"
                      style={{ padding: '16px' }}
                    />
                  )}
            </>
          )}
        </aside>
        <section className="sdetail">
          {pullErr ? (
            <div className="form-card err-card">
              <h3>
                <I n="warning" size={17} /> 设备拉取失败
              </h3>
              <div className="notice err">{pullErr}</div>
              <div className="desc">
                返回上一步检查小米 ID 与
                passToken，或到「小米凭据」页更新凭据后重试。
              </div>
            </div>
          ) : did ? (
            <div className="form-card">
              <h3>
                <I n="speaker" size={17} /> 设备详情
              </h3>
              <div className="desc">设备 ID 与型号由云端自动识别。</div>
              <div className="ro">
                {(() => {
                  const hw = (pulled || []).find(
                    (x) => x.miotDID === did,
                  )?.hardware
                  const m = modelOf(hw ?? '')
                  return m?.imageUrl ? (
                    <div className="model-pic">
                      <img
                        className="fade"
                        src={m.imageUrl}
                        alt={m.name}
                        onLoad={(e) => e.currentTarget.classList.add('loaded')}
                        onError={(e) => e.currentTarget.classList.add('loaded')}
                      />
                      <span className="pic-tag">
                        {m.builtin ? '内置型号' : '自定义型号'}
                      </span>
                    </div>
                  ) : null
                })()}
                <div className="rr2">
                  <div className="rr">
                    <span className="k">设备名称</span>
                    <span className="v">{props.alias || '—'}</span>
                  </div>
                  <div className="rr">
                    <span className="k">设备 ID</span>
                    <span className="v">{did || '—'}</span>
                  </div>
                  <div className="rr">
                    <span className="k">音箱型号</span>
                    <span className="v">
                      {modelOf(
                        (pulled || []).find((x) => x.miotDID === did)
                          ?.hardware || '',
                      )?.name || '待型号映射核对'}
                    </span>
                  </div>
                  <div className="rr">
                    <span className="k">设备状态</span>
                    <span className="v">
                      {(pulled || []).find((x) => x.miotDID === did)
                        ?.presence === 'online'
                        ? '在线'
                        : '离线'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="speaker"
              title="选择要接入的设备"
              desc="从左侧列表选择一台音箱；设备 ID 与型号自动识别。"
            />
          )}
        </section>
      </div>
    </div>
  )
}
