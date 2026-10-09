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

/** 可选年份范围：从 2020 到当前年份 */
const YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 2020 + 1 },
  (_, i) => 2020 + i,
)

const MONTH_LABELS = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
]

type PickerMode = 'date' | 'month' | 'year'

export interface DateRangePickerProps {
  fromKey: string
  toKey: string
  /** 有日志落盘的日期集合（null=尚未加载），用于日历置灰 */
  logDates?: Set<string> | null
  /** 是否显示底部提示文本 */
  showHint?: boolean
  /** 选择完成 */
  onSelect: (from: string, to: string) => void
}

/**
 * 中文月历：支持日期范围选择；未来日期默认禁用；
 * 点击标题可切换年/月快速选择视图。
 */
export function DateRangePicker({
  fromKey,
  toKey,
  logDates,
  showHint = true,
  onSelect,
}: DateRangePickerProps) {
  const [month, setMonth] = useState(() => dateOfKey(fromKey))
  // 范围选择锚点：null=等待选起始日期；非 null=已选起始、等待选结束日期
  const [anchor, setAnchor] = useState<string | null>(null)
  // 视图模式：date=日历，month=选月，year=选年
  const [mode, setMode] = useState<PickerMode>('date')

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
      setAnchor(k)
      return
    }
    onSelect(anchor, k)
    setAnchor(null)
  }

  // 切换到选年视图
  const pickYear = (year: number) => {
    setMonth(new Date(year, m, 1))
    setMode('month')
  }

  // 切换到选月视图
  const pickMonth = (mi: number) => {
    setMonth(new Date(y, mi, 1))
    setMode('date')
  }

  return (
    <div className="ui-cal">
      {mode === 'date' && (
        <>
          <div className="ui-cal-head">
            <button
              type="button"
              className="ui-cal-nav"
              onClick={() => go(-1)}
              aria-label="上个月"
            >
              <I n="chevronLeft" size={14} />
            </button>
            <span
              className="ui-cal-title"
              onClick={() => setMode('month')}
              style={{ cursor: 'pointer' }}
            >
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
              const hasNoLogToday =
                logDates != null && !logDates.has(k) && isToday
              const disabled: boolean = future || (hasNoLogToday ? true : false)
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
                      : hasNoLogToday
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
            <span>{anchor === null && showHint ? '点击选择起始日期' : ''}</span>
          </div>
        </>
      )}

      {mode === 'month' && (
        <>
          <div className="ui-cal-head">
            <button
              type="button"
              className="ui-cal-nav"
              onClick={() => setMode('year')}
              aria-label="选择年份"
            >
              <I n="chevronLeft" size={14} />
            </button>
            <span
              className="ui-cal-title"
              onClick={() => setMode('year')}
              style={{ cursor: 'pointer' }}
            >
              {y}年
            </span>
            <span className="ui-cal-nav" style={{ visibility: 'hidden' }}>
              <I n="chevronRight" size={14} />
            </span>
          </div>
          <div className="ui-cal-month-grid">
            {MONTH_LABELS.map((label, mi) => {
              const isCurrent = mi === m && y === now.getFullYear()
              const isFuture =
                y > now.getFullYear() ||
                (y === now.getFullYear() && mi > now.getMonth())
              return (
                <button
                  type="button"
                  key={mi}
                  className={'ui-cal-month-cell' + (isCurrent ? ' on' : '')}
                  disabled={isFuture}
                  onClick={() => pickMonth(mi)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </>
      )}

      {mode === 'year' && (
        <>
          <div className="ui-cal-head">
            <span className="ui-cal-title">选择年份</span>
            <span className="ui-cal-nav" style={{ visibility: 'hidden' }}>
              <I n="chevronRight" size={14} />
            </span>
          </div>
          <div className="ui-cal-year-grid">
            {YEAR_OPTIONS.map((year) => {
              const isCurrent = year === now.getFullYear()
              return (
                <button
                  type="button"
                  key={year}
                  className={'ui-cal-year-cell' + (isCurrent ? ' on' : '')}
                  onClick={() => pickYear(year)}
                >
                  {year}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
