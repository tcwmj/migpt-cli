import { describe, test, expect } from '@jest/globals'
import { writeZip, readZip, looksLikeZip, crc32, ZipError } from './zip.js'

const enc = (s: string) => Buffer.from(s, 'utf8')

describe('crc32', () => {
  test('已知向量：' + '"123456789" → 0xCBf43926', () => {
    expect(crc32(enc('123456789'))).toBe(0xcbf43926)
  })
  test('空缓冲为 0', () => {
    expect(crc32(Buffer.alloc(0))).toBe(0)
  })
})

describe('writeZip / readZip 往返', () => {
  test('单条目压缩后解出内容一致', () => {
    const data = enc(JSON.stringify({ hello: '世界', n: 123 }))
    const zip = writeZip([{ name: 'a.json', data }])
    expect(looksLikeZip(zip)).toBe(true)
    const out = readZip(zip)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('a.json')
    expect(out[0].data.toString('utf8')).toBe(data.toString('utf8'))
  })

  test('多条目均还原', () => {
    const zip = writeZip([
      { name: 'one.txt', data: enc('1') },
      { name: 'two.txt', data: enc('2') },
      { name: 'dir/three.txt', data: enc('3') },
    ])
    const out = readZip(zip)
    expect(out.map((e) => e.name)).toEqual([
      'one.txt',
      'two.txt',
      'dir/three.txt',
    ])
    expect(out.map((e) => e.data.toString())).toEqual(['1', '2', '3'])
  })

  test('deflate 对可压缩内容确实缩小', () => {
    const big = enc('A'.repeat(100_000))
    const zip = writeZip([{ name: 'big', data: big }])
    expect(zip.length).toBeLessThan(big.length / 10)
    expect(readZip(zip)[0].data.length).toBe(100_000)
  })

  test('空 zip 可解析为空条目列表', () => {
    const zip = writeZip([])
    expect(readZip(zip)).toEqual([])
  })
})

describe('readZip 校验', () => {
  test('非 zip 魔数抛错', () => {
    expect(() => readZip(enc('{"not":"zip"}'))).toThrow(ZipError)
  })

  test('数据被篡改抛错（CRC 或解压失败）', () => {
    const zip = writeZip([{ name: 'a', data: enc('payload-payload-payload') }])
    // 本地头 30 字节 + 名字长度 → 压缩数据起点；翻转数据中部一字节
    const dataAt = 30 + 1 + 'a'.length + 0 + Math.floor(10)
    const broken = Buffer.from(zip)
    broken[dataAt] ^= 0xff
    expect(() => readZip(broken)).toThrow(ZipError)
  })

  test('截断文件抛错', () => {
    const zip = writeZip([{ name: 'a', data: enc('payload-content') }])
    expect(() => readZip(zip.subarray(0, 20))).toThrow(ZipError)
  })

  test('缺失 EOCD 抛错', () => {
    // 以 PK 头开头但没有中央目录结尾标记
    expect(() =>
      readZip(Buffer.from('PK\x03\x04' + 'x'.repeat(64), 'utf8')),
    ).toThrow(/EOCD/)
  })

  test('looksLikeZip 区分 json 与 zip', () => {
    expect(looksLikeZip(enc('{"format":"migptgui-backup"}'))).toBe(false)
    expect(looksLikeZip(writeZip([{ name: 'x', data: enc('y') }]))).toBe(true)
    expect(looksLikeZip(Buffer.alloc(0))).toBe(false)
  })
})
