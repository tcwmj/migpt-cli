/* ══ DateRangePicker 可复用日历组件 ══ */
import { useState } from 'react'
import { I } from '../icons.tsx'

const pad2 = (n: number) => String(n).padStart(2, '0')
/** 日期键（yyyyMMdd） */
const keyOf = (d: Date) =>
  `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
const dateOfKey = (k: string) =>
  new Date(
    Number(k.slice(0, 4)),
    Number(k.slice(4, 6)) - 1,
    Number(k.slice(6, 8)),
  )

const TODAY_KEY = keyOf(new Date())

/** 月视图网格（周一为第一列；空位补 null） */
const monthGrid = (y: number, m: number): (Date | null)[] => {
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  const total = new Date(y, m + 1, 0).getDate()
  const cells: (Date | null)[] = Array.from({ length: offset }, () => null)
  for (let d = 1; d <= total; d++) cells.push(new Date(y, m, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** 中文化日期文案：2026年10月9日 */
const cnDate = (k: string) => {
  const d = dateOfKey(k)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export interface DateRangePickerProps {
  fromKey: string
  toKey: string
  /** 有日志落盘的日期集合（null=尚未加载），用于日历置灰 */
  logDates?: Set<string> | null
  /** 日期是否可以点击的额外判断（在 logDates 基础上增加） */
  canSelect?: (k: string) => boolean
  /** 选择完成 */
  onSelect: (from: string, to: string) => void
}

/**
 * 中文月历：支持日期范围选择；未来日期默认禁用；
 * 通过 logDates 控制无日志日期的禁用；通过 canSelect 扩展额外判断。
 */
export function DateRangePicker({
  fromKey,
  toKey,
  logDates,
  onSelect,
}: DateRangePickerProps) {
  const [month, setMonth] = useState(() => dateOfKey(fromKey))
  // 范围选择锚点：null=等待选起始日期；非 null=已选起始、等待选结束日期
  const [anchor, setAnchor] = useState<string | null>(null)
  const y = month.getFullYear()
  const m = month.getMonth()
  const now = new Date()
  const atLatest = y === now.getFullYear() && m === now.getMonth()
  const go = (delta: number) => setMonth(new Date(y, m + delta, 1))
  const pick = (k: string) => {
    if (anchor === null) {
      setAnchor(k)
      return
    }
    if (k < anchor) {
      // 早于起始日期：重置为新的起始
      setAnchor(k)
      return
    }
    onSelect(anchor, k)
    setAnchor(null)
  }
  return (
    <div className="ui-cal">
      <div className="ui-cal-head">
        <button
          type="button"
          className="ui-cal-nav"
          onClick={() => go(-1)}
          aria-label="上个月"
        >
          <I n="chevronLeft" size={14} />
        </button>
        <span className="ui-cal-title">
          {y}年{m + 1}月
        </span>
        <button
          type="button"
          className="ui-cal-nav"
          onClick={() => go(1)}
          disabled={atLatest}
          aria-label="下个月"
        >
          <I n="chevronRight" size={14} />
        </button>
      </div>
      <div className="ui-cal-grid">
        {monthGrid(y, m).map((day, i) => {
          if (!day) return <span key={'e' + i} />
          const k = keyOf(day)
          const isToday = k === TODAY_KEY
          const future = k > TODAY_KEY
          const noLog = !logDates || !isToday || logDates.has(k)
          const disabled = future || noLog
          // 已选范围高亮（含锚点到悬停前的预选区间）
          const inRange =
            !disabled &&
            ((anchor !== null && k >= anchor) ||
              (anchor === null && k >= fromKey && k <= toKey))
          return (
            <button
              type="button"
              key={k}
              className={
                'ui-cal-day' +
                (inRange ? ' in' : '') +
                (anchor !== null
                  ? k === anchor
                    ? ' on'
                    : ''
                  : k === fromKey || k === toKey
                    ? ' on'
                    : '') +
                (isToday ? ' today' : '')
              }
              disabled={disabled}
              title={
                future
                  ? '未来日期暂无日志'
                  : noLog
                    ? '当天没有日志记录'
                    : undefined
              }
              onClick={() => pick(k)}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
      <div className="ui-cal-foot">
        <span>
          {anchor === null
            ? '灰色日期暂无日志 · 点击选择起始日期'
            : `起始 ${cnDate(anchor)} · 点击选择结束日期`}
        </span>
        <button
          type="button"
          className="ui-cal-today"
          disabled={
            anchor === null && fromKey === TODAY_KEY && toKey === TODAY_KEY
          }
          onClick={() => {
            setAnchor(null)
            onSelect(TODAY_KEY, TODAY_KEY)
          }}
        >
          回到今天
        </button>
      </div>
    </div>
  )
}
