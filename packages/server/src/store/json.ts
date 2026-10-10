// ── JSON 持久化原语：读缓存、原子写与写队列 ──
import path from 'node:path'
import fs from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import fse from 'fs-extra'
import writeFileAtomic from 'write-file-atomic'

// ── JSON 读缓存：按文件 mtime/size 校验，命中即免去重复读盘与解析 ──
// 写入统一走 writeJson 的原子替换（临时文件 + rename），mtime 必变，故无需显式失效；
// 设备目录被整体删除时 stat 抛 ENOENT，直接回落 fallback，也不会读到旧值。
interface _JsonCacheEntry {
  mtimeMs: number
  size: number
  data: unknown
}
const _jsonCache = new Map<string, _JsonCacheEntry>()

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    // 先 stat 后 read：若写入恰好落在两者之间，下次读取因 mtime/size 变化会重新读盘
    const st = await fs.stat(file)
    const hit = _jsonCache.get(file)
    if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) {
      return structuredClone(hit.data) as T
    }
    const data = JSON.parse(await fs.readFile(file, 'utf-8'))
    _jsonCache.set(file, { mtimeMs: st.mtimeMs, size: st.size, data })
    // 返回克隆，保持「每次解析得到独立对象」的既有语义，避免调用方就地修改（如 robots.push）污染缓存
    return structuredClone(data) as T
  } catch {
    _jsonCache.delete(file)
    return fallback
  }
}

// 同一文件的写入串行化：并发「读-改-写」若交叉执行会丢更新（后写覆盖前写），
// 临时文件同名也会互相覆盖。这里按文件维护一条 Promise 队列，保证写序稳定。
const _writeQueues = new Map<string, Promise<unknown>>()

async function _writeJsonAtomic(file: string, data: unknown) {
  await fse.ensureDir(path.dirname(file))
  // 原子写交给 write-file-atomic（临时文件 + fsync + rename），
  // 修复断电/崩溃在 rename 前留下脏文件的边角，并免去手写临时文件管理
  await writeFileAtomic(file, JSON.stringify(data, null, 2))
}

export function writeJson(file: string, data: unknown): Promise<void> {
  const prev = _writeQueues.get(file) ?? Promise.resolve()
  // 前序写入无论成败都继续排队，避免一次失败阻塞该文件后续所有写入
  const run = prev.then(
    () => _writeJsonAtomic(file, data),
    () => _writeJsonAtomic(file, data),
  )
  _writeQueues.set(file, run)
  // 队列排空后清理映射，避免长生命周期进程 Map 无限增长
  const cleanup = () => {
    if (_writeQueues.get(file) === run) _writeQueues.delete(file)
  }
  run.then(cleanup, cleanup)
  return run
}

// 同步读取小文件（认证中间件是同步的）
export function readJsonSync<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return fallback
  }
}
