import { jest, describe, test, expect } from '@jest/globals'

// 本用例只读 shared.ts 里的写字段白名单常量；shared.ts 运行期会拉入 ../store.js（整个门面），
// 按既有惯例 mock 掉，避免加载无关模块与真实数据目录。
jest.mock('../store.js', () => ({ listDeviceMetas: jest.fn(async () => []) }))

import { ENTITY_FIELDS } from '@migptgui/contracts'
import {
  accountSchema,
  deviceMetaSchema,
  robotSchema,
  roomSchema,
  settingsSchema,
  speakerModelSchema,
  thinkServiceSchema,
  voiceServiceSchema,
} from './schemas.js'
import {
  DEVICE_META_FIELDS,
  MODEL_FIELDS,
  ROBOT_FIELDS,
  ROOM_FIELDS,
  THINK_FIELDS,
  VOICE_FIELDS,
} from '../routes/shared.js'
import {
  redactAccount,
  redactThinkService,
  redactDeviceMeta,
  redactSettings,
  redactVoiceService,
  redactGuiConfig,
} from '../redact.js'
import * as backupNs from './backup.js'

const sorted = (fields: readonly string[]) => [...fields].sort()
const schemaKeys = (schema: { shape: Record<string, unknown> }) =>
  Object.keys(schema.shape).sort()

describe('契约 ↔ 存储 schema 一致性', () => {
  test('各实体 zod schema 字段与契约清单严格一致', () => {
    expect(schemaKeys(settingsSchema)).toEqual(sorted(ENTITY_FIELDS.settings))
    expect(schemaKeys(accountSchema)).toEqual(sorted(ENTITY_FIELDS.account))
    expect(schemaKeys(robotSchema)).toEqual(sorted(ENTITY_FIELDS.robot))
    expect(schemaKeys(thinkServiceSchema)).toEqual(
      sorted(ENTITY_FIELDS.thinkService),
    )
    expect(schemaKeys(voiceServiceSchema)).toEqual(
      sorted(ENTITY_FIELDS.voiceService),
    )
    expect(schemaKeys(speakerModelSchema)).toEqual(
      sorted(ENTITY_FIELDS.speakerModel),
    )
    expect(schemaKeys(roomSchema)).toEqual(sorted(ENTITY_FIELDS.room))
    expect(schemaKeys(deviceMetaSchema)).toEqual(
      sorted(ENTITY_FIELDS.deviceMeta),
    )
  })
})

describe('契约 ↔ 路由写白名单一致性', () => {
  test('写接口白名单均为契约字段的子集（受控字段不可由客户端写入）', () => {
    const pairs: [readonly string[], readonly string[]][] = [
      [ROBOT_FIELDS, ENTITY_FIELDS.robot],
      [THINK_FIELDS, ENTITY_FIELDS.thinkService],
      [VOICE_FIELDS, ENTITY_FIELDS.voiceService],
      [MODEL_FIELDS, ENTITY_FIELDS.speakerModel],
      [ROOM_FIELDS, ENTITY_FIELDS.room],
      [DEVICE_META_FIELDS, ENTITY_FIELDS.deviceMeta],
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
  test('账号凭据（passToken / miPassword）不回传明文', () => {
    const out = JSON.stringify(
      redactAccount({
        id: 'a',
        name: 'x',
        miUserId: 'u',
        passToken: SECRET,
        miPassword: SECRET,
      } as never),
    )
    expect(out).not.toContain(SECRET)
  })

  test('思考服务 apiKey 不回传明文', () => {
    const out = JSON.stringify(
      redactThinkService({ id: 't', name: 'x', apiKey: SECRET } as never),
    )
    expect(out).not.toContain(SECRET)
  })

  test('设备 ttsSecret 不回传明文', () => {
    const out = JSON.stringify(
      redactDeviceMeta({ id: 'd', alias: 'x', ttsSecret: SECRET } as never),
    )
    expect(out).not.toContain(SECRET)
  })

  test('旧版 settings passToken 不回传明文', () => {
    const out = JSON.stringify(
      redactSettings({ miUserId: 'u', passToken: SECRET } as never),
    )
    expect(out).not.toContain(SECRET)
  })

  test('语音服务 TTS 令牌（edge/volcano/openai）不回传明文', () => {
    const out = JSON.stringify(
      redactVoiceService({
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
      'miPassword',
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
