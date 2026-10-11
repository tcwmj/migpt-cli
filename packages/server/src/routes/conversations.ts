// ── 会话群（对话记忆上下文归属，多角色共用）──────────────────────
import { nanoid } from 'nanoid'
import {
  getRooms,
  saveRooms,
  resetBuiltinRoom,
  roomListSchema,
  getRobots,
} from '../store.js'
import type { Room } from '../types.js'
import { API_PREFIX, asyncHandler, fail, pick, ROOM_FIELDS } from './shared.js'
import { createCrudRouter, robotRefs } from './crud.js'

export const registerRoomRoutes = createCrudRouter<Room>({
  path: 'rooms',
  label: '会话群',
  nameLabel: '会话群名称',
  list: getRooms,
  save: saveRooms,
  schema: roomListSchema,
  listTransform: async (rooms) => {
    const robots = await getRobots()
    return rooms.map((r) => ({
      ...r,
      robotCount: robots.filter((m) => m.roomRef === r.id).length,
    }))
  },
  validate: (body) => (body.name ? null : '会话群名称必填'),
  build: (body) => ({
    id: nanoid(8),
    name: body.name as string,
    description: body.description,
    // 内置标记只由代码注册表（store/builtins）决定，禁止客户端伪造 builtin:true
    builtin: false,
    createdAt: Date.now(),
  }),
  applyUpdate: (list, idx, body) => {
    list[idx] = {
      ...list[idx],
      ...pick<Room>(body, ROOM_FIELDS),
      id: list[idx].id,
      builtin: list[idx].builtin,
    }
  },
  deleteGuard: (target) => (target.builtin ? '系统内置会话群不可删除' : null),
  refRules: [robotRefs('roomRef')],
  refMessage: '该会话群正被对话角色引用，无法删除；请先解绑引用该会话群的角色',
  extra: ({ app }) => {
    // 重置内置会话群为系统默认值（仅 builtin 可用；用户改动可随时恢复）
    app.post(
      `${API_PREFIX}/rooms/:id/reset`,
      asyncHandler(async (req, res) => {
        const room = await resetBuiltinRoom(req.params.id)
        if (!room) {
          fail(res, 404, '仅系统内置会话群支持重置默认')
          return
        }
        res.json(room)
      }),
    )
  },
})
