/* ══ 对话角色与会话群：过滤 + 引用统计 + 保存/创建/删除 ══ */
import { useCallback, useMemo } from 'react'
import * as api from '../apis.ts'
import type { DeviceRow, Role, Room } from '../apis.ts'
import type { ConfirmState } from '../ui-types.ts'
import { errText } from '../components/app/errText.ts'

export function useRolesRoomsCrud(opts: {
  roles: Role[]
  rooms: Room[]
  devices: DeviceRow[]
  query: string
  showToast: (msg: string) => void
  refreshAll: () => void
  setConfirm: (c: ConfirmState) => void
}) {
  const { roles, rooms, devices, query, showToast, refreshAll, setConfirm } =
    opts

  const filterRoles = useMemo(() => {
    if (!query) return roles
    const q = query.toLowerCase()
    return roles.filter((r) => r.name.toLowerCase().includes(q))
  }, [roles, query])

  const filterRooms = useMemo(() => {
    if (!query) return rooms
    const q = query.toLowerCase()
    return rooms.filter((rm) =>
      (rm.name + (rm.description || '')).toLowerCase().includes(q),
    )
  }, [rooms, query])

  /* 被哪些设备引用（别名列表） */
  const roleUsage = useCallback(
    (id: string) => devices.filter((d) => d.roleId === id).map((d) => d.alias),
    [devices],
  )
  const roomUsage = useCallback(
    (id: string) => devices.filter((d) => d.roomRef === id).map((d) => d.alias),
    [devices],
  )

  const saveRole = async (r: Role) => {
    try {
      await api.updateRole(r.id, r)
      showToast('角色已保存，人设与模型热生效')
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }
  const createRole = async (r: Partial<Role>) => {
    try {
      const c = await api.createRole(r)
      showToast('角色已创建')
      await refreshAll()
      return c
    } catch (e) {
      showToast(errText(e))
      return null
    }
  }
  const delRole = async (id: string) => {
    const used = roleUsage(id)
    if (used.length) {
      showToast(
        `该角色正被 ${used.length} 台设备引用（${used.join('、')}），请先解除设备绑定`,
      )
      return
    }
    const r = roles.find((x) => x.id === id)
    setConfirm({
      title: '删除对话角色',
      msg: `确定删除「${r?.name || '该角色'}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteRole(id)
          showToast('角色已删除')
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }

  const saveRoom = async (r: Room) => {
    try {
      await api.updateRoom(r.id, r)
      showToast('会话群已保存，关联设备重启后生效')
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }
  const createRoom = async (r: Partial<Room>) => {
    try {
      const c = await api.createRoom(r)
      showToast('会话群已创建')
      await refreshAll()
      return c
    } catch (e) {
      showToast(errText(e))
      return null
    }
  }
  const delRoom = async (id: string) => {
    const used = roomUsage(id)
    if (used.length) {
      showToast(`该会话群正被设备「${used.join('、')}」引用，请先解除设备绑定`)
      return
    }
    const r = rooms.find((x) => x.id === id)
    setConfirm({
      title: '删除会话群',
      msg: `确定删除「${r?.name || '该会话群'}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteRoom(id)
          showToast('会话群已删除')
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }

  return {
    filterRoles,
    filterRooms,
    roleUsage,
    roomUsage,
    saveRole,
    createRole,
    delRole,
    saveRoom,
    createRoom,
    delRoom,
  }
}
