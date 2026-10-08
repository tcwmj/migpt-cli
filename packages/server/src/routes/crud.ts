// ── CRUD 路由工厂：统一「列表 / 创建 / 更新 / 删除」四段式与删除引用保护 ──
// 各实体只提供数据读写与少量钩子（构造、更新、脱敏、校验），
// 参数校验、唯一名检查、404、内置保护、引用冲突等样板逻辑在此集中实现，避免逐实体复制。
import type { Express } from 'express'
import { assertUniqueName, getRoles, listDeviceMetas } from '../store.js'
import type { DeviceMeta, Role } from '../types.js'
import { findIndexOr404, refConflict, type RouteContext } from './shared.js'

/** 引用登记规则：删除目标实体前，收集「引用了它」的实体显示名 */
export interface RefRule {
  /** 引用清单键名（回包 refs 分组），如 devices / roles */
  key: string
  /** 返回引用了目标 id 的引用方显示名列表（空数组表示无引用） */
  find: (id: string, target: unknown) => Promise<string[]>
}

/**
 * 设备引用规则：按 DeviceMeta 字段匹配目标 id。
 * byName 用于兼容旧数据把型号存成名称（speakerModel 可能为 id 或名称）。
 */
export function deviceRefs(
  field: keyof DeviceMeta,
  opts: { byName?: boolean } = {},
): RefRule {
  return {
    key: 'devices',
    find: async (id, target) => {
      const name = (target as { name?: string })?.name
      const metas = await listDeviceMetas()
      return metas
        .filter((m) => {
          const v = m[field]
          return v === id || (!!opts.byName && name !== undefined && v === name)
        })
        .map((m) => m.alias)
    },
  }
}

/** 角色引用规则：按 Role 字段匹配目标 id */
export function roleRefs(field: keyof Role): RefRule {
  return {
    key: 'roles',
    find: async (id) => {
      const roles = await getRoles()
      return roles.filter((r) => r[field] === id).map((r) => r.name)
    },
  }
}

/** 依次执行引用规则，汇总非空引用清单（空对象表示可安全删除） */
export async function collectRefs(
  id: string,
  target: unknown,
  rules: readonly RefRule[],
): Promise<Record<string, string[]>> {
  const refs: Record<string, string[]> = {}
  for (const rule of rules) {
    const names = await rule.find(id, target)
    if (names.length) refs[rule.key] = names
  }
  return refs
}

export interface CrudConfig<T extends { id: string; name?: string }> {
  /** 资源路径段（不含前缀斜杠），如 'roles' → /api/roles */
  path: string
  /** 中文实体名，用于 404 文案，如 '角色' */
  label: string
  /** 唯一名校验字段标签，如 '角色名称'；省略则跳过唯一校验 */
  nameLabel?: string
  /** 读取全量列表 */
  list: () => Promise<T[]>
  /** 写回全量列表（原子写 + 串行化由 store 保证） */
  save: (list: T[]) => Promise<void>
  /** 列表响应转换（脱敏 / 归一化 / 附加统计），可异步 */
  listTransform?: (list: T[]) => unknown | Promise<unknown>
  /** 创建前校验：返回错误文案则回 400 */
  validate?: (body: Partial<T>) => string | null
  /** 构造新实体；可改写 list 中其他项（如全局默认唯一）；返回待插入实体 */
  build: (body: Partial<T>, list: T[]) => T
  /** 就地更新 list[idx]；可调整 list 中其他项（如全局默认唯一） */
  applyUpdate: (list: T[], idx: number, body: Partial<T>) => void
  /** 单实体响应转换（脱敏）；列表响应由 listTransform 处理 */
  respond?: (entity: T) => unknown
  /** 删除保护：返回文案则回 409（如系统内置不可删） */
  deleteGuard?: (target: T) => string | null
  /** 删除引用校验规则（注册表式：新增引用关系只需登记规则） */
  refRules?: readonly RefRule[]
  /** 引用冲突文案 */
  refMessage?: string
  /** 追加自定义路由（reset / pull-devices / settings 等） */
  extra?: (ctx: RouteContext) => void
}

/**
 * 生成实体 CRUD 路由注册函数。
 * 统一处理：列表读取、创建校验与唯一名、更新 404 与唯一名、删除 404 / 内置保护 / 引用冲突。
 */
export function createCrudRouter<T extends { id: string; name?: string }>(
  cfg: CrudConfig<T>,
): (ctx: RouteContext) => void {
  const base = `/api/${cfg.path}`
  return (ctx: RouteContext) => {
    const app: Express = ctx.app

    app.get(base, async (_req, res) => {
      const list = await cfg.list()
      res.json(cfg.listTransform ? await cfg.listTransform(list) : list)
    })

    app.post(base, async (req, res) => {
      const body = (req.body ?? {}) as Partial<T>
      const invalid = cfg.validate?.(body)
      if (invalid) {
        res.status(400).json({ error: invalid })
        return
      }
      const list = await cfg.list()
      if (cfg.nameLabel) {
        const dup = assertUniqueName(list, body.name, undefined, cfg.nameLabel)
        if (dup) {
          res.status(409).json({ error: dup })
          return
        }
      }
      const entity = cfg.build(body, list)
      list.push(entity)
      await cfg.save(list)
      res.json(cfg.respond ? cfg.respond(entity) : entity)
    })

    app.put(`${base}/:id`, async (req, res) => {
      const list = await cfg.list()
      const idx = findIndexOr404(res, list, req.params.id, cfg.label)
      if (idx === null) return
      const body = (req.body ?? {}) as Partial<T>
      if (cfg.nameLabel) {
        const dup = assertUniqueName(
          list,
          body.name,
          req.params.id,
          cfg.nameLabel,
        )
        if (dup) {
          res.status(409).json({ error: dup })
          return
        }
      }
      cfg.applyUpdate(list, idx, body)
      await cfg.save(list)
      res.json(cfg.respond ? cfg.respond(list[idx]) : list[idx])
    })

    app.delete(`${base}/:id`, async (req, res) => {
      const list = await cfg.list()
      const target = list.find((x) => x.id === req.params.id)
      if (!target) {
        res.status(404).json({ error: `${cfg.label}不存在` })
        return
      }
      const guarded = cfg.deleteGuard?.(target)
      if (guarded) {
        res.status(409).json({ error: guarded })
        return
      }
      if (cfg.refRules?.length) {
        const refs = await collectRefs(req.params.id, target, cfg.refRules)
        if (Object.keys(refs).length > 0) {
          refConflict(
            res,
            refs,
            cfg.refMessage ?? `${cfg.label}正被引用，无法删除`,
          )
          return
        }
      }
      await cfg.save(list.filter((x) => x.id !== req.params.id))
      res.json({ success: true })
    })

    cfg.extra?.(ctx)
  }
}
