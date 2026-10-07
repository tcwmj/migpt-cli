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

export function _pushSysLog(level: string, text: string) {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const line = `[${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}] [${level}] ${text}`
  sysLogBuf.push(line)
  if (sysLogBuf.length > sysLogMax) sysLogBuf.splice(0, sysLogBuf.length - sysLogMax)
  fse.appendFile(systemLogFile, line + '\n').catch(() => {})
}

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
export const logBuffers = new Map<string, string[]>()

export function appendLog(id: string, line: string) {
  let buf = logBuffers.get(id)
  if (!buf) {
    buf = []
    logBuffers.set(id, buf)
  }
  buf.push(line)
  if (buf.length > MAX_LOG_LINES) buf.splice(0, buf.length - MAX_LOG_LINES)
}

/** 日志时间戳（如 2026/10/07 17:00:00） */
export function demoTs(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
