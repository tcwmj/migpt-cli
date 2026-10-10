import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import type { Express, Request, RequestHandler, Response } from 'express'

// crud.ts 从 '../store.js' 取唯一名校验、引用查询与落盘 schema 断言；
// 唯一名校验/断言用真实实现，引用查询用 jest.fn 以便逐用例注入数据。
jest.mock('../store.js', () => {
  const entities = jest.requireActual<typeof import('../store/entities.js')>(
    '../store/entities.js',
  )
  const schemas = jest.requireActual<typeof import('../store/schemas.js')>(
    '../store/schemas.js',
  )
  return {
    assertUniqueName: entities.assertUniqueName,
    assertEntity: schemas.assertEntity,
    getRobots: jest.fn(async () => []),
    listDeviceMetas: jest.fn(async () => []),
  }
})

import { z } from 'zod'
import { getRobots, listDeviceMetas } from '../store.js'
import { DataValidationError } from '../store/schemas.js'
import type { Robot } from '../types.js'
import {
  createCrudRouter,
  collectRefs,
  deviceRefs,
  robotRefs,
  type CrudConfig,
  type RefRule,
} from './crud.js'

type Handler = (req: Request, res: Response) => unknown

const makeApp = () => {
  const routes = new Map<string, Handler>()
  const app = {
    get: (p: string, h: Handler) => routes.set(`GET ${p}`, h),
    post: (p: string, h: Handler) => routes.set(`POST ${p}`, h),
    put: (p: string, h: Handler) => routes.set(`PUT ${p}`, h),
    delete: (p: string, h: Handler) => routes.set(`DELETE ${p}`, h),
  }
  return { app: app as unknown as Express, routes }
}

const makeRes = () => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(body: unknown) {
      res.body = body
      return res
    },
  }
  return res
}

const req = (body?: unknown, id?: string) =>
  ({ body, params: { id } }) as unknown as Request

interface Item {
  id: string
  name?: string
}

let items: Item[]

const register = (over: Partial<CrudConfig<Item>> = {}) => {
  items = [
    { id: 'i1', name: '一' },
    { id: 'i2', name: '二' },
  ]
  const { app, routes } = makeApp()
  createCrudRouter<Item>({
    path: 'items',
    label: '条目',
    nameLabel: '名称',
    list: async () => items,
    save: async (list) => {
      items = list
    },
    build: (body, list) => ({ id: `i${list.length + 1}`, name: body.name }),
    applyUpdate: (list, idx, body) => {
      list[idx] = { ...list[idx], ...body }
    },
    ...over,
  })({ app })
  return routes
}

beforeEach(() => {
  jest.mocked(getRobots).mockResolvedValue([])
  jest.mocked(listDeviceMetas).mockResolvedValue([])
})

describe('createCrudRouter · GET', () => {
  test('返回列表', async () => {
    const routes = register()
    const res = makeRes()
    await routes.get('GET /api/v1/items')!(req(), res as unknown as Response)
    expect(res.body).toEqual([
      { id: 'i1', name: '一' },
      { id: 'i2', name: '二' },
    ])
  })

  test('listTransform 生效', async () => {
    const routes = register({
      listTransform: (list) => list.map((x) => ({ ...x, tag: 't' })),
    })
    const res = makeRes()
    await routes.get('GET /api/v1/items')!(req(), res as unknown as Response)
    expect(res.body).toEqual([
      { id: 'i1', name: '一', tag: 't' },
      { id: 'i2', name: '二', tag: 't' },
    ])
  })
})

describe('createCrudRouter · POST', () => {
  test('validate 返回文案时回 400', async () => {
    const routes = register({
      validate: (b) => (b.name ? null : '名称必填'),
    })
    const res = makeRes()
    await routes.get('POST /api/v1/items')!(req({}), res as unknown as Response)
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: '名称必填' })
  })

  test('重名回 409', async () => {
    const routes = register()
    const res = makeRes()
    await routes.get('POST /api/v1/items')!(
      req({ name: '一' }),
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(409)
    expect(res.body).toEqual({ error: '名称「一」已存在，名称需唯一' })
  })

  test('成功创建：构造 + 追加 + 落盘', async () => {
    const routes = register()
    const res = makeRes()
    await routes.get('POST /api/v1/items')!(
      req({ name: '三' }),
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ id: 'i3', name: '三' })
    expect(items.map((x) => x.name)).toEqual(['一', '二', '三'])
  })

  test('respond 转换单实体响应', async () => {
    const routes = register({
      respond: (e) => ({ ...e, name: e.name?.toUpperCase() }),
    })
    const res = makeRes()
    await routes.get('POST /api/v1/items')!(
      req({ name: '三' }),
      res as unknown as Response,
    )
    expect(res.body).toEqual({ id: 'i3', name: '三' })
  })
})

