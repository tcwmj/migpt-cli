/**
 * @fileOverview 用于运行 MiGPT 的子进程。
 * 使用子进程是因为一旦 import 'mi-gpt' 模块，它就会从环境变量中获取一些配置并且之后都不再改变，
 * 所以为了在 MiGPT 的代码执行前就配置好环境变量，需要在子进程中运行 MiGPT。
 */

import { MiGPT, type MiGPTConfig } from 'mi-gpt'

let migpt: MiGPT | undefined

process.on('message', (msg: { type: string; config?: MiGPTConfig }) => {
  if (msg.type === 'destroy') {
    if (migpt) {
      migpt.stop().then(() => {
        process.exit(0)
      })
    } else {
      process.exit(0)
    }
  } else if (msg.type === 'run') {
    const config = msg.config as MiGPTConfig
    // console.log('配置：\n', config)
    // 必须赋值给模块级 migpt，否则 destroy 分支拿不到实例、无法优雅停止
    try {
      migpt = MiGPT.create(config)
      // 添加错误处理：start() 是异步的，必须捕获异常
      migpt.start().catch((err) => {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error(`[MiGPT] 启动失败: ${errorMsg}`)
        if (err instanceof Error && err.stack) {
          console.error(err.stack)
        }
        // 启动失败时退出子进程，让父进程知道发生了错误
        process.exit(1)
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`[MiGPT] 创建实例失败: ${errorMsg}`)
      if (err instanceof Error && err.stack) {
        console.error(err.stack)
      }
      process.exit(1)
    }
  }
})
