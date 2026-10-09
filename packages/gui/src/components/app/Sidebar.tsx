/* ══ 侧栏：品牌、主菜单、个人中心入口与收起开关 ══ */
import { I, MiLogo } from '../../icons.tsx'
import { TITLES, type View } from '../../constants.ts'

/** 主菜单项（顺序即侧栏顺序） */
const NAV: View[] = [
  'home',
  'accounts',
  'devices',
  'roles',
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
  roles: 'chat',
  logs: 'log',
  syslogs: 'terminal',
  think: 'bolt',
  voice: 'mic',
  rooms: 'users',
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
  return (
    <aside className={'side' + (sideOff ? ' off' : '')}>
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
          >
            <I n={NAV_ICON[v]} />
            <span className="label">{TITLES[v]}</span>
          </a>
        ))}
      </nav>
      <div className="foot">
        <div className="user-card" onClick={onProfile}>
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
    </aside>
  )
}
