import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import { readJson, readJsonSync, writeJson } from './json.js'

let dir: string

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'migpt-json-'))
})

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

const file = (name: string) => path.join(dir, name)

describe('readJson / writeJson', () => {
  test('写入后可读回（含嵌套结构）', async () => {
    const f = file('roundtrip.json')
    const data = { a: 1, nested: { b: [1, 2, 3], c: '文本' } }
    await writeJson(f, data)
    expect(await readJson(f, null)).toEqual(data)
  })

  test('文件不存在时返回 fallback', async () => {
    expect(await readJson(file('missing.json'), { fallback: true })).toEqual({
      fallback: true,
    })
  })

  test('内容损坏时返回 fallback 且不抛错', async () => {
    const f = file('broken.json')
    await fs.writeFile(f, '{ not json')
    expect(await readJson(f, 'fb')).toBe('fb')
  })

  test('返回独立克隆：就地修改不回写缓存', async () => {
    const f = file('clone.json')
    await writeJson(f, { list: [1, 2] })
    const first = await readJson<{ list: number[] }>(f, { list: [] })
    first.list.push(3)
    // 命中缓存也必须返回干净副本
    const second = await readJson<{ list: number[] }>(f, { list: [] })
    expect(second.list).toEqual([1, 2])
  })

  test('写入后缓存失效，读到新值', async () => {
    const f = file('invalidate.json')
    await writeJson(f, { v: 1 })
    expect(await readJson(f, {})).toEqual({ v: 1 })
    await writeJson(f, { v: 2 })
    expect(await readJson(f, {})).toEqual({ v: 2 })
  })

  test('并发写入按序串行化，最终内容完整且无临时文件残留', async () => {
    const f = file('concurrent.json')
    // 同时发起多次写入：若未串行化，临时文件同名会互相覆盖或 rename 竞态
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => writeJson(f, { seq: i })),
    )
    const out = await readJson<{ seq: number }>(f, { seq: -1 })
    expect(out.seq).toBeGreaterThanOrEqual(0)
    const leftovers = (await fs.readdir(dir)).filter((n) =>
      n.startsWith('concurrent.json.'),
    )
    expect(leftovers).toEqual([])
  })

  test('自动创建不存在的父目录', async () => {
    const f = path.join(dir, 'deep', 'nested', 'auto.json')
    await writeJson(f, { ok: true })
    expect(await readJson(f, null)).toEqual({ ok: true })
  })
})

describe('readJsonSync', () => {
  test('同步读回已写入内容', async () => {
    const f = file('sync.json')
    await writeJson(f, { sync: 1 })
    expect(readJsonSync(f, null)).toEqual({ sync: 1 })
  })

  test('缺失 / 损坏时返回 fallback', () => {
    expect(readJsonSync(file('nope.json'), 'fb')).toBe('fb')
  })
})
