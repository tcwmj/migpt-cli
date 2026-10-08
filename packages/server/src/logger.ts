// ── 日志层：系统日志（console 拦截 → 环形缓冲 + 落盘）与设备日志缓冲 ──
import fse from 'fs-extra'
import { systemLogFile } from './paths.js'

// ── 系统日志：拦截 console → 内存环形缓冲 + 落盘 system.log ──
export const sysLogBuf: string[] = []
export const sysLogMax = 1000
const _origLog = console.log.bind(console)
const _origInfo = console.info.bind(console)
const _origWarn = console.warn.bind(console)
const _origError = console.error.bind(console)

export function _fmtLogArgs(args: any[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a
      if (a instanceof Error) return a.stack || a.message
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    })
    .join(' ')
}

// 落盘策略：合并缓冲 + 阈值/定时触发，避免每行一次 append 系统调用；
// 超过上限时轮转为 system.log.1，防止文件无限增长。
const SYS_LOG_MAX_BYTES = 5 * 1024 * 1024
const FLUSH_INTERVAL_MS = 500
const FLUSH_LINES = 200
const FLUSH_BYTES = 64 * 1024
let _pendingChunk = ''
let _pendingLines = 0
let _flushTimer: NodeJS.Timeout | undefined
let _writeChain: Promise<void> = Promise.resolve()

async function _appendChunk(chunk: string) {
  try {
    const st = await fse.stat(systemLogFile)
    if (st.size + Buffer.byteLength(chunk) > SYS_LOG_MAX_BYTES) {
      await fse.remove(`${systemLogFile}.1`).catch(() => {})
      await fse.rename(systemLogFile, `${systemLogFile}.1`).catch(() => {})
    }
  } catch {
    /* 文件尚未生成：首次写入 */
  }
  await fse.appendFile(systemLogFile, chunk)
}

function _flushSysLog() {
  if (_flushTimer) {
    clearTimeout(_flushTimer)
    _flushTimer = undefined
  }
  if (!_pendingChunk) return
  const chunk = _pendingChunk
  _pendingChunk = ''
  _pendingLines = 0
  // 串行化落盘，避免轮转与追加交叉执行
  _writeChain = _writeChain.then(() => _appendChunk(chunk)).catch(() => {})
}

/** 清空系统日志（内存缓冲 + 待写队列 + 落盘文件），供「清空日志」接口调用 */
export async function clearSysLog() {
  sysLogBuf.length = 0
  _pendingChunk = ''
  _pendingLines = 0
  if (_flushTimer) {
    clearTimeout(_flushTimer)
    _flushTimer = undefined
  }
  await _writeChain
  await fse.writeFile(systemLogFile, '', 'utf8')
}

export function _pushSysLog(level: string, text: string) {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const line = `[${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}] [${level}] ${text}`
  sysLogBuf.push(line)
  if (sysLogBuf.length > sysLogMax)
    sysLogBuf.splice(0, sysLogBuf.length - sysLogMax)
  _pendingChunk += line + '\n'
  _pendingLines++
  if (_pendingLines >= FLUSH_LINES || _pendingChunk.length >= FLUSH_BYTES) {
    _flushSysLog()
  } else if (!_flushTimer) {
    _flushTimer = setTimeout(_flushSysLog, FLUSH_INTERVAL_MS)
    _flushTimer.unref()
  }
}

// 进程退出前同步落盘，避免缓冲中的日志丢失
process.on('exit', () => {
  if (!_pendingChunk) return
  try {
    fse.appendFileSync(systemLogFile, _pendingChunk)
    _pendingChunk = ''
  } catch {
    /* 退出阶段忽略落盘异常 */
  }
})

// console 拦截（模块首次加载即安装；index.ts 应最先 import 本模块）
console.log = (...a: any[]) => {
  _pushSysLog('INFO', _fmtLogArgs(a))
  _origLog(...a)
}
console.info = (...a: any[]) => {
  _pushSysLog('INFO', _fmtLogArgs(a))
  _origInfo(...a)
}
console.warn = (...a: any[]) => {
  _pushSysLog('WARN', _fmtLogArgs(a))
  _origWarn(...a)
}
console.error = (...a: any[]) => {
  _pushSysLog('ERROR', _fmtLogArgs(a))
  _origError(...a)
}

// ── 设备日志环形缓冲（每台设备独立的对话/运行日志） ──
export const MAX_LOG_LINES = 500
// 原始行缓冲：供「单设备原始日志」接口按行返回
export const logBuffers = new Map<string, string[]>()

// 结构化行缓冲：写入期解析一次，聚合接口（/api/logs）直接消费，免去每请求重复正则解析
export interface LogRow {
  time: string
  kind: 'user' | 'ai' | 'system'
  text: string
}
export const logRows = new Map<string, LogRow[]>()

// 日志行解析正则：模块级预编译
const LOG_TS_RE = /^(\d{4}[/-]\d{2}[/-]\d{2} \d{2}:\d{2}:\d{2})/
const LOG_TS_STRIP_RE = /^\d{4}[/-]\d{2}[/-]\d{2} \d{2}:\d{2}:\d{2}\s*/
const LOG_USER_RE = /^\[用户\]|\[User\]|\[Q\]|^问[:：]|用户说/
const LOG_AI_RE = /^\[AI\]|\[Assistant\]|\[A\]|^答[:：]|AI 说/

export function appendLog(id: string, line: string) {
  let buf = logBuffers.get(id)
  if (!buf) {
    buf = []
    logBuffers.set(id, buf)
  }
  buf.push(line)
  if (buf.length > MAX_LOG_LINES) buf.splice(0, buf.length - MAX_LOG_LINES)

  // 同步结构化：带时间戳开新条；无时间戳的续行并入上一条（多行日志不拆开）
  let rows = logRows.get(id)
  if (!rows) {
    rows = []
    logRows.set(id, rows)
  }
  const m = line.match(LOG_TS_RE)
  const body = line.replace(LOG_TS_STRIP_RE, '')
  if (m) {
    let kind: LogRow['kind'] = 'system'
    if (LOG_USER_RE.test(body)) kind = 'user'
    else if (LOG_AI_RE.test(body)) kind = 'ai'
    rows.push({ time: m[1], kind, text: body })
  } else if (rows.length) {
    rows[rows.length - 1].text += '\n' + body
  }
  if (rows.length > MAX_LOG_LINES) rows.splice(0, rows.length - MAX_LOG_LINES)
}

/** 清空某设备的原始 + 结构化日志缓冲（设备删除 / 演示数据重建时调用） */
export function clearDeviceLog(id: string) {
  logBuffers.delete(id)
  logRows.delete(id)
}

/** 日志时间戳（如 2026/10/07 17:00:00） */
export function demoTs(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
