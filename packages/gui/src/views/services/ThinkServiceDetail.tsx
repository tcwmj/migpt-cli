import type { ThinkService, DeviceRow, Role } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button, ProviderBadge, Tag } from '../../components/atoms/index.ts'
import { THINK_PROVIDERS } from '../../constants.ts'

export function ThinkServiceDetail(props: {
  selThink: string
  thinkSvcs: ThinkService[]
  devices: DeviceRow[]
  roles: Role[]
  usageThink: (id: string) => number
  onDelete: (id: string) => void
  onEdit: () => void
  onNavigate?: (view: string, id: string) => void
}) {
  const svc = props.thinkSvcs.find((s) => s.id === props.selThink)

  // 找到使用该服务的设备
  const boundDevices = props.devices.filter((d) =>
    d.thinkServiceIds?.includes(props.selThink),
  )

  return (
    <div className="form-card">
      <h3>
        <I n="bolt" size={17} /> 思考服务详情
        <span className="refs">
          被 {props.usageThink(props.selThink)} 台设备引用 · 修改模型 /
          温度后热生效
        </span>
      </h3>
      <div className="desc">音箱「大脑」的模型配置；修改后绑定设备热生效。</div>
      <div className="ro">
        <div className="grp">
          <h4>基本信息</h4>
          <div className="row">
            <div className="rr">
              <span className="k">服务名称</span>
              <span className="v">{svc?.name || '—'}</span>
            </div>
            <div className="rr">
              <span className="k">供应商</span>
              <span className="v">
                {svc ? (
                  THINK_PROVIDERS[svc.provider] ? (
                    <ProviderBadge p={THINK_PROVIDERS[svc.provider]} />
                  ) : (
                    svc.provider
                  )
                ) : (
                  '—'
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="grp">
          <h4>模型配置</h4>
          <div className="row">
            <div className="rr">
              <span className="k">模型端点</span>
              <span className="v">{svc?.model || '—'}</span>
            </div>
            <div className="rr">
              <span className="k">API Key</span>
              <span className="v">{svc?.apiKey ? '已保存' : '未配置'}</span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">温度</span>
              <span className="v">{svc?.temperature ?? 0.7}</span>
            </div>
          </div>
        </div>
        <div className="grp">
          <h4>
            Token 用量
            {svc?.tokenLimit ? (
              <span
                className="aside"
                title={`Token 已使用 ${(((svc.tokenUsed ?? 0) / svc.tokenLimit) * 100).toFixed(1)}%（${(svc.tokenUsed ?? 0).toLocaleString()} / ${svc.tokenLimit.toLocaleString()}）`}
              >
                {(((svc.tokenUsed ?? 0) / svc.tokenLimit) * 100).toFixed(1)}%
              </span>
            ) : null}
            {svc?.limitReached && <Tag tone="bad">限额已达</Tag>}
          </h4>
          <div className="row">
            <div className="rr">
              <span className="k">输入 Token</span>
              <span className="v">
                {(svc?.tokenInputUsed ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="rr">
              <span className="k">输出 Token</span>
              <span className="v">
                {(svc?.tokenOutputUsed ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="rr">
              <span className="k">合计 Token</span>
              <span className="v">
                {(svc?.tokenUsed ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="rr">
              <span className="k">Token 上限</span>
              <span className="v">
                {svc?.tokenLimit ? svc.tokenLimit.toLocaleString() : '未设置'}
              </span>
            </div>
          </div>
        </div>
        <div className="grp">
          <h4>关联服务</h4>
          <div className="row">
            <div className="rr">
              <span className="k">设备服务</span>
              <span className="v">
                {boundDevices.length > 0 ? (
                  <div className="link-list">
                    {boundDevices.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className="link-btn"
                        onClick={() => props.onNavigate?.('devices', d.id)}
                      >
                        {d.alias || d.did}
                      </button>
                    ))}
                  </div>
                ) : (
                  '无'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="acts">
        <span className="sp" />
        <Button
          variant="danger"
          icon="trash"
          onClick={() => props.onDelete(props.selThink)}
        >
          删除
        </Button>
        <Button variant="primary" icon="pencil" onClick={props.onEdit}>
          编辑
        </Button>
      </div>
    </div>
  )
}
