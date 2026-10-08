// ── 内置数据种子：型号/语音服务初始化、重置与旧数据迁移 ──
import path from 'node:path'
import { nanoid } from 'nanoid'
import {
  devicesRoot,
  speakerModelsFile,
  voiceServicesFile,
  roomsFile,
} from '../paths.js'
import { appendLog, clearDeviceLog, demoTs } from '../logger.js'
import {
  type DeviceMeta,
  type SpeakerModel,
  type VoiceService,
} from '../types.js'
import { writeJson } from './json.js'
import {
  getRooms,
  getSpeakerModels,
  getVoiceServices,
  listDeviceMetas,
} from './entities.js'

/**
 * 系统内置音箱型号（初始化时必须存在；禁删禁编辑）。
 * 清单与指令参数对齐 mi-gpt 官方兼容型号表（github.com/idootop/mi-gpt docs/compatibility.md）
 * 与 migpt-server 内置型号选择器（packages/options ChooseSpeaker）。
 * 分组：支持连续对话（完美运行）/ 不支持连续对话（正常运行）。
 */
export const BUILTIN_MODELS: Omit<SpeakerModel, 'createdAt'>[] = [
  // ── 支持连续对话（完美运行）──
  {
    id: 'xiaomi-smart-pro',
    name: 'Xiaomi 智能音箱 Pro',
    did: 'OH2P',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/vIHjnJJqrc',
  },
  {
    id: 'xiaomi-smart',
    name: 'Xiaomi 智能音箱',
    did: 'OH2',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    playingCommand: [3, 1, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/WQG4uLGOcd',
  },
  {
    id: 'xiaomi-pro',
    name: '小爱音箱 Pro',
    did: 'LX06',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/fqq9JgNvUR',
  },
  {
    id: 'xiaomi-ai-speaker',
    name: '小米 AI 音箱',
    did: 'S12',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/s1KdNlarvU',
  },
  {
    id: 'xiaomi-ai-speaker-2',
    name: '小米 AI 音箱（第二代）',
    did: 'L15A',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    playingCommand: [3, 1, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/h84tjXGVYP',
  },
  {
    id: 'xiaomi-universal',
    name: '小爱音箱 万能遥控版',
    did: 'LX5A',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/ZpRUVmwTh5',
  },
  {
    id: 'xiaomi-play-2019',
    name: '小爱音箱 Play（2019 款）',
    did: 'LX05',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    playingCommand: [3, 1, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/sIhk2YxwD7',
  },
  {
    id: 'xiaomi-home-screen-10',
    name: '小爱智能家庭屏 10',
    did: 'X10A',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/sDM9V3slih',
  },
  {
    id: 'xiaomi-sound-pro',
    name: 'Xiaomi Sound Pro',
    did: 'L17A',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/s7vgvRqqwU',
  },
  // ── 不支持连续对话（正常运行）──
  {
    id: 'xiaomi-speaker',
    name: '小爱音箱',
    did: 'L06A',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 2],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/Ig6OUMFV2u',
  },
  {
    id: 'xiaomi-mini',
    name: '小爱音箱 mini',
    did: 'LX01',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 2],
    playingCommand: [4, 1, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/IBVUyAfu4M',
  },
  {
    id: 'xiaomi-play',
    name: '小爱音箱 Play',
    did: 'L05B',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/s9jN6QwVcG',
  },
  {
    id: 'xiaomi-play-plus',
    name: '小米小爱音箱 Play 增强版',
    did: 'L05C',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/NU5KITCTbl',
  },
  {
    id: 'xiaomi-art',
    name: '小爱音箱 Art',
    did: 'L09A',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [3, 1],
    wakeUpCommand: [3, 2],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/c7uFBjO7cV',
  },
  {
    id: 'xiaomi-touch',
    name: '小爱触屏音箱',
    did: 'LX04',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 2],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/SkwcG8td6n',
  },
  {
    id: 'xiaomi-home-mini',
    name: 'Xiaomi 智能家庭屏 Mini',
    did: 'ASX4B',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/Q9Vnj3UTJt',
  },
  {
    id: 'xiaomi-home-6',
    name: 'Xiaomi 智能家庭屏 6',
    did: 'X6A',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/2QVKCAW8rT',
  },
  {
    id: 'xiaomi-redmi-touch-8',
    name: 'Redmi 小爱触屏音箱 Pro 8 英寸',
    did: 'X08E',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/0UncKIwUlB',
  },
  {
    id: 'xiaomi-home-pro-8',
    name: 'Xiaomi 智能家庭屏 Pro 8',
    did: 'X8F',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/FQuMVAKPUK',
  },
]

export async function seedBuiltinVoice() {
  const list = await getVoiceServices()
  // 存量迁移：旧名「小米内置」→「默认语音」（历史数据可能存在多条 builtin，全部统一改名）
  let changed = false
  for (const v of list) {
    if (v.builtin && v.name === '小米内置') {
      v.name = '默认语音'
      changed = true
    }
  }
  if (changed) {
    await writeJson(voiceServicesFile, list)
    console.log('已更新内置语音服务名称：默认语音')
    return
  }
  if (!list.some((v) => v.builtin)) {
    list.unshift({
      id: 'builtin-mi',
      name: '默认语音',
      provider: 'builtin',
      builtin: true,
      isDefault: list.length === 0,
      createdAt: Date.now(),
    })
    await writeJson(voiceServicesFile, list)
    console.log('已初始化内置语音服务：默认语音')
  }
}

export async function seedBuiltinModels() {
  const list = await getSpeakerModels()
  // 只补缺失的内置型号：已存在的内置项（含用户修改）永不覆盖；
  // 用户可通过「重置默认」恢复为 BUILTIN_MODELS 官方默认值。
  const existing = new Set(list.map((x) => x.id))
  const missing = BUILTIN_MODELS.filter((m) => !existing.has(m.id))
  if (missing.length === 0) return
  const merged = [
    ...list,
    ...missing.map((m) => ({ ...m, createdAt: Date.now() })),
  ]
  await writeJson(speakerModelsFile, merged)
  console.log(`已初始化内置音箱型号：${missing.map((m) => m.name).join('、')}`)
}

/** 重置内置型号为官方默认值（仅 builtin 型号可用；保留 createdAt/id/builtin） */
export async function resetBuiltinModel(
  id: string,
): Promise<SpeakerModel | undefined> {
  const def = BUILTIN_MODELS.find((m) => m.id === id)
  if (!def) return undefined
  const list = await getSpeakerModels()
  const idx = list.findIndex((m) => m.id === id)
  if (idx < 0 || !list[idx].builtin) return undefined
  list[idx] = { ...def, createdAt: list[idx].createdAt }
  await writeJson(speakerModelsFile, list)
  return list[idx]
}

/** 重置内置语音服务为默认（仅 builtin 语音可用） */
export async function resetBuiltinVoice(
  id: string,
): Promise<VoiceService | undefined> {
  const list = await getVoiceServices()
  const idx = list.findIndex((v) => v.id === id)
  if (idx < 0 || !list[idx].builtin) return undefined
  const isDefault = list.some((v) => v.id !== id && v.isDefault) ? false : true
  list[idx] = {
    id: list[idx].id,
    name: '默认语音',
    provider: 'builtin',
    builtin: true,
    isDefault,
    createdAt: list[idx].createdAt,
  }
  await writeJson(voiceServicesFile, list)
  return list[idx]
}

/** 迁移旧版设备会话群字段 → Room 独立实体（幂等；同名归并，多设备共用） */
export async function migrateRooms() {
  const metas = await listDeviceMetas()
  const rooms = await getRooms()
  let changed = false
  for (const meta of metas) {
    if (!meta.roomName || meta.roomRef) continue
    let room = rooms.find((r) => r.name === meta.roomName)
    if (!room) {
      room = {
        id: nanoid(8),
        name: meta.roomName,
        description: meta.roomDescription,
        createdAt: Date.now(),
      }
      rooms.push(room)
    }
    const nextMeta: DeviceMeta = { ...meta, roomRef: room.id }
    delete nextMeta.roomName
    delete nextMeta.roomDescription
    await writeJson(path.join(devicesRoot, meta.id, 'meta.json'), nextMeta)
    changed = true
  }
  if (changed) await writeJson(roomsFile, rooms)
}

// ── 演示日志种子：仅 MIGPT_DEMO_LOGS=1 时注入 mock 对话，供「对话记录」页联调 ──
const DEMO_SCENES: { q: string; a: string; sys: string }[] = [
  {
    q: '小爱同学，今天天气怎么样',
    a: '今天多云转晴，气温 18~26℃，早晚偏凉记得加件外套。',
    sys: '思考服务命中角色默认（豆包 Doubao-Seed）',
  },
  {
    q: '帮我设一个 30 分钟的番茄钟',
    a: '好的，30 分钟倒计时已开始，结束后我会提醒你休息一下。',
    sys: '语音音色由角色指定（默认语音）',
  },
  {
    q: '播放点轻音乐',
    a: '为你播放《Lofi 清晨电台》，音量已调到 30%。',
    sys: '',
  },
  {
    q: '小爱同学，国庆周边有什么好玩的',
    a: '苏州周边推荐：拙政园、平江路夜游、金鸡湖音乐喷泉，今天人流量较大建议错峰出行。',
    sys: '语音音色热切换成功（豆包语音）',
  },
]

export async function seedDemoLogs() {
  if (!process.env.MIGPT_DEMO_LOGS) return
  const devices = await listDeviceMetas()
  if (!devices.length) return
  const now = Date.now()
  for (const d of devices) {
    // 走 appendLog 统一入口，保证原始缓冲与结构化缓冲同步生成
    clearDeviceLog(d.id)
    for (let i = 0; i < 4; i++) {
      const s = DEMO_SCENES[i % DEMO_SCENES.length]
      const tq = new Date(now - (i * 47 + 13) * 60000)
      appendLog(d.id, `${demoTs(tq)} [用户] 问：${s.q}`)
      appendLog(
        d.id,
        `${demoTs(new Date(tq.getTime() + 3500))} [AI] 答：${s.a}`,
      )
      if (s.sys)
        appendLog(
          d.id,
          `${demoTs(new Date(tq.getTime() + 16000))} [系统] ${s.sys}`,
        )
    }
  }
  console.log(
    `[demo] 已为 ${devices.length} 台设备注入演示对话日志（MIGPT_DEMO_LOGS=1）`,
  )
}
