import { jest, describe, test, expect } from '@jest/globals'
import fs from 'node:fs/promises'
import p from 'node:path'

// paths.ts 模块加载即锁定真实 ~/.migptgui，这里替换为临时目录，避免污染用户数据
jest.mock('./paths.js', () => {
  const os = jest.requireActual<typeof import('node:os')>('node:os')
  const p = jest.requireActual<typeof import('node:path')>('node:path')
  const f = jest.requireActual<typeof import('node:fs')>('node:fs')
  const root = f.mkdtempSync(p.join(os.tmpdir(), 'migpt-logger-'))
  return {
    root,
    systemLogFile: p.join(root, 'system.log'),
    systemLogPrefix: p.join(root, 'system'),
    conversationsDir: p.join(root, 'conversations'),
  }
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

describe('系统日志落盘（pino-roll 按天轮转）', () => {
  const root = p.dirname(paths.systemLogFile)
  const listLogs = async () =>
    (await fs.readdir(root)).filter((n) =>
      /^system(\.\d{8}\.\d+)?\.log(\.\d+)?$/.test(n),
    )

  test('日志写入当天轮转文件（system.<日期>.N.log）', async () => {
    for (let i = 0; i < 5; i++) logger.info(`line-${i}`)
    // SonicBoom fd 异步打开 + 异步 flush，等待落盘完成
    await wait(700)
    const files = await listLogs()
    expect(files.some((n) => /^system\.\d{8}\.\d+\.log$/.test(n))).toBe(true)
    const content = (
      await Promise.all(files.map((n) => fs.readFile(p.join(root, n), 'utf-8')))
    ).join('')
    expect(content).toContain('line-0')
    expect(content).toContain('line-4')
  })

  test('clearSysLog 清空内存缓冲与全部日志文件', async () => {
    logger.info('before-clear')
    await wait(300)
    await clearSysLog()
    expect(sysLogBuf).toHaveLength(0)
    // 活动文件被截断为空；不再有历史轮转/旧版残留文件
    const files = await listLogs()
    for (const n of files) {
      expect(await fs.readFile(p.join(root, n), 'utf-8')).toBe('')
    }
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

  test('小规模写入不截断，且落盘到按天文件', async () => {
    for (let i = 0; i < 1000; i++) {
      appendLog('d2', `2026/10/08 10:00:00 x${i}`)
    }
    expect(logBuffers.get('d2')).toHaveLength(1000)
    expect(logRows.get('d2')).toHaveLength(1000)
    // WriteStream 异步打开 + 异步写入，等待落盘后再查文件
    await wait(500)
    const convDir = paths.conversationsDir
    const files = await fs.readdir(convDir)
    const target = files.filter(
      (n) => n.startsWith('d2.') && n.endsWith('.log'),
    )
    expect(target.length).toBeGreaterThanOrEqual(1)
    const content = await fs.readFile(p.join(convDir, target[0]), 'utf-8')
    expect(content.trim().split('\n').length).toBe(1000)
  })

  test('clearDeviceLog 清空原始与结构化缓冲，并删除落盘文件', async () => {
    appendLog('d3', '2026/10/08 10:00:00 [系统] a')
    await wait(300)
    clearDeviceLog('d3')
    expect(logBuffers.has('d3')).toBe(false)
    expect(logRows.has('d3')).toBe(false)
    const convDir = paths.conversationsDir
    const files = await fs.readdir(convDir)
    expect(files.some((n) => n.startsWith('d3.'))).toBe(false)
  })
})

describe('demoTs', () => {
  test('格式化为 yyyy/MM/dd HH:mm:ss', () => {
    expect(demoTs(new Date(2026, 9, 8, 9, 5, 3))).toBe('2026/10/08 09:05:03')
  })
})
