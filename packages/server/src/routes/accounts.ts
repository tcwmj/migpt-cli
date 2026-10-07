// ── 云端账号（多账号）+ 旧版 settings 兼容读写 ───────────────────
import { nanoid } from 'nanoid'
import { accountsFile } from '../paths.js'
import {
  getAccounts,
  getAccountById,
  assertUniqueName,
  writeJson,
  listDeviceMetas,
} from '../store.js'
import { pullMicoDevices } from '../services.js'
import { redactAccount, redactAccounts, redactSettings } from '../redact.js'
import type { Account, Settings } from '../types.js'
import { _pushSysLog } from '../logger.js'
import { refConflict, type RouteContext } from './shared.js'

export function registerAccountRoutes({ app }: RouteContext): void {
  app.get('/api/accounts', async (req, res) => {
    res.json(redactAccounts(await getAccounts()))
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
    res.json(redactAccount(account))
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
    res.json(redactAccount(accounts[idx]))
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
      refConflict(
        res,
        { devices: refDevices.map((d) => d.alias) },
        '该账号正被设备引用，无法删除；请先解绑相关设备',
      )
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
        ? redactSettings({
            miUserId: account.miUserId,
            miPassword: account.miPassword,
            passToken: account.passToken,
          })
        : {},
    )
  })

  app.put('/api/settings', async (req, res) => {
    const body = req.body as Settings
    const accounts = await getAccounts()
    // 脱敏后前端不再回读明文：未传的凭据字段保持原值，避免误清空
    if (accounts.length > 0) {
      accounts[0] = {
        ...accounts[0],
        miUserId: body.miUserId || accounts[0].miUserId,
        miPassword: body.miPassword ?? accounts[0].miPassword,
        passToken: body.passToken ?? accounts[0].passToken,
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
}
