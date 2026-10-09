/* ══ LogDateFilter 复合组件 ══
 *  将 QuickRangeFilter（快捷时段）与 DateRangePicker（日历选择）组合为单一入口。
 *  点击触发按钮弹出面板，左侧为快捷过滤、右侧为日历。*/
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { I } from '../icons.tsx'
import {
  DateRangePicker,
  type DateRangePickerProps,
} from './DateRangePicker.tsx'
import { QuickRangeFilter, type QuickRangeItem } from './QuickRangeFilter.tsx'

const pad2 = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) =>
  `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
const dateOfKey = (k: string) =>
  new Date(
    Number(k.slice(0, 4)),
    Number(k.slice(4, 6)) - 1,
    Number(k.slice(6, 8)),
  )
const TODAY_KEY = keyOf(new Date())

/** 格式化日期便于展示：2026-10-09 */
const fmtDate = (k: string) => {
  const d = dateOfKey(k)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 检查当前范围是否匹配某个快捷项 */
function matchQuickItem(
  fromKey: string,
  toKey: string,
  item: QuickRangeItem,
): boolean {
  const [f, t] = item.toRange()
  return fromKey === f && toKey === t
}

export interface LogDateFilterProps {
  /** 当前起始日期（yyyyMMdd） */
  fromKey: string
  /** 当前结束日期（yyyyMMdd） */
  toKey: string
  /** 有日志落盘的日期集合，传给日历组件 */
  logDates?: DateRangePickerProps['logDates']
  /** 自定义快捷选项 */
  quickItems?: QuickRangeItem[]
  /** 范围变化回调 */
  onRangeChange: (from: string, to: string) => void
}

/**
 * 复合日期范围过滤组件。
 * 点击按钮弹出面板：左侧 QuickRangeFilter 快捷选中，右侧 DateRangePicker 精确选择。
 * 弹出面板中快捷过滤选中或日历选择范围后均自动关闭面板。
 */
export function LogDateFilter({
  fromKey,
  toKey,
  logDates,
  quickItems,
  onRangeChange,
}: LogDateFilterProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const single = fromKey === toKey
  const viewingToday = single && fromKey === TODAY_KEY
  const rangeLabel = single
    ? fmtDate(fromKey)
    : `${fmtDate(fromKey)} ~ ${fmtDate(toKey)}`

  // 内置快捷预设
  const builtins: QuickRangeItem[] = useMemo(
    () => [
      {
        id: 'today',
        label: '今天',
        toRange: () => [TODAY_KEY, TODAY_KEY],
      },
      {
        id: 'last_3d',
        label: '最近 3 天',
        toRange: () => {
          const s = new Date()
          s.setDate(s.getDate() - 2)
          return [keyOf(s), TODAY_KEY]
        },
      },
      {
        id: 'last_7d',
        label: '最近 7 天',
        toRange: () => {
          const s = new Date()
          s.setDate(s.getDate() - 6)
          return [keyOf(s), TODAY_KEY]
        },
      },
      {
        id: 'last_30d',
        label: '最近 30 天',
        toRange: () => {
          const s = new Date()
          s.setDate(s.getDate() - 29)
          return [keyOf(s), TODAY_KEY]
        },
      },
      {
        id: 'this_month',
        label: '本月',
        toRange: () => {
          const now = new Date()
          return [
            keyOf(new Date(now.getFullYear(), now.getMonth(), 1)),
            TODAY_KEY,
          ]
        },
      },
    ],
    [],
  )

  const items = quickItems ?? builtins
  // 当前快捷高亮：检查是否有预设项匹配当前范围
  const activeQuick =
    items.find((i) => matchQuickItem(fromKey, toKey, i))?.id ?? ''

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const handleChange = useCallback(
    (f: string, t: string) => {
      onRangeChange(f, t)
      setOpen(false)
    },
    [onRangeChange],
  )

  return (
    <div className="ldf-wrap" ref={wrapRef}>
      <button
        type="button"
        className={
          'ldf-btn' +
          (viewingToday ? '' : ' historical') +
          (open ? ' open' : '')
        }
        onClick={() => setOpen((v) => !v)}
        title="选择查看日期或范围"
      >
        <I n="calendar" size={15} />
        <span className="d num">{rangeLabel}</span>
        <I n="down" size={11} className="caret" />
      </button>
      {open && (
        <div className="ldf-pop">
          <div className="ldf-pop-left">
            <QuickRangeFilter
              activeId={activeQuick}
              items={items}
              onSelect={(_id, from, to) => handleChange(from, to)}
            />
          </div>
          <div className="ldf-pop-sep" />
          <div className="ldf-pop-right">
            <DateRangePicker
              fromKey={fromKey}
              toKey={toKey}
              logDates={logDates}
              onSelect={(f, t) => handleChange(f, t)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
