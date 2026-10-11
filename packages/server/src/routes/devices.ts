// ── 设备管理：状态、CRUD、启动/停止、设备日志 ─────────────────────
import path from 'node:path'
import { nanoid } from 'nanoid'
import createDebug from 'debug'
import { getAllStatus, run, stop, type RunConfig } from '@migptgui/controller'
import { type GuiConfig } from '@migptgui/options'
import { devicesRoot } from '../paths.js'
import {
  getDevice,
  listDevices,
  getCredentialById,
  assertUniqueName,
  loadDeviceConfig,
  saveDevice,
  saveDeviceConfig,
  saveDeviceCredentials,
  removeDevice,
} from '../store.js'
import { buildRunConfig, resolveBindings } from '../services.js'
import {
  redactDevice,
  redactDevices,
  redactGuiConfig,
  redactBindings,
} from '../redact.js'
import { logBuffers, appendLog, clearDeviceLog, logger } from '../logger.js'
import type { Device } from '../types.js'
import {
  API_PREFIX,
  pick,
  DEVICE_FIELDS,
  ok,
  fail,
  type RouteContext,
  asyncHandler,
} from './shared.js'
import { assertSafeId } from '../errors.js'
import { LOG_DATE_RE } from '../store.js'

const dAudio = createDebug('@migptgui/server:audio')

/** 解析 query 中的日期参数（yyyyMMdd）；未提供返回 undefined，非法返回 null */
function parseLogDate(v: unknown): string | undefined | null {
  if (v === undefined) return undefined
  const s = String(v)
  return LOG_DATE_RE.test(s) ? s : null
}

/** 从原始日志行首部时间戳提取 yyyyMMdd 日期键（无时间戳返回空） */
function dayOfRaw(line: string): string {
  const m = line.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/)
  return m ? `${m[1]}${m[2]}${m[3]}` : ''
}

