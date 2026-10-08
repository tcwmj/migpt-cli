import { jest, describe, test, expect } from '@jest/globals'

// 本用例只读 shared.ts 里的写字段白名单常量；shared.ts 运行期会拉入 ../store.js（整个门面），
// 按既有惯例 mock 掉，避免加载无关模块与真实数据目录。
jest.mock('../store.js', () => ({ listDeviceMetas: jest.fn(async () => []) }))

import { ENTITY_FIELDS } from '@migptgui/contracts'
import {
  accountSchema,
  deviceMetaSchema,
  roleSchema,
  roomSchema,
  settingsSchema,
  speakerModelSchema,
  thinkServiceSchema,
  voiceServiceSchema,
} from './schemas.js'
import {
  DEVICE_META_FIELDS,
  MODEL_FIELDS,
  ROLE_FIELDS,
  ROOM_FIELDS,
  THINK_FIELDS,
  VOICE_FIELDS,
} from '../routes/shared.js'

const sorted = (fields: readonly string[]) => [...fields].sort()
const schemaKeys = (schema: { shape: Record<string, unknown> }) =>
  Object.keys(schema.shape).sort()

describe('契约 ↔ 存储 schema 一致性', () => {
  test('各实体 zod schema 字段与契约清单严格一致', () => {
    expect(schemaKeys(settingsSchema)).toEqual(sorted(ENTITY_FIELDS.settings))
    expect(schemaKeys(accountSchema)).toEqual(sorted(ENTITY_FIELDS.account))
    expect(schemaKeys(roleSchema)).toEqual(sorted(ENTITY_FIELDS.role))
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
      [ROLE_FIELDS, ENTITY_FIELDS.role],
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
