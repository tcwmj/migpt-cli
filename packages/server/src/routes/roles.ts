// ── AI 角色（人设 + 对话行为）───────────────────────────────────
import { nanoid } from 'nanoid'
import {
  getRoles,
  saveRoles,
  resetBuiltinRole,
  roleListSchema,
} from '../store.js'
import { type Role } from '../types.js'
import {
  API_PREFIX,
  asyncHandler,
  fail,
  pick,
  normProfile,
  ROLE_FIELDS,
} from './shared.js'
import { createCrudRouter, deviceRefs } from './crud.js'

export const registerRoleRoutes = createCrudRouter<Role>({
  path: 'roles',
  label: '角色',
  nameLabel: '角色名称',
  list: getRoles,
  save: saveRoles,
  schema: roleListSchema,
  listTransform: (roles) =>
    roles.map((r) => ({ ...r, profile: normProfile(r.profile) })),
  // 内置角色（如「傻妞」）不可删除，但可编辑、可重置默认；其余实体同规则。
  // 对话行为字段由调用方完整提供，缺失即拒绝创建：
  // 空数组合法（表示「不设该提示」），仅当字段缺失（undefined / null）时拒绝。
  validate: (body) =>
    !body.name
      ? '角色称呼必填'
      : body.profile == null ||
          body.callAIKeywords == null ||
          body.wakeUpKeywords == null ||
          body.exitKeywords == null ||
          body.onEnterAI == null ||
          body.onExitAI == null ||
          body.onAIAsking == null ||
          body.onAIReplied == null ||
          body.onAIError == null ||
          body.checkInterval == null ||
          body.checkTTSStatusAfter == null ||
          body.exitKeepAliveAfter == null
        ? '角色配置不完整（对话行为字段缺失）'
        : null,
  build: (body) =>
    ({
      id: nanoid(8),
      ...pick<Role>(body, ROLE_FIELDS),
      profile: normProfile(body.profile),
      // 内置标记只由代码注册表（store/builtins）决定，禁止客户端伪造 builtin:true
      builtin: false,
    }) as Role,
  applyUpdate: (list, idx, body) => {
    list[idx] = {
      ...list[idx],
      ...pick<Role>(body, ROLE_FIELDS),
      id: list[idx].id,
      builtin: list[idx].builtin,
      profile: normProfile(body.profile ?? list[idx].profile),
    }
  },
  deleteGuard: (target) => (target.builtin ? '系统内置角色不可删除' : null),
  refRules: [deviceRefs('roleId')],
  refMessage: '该角色正被设备引用，无法删除；请先更换引用该角色的设备',
  extra: ({ app }) => {
    // 重置内置角色为系统默认值（仅 builtin 可用；用户改动可随时恢复）
    app.post(
      `${API_PREFIX}/roles/:id/reset`,
      asyncHandler(async (req, res) => {
        const role = await resetBuiltinRole(req.params.id)
        if (!role) {
          fail(res, 404, '仅系统内置角色支持重置默认')
          return
        }
        res.json(role)
      }),
    )
  },
})
