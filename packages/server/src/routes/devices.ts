// ── 设备管理：状态、CRUD、启动/停止、设备日志 ─────────────────────
import path from 'node:path'
import { nanoid } from 'nanoid'
import createDebug from 'debug'
import { getAllStatus, run, stop, type RunConfig } from '@migptgui/controller'
import { type GuiConfig } from '@migptgui/options'
import { devicesRoot } from '../paths.js'
import {
  getDeviceMeta,
  listDeviceMetas,
  getAccountById,
  assertUniqueName,
  loadDeviceConfig,
  saveDeviceMeta,
  saveDeviceConfig,
  saveDeviceCredentials,
  removeDevice,
} from '../store.js'
import { buildRunConfig, resolveBindings } from '../services.js'
import {
  redactDeviceMeta,
  redactDeviceMetas,
  redactGuiConfig,
  redactBindings,
} from '../redact.js'
import { logBuffers, appendLog, clearDeviceLog } from '../logger.js'
import type { DeviceMeta } from '../types.js'
import {
  API_PREFIX,
  pick,
  DEVICE_META_FIELDS,
  ok,
  fail,
  type RouteContext,
  asyncHandler,
} from './shared.js'
import { assertSafeId } from '../errors.js'

const dAudio = createDebug('@migptgui/server:audio')

