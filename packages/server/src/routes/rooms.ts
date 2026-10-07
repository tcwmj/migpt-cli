// ── 会话群（对话记忆上下文归属，多设备共用）──────────────────────
import { nanoid } from 'nanoid'
import { roomsFile } from '../paths.js'
import {
  getRooms,
  assertUniqueName,
  writeJson,
  listDeviceMetas,
} from '../store.js'
import type { Room } from '../types.js'
import { pick, ROOM_FIELDS, refConflict, type RouteContext } from './shared.js'

export function registerRoomRoutes({ app }: RouteContext): void {
  app.get('/api/rooms', async (req, res) => {
    const rooms = await getRooms()
    const metas = await listDeviceMetas()
    res.json(
      rooms.map((r) => ({
        ...r,
        deviceCount: metas.filter((m) => m.roomRef === r.id).length,
      })),
    )
  })

  app.post('/api/rooms', async (req, res) => {
    const body = req.body as Partial<Room>
    if (!body.name) {
      res.status(400).json({ error: '会话群名称必填' })
      return
    }
    const rooms = await getRooms()
    const dup = assertUniqueName(rooms, body.name, undefined, '会话群名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const room: Room = {
      id: nanoid(8),
      name: body.name,
      description: body.description,
      createdAt: Date.now(),
    }
    rooms.push(room)
    await writeJson(roomsFile, rooms)
    res.json(room)
  })

  app.put('/api/rooms/:id', async (req, res) => {
    const rooms = await getRooms()
    const idx = rooms.findIndex((r) => r.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '会话群不存在' })
      return
    }
    const body = req.body as Partial<Room>
    const dup = assertUniqueName(rooms, body.name, req.params.id, '会话群名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    rooms[idx] = {
      ...rooms[idx],
      ...pick<Room>(body, ROOM_FIELDS),
      id: req.params.id,
    }
    await writeJson(roomsFile, rooms)
    res.json(rooms[idx])
  })

  app.delete('/api/rooms/:id', async (req, res) => {
    const rooms = await getRooms()
    if (!rooms.some((r) => r.id === req.params.id)) {
      res.status(404).json({ error: '会话群不存在' })
      return
    }
    // 删除保护：被设备引用的会话群禁止删除
    const metas = await listDeviceMetas()
    const refDevices = metas.filter((m) => m.roomRef === req.params.id)
    if (refDevices.length > 0) {
      refConflict(
        res,
        { devices: refDevices.map((d) => d.alias) },
        '该会话群正被设备引用，无法删除；请先解绑引用该会话群的设备',
      )
      return
    }
    await writeJson(
      roomsFile,
      rooms.filter((r) => r.id !== req.params.id),
    )
    res.json({ success: true })
  })
}
