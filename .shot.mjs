import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'migpt-shot-'))
fs.mkdirSync(path.join(tmp, '.migptgui'), { recursive: true })
process.env.USERPROFILE = tmp; process.env.HOME = tmp
const { createApp } = await import('./packages/server/dist/index.js')
const app = createApp({ auth: false, staticPath: path.resolve('packages/gui/dist') + path.sep })
app.listen(36611, '127.0.0.1', () => console.log('READY 36611'))
