/* ══ QuickRangeFilter 快捷时段过滤组件 ══ */
import { useMemo } from 'react'

/** 快捷时段定义 */
export interface QuickRangeItem {
  /** 唯一标识 */
  id: string
  /** 显示文案 */
  label: string
  /** 映射为日期范围，返回 [fromKey, toKey]（yyyyMMdd） */
  toRange: () => [string, string]
}

/** 预设快捷时段列表：计算值随调用时间变化 */
function builtinRanges(): QuickRangeItem[] {
  const today = new Date()
  const d = (offset: number) => {
    const t = new Date(today)
    t.setDate(t.getDate() + offset)
    return keyOf(t)
  }
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const keyOf = (dd: Date) =>
    `${dd.getFullYear()}${pad2(dd.getMonth() + 1)}${pad2(dd.getDate())}`
  const todayStr = keyOf(today)
  return [
    {
      id: 'today',
      label: '今天',
      toRange: () => [todayStr, todayStr],
    },
    {
      id: 'last_3d',
      label: '最近 3 天',
      toRange: () => [d(-2), todayStr],
    },
    {
      id: 'last_7d',
      label: '最近 7 天',
      toRange: () => [d(-6), todayStr],
    },
    {
      id: 'last_30d',
      label: '最近 30 天',
      toRange: () => [d(-29), todayStr],
    },
    {
      id: 'this_month',
      label: '本月',
      toRange: () => [
        keyOf(new Date(today.getFullYear(), today.getMonth(), 1)),
        todayStr,
      ],
    },
  ]
}

export interface QuickRangeFilterProps {
  /** 当前选中的快捷项 id；传入空字符串或不匹配则不选中任何按钮 */
  activeId?: string
  /** 自定义快捷选项（不传则使用内置预设） */
  items?: QuickRangeItem[]
  /** 选中某项时触发 */
  onSelect: (id: string, from: string, to: string) => void
}

/**
 * 按钮式快捷时段过滤组件，参考使用统计页面时段过滤样式。
 * 用于快速切换"今天/最近3天/最近7天/最近30天/本月"等预设范围。
 */
export function QuickRangeFilter({
  activeId,
  items,
  onSelect,
}: QuickRangeFilterProps) {
  const ranges = useMemo(() => items ?? builtinRanges(), [items])
  return (
    <div className="qr-filter">
      {ranges.map((r) => {
        const on = activeId === r.id
        const [from, to] = r.toRange()
        return (
          <button
            key={r.id}
            type="button"
            className={'qr-btn' + (on ? ' on' : '')}
            onClick={() => onSelect(r.id, from, to)}
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}