export function registerDeviceRoutes({ app }: RouteContext): void {
  // ── 状态：全部设备 ─────────────────────────────────────────────
  app.get(
    `${API_PREFIX}/status`,
    asyncHandler(async (req, res) => {
      const devices = await listDevices()
      const status = getAllStatus()
      res.json({
        devices: redactDevices(devices).map((meta) => ({
          ...meta,
          running: !!status[meta.id],
        })),
      })
    }),
  )

  app.get(
    `${API_PREFIX}/devices`,
    asyncHandler(async (req, res) => {
      const devices = await listDevices()
      const status = getAllStatus()
      res.json(
        redactDevices(devices).map((meta) => ({
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
        robotId?: string
        credentialId?: string
        modelIds?: string[]
        modelId?: string
        voiceId?: string
        conversationRef?: string
        conversationName?: string
        conversationDescription?: string
      }
      if (!body.alias || !body.did) {
        fail(res, 400, '别名和设备 ID 必填')
        return
      }
      // 设备服务必填：模型与语音须显式指定（不再有全局默认回退）
      if (!body.modelIds || body.modelIds.length === 0) {
        fail(res, 400, '模型必填')
        return
      }
      if (!body.voiceId) {
        fail(res, 400, '语音必填')
        return
      }
      // 对话角色必填：角色承载人设与对话行为，无角色无法编译运行配置
      if (!body.robotId) {
        fail(res, 400, '对话角色必填')
        return
      }
      const metas = await listDevices()
      // 唯一性按「凭据」维度：同凭据下设备 ID 唯一（防止同一设备多套配置）；不同凭据允许相同 ID/名称（支持设备切换凭据）
      const sameCred = body.credentialId
        ? metas.filter((m) => m.credentialId === body.credentialId)
        : metas
      if (sameCred.some((m) => m.did === body.did)) {
        fail(res, 409, '该凭据下已接入此设备（设备 ID 相同），请勿重复配置')
        return
      }
      const dup = assertUniqueName(sameCred, body.alias, undefined, '设备名称')
      if (dup) {
        fail(res, 409, dup)
        return
      }
      const id = nanoid(8)
      const meta: Device = {
        id,
        alias: body.alias,
        did: body.did,
        speakerModel: body.speakerModel,
        robotId: body.robotId,
        credentialId: body.credentialId,
        modelIds: body.modelIds,
        modelId: body.modelId,
        voiceId: body.voiceId,
        conversationRef: body.conversationRef,
        conversationName: body.conversationName,
        conversationDescription: body.conversationDescription,
        ttsSecret: nanoid(),
        createdAt: Date.now(),
      }
      await saveDevice(id, meta)
      // 按绑定链编译初始配置（编译投影）
      const { config } = await buildRunConfig(meta)
      await saveDeviceConfig(id, config)
      res.json({ id, meta: redactDevice(meta) })
    }),
  )

  app.get(
    `${API_PREFIX}/devices/:id`,
    asyncHandler(async (req, res) => {
      assertSafeId(req.params.id)
      const meta = await getDevice(req.params.id)
      if (!meta) {
        fail(res, 404, '设备不存在')
        return
      }
      const config = await loadDeviceConfig(req.params.id)
      // 绑定关系（含来源标注：设备覆盖 / 继承人设 / 全局默认）
      const bindings = await resolveBindings(meta)
      // 响应脱敏：meta / config / bindings 中的凭据一律不回传明文
      res.json({
        meta: redactDevice(meta),
        config: config ? redactGuiConfig(config) : config,
        bindings: redactBindings(bindings),
      })
    }),
  )

  app.put(
    `${API_PREFIX}/devices/:id`,
    asyncHandler(async (req, res) => {
      const id = assertSafeId(req.params.id)
      const meta = await getDevice(id)
      if (!meta) {
        fail(res, 404, '设备不存在')
        return
      }
      const body = req.body as {
        meta?: Partial<Device>
        config?: GuiConfig
      }
      if (body.meta) {
        // 唯一性按「凭据」维度校验（同凭据 did 唯一 / 同凭据内名称唯一），排除自身
        if (
          body.meta.alias !== undefined ||
          body.meta.did !== undefined ||
          body.meta.credentialId !== undefined
        ) {
          const allMetas = await listDevices()
          const nextCred =
            body.meta.credentialId !== undefined
              ? body.meta.credentialId
              : meta.credentialId
          const sameCred = nextCred
            ? allMetas.filter((m) => m.credentialId === nextCred && m.id !== id)
            : allMetas.filter((m) => m.id !== id)
          const nextDid = body.meta.did !== undefined ? body.meta.did : meta.did
          if (sameCred.some((m) => m.did === nextDid)) {
            fail(res, 409, '该凭据下已接入此设备（设备 ID 相同），请勿重复配置')
            return
          }
          if (body.meta.alias !== undefined) {
            const dup = assertUniqueName(
              sameCred,
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
        const patch = pick<Device>(body.meta, DEVICE_FIELDS)
        if (!patch.ttsSecret) delete patch.ttsSecret
        const nextMeta: Device = { ...meta, ...patch, id }
        // 设备服务必填：合并后仍须各指定至少一个（不再有全局默认回退）
        if (!nextMeta.modelIds || nextMeta.modelIds.length === 0) {
          fail(res, 400, '模型必填')
          return
        }
        if (!nextMeta.voiceId) {
          fail(res, 400, '语音必填')
          return
        }
        // 对话角色必填：合并后仍须指定（不再有内置默认人设回退）
        if (!nextMeta.robotId) {
          fail(res, 400, '对话角色必填')
          return
        }
        await saveDevice(id, nextMeta)
        // 绑定字段变化时重新编译投影，保证 migptgui.json 与绑定链一致
        if (
          body.meta.robotId !== undefined ||
          body.meta.credentialId !== undefined ||
          body.meta.speakerModel !== undefined ||
          body.meta.did !== undefined ||
          body.meta.modelIds !== undefined ||
          body.meta.modelId !== undefined ||
          body.meta.voiceId !== undefined ||
          body.meta.conversationRef !== undefined ||
          body.meta.conversationName !== undefined ||
          body.meta.conversationDescription !== undefined
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
      const meta = await getDevice(id)
      if (!meta) {
        fail(res, 404, '设备不存在')
        return
      }
      // 启动前按绑定链重新编译投影（角色/服务变更后无需手动改 migptgui.json）
      const existing = await loadDeviceConfig(id)
      const { config } = await buildRunConfig(meta, existing)
      const deviceCwd = path.join(devicesRoot, id)
      await saveDeviceConfig(id, config)

      // 凭据托管：按设备归属凭据自动写入 .mi.json（mina/miiot 两段）
      const credential = await getCredentialById(meta.credentialId)
      if (credential?.passToken) {
        // 直接使用 passToken 登录，绕过 userId/password 生成 passToken 的步骤
        // mi-service-lite 的 getAccount 函数会先用 passToken 尝试登录，
        // 如果 passToken 有效（pass.code === 0），则不需要 password
        // 只有当 passToken 无效时才会使用 password 重新登录
        const miJson = {
          mina: {
            userId: credential.miUserId,
            // 虚拟密码：mi-service-lite 要求此字段存在，但 passToken 有效时不会使用
            password: 'passToken-mode',
            pass: { passToken: credential.passToken },
          },
          miiot: {
            userId: credential.miUserId,
            password: 'passToken-mode',
            pass: { passToken: credential.passToken },
          },
        }
        await saveDeviceCredentials(id, miJson)
      }

      // 内置 TTS：为设备注入独立的 TTS_BASE_URL
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

      logger.info(`${meta.alias} 设备服务启动成功`)

      ok(res)
    }),
  )

  app.post(
    `${API_PREFIX}/devices/:id/stop`,
    asyncHandler(async (req, res) => {
      const id = assertSafeId(req.params.id)
      const meta = await getDevice(id)
      await stop(id)
      logger.info(`${meta?.alias || id} 设备服务已停止`)
      ok(res)
    }),
  )

  app.get(
    `${API_PREFIX}/devices/:id/logs`,
    asyncHandler(async (req, res) => {
      assertSafeId(req.params.id)
      const date = parseLogDate(req.query.date)
      if (date === null) {
        fail(res, 400, '日期参数格式应为 yyyyMMdd')
        return
      }
      const limit = Number(req.query.limit) || 100
      let buf = logBuffers.get(req.params.id) || []
      if (date) {
        // 按天过滤：无时间戳的续行归属上一条带时间戳行的日期，避免丢行
        const out: string[] = []
        let cur = ''
        for (const l of buf) {
          const d = dayOfRaw(l)
          if (d) cur = d
          if (cur === date) out.push(l)
        }
        buf = out
      }
      res.json({ logs: buf.slice(-limit) })
    }),
  )
}
