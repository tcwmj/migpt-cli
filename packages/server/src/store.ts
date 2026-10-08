// ── 数据存取层门面 ────────────────────────────────────────────
// 实现按职责拆分到 ./store/* 子模块，此处统一再导出，保持既有 `./store.js` 导入面不变：
//   · json.ts     JSON 读缓存 / 原子写 / 同步读原语
//   · auth.ts     登录凭据解析与恒定时间比较
//   · entities.ts 实体读取（settings/accounts/roles/services/models/rooms/devices）
//   · seeds.ts    内置型号与语音服务种子、重置与旧数据迁移
export * from './store/json.js'
export * from './store/auth.js'
export * from './store/entities.js'
export * from './store/seeds.js'
