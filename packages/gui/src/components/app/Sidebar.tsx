/* ══ 侧栏：品牌、主菜单、个人中心入口与收起开关 ══ */
import { useRef, useState, type MouseEvent } from 'react'
import { I, MiLogo } from '../../icons.tsx'
import { TITLES, type View } from '../../constants.ts'

/** 主菜单项（顺序即侧栏顺序） */
const NAV: View[] = [
  'home',
  'accounts',
  'devices',
  'robots',
  'rooms',
  'think',
  'voice',
  'models',
  'logs',
  'stats',
  'syslogs',
]

/** 菜单图标：settings / profile 等非菜单视图回退为齿轮 */
const NAV_ICON: Record<View, string> = {
  home: 'home',
  accounts: 'user',
  devices: 'speaker',
  robots: 'chat',
  logs: 'log',
  syslogs: 'terminal',
  think: 'bolt',
  voice: 'mic',
  rooms: 'chats',
  models: 'gear',
  settings: 'gear',
  profile: 'gear',
  stats: 'chart',
}

export function Sidebar(props: {
  view: View
  sideOff: boolean
  onNav: (v: View) => void
  onProfile: () => void
  onToggle: () => void
}) {
  const { view, sideOff, onNav, onProfile, onToggle } = props
  // 收起态悬浮提示：单个 fixed 浮层（仅收起态显示）。
  // 旧 ::after 伪元素方案会被滚动容器（overflow-y:auto）裁掉溢出部分，
  // 且窄屏矮视口下侧栏出现纵向滚动后无法逃逸裁剪；fixed 相对视口定位
  // 不受祖先 overflow 裁剪。侧栏轨道宽 64px 贴视口左缘，水平位置固定，
  // 垂直按悬停项中心定位；滚动即隐藏，避免浮层与菜单项错位。
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onEnter = (label: string) => (e: MouseEvent<HTMLElement>) => {
    if (!sideOff) return
    if (timer.current) clearTimeout(timer.current)
    const rect = e.currentTarget.getBoundingClientRect()
    const top = rect.top + rect.height / 2
    // 延迟出现：与原 CSS transition-delay(180ms) 交互一致，扫过不误弹
    timer.current = setTimeout(() => setTip({ label, top }), 180)
  }
  const hideTip = () => {
    if (timer.current) clearTimeout(timer.current)
    setTip(null)
  }

  return (
    <aside
      className={'side' + (sideOff ? ' off' : '')}
      onMouseLeave={hideTip}
      onScroll={hideTip}
    >
      <div className="brand">
        <span className="mark">
          <MiLogo size={22} />
        </span>
        <span className="brand-txt">
          <b>MiGPT 控制面板</b>
        </span>
      </div>
      <nav>
        {NAV.map((v) => (
          <a
            key={v}
            data-label={TITLES[v]}
            className={view === v ? 'on' : ''}
            onClick={() => onNav(v)}
            onMouseEnter={onEnter(TITLES[v])}
            onMouseLeave={hideTip}
          >
            <I n={NAV_ICON[v]} />
            <span className="label">{TITLES[v]}</span>
          </a>
        ))}
      </nav>
      <div className="foot">
        <div
          className="user-card"
          onClick={onProfile}
          onMouseEnter={onEnter('个人中心')}
          onMouseLeave={hideTip}
        >
          <span className="avatar">A</span>
          <span className="foot-txt">
            <b>admin</b>
            <span>点击进入个人中心 ›</span>
          </span>
        </div>
      </div>
      <button
        className={'side-toggle' + (sideOff ? ' off' : '')}
        title={sideOff ? '展开侧栏' : '收起侧栏'}
        onClick={onToggle}
        aria-label={sideOff ? '展开侧栏' : '收起侧栏'}
      >
        <svg viewBox="0 0 12 24" className="tri" aria-hidden="true">
          <path
            d={sideOff ? 'M10 12 L3.6 1 L3.6 23 Z' : 'M3.6 12 L10 1 L10 23 Z'}
          />
        </svg>
      </button>
      {tip && (
        <div className="side-tip" style={{ top: tip.top }}>
          {tip.label}
        </div>
      )}
    </aside>
  )
}
