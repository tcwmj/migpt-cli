// ── 日志层：结构化 logger（pino）+ 系统日志落盘 + 设备日志缓冲 ──
// pino 输出结构化记录，经自定义 destination 转成人可读行写入 system.log（GUI「系统日志」页直接展示）
// 并镜像到 stdout（容器日志）；不再劫持全局 console.*。
import { Writable } from 'node:stream'
import fse from 'fs-extra'
import pino from 'pino'
import { systemLogFile } from './paths.js'
import { getEnv } from './store/env.js'

// ── 系统日志：内存环形缓冲 + 轮转落盘 system.log ──
export const sysLogBuf: string[] = []
export const sysLogMax = 1000

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

/** 追加一行已格式化的系统日志：环形缓冲 + 合并落盘 */
function _pushLine(line: string) {
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

// ── pino → 人可读行 ──────────────────────────────────────────
const LEVEL_LABELS: Record<number, string> = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL',
}
// 这些字段由 pino 自身携带，不再作为附加键展示
const _RESERVED = new Set(['level', 'time', 'msg', 'pid', 'hostname'])
const _pad = (n: number) => String(n).padStart(2, '0')

function _formatRecord(rec: Record<string, unknown>): string {
  const d = new Date(Number(rec.time) || Date.now())
  const ts = `${d.getFullYear()}-${_pad(d.getMonth() + 1)}-${_pad(d.getDate())} ${_pad(
    d.getHours(),
  )}:${_pad(d.getMinutes())}:${_pad(d.getSeconds())}`
  const level = LEVEL_LABELS[Number(rec.level)] ?? String(rec.level)
  const extra: string[] = []
  for (const k of Object.keys(rec)) {
    if (_RESERVED.has(k)) continue
    const v = rec[k]
    extra.push(
      `${k}=${v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v)}`,
    )
  }
  const msg = rec.msg === undefined ? '' : String(rec.msg)
  return `[${ts}] [${level}] ${msg}${extra.length ? ' ' + extra.join(' ') : ''}`
}

const _dest = new Writable({
  write(chunk, _enc, cb) {
    for (const line of chunk.toString().split('\n')) {
      if (!line.trim()) continue
      let rec: Record<string, unknown>
      try {
        rec = JSON.parse(line) as Record<string, unknown>
      } catch {
        // 非 JSON 行（理论上不会出现）：原样落盘
        _pushLine(line)
        continue
      }
      const formatted = _formatRecord(rec)
      _pushLine(formatted)
      process.stdout.write(formatted + '\n')
    }
    cb()
  },
})

/**
 * 结构化 logger：`logger.info({ reqId, ... }, '消息')`。
 * 凭据类字段（apiKey / passToken / miPassword / ttsSecret / password / token）自动脱敏。
 * 级别由 `LOG_LEVEL` 环境变量控制，默认 info（debug 级请求日志默认不落盘）。
 */
export const logger = pino(
  {
    level: getEnv().LOG_LEVEL,
    base: null,
    redact: {
      paths: [
        'apiKey',
        'passToken',
        'miPassword',
        'ttsSecret',
        'password',
        'token',
      ],
      censor: '[REDACTED]',
    },
  },
  _dest,
)

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
