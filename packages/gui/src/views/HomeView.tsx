/* ══ HomeView ══ */
import { I } from '../icons.tsx'
import { Button, Tag } from '../components/atoms/index.ts'
import type {
  Account,
  DeviceRow,
  Role,
  Room,
  SpeakerModel,
  ThinkService,
  VoiceService,
} from '../apis.ts'
import { type View } from '../constants.ts'
import bannerHomeImg from '../assets/banner-home.jpg'
import bannerBedroomImg from '../assets/banner-bedroom.jpg'
import bannerStudyImg from '../assets/banner-study.jpg'
import bannerKitchenImg from '../assets/banner-kitchen.jpg'
import bannerBalconyImg from '../assets/banner-balcony.jpg'
import livingImg from '../assets/scene-living.jpg'
import roomImg from '../assets/speaker-room.jpg'
import roleImg from '../assets/kpi-role.jpg'
import studyImg from '../assets/scene-study.jpg'
import heroImg from '../assets/speaker-hero-multi.jpg'
import voiceImg from '../assets/kpi-voice.jpg'
import modelsImg from '../assets/model-stack.jpg'
import girlImg from '../assets/avatar-girl.jpg'
import catImg from '../assets/avatar-cat.jpg'
import closeImg from '../assets/speaker-close.jpg'

export function HomeView(props: {
  bannerIdx: number
  onBanner: (i: number) => void
  accounts: Account[]
  devices: DeviceRow[]
  roles: Role[]
  rooms: Room[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  models: SpeakerModel[]
  runningCount: number
  builtinModelCount: number
  customModelCount: number
  logCount: number
  onNav: (v: View) => void
  onOpenThink: () => void
  onOpenVoice: () => void
  onStartWizard: () => void
}) {
  const {
    bannerIdx,
    onBanner,
    accounts,
    devices,
    roles,
    rooms,
    thinkSvcs,
    voiceSvcs,
    models,
    runningCount,
    builtinModelCount,
    customModelCount,
    logCount,
    onNav,
    onOpenThink,
    onOpenVoice,
    onStartWizard,
  } = props
  return (
    <section data-view="home" className="on">
      <div className="hero banner">
        {[
          bannerHomeImg,
          bannerBedroomImg,
          bannerStudyImg,
          bannerKitchenImg,
          bannerBalconyImg,
        ].map((b, i) => (
          <div
            key={i}
            className={'art' + (i === bannerIdx ? ' on' : '')}
            style={{ backgroundImage: `url(${b})` }}
          />
        ))}
        <div className="dots">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={i === bannerIdx ? 'on' : ''}
              onClick={() => onBanner(i)}
            />
          ))}
        </div>
        <span className="idx">{bannerIdx + 1} / 5</span>
      </div>
      <div className="kpis">
        <button className="kpi" onClick={() => onNav('accounts')}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${livingImg})` }}
          />
          <div className="kv">
            <div className="k">云端账号</div>
            <div className="v num">{accounts.length}</div>
          </div>
          <div className="d mut">
            {accounts.map((a) => a.name).join(' + ') || '尚未接入'}
          </div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={() => onNav('devices')}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${roomImg})` }}
          />
          <div className="kv">
            <div className="k">设备服务</div>
            <div className="v num">{devices.length}</div>
          </div>
          <div className="d mut">
            {runningCount > 0
              ? `${runningCount} 台运行中`
              : devices.length > 0
                ? '部分设备待启动'
                : '尚未绑定音箱'}
          </div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={() => onNav('roles')}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${roleImg})` }}
          />
          <div className="kv">
            <div className="k">对话角色</div>
            <div className="v num">{roles.length}</div>
          </div>
          <div className="d mut">
            {roles.map((r) => r.name).join(' · ') || '尚未创建'}
          </div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={() => onNav('rooms')}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${studyImg})` }}
          />
          <div className="kv">
            <div className="k">会话群</div>
            <div className="v num">{rooms.length}</div>
          </div>
          <div className="d mut">
            {rooms.map((r) => r.name).join(' · ') || '尚未创建'}
          </div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={onOpenThink}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${heroImg})` }}
          />
          <div className="kv">
            <div className="k">思考服务</div>
            <div className="v num">{thinkSvcs.length}</div>
          </div>
          <div className="d mut">
            {thinkSvcs.map((t) => t.name).join(' · ') || '尚未配置'}
          </div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={onOpenVoice}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${voiceImg})` }}
          />
          <div className="kv">
            <div className="k">语音服务</div>
            <div className="v num">{voiceSvcs.length}</div>
          </div>
          <div className="d mut">
            {voiceSvcs.map((v) => v.name).join(' · ') || '尚未配置'}
          </div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={() => onNav('models')}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${modelsImg})` }}
          />
          <div className="kv">
            <div className="k">设备型号</div>
            <div className="v num">{models.length}</div>
          </div>
          <div className="d mut">
            内置 {builtinModelCount} · 自定义 {customModelCount}
          </div>
          <I n="arrowR" className="go" size={14} />
        </button>
      </div>
      <div className="panel guide">
        <div className="guide-main">
          <b className="guide-h">
            新手引导
            <span className="sub">3 步完成接入</span>
          </b>
          {[
            [
              '连接账号',
              '选择已有云端账号，或新建并填入小米 ID 与 passToken',
              girlImg,
            ],
            ['选择设备', '从云端账号拉取音箱列表，选择要接入的设备', catImg],
            ['对话服务', '选择已有对话角色，或新建角色绑定人设', closeImg],
          ].map(([t, d, img], i) => (
            <div
              key={t}
              style={{ display: 'flex', gap: 12, alignItems: 'center' }}
            >
              <span
                className="step-pic"
                style={{ backgroundImage: `url(${img})` }}
              />
              <div style={{ flex: 1 }}>
                <b
                  style={{
                    fontSize: 13.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Tag
                    tone="accent"
                    style={{
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'inline-grid',
                      placeItems: 'center',
                      padding: 0,
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    {i + 1}
                  </Tag>
                  {t}
                </b>
                <div
                  style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}
                >
                  {d}
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="primary"
            style={{ justifyContent: 'center', alignSelf: 'center' }}
            onClick={onStartWizard}
          >
            开始三步连接
          </Button>
        </div>
        <div
          className="guide-art"
          style={{ backgroundImage: `url(${livingImg})` }}
        />
      </div>
    </section>
  )
}

/* ══ 账号设备 ══ */
