// ── 小米凭据（多凭据）：CRUD + 云端设备拉取 ──────────────────────
// 原「云端账号（accounts）」实体并入凭据后的唯一入口；
// 旧版单对象 credentials 兼容读写（/settings）已随实体合并移除。
import { nanoid } from 'nanoid'
import {
  getCredentials,
  credentialListSchema,
  saveCredentials,
} from '../store.js'
import { pullMicoDevices } from '../services.js'
import { redactCredential, redactCredentials } from '../redact.js'
import type { Credential } from '../types.js'
import { logger } from '../logger.js'
import { createCrudRouter, deviceRefs } from './crud.js'
import { API_PREFIX, asyncHandler, fail } from './shared.js'

export const registerCredentialRoutes = createCrudRouter<Credential>({
  path: 'credentials',
  label: '凭据',
  nameLabel: '凭据名称',
  list: getCredentials,
  save: saveCredentials,
  schema: credentialListSchema,
  listTransform: redactCredentials,
  validate: (body) =>
    !body.name || !body.miUserId ? '名称与小米账号数字 ID 必填' : null,
  build: (body) => ({
    id: nanoid(8),
    name: body.name as string,
    miUserId: body.miUserId as string,
    passToken: body.passToken,
    createdAt: Date.now(),
  }),
  applyUpdate: (list, idx, body) => {
    const cur = list[idx]
    // 脱敏后前端不回读明文凭据：仅在显式传入 passToken 时才覆盖令牌，避免误清空
    list[idx] = {
      ...cur,
      name: body.name ?? cur.name,
      miUserId: body.miUserId ?? cur.miUserId,
      ...(body.passToken !== undefined ? { passToken: body.passToken } : {}),
    }
  },
  respond: redactCredential,
  refRules: [deviceRefs('credentialId')],
  refMessage: '该凭据正被设备引用，无法删除；请先解绑相关设备',
  extra: ({ app }) => {
    // 凭 小米ID + passToken 拉取凭据下音箱设备列表（五步连接 Step2 与设备添加复用）
    app.post(
      `${API_PREFIX}/credentials/:id/pull-devices`,
      asyncHandler(async (req, res) => {
        const credentials = await getCredentials()
        const credential = credentials.find((a) => a.id === req.params.id)
        if (!credential) {
          fail(res, 404, '凭据不存在')
          return
        }
        if (!credential.miUserId || !credential.passToken) {
          res
            .status(400)
            .json({ error: '请先填写小米账号数字 ID 与会话凭证（passToken）' })
          return
        }
        try {
          const devices = await pullMicoDevices(
            credential.miUserId,
            credential.passToken,
          )
          res.json({ devices })
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          logger.error({ err: e }, `拉取凭据设备失败：${msg}`)
          fail(res, 502, `拉取设备失败：${msg}`)
        }
      }),
    )
  },
})
