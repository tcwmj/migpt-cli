// ── 数据目录（容器 VOLUME /root/.migptgui）────────────────────────
import path from 'node:path'
import os from 'node:os'

export const root = path.join(os.homedir(), '.migptgui')
export const devicesRoot = path.join(root, 'devices')
export const settingsFile = path.join(root, 'settings.json')
export const accountsFile = path.join(root, 'accounts.json')
export const rolesFile = path.join(root, 'roles.json')
export const thinkServicesFile = path.join(root, 'thinkServices.json')
export const voiceServicesFile = path.join(root, 'voiceServices.json')
export const speakerModelsFile = path.join(root, 'speakerModels.json')
export const roomsFile = path.join(root, 'rooms.json')
export const authFile = path.join(root, 'auth.json')
// 系统日志由 pino-roll 按天轮转：活动文件形如 system.<yyyy-MM-dd>.N.log（N 同天内递增）。
// systemLogPrefix 是轮转文件前缀；systemLogFile 为旧版固定名，仅作迁移期读取回退。
export const systemLogPrefix = path.join(root, 'system')
export const systemLogFile = path.join(root, 'system.log')
// 数据结构版本（迁移框架据此判断需要执行哪些升级步骤）
export const dataVersionFile = path.join(root, 'version.json')
// 内置实体的用户覆盖（与内置定义分离存储，恢复默认即删除覆盖项）
export const overridesFile = path.join(root, 'overrides.json')
// 备份目录（导出/导入与定时备份落盘处）
export const backupsRoot = path.join(root, 'backups')
