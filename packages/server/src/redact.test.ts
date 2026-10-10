import { describe, test, expect } from '@jest/globals'
import {
  redactAccount,
  redactAccounts,
  redactBindings,
  redactDeviceMeta,
  redactDeviceMetas,
  redactGuiConfig,
  redactSettings,
  redactThinkService,
  redactThinkServices,
} from './redact.js'
import type {
  Account,
  DeviceBindings,
  DeviceMeta,
  ThinkService,
} from './types.js'
import type { GuiConfig } from '@migptgui/options'

const account = (over: Partial<Account> = {}): Account => ({
  id: 'a1',
  name: '主账号',
  miUserId: '123456',
  miPassword: 'mi-pwd',
  passToken: 'mi-pass-token',
  createdAt: 1,
  ...over,
})

const think = (over: Partial<ThinkService> = {}): ThinkService => ({
  id: 't1',
  name: '豆包',
  provider: 'doubao',
  model: 'doubao-pro',
  apiKey: 'sk-secret',
  createdAt: 2,
  ...over,
})

const device = (over: Partial<DeviceMeta> = {}): DeviceMeta => ({
  id: 'd1',
  alias: '客厅音箱',
  did: 'X08E',
  robotId: 'r1',
  ttsSecret: 'tts-token',
  createdAt: 3,
  ...over,
})

describe('redactAccount', () => {
  test('抹掉明文凭据并标记「已配置」', () => {
    const out = redactAccount(account())
    expect(out.passToken).toBeUndefined()
    expect(out.miPassword).toBeUndefined()
    expect(out.hasPassToken).toBe(true)
    expect(out.hasMiPassword).toBe(true)
    // 非凭据字段保持不变
    expect(out).toMatchObject({ id: 'a1', name: '主账号', miUserId: '123456' })
  })

  test('未配置凭据时标记为 false', () => {
    const out = redactAccount(
      account({ passToken: undefined, miPassword: undefined }),
    )
    expect(out.hasPassToken).toBe(false)
    expect(out.hasMiPassword).toBe(false)
  })

  test('redactAccounts 逐项脱敏', () => {
    const out = redactAccounts([account(), account({ id: 'a2' })])
    expect(out).toHaveLength(2)
    expect(out.every((a) => a.hasPassToken && a.hasMiPassword)).toBe(true)
  })
})

describe('redactThinkService', () => {
  test('apiKey 置空并标记', () => {
    const out = redactThinkService(think())
    expect(out.apiKey).toBe('')
    expect(out.hasApiKey).toBe(true)
    expect(out).toMatchObject({ id: 't1', provider: 'doubao' })
  })

  test('无 apiKey 时标记为 false', () => {
    const out = redactThinkService(think({ apiKey: '' }))
    expect(out.hasApiKey).toBe(false)
  })

  test('redactThinkServices 逐项脱敏', () => {
    const out = redactThinkServices([think(), think({ id: 't2' })])
    expect(out.map((s) => s.apiKey)).toEqual(['', ''])
  })
})

describe('redactDeviceMeta', () => {
  test('ttsSecret 置空并标记', () => {
    const out = redactDeviceMeta(device())
    expect(out.ttsSecret).toBe('')
    expect(out.hasTtsSecret).toBe(true)
    expect(out).toMatchObject({ id: 'd1', alias: '客厅音箱', did: 'X08E' })
  })

  test('redactDeviceMetas 逐项脱敏', () => {
    const out = redactDeviceMetas([device(), device({ id: 'd2' })])
    expect(out.every((d) => d.hasTtsSecret && d.ttsSecret === '')).toBe(true)
  })
})

describe('redactSettings', () => {
  test('只保留 miUserId 与 hasPassToken 标记', () => {
    const out = redactSettings({
      miUserId: 'u1',
      miPassword: 'p',
      passToken: 't',
    })
    expect(out).toEqual({ miUserId: 'u1', hasPassToken: true })
  })

  test('无 passToken 时标记为 false', () => {
    expect(redactSettings({ miUserId: 'u1' }).hasPassToken).toBe(false)
  })
})

describe('redactGuiConfig', () => {
  const config = (): GuiConfig =>
    ({
      config: {
        bot: { name: '傻妞', profile: '' },
        master: { name: '主人', profile: '' },
        speaker: { userId: 'u1', password: 'mi-pwd', did: 'X08E' },
      },
      env: { OPENAI_API_KEY: 'sk-1', OPENAI_MODEL: 'gpt' },
      tts: {
        edge: { trustedToken: 'edge-token' },
        volcano: { accessToken: 'volcano-token' },
        openai: { apiKey: 'tts-openai-key' },
      },
    }) as unknown as GuiConfig

  test('抹掉模型密钥 / 账号密码 / 各 TTS 令牌', () => {
    const out = redactGuiConfig(config())
    expect(out.env.OPENAI_API_KEY).toBe('')
    expect(
      (out.config as { speaker: { password: string } }).speaker.password,
    ).toBe('')
    const tts = out.tts as {
      edge: { trustedToken: string }
      volcano: { accessToken: string }
      openai: { apiKey: string }
    }
    expect(tts.edge.trustedToken).toBe('')
    expect(tts.volcano.accessToken).toBe('')
    expect(tts.openai.apiKey).toBe('')
    // 非凭据字段保留
    expect(out.env.OPENAI_MODEL).toBe('gpt')
  })

  test('不就地修改入参（深拷贝）', () => {
    const src = config()
    redactGuiConfig(src)
    expect(src.env.OPENAI_API_KEY).toBe('sk-1')
    expect(
      (src.config as { speaker: { password: string } }).speaker.password,
    ).toBe('mi-pwd')
  })
})

describe('redactBindings', () => {
  test('账号与思考服务脱敏，角色 / 语音 / 行不变', () => {
    const bindings: DeviceBindings = {
      account: account(),
      think: think(),
      rows: [
        {
          key: 'account',
          label: '云端账号',
          name: '主账号',
          source: 'device',
          sourceLabel: '设备指定',
        },
      ],
    }
    const out = redactBindings(bindings)
    expect(out.account?.hasPassToken).toBe(true)
    expect(out.account?.passToken).toBeUndefined()
    expect(out.think?.apiKey).toBe('')
    expect(out.think?.hasApiKey).toBe(true)
    expect(out.rows).toEqual(bindings.rows)
  })

  test('account / think 缺省时不报错', () => {
    const out = redactBindings({ rows: [] })
    expect(out.account).toBeUndefined()
    expect(out.think).toBeUndefined()
  })
})
