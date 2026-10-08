import childProcess, { type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { type MiGPTConfig } from 'mi-gpt'
import { fileURLToPath } from 'node:url'

export interface RunConfig {
  /**
   * 运行 MiGPT 所需的环境变量
   * @see https://github.com/idootop/mi-gpt/blob/main/docs/settings.md#%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F
   */
  env: {
    OPENAI_API_KEY: string
    OPENAI_MODEL: string
    OPENAI_BASE_URL?: string
    AZURE_OPENAI_API_KEY?: string
    AUDIO_SILENT?: string
    AUDIO_BEEP?: string
    AUDIO_ACTIVE?: string
    AUDIO_ERROR?: string
    TTS_BASE_URL?: string
  }
  /**
   * MiGPT 的配置
   * @see https://github.com/idootop/mi-gpt/blob/main/docs/settings.md#migptjs
   */
  config: MiGPTConfig
}

/**
 * 多设备支持：每个 deviceId 对应一个独立的 bot 子进程。
 * 日志通过 onLog 回调透传给上层（server 端做环形缓冲）。
 */
const children = new Map<string, ChildProcess>()

function killChild(id: string) {
  return new Promise<void>((resolve) => {
    const child = children.get(id)
    if (!child) {
      resolve()
      return
    }
    const cleanup = () => {
      if (children.get(id) === child) children.delete(id)
      resolve()
    }
    child.once('exit', cleanup)
    try {
      child.send({ type: 'destroy' })
    } catch {
      // 子进程 IPC 已关闭（进程已退出），直接清理
      child.removeListener('exit', cleanup)
      cleanup()
    }
    // 超时兜底：防止子进程不响应 destroy 导致卡死
    setTimeout(() => {
      if (children.get(id) === child) {
        child.kill('SIGKILL')
        cleanup()
      }
    }, 5000).unref()
  })
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const childFilePath = path.join(__dirname, './child_process.js')

export async function run(
  id: string,
  config: RunConfig,
  cwd?: string,
  onLog?: (id: string, line: string) => void,
) {
  await killChild(id)
  const child = childProcess.fork(childFilePath, {
    env: config.env,
    cwd,
    stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
  })
  if (onLog) {
    const emit = (chunk: Buffer) => {
      const text = chunk.toString('utf8')
      for (const line of text.split('\n')) {
        if (line.trim()) onLog(id, line)
      }
    }
    child.stdout?.on('data', emit)
    child.stderr?.on('data', emit)
  }
  try {
    child.send({ type: 'run', config: config.config })
  } catch (e) {
    // fork 后立即 send 一般不会失败，失败则直接放弃该子进程
    child.kill('SIGKILL')
    throw e
  }
  children.set(id, child)
  child.on('exit', () => {
    if (children.get(id) === child) children.delete(id)
  })
}

export async function stop(id: string) {
  await killChild(id)
}

export function getAllStatus() {
  const status: Record<string, { running: boolean }> = {}
  for (const id of children.keys()) {
    status[id] = { running: true }
  }
  return status
}