describe('createCrudRouter · PUT', () => {
  test('目标不存在回 404', async () => {
    const routes = register()
    const res = makeRes()
    await routes.get('PUT /api/v1/items/:id')!(
      req({ name: '新' }, 'missing'),
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({ error: '条目不存在' })
  })

  test('改成已存在的名称回 409', async () => {
    const routes = register()
    const res = makeRes()
    await routes.get('PUT /api/v1/items/:id')!(
      req({ name: '二' }, 'i1'),
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(409)
  })

  test('成功更新并落盘', async () => {
    const routes = register()
    const res = makeRes()
    await routes.get('PUT /api/v1/items/:id')!(
      req({ name: '改' }, 'i2'),
      res as unknown as Response,
    )
    expect(res.body).toEqual({ id: 'i2', name: '改' })
    expect(items[1].name).toBe('改')
  })
})

describe('createCrudRouter · DELETE', () => {
  test('目标不存在回 404', async () => {
    const routes = register()
    const res = makeRes()
    await routes.get('DELETE /api/v1/items/:id')!(
      req(undefined, 'missing'),
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(404)
  })

  test('deleteGuard 拦截回 409', async () => {
    const routes = register({
      deleteGuard: (t) => (t.id === 'i1' ? '内置不可删' : null),
    })
    const res = makeRes()
    await routes.get('DELETE /api/v1/items/:id')!(
      req(undefined, 'i1'),
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(409)
    expect(res.body).toEqual({ error: '内置不可删' })
  })

  test('被引用时回 409 并附带引用清单', async () => {
    const routes = register({
      refRules: [
        { key: 'devices', find: async (id) => (id === 'i1' ? ['客厅'] : []) },
      ],
      refMessage: '正被引用',
    })
    const res = makeRes()
    await routes.get('DELETE /api/v1/items/:id')!(
      req(undefined, 'i1'),
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(409)
    expect(res.body).toEqual({ error: '正被引用', refs: { devices: ['客厅'] } })
  })

  test('成功删除：从列表移除并落盘', async () => {
    const routes = register()
    const res = makeRes()
    await routes.get('DELETE /api/v1/items/:id')!(
      req(undefined, 'i1'),
      res as unknown as Response,
    )
    expect(res.body).toEqual({ success: true })
    expect(items.map((x) => x.id)).toEqual(['i2'])
  })
})

describe('createCrudRouter · extra', () => {
  test('追加自定义路由', async () => {
    const routes = register({
      extra: (ctx) =>
        ctx.app.get('/api/v1/items/custom', ((_r: Request, res: Response) =>
          res.json({ ok: true })) as unknown as RequestHandler),
    })
    expect(routes.has('GET /api/v1/items/custom')).toBe(true)
  })
})

describe('createCrudRouter · schema 落盘校验', () => {
  // schema 校验的是「落盘的整份列表」（与各实体传入的 xxxListSchema 一致）
  const itemSchema = z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().optional(),
    }),
  )

  test('校验失败：save 不被调用，异常经 next 冒泡', async () => {
    const save = jest.fn(async () => {})
    const routes = register({
      schema: itemSchema,
      save,
      build: () => ({ id: '', name: '坏' }),
    })
    const res = makeRes()
    await expect(
      routes.get('POST /api/v1/items')!(req({}), res as unknown as Response),
    ).rejects.toThrow(DataValidationError)
    expect(save).not.toHaveBeenCalled()
  })

  test('校验通过：save 正常落盘', async () => {
    const save = jest.fn(async () => {})
    const routes = register({ schema: itemSchema, save })
    const res = makeRes()
    await routes.get('POST /api/v1/items')!(
      req({ name: '三' }),
      res as unknown as Response,
    )
    expect(save).toHaveBeenCalledTimes(1)
    expect(res.body).toEqual({ id: 'i3', name: '三' })
  })
})

describe('collectRefs', () => {
  const rules: RefRule[] = [
    { key: 'devices', find: async (id) => (id === 'x' ? ['客厅'] : []) },
    { key: 'robots', find: async () => [] },
  ]

  test('汇总非空引用', async () => {
    expect(await collectRefs('x', {}, rules)).toEqual({ devices: ['客厅'] })
  })

  test('无引用返回空对象', async () => {
    expect(await collectRefs('y', {}, rules)).toEqual({})
  })
})

describe('deviceRefs', () => {
  test('按字段 id 命中，byName 时兼容名称', async () => {
    jest.mocked(listDeviceMetas).mockResolvedValue([
      {
        id: 'd1',
        alias: '客厅',
        did: 'X',
        speakerModel: 'm1',
        robotId: 'r1',
        ttsSecret: 's',
        createdAt: 1,
      },
      {
        id: 'd2',
        alias: '书房',
        did: 'X',
        speakerModel: '小爱音箱',
        robotId: 'r1',
        ttsSecret: 's',
        createdAt: 2,
      },
    ])
    const rule = deviceRefs('speakerModel', { byName: true })
    expect(rule.key).toBe('devices')
    expect(await rule.find('m1', { name: 'm1' })).toEqual(['客厅'])
    // 目标名恰为另一设备的值时也应命中（兼容旧数据存名称）
    expect(await rule.find('m1', { name: '小爱音箱' })).toEqual([
      '客厅',
      '书房',
    ])
  })
})

describe('robotRefs', () => {
  test('按角色字段命中并返回角色名', async () => {
    jest.mocked(getRobots).mockResolvedValue([
      { id: 'r1', name: '傻妞', thinkServiceId: 't1' },
      { id: 'r2', name: '助手', thinkServiceId: 't2' },
    ] as unknown as Robot[])
    const rule = robotRefs('thinkServiceId')
    expect(rule.key).toBe('robots')
    expect(await rule.find('t1', {})).toEqual(['傻妞'])
    expect(await rule.find('t9', {})).toEqual([])
  })
})
