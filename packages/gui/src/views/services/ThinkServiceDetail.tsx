import type { ThinkService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button } from '../../components/atoms/index.ts'
import { PROVIDERS } from '../../constants.ts'

export function ThinkServiceDetail(props: {
  selThink: string
  thinkSvcs: ThinkService[]
  usageThink: (id: string) => number
  onDelete: (id: string) => void
  onEdit: () => void
}) {
  const svc = props.thinkSvcs.find((s) => s.id === props.selThink)
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
                {PROVIDERS[svc?.provider || ''] || svc?.provider || '—'}
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
