// ── 日志层：结构化 logger（pino）+ 系统日志落盘 + 设备日志缓冲 ──
// pino 输出结构化记录，经自定义 destination 转成人可读行写入按天轮转的日志文件
// （pino-roll：system.<yyyy-MM-dd>.N.log，单文件 5MB 上限、保留 7 份历史），
// 并镜像到 stdout（容器日志）；不再劫持全局 console.*。
import { Writable } from 'node:stream'
import fse from 'fs-extra'
import path from 'node:path'
import pino from 'pino'
import pinoRoll from 'pino-roll'
import { systemLogFile, systemLogPrefix, root } from './paths.js'
import { getEnv } from './store/env.js'

// ── 系统日志：内存环形缓冲（GUI「系统日志」页实时展示） + pino-roll 落盘 ──
export const sysLogBuf: string[] = []
export const sysLogMax = 1000

// 落盘：pino-roll 标准轮转（按天 + 单文件 5MB + 保留 7 份），替代手写缓冲合并/轮转。
// SonicBoom 的 fd 异步打开，ready 前的日志先积压在 _rollBacklog，ready 后补写，
// 保证启动瞬间的日志不丢失；积压设上限防止极端情况下内存膨胀。
const ROLL_SIZE = '5m'
const ROLL_KEEP = 7
const BACKLOG_MAX = 5000
let _roll: { write(s: string): boolean; flushSync(): void } | undefined
let _rollBacklog: string[] = []
void pinoRoll({
  file: systemLogPrefix,
  frequency: 'daily',
  dateFormat: 'yyyyMMdd',
  size: ROLL_SIZE,
  limit: { count: ROLL_KEEP },
  extension: 'log',
})
  .then((s) => {
    _roll = s
    const pending = _rollBacklog
    _rollBacklog = []
    for (const line of pending) s.write(line)
  })
  .catch((e: unknown) => {
    // 落盘不可用（目录权限等）时不影响内存缓冲与 stdout 输出
    process.stderr.write(`[logger] 系统日志落盘初始化失败：${String(e)}\n`)
  })

/** 清空系统日志：内存缓冲 + 当天及历史轮转文件；活动文件因 SonicBoom 持有句柄而截断为空 */
export async function clearSysLog() {
  sysLogBuf.length = 0
  _rollBacklog.length = 0
  const names = await fse.readdir(root).catch(() => [] as string[])
  const logs = names.filter((n) => n.startsWith('system') && n.endsWith('.log'))
  const today = _logDateStr(new Date())
  let active = ''
  let activeN = 0
  for (const n of logs) {
    const m = n.match(/^system\.(\d{8})\.(\d+)\.log$/)
    if (m && m[1] === today && Number(m[2]) > activeN) {
      activeN = Number(m[2])
      active = n
    }
  }
  await Promise.all(
    logs
      .filter((n) => n !== active)
      .map((n) => fse.remove(path.join(root, n)).catch(() => {})),
  )
  await fse.writeFile(path.join(root, active || 'system.log'), '', 'utf8')
}

const _pad2 = (n: number) => String(n).padStart(2, '0')
const _logDateStr = (d: Date) =>
  `${d.getFullYear()}${_pad2(d.getMonth() + 1)}${_pad2(d.getDate())}`

/** 追加一行已格式化的系统日志：环形缓冲 + stdout 镜像 + 落盘 */
function _pushLine(line: string) {
  sysLogBuf.push(line)
  if (sysLogBuf.length > sysLogMax)
    sysLogBuf.splice(0, sysLogBuf.length - sysLogMax)
  const out = line + '\n'
  process.stdout.write(out)
  if (_roll) _roll.write(out)
  else {
    _rollBacklog.push(out)
    if (_rollBacklog.length > BACKLOG_MAX) _rollBacklog.shift()
  }
}

// 进程退出前同步落盘，避免缓冲中的日志丢失
process.on('exit', () => {
  try {
    for (const line of _rollBacklog) fse.appendFileSync(systemLogFile, line)
    _rollBacklog = []
    _roll?.flushSync()
  } catch {
    /* 退出阶段忽略落盘异常（flushSync 在 fd 未就绪时会抛错） */
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
  /** 本次交互消耗的 input token 数 */
  inputTokens?: number
  /** 本次交互消耗的 output token 数 */
  outputTokens?: number
  /** 本次使用的思考服务 ID（用于 failover 追踪） */
  thinkServiceId?: string
}
export const logRows = new Map<string, LogRow[]>()

// 日志行解析正则：模块级预编译
const LOG_TS_RE = /^(\d{4}[/-]\d{2}[/-]\d{2} \d{2}:\d{2}:\d{2})/
const LOG_TS_STRIP_RE = /^\d{4}[/-]\d{2}[/-]\d{2} \d{2}:\d{2}:\d{2}\s*/
const LOG_USER_RE = /^\[用户\]|\[User\]|\[Q\]|^问[:：]|用户说/
const LOG_AI_RE = /^\[AI\]|\[Assistant\]|\[A\]|^答[:：]|AI 说/
// token 用量解析正则（中英文格式）
const INPUT_TOKEN_RE =
  /(?:prompt_tokens|input_tokens|输入.*?token)[=:]\s*(\d+)/i
const OUTPUT_TOKEN_RE =
  /(?:completion_tokens|output_tokens|输出.*?token)[=:]\s*(\d+)/i

/** fire-and-forget：将 token 用量累加到角色绑定的第一个可用思考服务 */
async function accumulateTokens(
  deviceId: string,
  input: number,
  output: number,
) {
  // 动态 import 避免 logger ← entities 循环依赖
  const { getDeviceMeta, getRoles, getThinkServices, saveThinkServices } =
    await import('./store.js')
  const meta = await getDeviceMeta(deviceId)
  if (!meta?.roleId) return
  const roles = await getRoles()
  const role = roles.find((r) => r.id === meta.roleId)
  if (!role) return
  const serviceIds = role.thinkServiceIds?.length
    ? role.thinkServiceIds
    : role.thinkServiceId
      ? [role.thinkServiceId]
      : []
  if (!serviceIds.length) return
  const services = await getThinkServices()
  const target = services.find(
    (s) => serviceIds.includes(s.id) && !s.limitReached,
  )
  if (!target) return
  target.tokenInputUsed = (target.tokenInputUsed ?? 0) + input
  target.tokenOutputUsed = (target.tokenOutputUsed ?? 0) + output
  target.tokenUsed = (target.tokenUsed ?? 0) + input + output
  await saveThinkServices(services)
}

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
    const row: LogRow = { time: m[1], kind, text: body }
    // 解析 token 用量（仅 AI 行）
    if (kind === 'ai') {
      const inputMatch = body.match(INPUT_TOKEN_RE)
      const outputMatch = body.match(OUTPUT_TOKEN_RE)
      if (inputMatch) row.inputTokens = Number(inputMatch[1])
      if (outputMatch) row.outputTokens = Number(outputMatch[1])
      if (row.inputTokens || row.outputTokens) {
        void accumulateTokens(
          id,
          row.inputTokens ?? 0,
          row.outputTokens ?? 0,
        ).catch(() => {})
      }
    }
    rows.push(row)
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
