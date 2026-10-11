import { useEffect, useCallback } from 'react'
import { type View } from '../constants.ts'

const VALID_VIEWS: View[] = [
  'home',
  'credentials',
  'devices',
  'robots',
  'conversations',
  'models',
  'voices',
  'speaker-models',
  'chat-logs',
  'settings',
  'profile',
  'system-logs',
  'stats',
]

/** 从 URL hash 解析视图名称 */
function parseView(hash: string): View {
  const v = hash.replace(/^#\/?/, '').split('/')[0] as View
  return VALID_VIEWS.includes(v) ? v : 'home'
}

/**
 * Hash 路由同步 hook：将视图状态与 URL hash 双向绑定
 * - 初始化时从 hash 读取视图
 * - 视图变化时更新 hash
 * - 浏览器前进/后退时同步视图
 */
export function useHashRouter(
  view: View,
  setView: (v: View) => void,
  setSettingTab?: (t: 'models' | 'voices') => void,
): void {
  // 初始化：从 hash 读取初始视图
  useEffect(() => {
    const initial = parseView(window.location.hash)
    if (initial !== 'home') {
      setView(initial)
      // 如果是 think 或 voice 视图，同步设置 settingTab
      if (setSettingTab && (initial === 'models' || initial === 'voices')) {
        setSettingTab(initial)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 视图变化时更新 hash
  useEffect(() => {
    const current = parseView(window.location.hash)
    if (current !== view) {
      window.history.pushState(null, '', `#/${view}`)
    }
  }, [view])

  // 浏览器前进/后退
  useEffect(() => {
    const handler = () => {
      const v = parseView(window.location.hash)
      setView(v)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [setView])
}

/** 创建带 hash 同步的导航函数 */
export function useNav(
  setView: (v: View) => void,
  setSettingTab: (t: 'models' | 'voices') => void,
  setQuery: (q: string) => void,
): (v: View) => void {
  return useCallback(
    (v: View) => {
      setView(v)
      if (v === 'models') setSettingTab('models')
      if (v === 'voices') setSettingTab('voices')
      setQuery('')
    },
    [setView, setSettingTab, setQuery],
  )
}
