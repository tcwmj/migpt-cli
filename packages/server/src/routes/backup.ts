// ── 数据备份路由：导出（脱敏）/ 导入 / 备份列表 / 立即备份 ──────────
import path from 'node:path'
import {
  applyBackup,
  buildBundle,
  createBackupFile,
  listBackups,
  DataValidationError,
} from '../store.js'
import { API_PREFIX, asyncHandler, fail, type RouteContext } from './shared.js'

function stamp(at = new Date()): string {
  return at.toISOString().replace(/[:.]/g, '-')
}

export function registerBackupRoutes({ app }: RouteContext): void {
  // 导出：默认脱敏（抹除明文凭据），可直接分享 / 迁移
  app.get(
    `${API_PREFIX}/backup/export`,
    asyncHandler(async (_req, res) => {
      const bundle = await buildBundle(true)
      const name = `migptgui-export-${stamp()}.json`
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
      res.send(JSON.stringify(bundle, null, 2))
    }),
  )

  // 导入：覆盖同 id、补齐缺失；包非法回 400
  app.post(
    `${API_PREFIX}/backup/import`,
    asyncHandler(async (req, res) => {
      try {
        const result = await applyBackup(req.body)
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

  // 立即生成一份完整备份（未脱敏）
  app.post(
    `${API_PREFIX}/backup/run`,
    asyncHandler(async (_req, res) => {
      const file = await createBackupFile()
      res.json({ success: true, file: path.basename(file) })
    }),
  )
}