export function registerDeviceRoutes({ app }: RouteContext): void {
  // ── 状态：全部设备 ─────────────────────────────────────────────
  app.get(
    `${API_PREFIX}/status`,
    asyncHandler(async (req, res) => {
      const devices = await listDeviceMetas()
      const status = getAllStatus()
      res.json({
        devices: redactDeviceMetas(devices).map((meta) => ({
          ...meta,
          running: !!status[meta.id],
        })),
      })
    }),
  )

  app.get(
    `${API_PREFIX}/devices`,
    asyncHandler(async (req, res) => {
      const devices = await listDeviceMetas()
      const status = getAllStatus()
      res.json(
        redactDeviceMetas(devices).map((meta) => ({
          ...meta,
          running: !!status[meta.id],
        })),
      )
    }),
  )

  app.post(
    `${API_PREFIX}/devices`,
    asyncHandler(async (req, res) => {
      const body = req.body as {
        alias: string
        did: string
        speakerModel?: string
        roleId?: string
        accountId?: string
        thinkServiceIds?: string[]
        thinkServiceId?: string
        voiceId?: string
        roomRef?: string
        roomName?: string
        roomDescription?: string
      }
      if (!body.alias || !body.did) {
        fail(res, 400, '别名和设备 ID 必填')
        return
      }
      const metas = await listDeviceMetas()
      // 唯一性按「账号」维度：同账号下设备 ID 唯一（防止同一设备多套配置）；不同账号允许相同 ID/名称（支持设备切换账号）
      const sameAcct = body.accountId
        ? metas.filter((m) => m.accountId === body.accountId)
        : metas
      if (sameAcct.some((m) => m.did === body.did)) {
        fail(res, 409, '该账号下已接入此设备（设备 ID 相同），请勿重复配置')
        return
      }
      const dup = assertUniqueName(sameAcct, body.alias, undefined, '设备名称')
      if (dup) {
        fail(res, 409, dup)
        return
      }
      const id = nanoid(8)
      const meta: DeviceMeta = {
        id,
        alias: body.alias,
        did: body.did,
        speakerModel: body.speakerModel,
        roleId: body.roleId,
        accountId: body.accountId,
        thinkServiceIds: body.thinkServiceIds,
        thinkServiceId: body.thinkServiceId,
        voiceId: body.voiceId,
        roomRef: body.roomRef,
        roomName: body.roomName,
        roomDescription: body.roomDescription,
        ttsSecret: nanoid(),
        createdAt: Date.now(),
      }
      await saveDeviceMeta(id, meta)
      // 按绑定链编译初始配置（编译投影）
      const { config } = await buildRunConfig(meta)
      await saveDeviceConfig(id, config)
      res.json({ id, meta: redactDeviceMeta(meta) })
    }),
  )

  app.get(
    `${API_PREFIX}/devices/:id`,
    asyncHandler(async (req, res) => {
      assertSafeId(req.params.id)
      const meta = await getDeviceMeta(req.params.id)
      if (!meta) {
        fail(res, 404, '设备不存在')
        return
      }
      const config = await loadDeviceConfig(req.params.id)
      // 绑定关系（含来源标注：设备覆盖 / 继承人设 / 全局默认）
      const bindings = await resolveBindings(meta)
      // 响应脱敏：meta / config / bindings 中的凭据一律不回传明文
      res.json({
        meta: redactDeviceMeta(meta),
        config: config ? redactGuiConfig(config) : config,
        bindings: redactBindings(bindings),
      })
    }),
  )

  app.put(
    `${API_PREFIX}/devices/:id`,
    asyncHandler(async (req, res) => {
      const id = assertSafeId(req.params.id)
      const meta = await getDeviceMeta(id)
      if (!meta) {
        fail(res, 404, '设备不存在')
        return
      }
      const body = req.body as {
        meta?: Partial<DeviceMeta>
        config?: GuiConfig
      }
      if (body.meta) {
        // 唯一性按「账号」维度校验（同账号 did 唯一 / 同账号内名称唯一），排除自身
        if (
          body.meta.alias !== undefined ||
          body.meta.did !== undefined ||
          body.meta.accountId !== undefined
        ) {
          const allMetas = await listDeviceMetas()
          const nextAcct =
            body.meta.accountId !== undefined
              ? body.meta.accountId
              : meta.accountId
          const sameAcct = nextAcct
            ? allMetas.filter((m) => m.accountId === nextAcct && m.id !== id)
            : allMetas.filter((m) => m.id !== id)
          const nextDid = body.meta.did !== undefined ? body.meta.did : meta.did
          if (sameAcct.some((m) => m.did === nextDid)) {
            fail(res, 409, '该账号下已接入此设备（设备 ID 相同），请勿重复配置')
            return
          }
          if (body.meta.alias !== undefined) {
            const dup = assertUniqueName(
              sameAcct,
              body.meta.alias,
              id,
              '设备名称',
            )
            if (dup) {
              fail(res, 409, dup)
              return
            }
          }
        }
        // 脱敏后前端不回读 ttsSecret：空值视为「未修改」，避免误清空设备 TTS 路径令牌
        const patch = pick<DeviceMeta>(body.meta, DEVICE_META_FIELDS)
        if (!patch.ttsSecret) delete patch.ttsSecret
        const nextMeta: DeviceMeta = { ...meta, ...patch, id }
        await saveDeviceMeta(id, nextMeta)
        // 绑定字段变化时重新编译投影，保证 migptgui.json 与绑定链一致
        if (
          body.meta.roleId !== undefined ||
          body.meta.accountId !== undefined ||
          body.meta.speakerModel !== undefined ||
          body.meta.did !== undefined ||
          body.meta.thinkServiceIds !== undefined ||
          body.meta.thinkServiceId !== undefined ||
          body.meta.voiceId !== undefined ||
          body.meta.roomRef !== undefined ||
          body.meta.roomName !== undefined ||
          body.meta.roomDescription !== undefined
        ) {
          const { config } = await buildRunConfig(nextMeta)
          await saveDeviceConfig(id, config)
        }
      }
      if (body.config) {
        await saveDeviceConfig(id, body.config)
      }
      ok(res)
    }),
  )

  app.delete(
    `${API_PREFIX}/devices/:id`,
    asyncHandler(async (req, res) => {
      const id = assertSafeId(req.params.id)
      await stop(id)
      await removeDevice(id)
      clearDeviceLog(id)
      ok(res)
    }),
  )

  // ── 启动/停止 ─────────────────────────────────────────────────
  app.post(
    `${API_PREFIX}/devices/:id/start`,
    asyncHandler(async (req, res) => {
      const id = assertSafeId(req.params.id)
      const meta = await getDeviceMeta(id)
      if (!meta) {
        fail(res, 404, '设备不存在')
        return
      }
      // 启动前按绑定链重新编译投影（角色/服务变更后无需手动改 migptgui.json）
      const existing = await loadDeviceConfig(id)
      const { config } = await buildRunConfig(meta, existing)
      const deviceCwd = path.join(devicesRoot, id)
      await saveDeviceConfig(id, config)

      // 账号托管：按设备归属账号自动写入 .mi.json（minna/miiot 两段）
      const account = await getAccountById(meta.accountId)
      if (account?.passToken) {
        const miJson = {
          mina: { pass: { passToken: account.passToken } },
          miiot: { pass: { passToken: account.passToken } },
        }
        await saveDeviceCredentials(id, miJson)
      }

      // 内建 TTS：为设备注入独立的 TTS_BASE_URL
      if (
        config.config.speaker.tts === 'custom' &&
        config.gui &&
        config.gui.ttsProvider !== 'custom' &&
        config.tts
      ) {
        config.env.TTS_BASE_URL = `${(config.gui.publicURL || '').replace(/\/+$/, '')}/${meta.ttsSecret}/tts`
        dAudio('设置 TTS_BASE_URL 为：%s', config.env.TTS_BASE_URL)
      }

      await run(
        id,
        config as unknown as RunConfig,
        deviceCwd,
        (deviceId, line) => appendLog(deviceId, line),
      )

      ok(res)
    }),
  )

  app.post(
    `${API_PREFIX}/devices/:id/stop`,
    asyncHandler(async (req, res) => {
      await stop(assertSafeId(req.params.id))
      ok(res)
    }),
  )

  app.get(
    `${API_PREFIX}/devices/:id/logs`,
    asyncHandler(async (req, res) => {
      assertSafeId(req.params.id)
      const limit = Number(req.query.limit) || 100
      const buf = logBuffers.get(req.params.id) || []
      res.json({ logs: buf.slice(-limit) })
    }),
  )
}
