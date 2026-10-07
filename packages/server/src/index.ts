// ── 服务入口：HTTP 服务组装 + 全部 API 路由 ────────────────────────
// 日志拦截必须先加载（console.* 被包装后，其他模块的日志同样进入 system.log）
import './logger.js'
import path from 'node:path'
import express from 'express'
import open from 'open'
import fse from 'fs-extra'
import fs from 'node:fs/promises'
import { createTTS, kTTSSpeakers } from 'mi-gpt-tts'
import { Readable } from 'node:stream'
import { type GuiConfig } from '@migptgui/options'
import { nanoid } from 'nanoid'
import _trimEnd from 'lodash/trimEnd.js'
import createDebug from 'debug'
import { getAllStatus, run, stop, type RunConfig } from '@migptgui/controller'
import {
  root,
  devicesRoot,
  accountsFile,
  rolesFile,
  thinkServicesFile,
  voiceServicesFile,
  speakerModelsFile,
  roomsFile,
  authFile,
  systemLogFile,
} from './paths.js'
import { sysLogBuf, logBuffers, appendLog, _pushSysLog } from './logger.js'
import {
  resolveAuth,
  getAccounts,
  getAccountById,
  getRoles,
  getThinkServices,
  getVoiceServices,
  getSpeakerModels,
  getRooms,
  getDeviceMeta,
  listDeviceMetas,
  assertUniqueName,
  writeJson,
  seedBuiltinVoice,
  seedBuiltinModels,
  resetBuiltinModel,
  resetBuiltinVoice,
  migrateRooms,
  seedDemoLogs,
} from './store.js'
import { pullMicoDevices, buildRunConfig, resolveBindings } from './services.js'
import {
  ROLE_DEFAULTS,
  type Settings,
  type Account,
  type Role,
  type ThinkService,
  type VoiceService,
  type Room,
  type DeviceMeta,
  type SpeakerModel,
} from './types.js'

const dAudio = createDebug('@migptgui/server:audio')

