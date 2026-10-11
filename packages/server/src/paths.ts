// ── 数据目录（容器默认 VOLUME /home/node/.migptgui）──────────────
// 可被环境变量 MIGPTGUI_HOME / DATA_DIR 覆盖（前者优先），便于挂载到任意路径、
// rootless 或多实例部署；二者均未设置时回落 $HOME/.migptgui。
import path from 'node:path'
import os from 'node:os'
import { getEnv } from './store/env.js'

const _env = getEnv()
const _rawHome =
  (_env.MIGPTGUI_HOME || _env.DATA_DIR || '').trim() ||
  path.join(os.homedir(), '.migptgui')
export const root = path.resolve(_rawHome)
export const devicesRoot = path.join(root, 'devices')
export const credentialsFile = path.join(root, 'credentials.json')
export const accountsFile = path.join(root, 'accounts.json')
export const robotsFile = path.join(root, 'robots.json')
export const modelsFile = path.join(root, 'models.json')
export const voicesFile = path.join(root, 'voices.json')
export const speakerModelsFile = path.join(root, 'speakerModels.json')
// 会话实体（与 chatlogs/ 对话记录目录区分，避免同名歧义）
export const conversationsFile = path.join(root, 'conversations.json')
export const authFile = path.join(root, 'auth.json')
// 系统日志：写入 logs/system.<yyyyMMdd>.N.log（pino-roll 按天 + 单文件 5MB，不设 limit → 永久保留）
export const logsDir = path.join(root, 'logs')
// systemLogPrefix 是轮转文件前缀；systemLogFile 为旧版无日期固定名，仅作迁移期回退
export const systemLogPrefix = path.join(logsDir, 'system')
export const systemLogFile = path.join(logsDir, 'system.log')
// 数据结构版本（迁移框架据此判断需要执行哪些升级步骤）
export const dataVersionFile = path.join(root, 'version.json')
// 内置实体的用户覆盖（与内置定义分离存储，恢复默认即删除覆盖项）
export const overridesFile = path.join(root, 'overrides.json')
// 备份目录（导出/导入与定时备份落盘处）
export const backupsRoot = path.join(root, 'backups')
// 对话记录按天滚动落盘目录（重命名为 chatlogs/ 以与 conversations.json 会话实体区分）：
// 每台设备一个 <safeId>.<yyyyMMdd>.log（纯文本原始行）
export const chatLogsDir = path.join(root, 'chatlogs')
