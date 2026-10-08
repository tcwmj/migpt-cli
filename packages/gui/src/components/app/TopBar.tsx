/* ══ 顶栏：页面标题、搜索框与服务状态 ══ */
import { I } from '../../icons.tsx'
import { SEARCH_HINT, TITLES, type View } from '../../constants.ts'

export function TopBar(props: {
  view: View
  query: string
  onQuery: (q: string) => void
}) {
  const { view, query, onQuery } = props
  return (
    <header className="top">
      <h1>{TITLES[view]}</h1>
      <label className="search">
        <I n="search" />
        <input
          placeholder={SEARCH_HINT[view] || '搜索…'}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </label>
      <span className="sp" />
      <div className="top-right">
        <div className="srv" title="migpt-server 服务状态">
          <span className="dot" />
          <span>服务运行中</span>
          <em>v{__APP_VERSION__}</em>
        </div>
      </div>
    </header>
  )
}
