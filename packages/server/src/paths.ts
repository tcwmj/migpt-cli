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
export const systemLogFile = path.join(root, 'system.log')
