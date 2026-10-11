// ── 会话（对话记忆上下文归属，多角色共用）──────────────────────
import { nanoid } from 'nanoid'
import {
  getConversations,
  saveConversations,
  resetBuiltinConversation,
  conversationListSchema,
  getRobots,
} from '../store.js'
import type { Conversation } from '../types.js'
import {
  API_PREFIX,
  asyncHandler,
  fail,
  pick,
  CONVERSATION_FIELDS,
} from './shared.js'
import { createCrudRouter, robotRefs } from './crud.js'

export const registerConversationRoutes = createCrudRouter<Conversation>({
  path: 'conversations',
  label: '会话',
  nameLabel: '会话名称',
  list: getConversations,
  save: saveConversations,
  schema: conversationListSchema,
  listTransform: async (conversations) => {
    const robots = await getRobots()
    return conversations.map((r) => ({
      ...r,
      robotCount: robots.filter((m) => m.conversationId === r.id).length,
    }))
  },
  validate: (body) => (body.name ? null : '会话名称必填'),
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
      ...pick<Conversation>(body, CONVERSATION_FIELDS),
      id: list[idx].id,
      builtin: list[idx].builtin,
    }
  },
  deleteGuard: (target) => (target.builtin ? '系统内置会话不可删除' : null),
  refRules: [robotRefs('conversationId')],
  refMessage: '该会话正被对话角色引用，无法删除；请先解绑引用该会话的角色',
  extra: ({ app }) => {
    // 重置内置会话为系统默认值（仅 builtin 可用；用户改动可随时恢复）
    app.post(
      `${API_PREFIX}/conversations/:id/reset`,
      asyncHandler(async (req, res) => {
        const conversation = await resetBuiltinConversation(req.params.id)
        if (!conversation) {
          fail(res, 404, '仅系统内置会话支持重置默认')
          return
        }
        res.json(conversation)
      }),
    )
  },
})
