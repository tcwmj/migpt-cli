// ── 会话群（对话记忆上下文归属，多设备共用）──────────────────────
import { nanoid } from 'nanoid'
import { roomsFile } from '../paths.js'
import {
  getRooms,
  roomListSchema,
  writeJson,
  listDeviceMetas,
} from '../store.js'
import type { Room } from '../types.js'
import { pick, ROOM_FIELDS } from './shared.js'
import { createCrudRouter, deviceRefs } from './crud.js'

export const registerRoomRoutes = createCrudRouter<Room>({
  path: 'rooms',
  label: '会话群',
  nameLabel: '会话群名称',
  list: getRooms,
  save: (list) => writeJson(roomsFile, list),
  schema: roomListSchema,
  listTransform: async (rooms) => {
    const metas = await listDeviceMetas()
    return rooms.map((r) => ({
      ...r,
      deviceCount: metas.filter((m) => m.roomRef === r.id).length,
    }))
  },
  validate: (body) => (body.name ? null : '会话群名称必填'),
  build: (body) => ({
    id: nanoid(8),
    name: body.name as string,
    description: body.description,
    createdAt: Date.now(),
  }),
  applyUpdate: (list, idx, body) => {
    list[idx] = {
      ...list[idx],
      ...pick<Room>(body, ROOM_FIELDS),
      id: list[idx].id,
    }
  },
  refRules: [deviceRefs('roomRef')],
  refMessage: '该会话群正被设备引用，无法删除；请先解绑引用该会话群的设备',
})
