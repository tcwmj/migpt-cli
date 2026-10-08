// ── 云端账号（多账号）+ 旧版 settings 兼容读写 ───────────────────
import { nanoid } from 'nanoid'
import {
  getAccounts,
  getAccountById,
  accountListSchema,
  saveAccounts,
} from '../store.js'
import { pullMicoDevices } from '../services.js'
import { redactAccount, redactAccounts, redactSettings } from '../redact.js'
import type { Account, Settings } from '../types.js'
import { logger } from '../logger.js'
import { createCrudRouter, deviceRefs } from './crud.js'
import { ok, fail } from './shared.js'

export const registerAccountRoutes = createCrudRouter<Account>({
  path: 'accounts',
  label: '账号',
  nameLabel: '账号名称',
  list: getAccounts,
  save: saveAccounts,
  schema: accountListSchema,
  listTransform: redactAccounts,
  validate: (body) =>
    !body.name || !body.miUserId ? '名称与云端账号数字 ID 必填' : null,
  build: (body) => ({
    id: nanoid(8),
    name: body.name as string,
    miUserId: body.miUserId as string,
    miPassword: body.miPassword,
    passToken: body.passToken,
    createdAt: Date.now(),
  }),
  applyUpdate: (list, idx, body) => {
    const cur = list[idx]
    // 脱敏后前端不回读明文凭据：仅在显式传入 passToken 时才覆盖密码与令牌，避免误清空
    list[idx] = {
      ...cur,
      name: body.name ?? cur.name,
      miUserId: body.miUserId ?? cur.miUserId,
      ...(body.passToken !== undefined
        ? { miPassword: body.miPassword, passToken: body.passToken }
        : {}),
    }
  },
  respond: redactAccount,
  refRules: [deviceRefs('accountId')],
  refMessage: '该账号正被设备引用，无法删除；请先解绑相关设备',
  extra: ({ app }) => {
    // 凭 小米ID + passToken 拉取账号下音箱设备列表（三步连接 Step2 与设备添加复用）
    app.post('/api/accounts/:id/pull-devices', async (req, res) => {
      const accounts = await getAccounts()
      const account = accounts.find((a) => a.id === req.params.id)
      if (!account) {
        fail(res, 404, '账号不存在')
        return
      }
      if (!account.miUserId || !account.passToken) {
        res
          .status(400)
          .json({ error: '请先填写云端账号数字 ID 与会话凭证（passToken）' })
        return
      }
      try {
        const devices = await pullMicoDevices(
          account.miUserId,
          account.passToken,
        )
        res.json({ devices })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        logger.error({ err: e }, `拉取账号设备失败：${msg}`)
        fail(res, 502, `拉取设备失败：${msg}`)
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
      await saveAccounts(accounts)
      ok(res)
    })
  },
})