export function runServer(options?: {
  open?: boolean
  port?: number
  users?: Record<string, string>
  staticPath?: string
  auth?: boolean
}) {
  const port = options?.port || 36592
  // 认证默认启用（中间件无条件挂载）；--no-auth 时由 apps/server 传 auth:false
  const isAuth = options?.auth !== false
  const defaultBotCwd = path.join(root, 'default')

  const app = express()

  // 健康检查 / 对外地址连通性测试：GET（Docker HEALTHCHECK）与 POST（面板测试）均支持
  app.all('/ping', (_req, res) => {
    res.status(204).send()
  })

  // ── 多设备 TTS：/{ttsSecret}/tts/tts.mp3（小爱音箱访问，不能加 basicAuth）──
  async function findDeviceBySecret(
    secret: string,
  ): Promise<DeviceMeta | undefined> {
    const metas = await listDeviceMetas()
    return metas.find((m) => m.ttsSecret === secret)
  }

  async function loadDeviceConfig(id: string): Promise<GuiConfig | undefined> {
    const file =
      id === 'default'
        ? path.join(root, 'default', 'migptgui.json')
        : path.join(devicesRoot, id, 'migptgui.json')
    try {
      return JSON.parse(await fs.readFile(file, 'utf-8'))
    } catch {
      return undefined
    }
  }

  app.get('/:secret/tts/speakers', (req, res) => {
    res.json(kTTSSpeakers)
  })

  app.get('/:secret/tts/tts.mp3', async (req, res) => {
    const secret = req.params.secret
    let meta: DeviceMeta | undefined
    let config: GuiConfig | undefined
    if (secret === 'default') {
      config = await loadDeviceConfig('default')
    } else {
      meta = await findDeviceBySecret(secret)
      config = meta ? await loadDeviceConfig(meta.id) : undefined
    }

    if (!config?.tts) {
      res.status(500).send('Internal Server Error')
      return
    }

    const tts = createTTS(config.tts)
    const nUrl = req.url.replace('+text=', '&text=')
    const url = new URL('http://localhost' + nUrl)
    const audioStream = new Readable({ read() {} })

    const options = {
      speaker: url.searchParams.get('speaker') || config.tts.defaultSpeaker!,
      text: decodeURIComponent(url.searchParams.get('text') || ''),
      stream: audioStream,
    }

    dAudio('准备合成语音。参数：%O', options)

    tts(options).then((buffer) => {
      if (!buffer) {
        audioStream.destroy(new Error('没有把配置填写完整'))
      }
    })

    let headersSent = false
    audioStream.on('data', (chunk) => {
      if (
        (chunk.length === 3 && chunk.toString('utf8') === '404') ||
        (chunk.length === 5 && chunk.toString('utf8') === 'error')
      ) {
        audioStream.destroy(new Error('配置填写有误'))
        return
      }
      if (!headersSent) {
        res.writeHead(200, {
          'Transfer-Encoding': 'chunked',
          'Content-Type': 'audio/mp3',
        })
        headersSent = true
      }
      res.write(chunk)
    })
    audioStream.on('end', () => res.end())
    audioStream.once('error', (error) => {
      if (!headersSent) {
        res.status(400).send(error.message || 'Internal Server Error')
      } else {
        res.end()
      }
    })
  })

  app.use(express.json())

  // 静态资源匿名加载（前端 SPA 先加载 JS），API 全部要求认证
  if (options?.staticPath) {
    app.use(express.static(options.staticPath))
  }

  // 自定义 Basic Auth：失败返回 JSON 401（不带 challenge），由前端渲染登录页。
  // 认证默认启用：凭据按 环境变量/--pwd > auth.json（面板可改）> 默认 admin/123456 解析。
  if (options?.auth !== false) {
    app.use('/api', (req, res, next) => {
      const users = resolveAuth(options?.users)
      const header = req.headers.authorization || ''
      const [type, token] = header.split(' ')
      if (type === 'Basic' && token) {
        let decoded = ''
        try {
          decoded = Buffer.from(token, 'base64').toString('utf-8')
        } catch {
          decoded = ''
        }
        const idx = decoded.indexOf(':')
        const user = idx >= 0 ? decoded.slice(0, idx) : ''
        const pass = idx >= 0 ? decoded.slice(idx + 1) : ''
        if (user && users[user] === pass) {
          return next()
        }
      }
      res.status(401).json({ error: 'unauthorized' })
    })
  }

  // ── 修改登录凭据（持久化到 auth.json，前端「我的」页调用）─────
  app.put('/api/auth', async (req, res) => {
    const body = req.body as {
      oldUser?: string
      oldPassword?: string
      newUser?: string
      newPassword?: string
    }
    if (!body.newUser || !body.newPassword) {
      res.status(400).json({ error: '新用户名和新密码必填' })
      return
    }
    const users = resolveAuth(options?.users)
    const current = users[body.oldUser || '']
    if (!current || current !== body.oldPassword) {
      res.status(403).json({ error: '旧密码不正确' })
      return
    }
    await writeJson(authFile, {
      user: body.newUser,
      password: body.newPassword,
    })
    res.json({ success: true })
  })

  // ── 状态：全部设备 ─────────────────────────────────────────────
  app.get('/api/status', async (req, res) => {
    const devices = await listDeviceMetas()
    const status = getAllStatus()
    res.json({
      devices: devices.map((meta) => ({
        ...meta,
        running: !!status[meta.id],
      })),
    })
  })

  // ── 账号托管 ──────────────────────────────────────────────────
  // ── 云端账号（多账号）────────────────────────────────────────
  app.get('/api/accounts', async (req, res) => {
    res.json(await getAccounts())
  })

  app.post('/api/accounts', async (req, res) => {
    const body = req.body as Partial<Account>
    if (!body.name || !body.miUserId) {
      res.status(400).json({ error: '名称与云端账号数字 ID 必填' })
      return
    }
    const accounts = await getAccounts()
    const dup = assertUniqueName(accounts, body.name, undefined, '账号名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const account: Account = {
      id: nanoid(8),
      name: body.name,
      miUserId: body.miUserId,
      miPassword: body.miPassword,
      passToken: body.passToken,
      createdAt: Date.now(),
    }
    accounts.push(account)
    await writeJson(accountsFile, accounts)
    res.json(account)
  })

  app.put('/api/accounts/:id', async (req, res) => {
    const accounts = await getAccounts()
    const idx = accounts.findIndex((a) => a.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '账号不存在' })
      return
    }
    const body = req.body as Partial<Account>
    const dup = assertUniqueName(accounts, body.name, req.params.id, '账号名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    accounts[idx] = {
      ...accounts[idx],
      name: body.name ?? accounts[idx].name,
      miUserId: body.miUserId ?? accounts[idx].miUserId,
      ...(body.passToken !== undefined
        ? { miPassword: body.miPassword, passToken: body.passToken }
        : {}),
    }
    await writeJson(accountsFile, accounts)
    res.json(accounts[idx])
  })

  app.delete('/api/accounts/:id', async (req, res) => {
    const accounts = await getAccounts()
    const idx = accounts.findIndex((a) => a.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '账号不存在' })
      return
    }
    // 删除保护：被设备引用的账号禁止删除
    const metas = await listDeviceMetas()
    const refDevices = metas.filter((m) => m.accountId === req.params.id)
    if (refDevices.length > 0) {
      res.status(409).json({
        error: '该账号正被设备引用，无法删除；请先解绑相关设备',
        refs: { devices: refDevices.map((d) => d.alias) },
      })
      return
    }
    accounts.splice(idx, 1)
    await writeJson(accountsFile, accounts)
    res.json({ success: true })
  })

  // 凭 小米ID + passToken 拉取账号下音箱设备列表（三步连接 Step2 与设备添加复用）
  app.post('/api/accounts/:id/pull-devices', async (req, res) => {
    const accounts = await getAccounts()
    const account = accounts.find((a) => a.id === req.params.id)
    if (!account) {
      res.status(404).json({ error: '账号不存在' })
      return
    }
    if (!account.miUserId || !account.passToken) {
      res
        .status(400)
        .json({ error: '请先填写云端账号数字 ID 与会话凭证（passToken）' })
      return
    }
    try {
      const devices = await pullMicoDevices(account.miUserId, account.passToken)
      res.json({ devices })
    } catch (e: any) {
      console.error('拉取设备失败', e)
      _pushSysLog('ERROR', `拉取账号设备失败：${e?.message || e}`)
      res.status(502).json({ error: `拉取设备失败：${e?.message || e}` })
    }
  })

  // 兼容旧版：/api/settings 读写第一个（默认）账号
  app.get('/api/settings', async (req, res) => {
    const account = await getAccountById()
    res.json(
      account
        ? {
            miUserId: account.miUserId,
            miPassword: account.miPassword,
            passToken: account.passToken,
          }
        : {},
    )
  })

  app.put('/api/settings', async (req, res) => {
    const body = req.body as Settings
    const accounts = await getAccounts()
    if (accounts.length > 0) {
      accounts[0] = {
        ...accounts[0],
        miUserId: body.miUserId || accounts[0].miUserId,
        miPassword: body.miPassword,
        passToken: body.passToken,
      }
    } else {
      accounts.push({
        id: nanoid(8),
        name: '默认账号',
        miUserId: body.miUserId || '',
        miPassword: body.miPassword,
        passToken: body.passToken,
        createdAt: Date.now(),
      })
    }
    await writeJson(accountsFile, accounts)
    res.json({ success: true })
  })

  // ── AI 角色 ───────────────────────────────────────────────────
  // 归一化人设描述：兼容旧版存储的字面 `\n`，统一转为真实换行符
  const normProfile = (s?: string) => (s || '').replace(/\\n/g, '\n')

  app.get('/api/roles', async (req, res) => {
    const roles = await getRoles()
    res.json(roles.map((r) => ({ ...r, profile: normProfile(r.profile) })))
  })

  app.post('/api/roles', async (req, res) => {
    const roles = await getRoles()
    const dup = assertUniqueName(roles, req.body?.name, undefined, '角色名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const role: Role = {
      id: nanoid(8),
      ...ROLE_DEFAULTS,
      ...req.body,
      profile: normProfile(req.body.profile),
    }
    roles.push(role)
    await writeJson(rolesFile, roles)
    res.json(role)
  })

  app.put('/api/roles/:id', async (req, res) => {
    const roles = await getRoles()
    const idx = roles.findIndex((r) => r.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '角色不存在' })
      return
    }
    const dup = assertUniqueName(
      roles,
      req.body?.name,
      req.params.id,
      '角色名称',
    )
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    roles[idx] = {
      ...roles[idx],
      ...req.body,
      id: req.params.id,
      profile: normProfile(req.body.profile ?? roles[idx].profile),
    }
    await writeJson(rolesFile, roles)
    res.json(roles[idx])
  })

  app.delete('/api/roles/:id', async (req, res) => {
    const roles = await getRoles()
    if (!roles.some((r) => r.id === req.params.id)) {
      res.status(404).json({ error: '角色不存在' })
      return
    }
    // 删除保护：被设备引用的角色禁止删除
    const metas = await listDeviceMetas()
    const refDevices = metas.filter((m) => m.roleId === req.params.id)
    if (refDevices.length > 0) {
      res.status(409).json({
        error: '该角色正被设备引用，无法删除；请先更换引用该角色的设备',
        refs: { devices: refDevices.map((d) => d.alias) },
      })
      return
    }
    await writeJson(
      rolesFile,
      roles.filter((r) => r.id !== req.params.id),
    )
    res.json({ success: true })
  })

  // ── 思考服务（音箱的「大脑」）───────────────────────────────
  app.get('/api/think-services', async (req, res) => {
    res.json(await getThinkServices())
  })

  app.post('/api/think-services', async (req, res) => {
    const body = req.body as Partial<ThinkService>
    if (!body.name || !body.provider || !body.model || !body.apiKey) {
      res.status(400).json({ error: '名称、供应商、模型与 API Key 必填' })
      return
    }
    const list = await getThinkServices()
    const dup = assertUniqueName(list, body.name, undefined, '思考服务名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const svc: ThinkService = {
      id: nanoid(8),
      name: body.name,
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      temperature: body.temperature,
      isDefault: body.isDefault ?? list.length === 0,
      createdAt: Date.now(),
    }
    // 保持全局默认唯一
    if (svc.isDefault) {
      for (const t of list) t.isDefault = false
      await writeJson(thinkServicesFile, list)
    }
    list.push(svc)
    await writeJson(thinkServicesFile, list)
    res.json(svc)
  })

  app.put('/api/think-services/:id', async (req, res) => {
    const list = await getThinkServices()
    const idx = list.findIndex((t) => t.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '思考服务不存在' })
      return
    }
    const body = req.body as Partial<ThinkService>
    const dup = assertUniqueName(list, body.name, req.params.id, '思考服务名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const wasDefault = list[idx].isDefault
    list[idx] = { ...list[idx], ...body, id: req.params.id }
    if (body.isDefault && !wasDefault) {
      for (const t of list) if (t.id !== req.params.id) t.isDefault = false
    }
    if (body.isDefault === false && wasDefault) {
      list[idx].isDefault = list.length === 1
    }
    await writeJson(thinkServicesFile, list)
    res.json(list[idx])
  })

  app.delete('/api/think-services/:id', async (req, res) => {
    const list = await getThinkServices()
    if (!list.some((t) => t.id === req.params.id)) {
      res.status(404).json({ error: '思考服务不存在' })
      return
    }
    // 删除保护：被设备或角色引用的实体禁止删除
    const roles = await getRoles()
    const metas = await listDeviceMetas()
    const refRoles = roles.filter((r) => r.thinkServiceId === req.params.id)
    const refDevices = metas.filter((m) => m.thinkServiceId === req.params.id)
    if (refRoles.length > 0 || refDevices.length > 0) {
      res.status(409).json({
        error: '该思考服务正被其他实体引用，无法删除',
        refs: {
          roles: refRoles.map((r) => r.name),
          devices: refDevices.map((d) => d.alias),
        },
      })
      return
    }
    await writeJson(
      thinkServicesFile,
      list.filter((t) => t.id !== req.params.id),
    )
    res.json({ success: true })
  })

  // ── 语音服务（音箱的「嗓子」）───────────────────────────────
  app.get('/api/voice-services', async (req, res) => {
    res.json(await getVoiceServices())
  })

  app.post('/api/voice-services', async (req, res) => {
    const body = req.body as Partial<VoiceService>
    if (!body.name || !body.provider) {
      res.status(400).json({ error: '名称与供应商必填' })
      return
    }
    const list = await getVoiceServices()
    const dup = assertUniqueName(list, body.name, undefined, '语音服务名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const svc: VoiceService = {
      id: nanoid(8),
      name: body.name,
      provider: body.provider,
      voiceId: body.voiceId,
      ttsCommand: body.ttsCommand,
      builtin: body.builtin ?? false,
      isDefault: body.isDefault ?? list.length === 0,
      tts: body.tts,
      createdAt: Date.now(),
    }
    if (svc.isDefault) {
      for (const v of list) v.isDefault = false
      await writeJson(voiceServicesFile, list)
    }
    list.push(svc)
    await writeJson(voiceServicesFile, list)
    res.json(svc)
  })

  app.put('/api/voice-services/:id', async (req, res) => {
    const list = await getVoiceServices()
    const idx = list.findIndex((v) => v.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '语音服务不存在' })
      return
    }
    const body = req.body as Partial<VoiceService>
    const dup = assertUniqueName(list, body.name, req.params.id, '语音服务名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const wasDefault = list[idx].isDefault
    list[idx] = {
      ...list[idx],
      ...body,
      id: req.params.id,
      builtin: list[idx].builtin,
    }
    if (body.isDefault && !wasDefault) {
      for (const v of list) if (v.id !== req.params.id) v.isDefault = false
    }
    if (body.isDefault === false && wasDefault) {
      list[idx].isDefault = list.length === 1
    }
    await writeJson(voiceServicesFile, list)
    res.json(list[idx])
  })

  app.delete('/api/voice-services/:id', async (req, res) => {
    const list = await getVoiceServices()
    const target = list.find((v) => v.id === req.params.id)
    if (!target) {
      res.status(404).json({ error: '语音服务不存在' })
      return
    }
    if (target.builtin) {
      res.status(409).json({ error: '内建语音服务不可删除' })
      return
    }
    // 删除保护：被设备或角色引用的实体禁止删除
    const roles = await getRoles()
    const metas = await listDeviceMetas()
    const refRoles = roles.filter((r) => r.voiceId === req.params.id)
    const refDevices = metas.filter((m) => m.voiceOverrideId === req.params.id)
    if (refRoles.length > 0 || refDevices.length > 0) {
      res.status(409).json({
        error: '该语音服务正被其他实体引用，无法删除',
        refs: {
          roles: refRoles.map((r) => r.name),
          devices: refDevices.map((d) => d.alias),
        },
      })
      return
    }
    await writeJson(
      voiceServicesFile,
      list.filter((v) => v.id !== req.params.id),
    )
    res.json({ success: true })
  })

  // 重置内置语音服务为默认（仅 builtin 可用）
  app.post('/api/voice-services/:id/reset', async (req, res) => {
    const svc = await resetBuiltinVoice(req.params.id)
    if (!svc) {
      res.status(404).json({ error: '仅系统内置语音服务支持重置默认' })
      return
    }
    res.json(svc)
  })

  // ── 音箱型号（设备的「硬件身份」配置）─────────────────────────
  app.get('/api/speaker-models', async (req, res) => {
    res.json(await getSpeakerModels())
  })

  app.post('/api/speaker-models', async (req, res) => {
    const body = req.body as Partial<SpeakerModel>
    if (!body.name || !body.did) {
      res.status(400).json({ error: '名称与型号标识必填' })
      return
    }
    const list = await getSpeakerModels()
    const dup = assertUniqueName(list, body.name, undefined, '型号名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const model: SpeakerModel = {
      id: nanoid(8),
      name: body.name,
      did: body.did,
      desc: body.desc,
      ttsCommand: body.ttsCommand || [],
      wakeUpCommand: body.wakeUpCommand || [],
      playingCommand: body.playingCommand || [],
      consecutive: body.consecutive ?? true,
      imageUrl: body.imageUrl,
      builtin: false,
      createdAt: Date.now(),
    }
    list.push(model)
    await writeJson(speakerModelsFile, list)
    res.json(model)
  })

  app.put('/api/speaker-models/:id', async (req, res) => {
    const list = await getSpeakerModels()
    const idx = list.findIndex((m) => m.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '型号不存在' })
      return
    }
    const body = req.body as Partial<SpeakerModel>
    const dup = assertUniqueName(list, body.name, req.params.id, '型号名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    list[idx] = {
      ...list[idx],
      ...body,
      id: req.params.id,
      builtin: list[idx].builtin,
    }
    await writeJson(speakerModelsFile, list)
    res.json(list[idx])
  })

  app.delete('/api/speaker-models/:id', async (req, res) => {
    const list = await getSpeakerModels()
    const target = list.find((m) => m.id === req.params.id)
    if (!target) {
      res.status(404).json({ error: '型号不存在' })
      return
    }
    if (target.builtin) {
      res.status(409).json({ error: '系统内置型号不可删除' })
      return
    }
    // 删除保护：被设备关联的型号禁止删除
    const metas = await listDeviceMetas()
    const refDevices = metas.filter(
      (m) => m.speakerModel === req.params.id || m.speakerModel === target.name,
    )
    if (refDevices.length > 0) {
      res.status(409).json({
        error: '该型号正被设备引用，无法删除',
        refs: { devices: refDevices.map((d) => d.alias) },
      })
      return
    }
    await writeJson(
      speakerModelsFile,
      list.filter((m) => m.id !== req.params.id),
    )
    res.json({ success: true })
  })

  // 重置内置型号为官方默认值（仅 builtin 可用；用户改动可随时恢复）
  app.post('/api/speaker-models/:id/reset', async (req, res) => {
    const model = await resetBuiltinModel(req.params.id)
    if (!model) {
      res.status(404).json({ error: '仅系统内置型号支持重置默认' })
      return
    }
    res.json(model)
  })

  // ── 会话群（对话记忆上下文归属，多设备共用）──────────────────────
  app.get('/api/rooms', async (req, res) => {
    const rooms = await getRooms()
    const metas = await listDeviceMetas()
    res.json(
      rooms.map((r) => ({
        ...r,
        deviceCount: metas.filter((m) => m.roomRef === r.id).length,
      })),
    )
  })

  app.post('/api/rooms', async (req, res) => {
    const body = req.body as Partial<Room>
    if (!body.name) {
      res.status(400).json({ error: '会话群名称必填' })
      return
    }
    const rooms = await getRooms()
    const dup = assertUniqueName(rooms, body.name, undefined, '会话群名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const room: Room = {
      id: nanoid(8),
      name: body.name,
      description: body.description,
      createdAt: Date.now(),
    }
    rooms.push(room)
    await writeJson(roomsFile, rooms)
    res.json(room)
  })

  app.put('/api/rooms/:id', async (req, res) => {
    const rooms = await getRooms()
    const idx = rooms.findIndex((r) => r.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '会话群不存在' })
      return
    }
    const body = req.body as Partial<Room>
    const dup = assertUniqueName(rooms, body.name, req.params.id, '会话群名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    rooms[idx] = { ...rooms[idx], ...body, id: req.params.id }
    await writeJson(roomsFile, rooms)
    res.json(rooms[idx])
  })

  app.delete('/api/rooms/:id', async (req, res) => {
    const rooms = await getRooms()
    if (!rooms.some((r) => r.id === req.params.id)) {
      res.status(404).json({ error: '会话群不存在' })
      return
    }
    // 删除保护：被设备引用的会话群禁止删除
    const metas = await listDeviceMetas()
    const refDevices = metas.filter((m) => m.roomRef === req.params.id)
    if (refDevices.length > 0) {
      res.status(409).json({
        error: '该会话群正被设备引用，无法删除；请先解绑引用该会话群的设备',
        refs: { devices: refDevices.map((d) => d.alias) },
      })
      return
    }
    await writeJson(
      roomsFile,
      rooms.filter((r) => r.id !== req.params.id),
    )
    res.json({ success: true })
  })

  // ── 设备管理 ──────────────────────────────────────────────────
  app.get('/api/devices', async (req, res) => {
    const devices = await listDeviceMetas()
    const status = getAllStatus()
    res.json(devices.map((meta) => ({ ...meta, running: !!status[meta.id] })))
  })

  app.post('/api/devices', async (req, res) => {
    const body = req.body as {
      alias: string
      did: string
      speakerModel?: string
      roleId?: string
      accountId?: string
      thinkServiceId?: string
      voiceOverrideId?: string
      exitKeepAliveAfter?: number
      roomRef?: string
      roomName?: string
      roomDescription?: string
    }
    if (!body.alias || !body.did) {
      res.status(400).json({ error: '别名和设备 ID 必填' })
      return
    }
    const metas = await listDeviceMetas()
    // 唯一性按「账号」维度：同账号下设备 ID 唯一（防止同一设备多套配置）；不同账号允许相同 ID/名称（支持设备切换账号）
    const sameAcct = body.accountId
      ? metas.filter((m) => m.accountId === body.accountId)
      : metas
    if (sameAcct.some((m) => m.did === body.did)) {
      res
        .status(409)
        .json({ error: '该账号下已接入此设备（设备 ID 相同），请勿重复配置' })
      return
    }
    const dup = assertUniqueName(sameAcct, body.alias, undefined, '设备名称')
    if (dup) {
      res.status(409).json({ error: dup })
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
      thinkServiceId: body.thinkServiceId,
      voiceOverrideId: body.voiceOverrideId,
      exitKeepAliveAfter: body.exitKeepAliveAfter,
      roomRef: body.roomRef,
      roomName: body.roomName,
      roomDescription: body.roomDescription,
      ttsSecret: nanoid(),
      createdAt: Date.now(),
    }
    const deviceCwd = path.join(devicesRoot, id)
    await writeJson(path.join(deviceCwd, 'meta.json'), meta)
    // 按绑定链编译初始配置（编译投影）
    const { config } = await buildRunConfig(meta)
    await writeJson(path.join(deviceCwd, 'migptgui.json'), config)
    res.json({ id, meta })
  })

  app.get('/api/devices/:id', async (req, res) => {
    const meta = await getDeviceMeta(req.params.id)
    if (!meta) {
      res.status(404).json({ error: '设备不存在' })
      return
    }
    const config = await loadDeviceConfig(req.params.id)
    // 绑定关系（含来源标注：设备覆盖 / 继承人设 / 全局默认）
    const bindings = await resolveBindings(meta)
    res.json({ meta, config, bindings })
  })

  app.put('/api/devices/:id', async (req, res) => {
    const id = req.params.id
    const meta = await getDeviceMeta(id)
    if (!meta) {
      res.status(404).json({ error: '设备不存在' })
      return
    }
    const body = req.body as { meta?: Partial<DeviceMeta>; config?: GuiConfig }
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
          res
            .status(409)
            .json({
              error: '该账号下已接入此设备（设备 ID 相同），请勿重复配置',
            })
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
            res.status(409).json({ error: dup })
            return
          }
        }
      }
      const nextMeta: DeviceMeta = { ...meta, ...body.meta, id }
      await writeJson(path.join(devicesRoot, id, 'meta.json'), nextMeta)
      // 绑定字段变化时重新编译投影，保证 migptgui.json 与绑定链一致
      if (
        body.meta.roleId !== undefined ||
        body.meta.accountId !== undefined ||
        body.meta.thinkServiceId !== undefined ||
        body.meta.voiceOverrideId !== undefined ||
        body.meta.speakerModel !== undefined ||
        body.meta.did !== undefined ||
        body.meta.exitKeepAliveAfter !== undefined ||
        body.meta.roomRef !== undefined ||
        body.meta.roomName !== undefined ||
        body.meta.roomDescription !== undefined
      ) {
        const { config } = await buildRunConfig(nextMeta)
        await writeJson(path.join(devicesRoot, id, 'migptgui.json'), config)
      }
    }
    if (body.config) {
      await writeJson(path.join(devicesRoot, id, 'migptgui.json'), body.config)
    }
    res.json({ success: true })
  })

  app.delete('/api/devices/:id', async (req, res) => {
    await stop(req.params.id)
    await fse.remove(path.join(devicesRoot, req.params.id))
    logBuffers.delete(req.params.id)
    res.json({ success: true })
  })

  // ── 启动/停止 ─────────────────────────────────────────────────
  app.post('/api/devices/:id/start', async (req, res) => {
    const id = req.params.id
    const meta = await getDeviceMeta(id)
    if (!meta) {
      res.status(404).json({ error: '设备不存在' })
      return
    }
    // 启动前按绑定链重新编译投影（角色/服务变更后无需手动改 migptgui.json）
    const existing = await loadDeviceConfig(id)
    const { config } = await buildRunConfig(meta, existing)
    const deviceCwd = path.join(devicesRoot, id)
    await writeJson(path.join(deviceCwd, 'migptgui.json'), config)

    // 账号托管：按设备归属账号自动写入 .mi.json（minna/miiot 两段）
    const account = await getAccountById(meta.accountId)
    if (account?.passToken) {
      const miJson = {
        mina: { pass: { passToken: account.passToken } },
        miiot: { pass: { passToken: account.passToken } },
      }
      await writeJson(path.join(deviceCwd, '.mi.json'), miJson)
    }

    // 内建 TTS：为设备注入独立的 TTS_BASE_URL
    if (
      config.config.speaker.tts === 'custom' &&
      config.gui &&
      config.gui.ttsProvider !== 'custom' &&
      config.tts
    ) {
      config.env.TTS_BASE_URL = `${_trimEnd(
        config.gui.publicURL || '',
        '/',
      )}/${meta.ttsSecret}/tts`
      dAudio('设置 TTS_BASE_URL 为：%s', config.env.TTS_BASE_URL)
    }

    await run(id, config as unknown as RunConfig, deviceCwd, (deviceId, line) =>
      appendLog(deviceId, line),
    )

    res.json({ success: true })
  })

  app.post('/api/devices/:id/stop', async (req, res) => {
    await stop(req.params.id)
    res.json({ success: true })
  })

  app.get('/api/devices/:id/logs', async (req, res) => {
    const limit = Number(req.query.limit) || 100
    const buf = logBuffers.get(req.params.id) || []
    res.json({ logs: buf.slice(-limit) })
  })

  // ── 全局对话日志（聚合所有设备，供「对话记录」页）────────────────
  app.get('/api/logs', async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 500)
    const rows: {
      deviceId: string
      deviceAlias: string
      time: string
      kind: 'user' | 'ai' | 'system'
      text: string
    }[] = []
    for (const [deviceId, buf] of logBuffers) {
      const meta = await getDeviceMeta(deviceId)
      let cur: {
        time: string
        kind: 'user' | 'ai' | 'system'
        text: string
      } | null = null
      for (const line of buf.slice(-limit)) {
        const m = line.match(/^(\d{4}[/-]\d{2}[/-]\d{2} \d{2}:\d{2}:\d{2})/)
        const body = line.replace(
          /^\d{4}[/-]\d{2}[/-]\d{2} \d{2}:\d{2}:\d{2}\s*/,
          '',
        )
        if (m) {
          if (cur)
            rows.push({
              deviceId,
              deviceAlias: meta?.alias || deviceId,
              ...cur,
            })
          let kind: 'user' | 'ai' | 'system' = 'system'
          if (/^\[用户\]|\[User\]|\[Q\]|^问[:：]|用户说/.test(body))
            kind = 'user'
          else if (/^\[AI\]|\[Assistant\]|\[A\]|^答[:：]|AI 说/.test(body))
            kind = 'ai'
          cur = { time: m[1], kind, text: body }
        } else if (cur) {
          // 无时间戳的续行并入上一条日志（同一条多行日志不拆成多条）
          cur.text += '\n' + body
        }
      }
      if (cur)
        rows.push({ deviceId, deviceAlias: meta?.alias || deviceId, ...cur })
    }
    rows.sort((a, b) => (a.time < b.time ? 1 : -1))
    res.json({ total: rows.length, logs: rows.slice(0, limit) })
  })

  // ── 系统日志（实时查看 + 下载历史）───────────────────────────
  app.get('/api/system/logs', async (req, res) => {
    const lines = Math.min(Number(req.query.lines) || 300, 2000)
    let arr = sysLogBuf.slice(-lines)
    if (arr.length < lines) {
      try {
        const all = (await fs.readFile(systemLogFile, 'utf8'))
          .split('\n')
          .filter(Boolean)
        arr = all.slice(-lines)
      } catch {
        /* 日志文件尚未生成 */
      }
    }
    let size = 0
    try {
      size = (await fs.stat(systemLogFile)).size
    } catch {
      /* 忽略 */
    }
    res.json({ lines: arr, file: systemLogFile, size })
  })

  app.get('/api/system/logs/download', async (_req, res) => {
    try {
      const text = await fs.readFile(systemLogFile, 'utf8')
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="migpt-system.log"',
      )
      res.send(text)
    } catch {
      res.status(404).json({ error: '系统日志文件不存在' })
    }
  })

  app.post('/api/system/logs/clear', async (_req, res) => {
    try {
      sysLogBuf.length = 0
      await fse.writeFile(systemLogFile, '', 'utf8')
      res.json({ success: true })
    } catch (err) {
      res.json({ success: false, error: String(err) })
    }
  })

  // ── 测试接口（保留） ──────────────────────────────────────────
  app.post('/api/test', async (req, res) => {
    const testBaseUrl = req.body.url
    const ping = _trimEnd(testBaseUrl, '/') + '/ping'
    try {
      const fetchRes = await fetch(ping, {
        method: 'POST',
        signal: AbortSignal.timeout(500),
      })
      res.json({ success: fetchRes.ok })
    } catch {
      res.json({ success: false })
    }
  })

  app.get('/api/test/audio', (req, res) => {
    const params = req.query as { ttsConfig: string }
    const options = JSON.parse(params.ttsConfig)
    const testTTS = createTTS(options)
    const audioStream = new Readable({ read() {} })
    options.stream = audioStream
    const ro = {
      text: '配置成功！',
      stream: audioStream,
      speaker: options.defaultSpeaker,
    }
    testTTS(ro).then((buffer) => {
      if (!buffer) {
        audioStream.destroy(new Error('没有把配置填写完整'))
      }
    })
    let headersSent = false
    audioStream.on('data', (chunk) => {
      if (
        (chunk.length === 3 && chunk.toString('utf8') === '404') ||
        (chunk.length === 5 && chunk.toString('utf8') === 'error')
      ) {
        audioStream.destroy(new Error('配置填写有误'))
        return
      }
      if (!headersSent) {
        res.writeHead(200, {
          'Transfer-Encoding': 'chunked',
          'Content-Type': 'audio/mp3',
        })
        headersSent = true
      }
      res.write(chunk)
    })
    audioStream.on('end', () => res.end())
    audioStream.once('error', (error) => {
      if (!headersSent) {
        res.status(400).send(error.message || 'Internal Server Error')
      } else {
        res.end()
      }
    })
  })

  // ── 兼容旧版单设备 API（内部映射 id=default） ───────────────────
  const defaultDeviceCwd = defaultBotCwd

  async function saveDefaultConfig(config: GuiConfig) {
    await fse.ensureDir(defaultDeviceCwd)
    return fs.writeFile(
      path.join(defaultDeviceCwd, 'migptgui.json'),
      JSON.stringify(config),
    )
  }

  app.get('/api/default', async (req, res) => {
    let migptConfig: GuiConfig | undefined
    try {
      migptConfig = JSON.parse(
        await fs.readFile(
          path.join(defaultDeviceCwd, 'migptgui.json'),
          'utf-8',
        ),
      )
    } catch {
      /* 不存在 */
    }
    res.json(migptConfig ? { config: migptConfig } : {})
  })

  app.put('/api/default', async (req, res) => {
    await saveDefaultConfig(req.body as GuiConfig)
    res.json({ success: true })
  })

  app.delete('/api/default', (req, res) => {
    Promise.all([
      fse.remove(path.join(defaultDeviceCwd, '.mi.json')),
      fse.remove(path.join(defaultDeviceCwd, '.bot.json')),
    ]).then(
      () => res.json({ success: true }),
      (err) => res.json({ success: false, error: err }),
    )
  })

  app.post('/api/default/start', async (req, res) => {
    const migptConfig = req.body as GuiConfig
    await saveDefaultConfig(migptConfig)
    if (
      migptConfig.config.speaker.tts === 'custom' &&
      migptConfig.gui &&
      migptConfig.gui.ttsProvider !== 'custom' &&
      migptConfig.tts
    ) {
      migptConfig.env.TTS_BASE_URL = `${_trimEnd(
        migptConfig.gui.publicURL || '',
        '/',
      )}/default/tts`
    }
    await run(
      'default',
      migptConfig as unknown as RunConfig,
      defaultDeviceCwd,
      (deviceId, line) => appendLog(deviceId, line),
    )
    res.json({ success: true })
  })

  app.post('/api/default/stop', async (req, res) => {
    await stop('default')
    res.json({ success: true })
  })

  app.get('/api/default/logs', async (req, res) => {
    const limit = Number(req.query.limit) || 100
    const buf = logBuffers.get('default') || []
    res.json({ logs: buf.slice(-limit) })
  })

  seedBuiltinVoice().catch(() => {})
  seedBuiltinModels().catch(() => {})
  migrateRooms().catch(() => {})
  seedDemoLogs().catch(() => {})
  app.listen(port, () => {
    console.log('端口：', port)
    console.log('登录认证：', isAuth ? '已启用' : '未启用')
    console.log('秘密路径：', '已启用')
    if (options?.open) {
      open(`http://localhost:${port}`)
    }
  })
}
