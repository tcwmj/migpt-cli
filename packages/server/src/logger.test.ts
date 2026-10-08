import { jest, describe, test, expect } from '@jest/globals'
import fs from 'node:fs/promises'

// paths.ts 模块加载即锁定真实 ~/.migptgui，这里替换为临时目录，避免污染用户数据
jest.mock('./paths.js', () => {
  const os = jest.requireActual<typeof import('node:os')>('node:os')
  const p = jest.requireActual<typeof import('node:path')>('node:path')
  const f = jest.requireActual<typeof import('node:fs')>('node:fs')
  const root = f.mkdtempSync(p.join(os.tmpdir(), 'migpt-logger-'))
  return { systemLogFile: p.join(root, 'system.log') }
})

import * as paths from './paths.js'
import {
  logger,
  sysLogBuf,
  clearSysLog,
  appendLog,
  clearDeviceLog,
  logBuffers,
  logRows,
  demoTs,
  MAX_LOG_LINES,
} from './logger.js'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('logger 结构化输出', () => {
  test('pino 记录转为人可读行（含附加字段）', () => {
    logger.info({ reqId: 'abc', n: 1 }, 'hello')
    const last = sysLogBuf[sysLogBuf.length - 1]
    expect(last).toContain('[INFO] hello')
    expect(last).toContain('reqId=abc')
    expect(last).toContain('n=1')
  })

  test('凭据字段自动脱敏', () => {
    logger.info({ apiKey: 'secret', passToken: 'tok' }, 'cred')
    const last = sysLogBuf[sysLogBuf.length - 1]
    expect(last).toContain('[REDACTED]')
    expect(last).not.toContain('secret')
    expect(last).not.toContain('tok')
  })
})

describe('系统日志落盘', () => {
  test('累积达到阈值后写入 system.log', async () => {
    for (let i = 0; i < 210; i++) logger.info(`line-${i}`)
    // 200 行触发阈值立即落盘，尾部 10 行由 500ms 定时器兜底
    await wait(700)
    const content = await fs.readFile(paths.systemLogFile, 'utf-8')
    expect(content).toContain('line-0')
    expect(content).toContain('line-209')
  })

  test('clearSysLog 清空内存缓冲与落盘文件', async () => {
    logger.info('before-clear')
    await clearSysLog()
    expect(sysLogBuf).toHaveLength(0)
    const content = await fs.readFile(paths.systemLogFile, 'utf-8')
    expect(content).toBe('')
  })
})

describe('设备日志缓冲', () => {
  test('appendLog 解析时间戳与角色，续行并入上一条', () => {
    appendLog('d1', '2026/10/08 10:00:00 [用户] 你好')
    appendLog('d1', '2026/10/08 10:00:01 [AI] 在的')
    appendLog('d1', '2026/10/08 10:00:02 [系统] 已连接')
    appendLog('d1', '续行内容')

    const rows = logRows.get('d1')!
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({
      time: '2026/10/08 10:00:00',
      kind: 'user',
      text: '[用户] 你好',
    })
    expect(rows[1].kind).toBe('ai')
    expect(rows[2].kind).toBe('system')
    expect(rows[2].text).toContain('续行内容')
    expect(logBuffers.get('d1')).toHaveLength(4)
  })

  test('超过上限时截断', () => {
    for (let i = 0; i < MAX_LOG_LINES + 10; i++) {
      appendLog('d2', `2026/10/08 10:00:00 x${i}`)
    }
    expect(logBuffers.get('d2')).toHaveLength(MAX_LOG_LINES)
    expect(logRows.get('d2')).toHaveLength(MAX_LOG_LINES)
  })

  test('clearDeviceLog 清空原始与结构化缓冲', () => {
    appendLog('d3', '2026/10/08 10:00:00 [系统] a')
    clearDeviceLog('d3')
    expect(logBuffers.has('d3')).toBe(false)
    expect(logRows.has('d3')).toBe(false)
  })
})

describe('demoTs', () => {
  test('格式化为 yyyy/MM/dd HH:mm:ss', () => {
    expect(demoTs(new Date(2026, 9, 8, 9, 5, 3))).toBe('2026/10/08 09:05:03')
  })
})
