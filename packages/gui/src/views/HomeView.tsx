/* ══ HomeView ══ */
import { useEffect, useState } from 'react'
import { I } from '../icons.tsx'
import { Button, Tag } from '../components/atoms/index.ts'
import type {
  Credential,
  DeviceRow,
  Robot,
  Conversation,
  SpeakerModel,
  Model,
  Voice,
} from '../apis.ts'
import { type View } from '../constants.ts'
import bannerHomeImg from '../assets/banner-home.jpg'
import bannerBedroomImg from '../assets/banner-bedroom.jpg'
import bannerStudyImg from '../assets/banner-study.jpg'
import bannerKitchenImg from '../assets/banner-kitchen.jpg'
import bannerBalconyImg from '../assets/banner-balcony.jpg'
import livingImg from '../assets/scene-living.jpg'
import roomImg from '../assets/speaker-conversation.jpg'
import robotImg from '../assets/kpi-robot.jpg'
import studyImg from '../assets/scene-study.jpg'
import heroImg from '../assets/speaker-hero-multi.jpg'
import voiceImg from '../assets/kpi-voice.jpg'
import modelsImg from '../assets/model-stack.jpg'
import avatarRobotImg from '../assets/avatar-robot.jpg'
import speakerHeroImg from '../assets/speaker-hero.jpg'
import kpiRobotImg from '../assets/kpi-robot.jpg'
import kpiVoiceImg from '../assets/kpi-voice.jpg'
import avatarGirlImg from '../assets/avatar-girl.jpg'

export function HomeView(props: {
  credentials: Credential[]
  devices: DeviceRow[]
  robots: Robot[]
  conversations: Conversation[]
  models: Model[]
  voices: Voice[]
  speakerModels: SpeakerModel[]
  runningCount: number
  builtinSpeakerModelCount: number
  customSpeakerModelCount: number
  logCount: number
  onNav: (v: View) => void
  onOpenModel: () => void
  onOpenVoice: () => void
  onStartWizard: () => void
}) {
  const {
    credentials,
    devices,
    robots,
    conversations,
    models,
    voices,
    speakerModels,
    runningCount,
    builtinSpeakerModelCount,
    customSpeakerModelCount,
    logCount,
    onNav,
    onOpenModel,
    onOpenVoice,
    onStartWizard,
  } = props
  // banner 轮播状态仅首页使用，下沉到本组件局部，避免 5s 定时触发整棵 App 子树重渲染
  const [bannerIdx, setBannerIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % 5), 5000)
    return () => clearInterval(t)
  }, [])
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
              onClick={() => setBannerIdx(i)}
            />
          ))}
        </div>
        <span className="idx">{bannerIdx + 1} / 5</span>
      </div>
      <div className="kpis">
        <button className="kpi" onClick={() => onNav('credentials')}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${livingImg})` }}
          />
          <div className="kv">
            <div className="k">小米凭据</div>
            <div className="v num">{credentials.length}</div>
          </div>
          <div className="d mut">
            {credentials.map((a) => a.name).join(' + ') || '尚未接入'}
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
        <button className="kpi" onClick={() => onNav('robots')}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${robotImg})` }}
          />
          <div className="kv">
            <div className="k">对话角色</div>
            <div className="v num">{robots.length}</div>
          </div>
          <div className="d mut">
            {robots.map((r) => r.name).join(' · ') || '尚未创建'}
          </div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={() => onNav('conversations')}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${studyImg})` }}
          />
          <div className="kv">
            <div className="k">会话</div>
            <div className="v num">{conversations.length}</div>
          </div>
          <div className="d mut">
            {conversations.map((r) => r.name).join(' · ') || '尚未创建'}
          </div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={onOpenModel}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${heroImg})` }}
          />
          <div className="kv">
            <div className="k">模型</div>
            <div className="v num">{models.length}</div>
          </div>
          <div className="d mut">
            {models.map((t) => t.name).join(' · ') || '尚未配置'}
          </div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={onOpenVoice}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${voiceImg})` }}
          />
          <div className="kv">
            <div className="k">语音</div>
            <div className="v num">{voices.length}</div>
          </div>
          <div className="d mut">
            {voices.map((v) => v.name).join(' · ') || '尚未配置'}
          </div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={() => onNav('speaker-models')}>
          <span
            className="pic"
            style={{ backgroundImage: `url(${modelsImg})` }}
          />
          <div className="kv">
            <div className="k">音箱型号</div>
            <div className="v num">{speakerModels.length}</div>
          </div>
          <div className="d mut">
            内置 {builtinSpeakerModelCount} · 自定义 {customSpeakerModelCount}
          </div>
          <I n="arrowR" className="go" size={14} />
        </button>
      </div>
      <div className="panel guide">
        <div className="guide-main">
          <b className="guide-h">
            新手引导
            <span className="sub">5 步完成接入</span>
          </b>
          {[
            [
              '连接凭据',
              '选择已有小米凭据，或新建并填入小米 ID 与 passToken',
              avatarGirlImg,
            ],
            [
              '选择设备',
              '从小米凭据拉取音箱列表，选择要接入的设备',
              speakerHeroImg,
            ],
            [
              '思考服务',
              '选择或新建大模型服务，作为音箱的思考大脑',
              kpiRobotImg,
            ],
            ['语音服务', '选择或新建语音服务，决定音箱的发音音色', kpiVoiceImg],
            [
              '对话角色',
              '选择已有对话角色，或新建角色绑定角色性格',
              avatarRobotImg,
            ],
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
            开始五步连接
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

/* ══ 凭据设备 ══ */
