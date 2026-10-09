// pino-roll v4 未携带类型声明，这里按其 JSDoc（pino-roll.js 顶部）补充最小声明：
// 异步工厂返回 SonicBoom 流，可直接作为 pino 的 destination 写入文本行。
declare module 'pino-roll' {
  import type { Writable } from 'node:stream'

  interface PinoRollOptions {
    /** 日志文件路径前缀（不含序号与扩展名），如 `<root>/system` */
    file: string
    /** 轮转周期：'daily' / 'hourly' / 毫秒数 */
    frequency?: string
    /** 文件名中的日期段格式（date-fns），如 'yyyy-MM-dd' */
    dateFormat?: string
    /** 单文件大小上限，单位单字母 k/m/g，如 '5m' */
    size?: string
    /** 保留策略：count 为当前文件之外额外保留的文件数 */
    limit?: { count?: number; removeOtherLogFiles?: boolean }
    /** 文件扩展名（不含点），如 'log' */
    extension?: string
  }

  export default function pinoRoll(
    options: PinoRollOptions,
  ): Promise<Writable & { flushSync(): void }>
}
