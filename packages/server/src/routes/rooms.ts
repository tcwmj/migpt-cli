// ── 会话群（对话记忆上下文归属，多角色共用）──────────────────────
import { nanoid } from 'nanoid'
import { getRooms, saveRooms, roomListSchema, getRoles } from '../store.js'
import type { Room } from '../types.js'
import { pick, ROOM_FIELDS } from './shared.js'
import { createCrudRouter, roleRefs } from './crud.js'

export const registerRoomRoutes = createCrudRouter<Room>({
  path: 'rooms',
  label: '会话群',
  nameLabel: '会话群名称',
  list: getRooms,
  save: saveRooms,
  schema: roomListSchema,
  listTransform: async (rooms) => {
    const roles = await getRoles()
    return rooms.map((r) => ({
      ...r,
      roleCount: roles.filter((m) => m.roomRef === r.id).length,
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
  refRules: [roleRefs('roomRef')],
  refMessage: '该会话群正被对话角色引用，无法删除；请先解绑引用该会话群的角色',
})
