// ── 数据备份路由：导出（ZIP，含明文凭据）/ 导入（ZIP / JSON）/ 备份列表 / 立即备份 ──
import path from 'node:path'
import express from 'express'
import {
  applyBackup,
  buildBundle,
  bundleToZip,
  createBackupFile,
  listBackups,
  parseBackupPayload,
  BACKUP_FORMAT,
  DataValidationError,
} from '../store.js'
import { API_PREFIX, asyncHandler, fail, type RouteContext } from './shared.js'

function stamp(at = new Date()): string {
  return at.toISOString().replace(/[:.]/g, '-')
}

/**
 * 导入载荷 → Buffer：
 * · raw 中间件（ZIP / 二进制 / 文本）→ req.body 已是 Buffer
 * · 未经 raw 的直投（测试传对象）→ 序列化回文本走同一解析
 */
function toPayload(body: unknown): Buffer {
  if (Buffer.isBuffer(body)) return body
  if (typeof body === 'string') return Buffer.from(body, 'utf8')
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    if (b.format === BACKUP_FORMAT)
      return Buffer.from(JSON.stringify(b), 'utf8')
    throw new DataValidationError('导入载荷无法识别（期望 ZIP 或 JSON 备份包）')
  }
  throw new DataValidationError('导入内容为空')
}

export function registerBackupRoutes({ app }: RouteContext): void {
  // 导出：ZIP（内含 backup.json，全明文含凭据），导入新环境即可直接运行；
  // 文件等同交出全部账号密钥，务必妥善保管、勿随意分享
  app.get(
    `${API_PREFIX}/backup/export`,
    asyncHandler(async (_req, res) => {
      const bundle = await buildBundle(false)
      const zipBuf = bundleToZip(bundle)
      const name = `migptgui-export-${stamp()}.zip`
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
      res.send(zipBuf)
    }),
  )

  // 导入：支持 ZIP 与裸 JSON 双格式。raw 中间件按字节收 body
  //（上限 10mb；全局 express.json 的 1mb 不适用于二进制体），
  // ZIP 逐条校验结构与 CRC32，数据文件再做备份包格式完整校验，非法一律 400。
  app.post(
    `${API_PREFIX}/backup/import`,
    express.raw({ type: () => true, limit: '10mb' }),
    asyncHandler(async (req, res) => {
      try {
        const bundle = parseBackupPayload(toPayload(req.body))
        const result = await applyBackup(bundle)
        res.json({ success: true, imported: result })
      } catch (e) {
        if (e instanceof DataValidationError) {
          fail(res, 400, e.message)
          return
        }
        throw e
      }
    }),
  )

  // 备份列表（backupsRoot 下的备份文件）
  app.get(
    `${API_PREFIX}/backup/list`,
    asyncHandler(async (_req, res) => {
      res.json({ backups: await listBackups() })
    }),
  )

  // 立即生成一份完整备份（ZIP）
  app.post(
    `${API_PREFIX}/backup/run`,
    asyncHandler(async (_req, res) => {
      const file = await createBackupFile()
      res.json({ success: true, file: path.basename(file) })
    }),
  )
}
