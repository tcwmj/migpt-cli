// ── 最小 ZIP 读写（零依赖，仅够备份包使用）──────────────────────
// 写：单/多条目，deflate 压缩（Node 内置 zlib），标准本地头 + 中央目录 + EOCD。
// 读：从 EOCD → 中央目录逐条定位本地头，支持 method 0（stored）与 8（deflate），
//     每条强制校验解压后长度与 CRC32——结构或内容损坏即抛错（导入方据此回 400）。
// 不处理：加密、zip64、分卷、注释超长（对备份包场景无需要）。
import { deflateRawSync, inflateRawSync } from 'node:zlib'

export interface ZipEntry {
  name: string
  data: Buffer
}

/** zip 结构错误（格式非法 / 校验失败），message 面向用户可读 */
export class ZipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZipError'
  }
}

// ── CRC32（ZIP 官方多项式 0xEDB88320）──────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

export function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** 本地文件 / 中央目录公共签名魔数 */
const SIG_LOCAL = 0x04034b50
const SIG_CENTRAL = 0x02014b50
const SIG_EOCD = 0x06054b50

/** 把 Date 编码为 DOS time/date（zip 字段） */
function dosDateTime(at = new Date()): { time: number; date: number } {
  const time =
    (at.getHours() << 11) | (at.getMinutes() << 5) | (at.getSeconds() >> 1)
  const date =
    ((at.getFullYear() - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate()
  return { time, date }
}

/** 打包为 zip Buffer（method 8 = deflate） */
export function writeZip(entries: ZipEntry[], at = new Date()): Buffer {
  const { time, date } = dosDateTime(at)
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8')
    if (nameBuf.includes(0)) throw new ZipError('条目名含非法字符')
    const comp = deflateRawSync(e.data, { level: 9 })
    const crc = crc32(e.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(SIG_LOCAL, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0, 6) // flags（UTF-8 名字走常规导出，读取按 utf8 解码）
    local.writeUInt16LE(8, 8) // method = deflate
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(comp.length, 18)
    local.writeUInt32LE(e.data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28) // extra len
    locals.push(local, nameBuf, comp)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(SIG_CENTRAL, 0)
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6) // version needed
    central.writeUInt16LE(0, 8) // flags
    central.writeUInt16LE(8, 10) // method
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(date, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(comp.length, 20)
    central.writeUInt32LE(e.data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt16LE(0, 30) // extra
    central.writeUInt16LE(0, 32) // comment
    central.writeUInt16LE(0, 34) // disk number
    central.writeUInt16LE(0, 36) // internal attrs
    central.writeUInt32LE(0, 38) // external attrs
    central.writeUInt32LE(offset, 42) // local header offset
    centrals.push(central, nameBuf)

    offset += local.length + nameBuf.length + comp.length
  }
  const centralBuf = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(SIG_EOCD, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)
  return Buffer.concat([...locals, centralBuf, eocd])
}

/**
 * 解析并校验 zip：返回全部条目（含校验通过的解压数据）。
 * 校验点：EOCD 存在、中央目录签名逐条匹配、条目数量一致、
 * 本地头签名一致、压缩数据不越界、解压长度与 CRC32 匹配。
 * 任一点失败抛 ZipError（调用方据此拒绝导入）。
 */
export function readZip(buf: Buffer): ZipEntry[] {
  if (buf.length < 22) throw new ZipError('文件过小，不是合法 zip')
  // EOCD 只能在尾部 64KB+22 内（本工具产出的 EOCD 恒在末尾，仍按标准反向扫描）
  const scanFrom = Math.max(0, buf.length - 22 - 0xffff)
  let eocdAt = -1
  for (let i = buf.length - 22; i >= scanFrom; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) {
      eocdAt = i
      break
    }
  }
  if (eocdAt < 0)
    throw new ZipError(
      '未找到 zip 中央目录结尾标记（EOCD），文件不是合法 zip 或已损坏',
    )
  if (buf.readUInt16LE(eocdAt + 4) !== 0 || buf.readUInt16LE(eocdAt + 6) !== 0)
    throw new ZipError('不支持分卷 zip')
  const total = buf.readUInt16LE(eocdAt + 10)
  const cdSize = buf.readUInt32LE(eocdAt + 12)
  const cdOffset = buf.readUInt32LE(eocdAt + 16)
  if (cdOffset + cdSize > eocdAt)
    throw new ZipError('zip 中央目录越界，文件已损坏')
  if (total === 0xffff || cdOffset === 0xffffffff)
    throw new ZipError('不支持 zip64')

  const out: ZipEntry[] = []
  let p = cdOffset
  for (let n = 0; n < total; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== SIG_CENTRAL)
      throw new ZipError(`zip 中央目录第 ${n + 1} 条签名非法，文件已损坏`)
    const method = buf.readUInt16LE(p + 10)
    const crc = buf.readUInt32LE(p + 16)
    const compSize = buf.readUInt32LE(p + 20)
    const uncompSize = buf.readUInt32LE(p + 24)
    const nameLen = buf.readUInt16LE(p + 28)
    const cdExtra = buf.readUInt16LE(p + 30)
    const localOff = buf.readUInt32LE(p + 42)
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8')
    p += 46 + nameLen + cdExtra

    // 定位并校验本地头（名字/扩展长度以本地头为准，可与中央目录不同）
    if (localOff + 30 > buf.length || buf.readUInt32LE(localOff) !== SIG_LOCAL)
      throw new ZipError(`条目 ${name} 本地头非法，文件已损坏`)
    const lNameLen = buf.readUInt16LE(localOff + 26)
    const lExtraLen = buf.readUInt16LE(localOff + 28)
    const dataAt = localOff + 30 + lNameLen + lExtraLen
    if (dataAt + compSize > buf.length)
      throw new ZipError(`条目 ${name} 数据越界，文件已损坏`)
    const comp = buf.subarray(dataAt, dataAt + compSize)
    let data: Buffer
    if (method === 0) {
      data = Buffer.from(comp)
    } else if (method === 8) {
      try {
        data = inflateRawSync(comp)
      } catch {
        throw new ZipError(`条目 ${name} 解压失败，文件已损坏`)
      }
    } else {
      throw new ZipError(
        `条目 ${name} 使用了不支持的压缩方式（method=${method}）`,
      )
    }
    if (data.length !== uncompSize)
      throw new ZipError(`条目 ${name} 解压长度不符，文件已损坏`)
    if (crc32(data) !== crc)
      throw new ZipError(`条目 ${name} CRC 校验失败，文件内容已损坏`)
    out.push({ name, data })
  }
  return out
}

/** 是否为 zip 文件魔数（PK\x03\x04；空 zip 的 PK\x05\x06 也识别） */
export function looksLikeZip(buf: Buffer): boolean {
  return (
    buf.length >= 4 &&
    (buf.readUInt32LE(0) === SIG_LOCAL || buf.readUInt32LE(0) === SIG_EOCD)
  )
}
