import { describe, test, expect } from '@jest/globals'
import {
  redactCredential,
  redactCredentials,
  redactDevice,
  redactDevices,
  redactGuiConfig,
  redactModel,
  redactModels,
  redactBindings,
  redactVoice,
} from './redact.js'
import type {
  Credential,
  DeviceBindings,
  Device,
  Model,
  Voice,
} from './types.js'
import type { GuiConfig } from '@migptgui/options'

const SECRET = 'TOP_SECRET_123456'

const credential = (over: Partial<Credential> = {}): Credential => ({
  id: 'a1',
  name: '一号',
  miUserId: 'u1',
  passToken: SECRET,
  createdAt: 1,
  ...over,
})

const modelFixture = (over: Partial<Model> = {}): Model => ({
  id: 't1',
  name: '脑',
  provider: 'openai',
  model: 'gpt',
  apiKey: SECRET,
  createdAt: 2,
  ...over,
})

const device = (over: Partial<Device> = {}): Device => ({
  id: 'd1',
  alias: '音箱',
  did: 'D1',
  robotId: 'r1',
  ttsSecret: SECRET,
  createdAt: 3,
  ...over,
})

describe('redactCredential', () => {
  test('抹掉 passToken 明文并标记「已配置」', () => {
    const out = redactCredential(credential())
    expect(out.passToken).toBeUndefined()
    expect(out.hasPassToken).toBe(true)
    expect(JSON.stringify(out)).not.toContain(SECRET)
  })

  test('未配置 passToken 时标记为 false', () => {
    const out = redactCredential(credential({ passToken: undefined }))
    expect(out.hasPassToken).toBe(false)
  })

  test('redactCredentials 逐项脱敏', () => {
    const out = redactCredentials([credential(), credential({ id: 'a2' })])
    expect(out).toHaveLength(2)
    expect(out.every((c) => c.hasPassToken === true)).toBe(true)
  })
})

describe('redactModel', () => {
  test('抹掉 apiKey 明文并标记已配置', () => {
    const out = redactModel(modelFixture())
    expect(out.apiKey).toBe('')
    expect(out.hasApiKey).toBe(true)
    expect(JSON.stringify(out)).not.toContain(SECRET)
  })

  test('空 apiKey 标记为 false', () => {
    const out = redactModel(modelFixture({ apiKey: '' }))
    expect(out.hasApiKey).toBe(false)
  })

  test('redactModels 逐项脱敏', () => {
    const out = redactModels([modelFixture(), modelFixture({ id: 't2' })])
    expect(out.every((m) => m.hasApiKey === true)).toBe(true)
  })
})

describe('redactDevice', () => {
  test('抹掉 ttsSecret 明文并标记已配置', () => {
    const out = redactDevice(device())
    expect(out.ttsSecret).toBe('')
    expect(out.hasTtsSecret).toBe(true)
    expect(JSON.stringify(out)).not.toContain(SECRET)
  })

  test('redactDevices 逐项脱敏', () => {
    const out = redactDevices([device(), device({ id: 'd2' })])
    expect(out.every((d) => d.hasTtsSecret === true)).toBe(true)
  })
})

describe('redactVoice', () => {
  test('第三方 TTS 令牌不回传明文', () => {
    const out = redactVoice({
      id: 'v1',
      name: '声',
      provider: 'edge',
      createdAt: 1,
      tts: { edge: { trustedToken: SECRET } },
    } as Voice)
    expect(JSON.stringify(out)).not.toContain(SECRET)
    expect(out.hasTtsToken).toBe(true)
  })

  test('无 tts 配置标记为 false', () => {
    const out = redactVoice({
      id: 'v2',
      name: '内置',
      provider: 'builtin',
      createdAt: 1,
    } as Voice)
    expect(out.hasTtsToken).toBe(false)
  })
})

describe('redactGuiConfig', () => {
  const config = (): GuiConfig =>
    ({
      env: { OPENAI_API_KEY: SECRET },
      config: { speaker: { password: SECRET } },
      tts: { edge: { trustedToken: SECRET } },
    }) as unknown as GuiConfig

  test('抹掉模型密钥 / 凭据密码 / 各 TTS 令牌', () => {
    const out = redactGuiConfig(config())
    expect(JSON.stringify(out)).not.toContain(SECRET)
  })

  test('不就地修改深拷贝入参以外的原对象（原对象仍含明文）', () => {
    const src = config()
    const out = redactGuiConfig(src)
    expect(src.env.OPENAI_API_KEY).toBe(SECRET)
    expect(out.env.OPENAI_API_KEY).toBe('')
  })
})

describe('redactBindings', () => {
  test('凭据与模型脱敏，其余字段保留', () => {
    const bindings: DeviceBindings = {
      credential: credential(),
      model: modelFixture(),
      rows: [
        {
          key: 'credential',
          label: '凭据',
          name: '一号',
          source: 'device',
          sourceLabel: '设备',
        },
      ],
    }
    const out = redactBindings(bindings)
    expect(out.credential?.hasPassToken).toBe(true)
    expect(out.credential?.passToken).toBeUndefined()
    expect(out.model?.apiKey).toBe('')
    expect(out.rows).toHaveLength(1)
  })

  test('credential / model 缺省时不报错', () => {
    const out = redactBindings({ rows: [] })
    expect(out.credential).toBeUndefined()
    expect(out.model).toBeUndefined()
  })
})
