import { jest, describe, test, expect } from '@jest/globals'

// 本用例只读 shared.ts 里的写字段白名单常量；shared.ts 运行期会拉入 ../store.js（整个门面），
// 按既有惯例 mock 掉，避免加载无关模块与真实数据目录。
jest.mock('../store.js', () => ({ listDevices: jest.fn(async () => []) }))

import { ENTITY_FIELDS } from '@migptgui/contracts'
import {
  credentialSchema,
  deviceSchema,
  robotSchema,
  conversationSchema,
  speakerModelSchema,
  modelSchema,
  voiceSchema,
} from './schemas.js'
import {
  DEVICE_FIELDS,
  SPEAKER_MODEL_FIELDS,
  ROBOT_FIELDS,
  CONVERSATION_FIELDS,
  MODEL_FIELDS,
  VOICE_FIELDS,
} from '../routes/shared.js'
import {
  redactCredential,
  redactModel,
  redactDevice,
  redactVoice,
  redactGuiConfig,
} from '../redact.js'
import * as backupNs from './backup.js'

const sorted = (fields: readonly string[]) => [...fields].sort()
const schemaKeys = (schema: { shape: Record<string, unknown> }) =>
  Object.keys(schema.shape).sort()

describe('契约 ↔ 存储 schema 一致性', () => {
  test('各实体 zod schema 字段与契约清单严格一致', () => {
    expect(schemaKeys(credentialSchema)).toEqual(
      sorted(ENTITY_FIELDS.credential),
    )
    expect(schemaKeys(robotSchema)).toEqual(sorted(ENTITY_FIELDS.robot))
    expect(schemaKeys(modelSchema)).toEqual(sorted(ENTITY_FIELDS.model))
    expect(schemaKeys(voiceSchema)).toEqual(sorted(ENTITY_FIELDS.voice))
    expect(schemaKeys(speakerModelSchema)).toEqual(
      sorted(ENTITY_FIELDS.speakerModel),
    )
    expect(schemaKeys(conversationSchema)).toEqual(
      sorted(ENTITY_FIELDS.conversation),
    )
    expect(schemaKeys(deviceSchema)).toEqual(sorted(ENTITY_FIELDS.device))
  })
})

describe('契约 ↔ 路由写白名单一致性', () => {
  test('写接口白名单均为契约字段的子集（受控字段不可由客户端写入）', () => {
    const pairs: [readonly string[], readonly string[]][] = [
      [ROBOT_FIELDS, ENTITY_FIELDS.robot],
      [MODEL_FIELDS, ENTITY_FIELDS.model],
      [VOICE_FIELDS, ENTITY_FIELDS.voice],
      [SPEAKER_MODEL_FIELDS, ENTITY_FIELDS.speakerModel],
      [CONVERSATION_FIELDS, ENTITY_FIELDS.conversation],
      [DEVICE_FIELDS, ENTITY_FIELDS.device],
    ]
    for (const [whitelist, fields] of pairs) {
      const unknown = whitelist.filter((f) => !fields.includes(f))
      expect(unknown).toEqual([])
    }
  })
})

// ── 脱敏一致性：防止新增凭据字段漏脱敏、明文回传 ──
// 任意 redact* 函数的输出都不得包含凭据明文；SECRET_KEYS 必须覆盖关键凭据字段。

const SECRET = 'SUPER_SECRET_VALUE_12345'

describe('响应脱敏一致性', () => {
  test('凭据 passToken 不回传明文', () => {
    const out = JSON.stringify(
      redactCredential({
        id: 'a',
        name: 'x',
        miUserId: 'u',
        passToken: SECRET,
        createdAt: 1,
      }),
    )
    expect(out).not.toContain(SECRET)
  })

  test('模型 apiKey 不回传明文', () => {
    const out = JSON.stringify(
      redactModel({ id: 't', name: 'x', apiKey: SECRET } as never),
    )
    expect(out).not.toContain(SECRET)
  })

  test('设备 ttsSecret 不回传明文', () => {
    const out = JSON.stringify(
      redactDevice({ id: 'd', alias: 'x', ttsSecret: SECRET } as never),
    )
    expect(out).not.toContain(SECRET)
  })

  test('语音 TTS 令牌（edge/volcano/openai）不回传明文', () => {
    const out = JSON.stringify(
      redactVoice({
        id: 'v',
        name: 'x',
        tts: {
          edge: { trustedToken: SECRET },
          volcano: { accessToken: SECRET },
          openai: { apiKey: SECRET },
        },
      } as never),
    )
    expect(out).not.toContain(SECRET)
  })

  test('设备运行时配置（OPENAI_API_KEY / speaker.password / TTS 令牌）不回传明文', () => {
    const out = JSON.stringify(
      redactGuiConfig({
        env: { OPENAI_API_KEY: SECRET },
        config: { speaker: { password: SECRET } },
        tts: { edge: { trustedToken: SECRET } },
      } as never),
    )
    expect(out).not.toContain(SECRET)
  })

  test('关键凭据字段均被脱敏体系覆盖（防止新增凭据字段漏脱敏）', () => {
    // 与备份导出脱敏（SECRET_KEYS）对应的凭据字段集：任一 redact* 函数都必须抹除这些字段。
    const secretKeys = [
      'passToken',
      'apiKey',
      'ttsSecret',
      'trustedToken',
      'accessToken',
      'password',
    ]
    for (const key of secretKeys) {
      expect(backupNs.SECRET_KEYS.has(key)).toBe(true)
    }
  })
})
