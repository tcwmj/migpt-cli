#!/usr/bin/env node

import { runServer } from '@migptgui/server'
import path from 'node:path'
import { program } from 'commander'
import { fileURLToPath } from 'node:url'

program
  .option('-p, --port <number>', '后台服务的端口。')
  .option('--user <string>', '用户名。')
  .option('--pwd <string>', '密码。')
  .option('--open', '是否自动打开配置界面。')
  .option('--no-auth', '禁用登录认证（不推荐）。')

program.parse()

const options = program.opts()

// 登录认证：默认启用，默认密码 123456（可在面板「我的」中修改，或用 AUTH_PASSWORD/--pwd 覆盖）。
// 端口：CLI -p 优先，其次 PORT 环境变量，最后默认 36597。
let user: string | undefined
let pwd: string | undefined
if (!options.auth) {
  console.log('⚠️ 登录认证已禁用（--no-auth）。')
} else if (options.pwd) {
  user = options.user || 'admin'
  pwd = options.pwd
} else if (process.env.AUTH_PASSWORD) {
  user = process.env.AUTH_USER || 'admin'
} else {
  user = 'admin'
}

const port =
  options.port ?? (process.env.PORT ? Number(process.env.PORT) : undefined)

runServer({
  port,
  open: options.open,
  users: user && pwd ? { [user]: pwd } : undefined,
  auth: options.auth,
  staticPath: fileURLToPath(
    path.dirname(import.meta.resolve('@migptgui/gui')) + '/dist/',
  ),
})
