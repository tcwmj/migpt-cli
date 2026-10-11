// ── 测试接口：对外地址连通性 + TTS 配置试听 ─────────────────────
import dns from 'node:dns/promises'
import net from 'node:net'
import { createTTS } from 'mi-gpt-tts'
import { streamTTSResponse } from '../tts.js'
import { API_PREFIX, fail, asyncHandler, type RouteContext } from './shared.js'
import { BadRequestError } from '../errors.js'

/** 是否回环 / 链路本地 / 未指定地址（含云元数据 169.254.169.254、本机面板、docker 内部） */
function isLoopbackOrLinkLocal(host: string): boolean {
  if (net.isIPv4(host)) {
    const [a, b] = host.split('.').map(Number)
    if (a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    return false
  }
  if (net.isIPv6(host)) {
    const h = host.toLowerCase()
    if (h === '::1' || h === '::' || h === '::ffff:127.0.0.1') return true
    if (h.startsWith('fe80')) return true
    if (h.startsWith('::ffff:169.254.')) return true
    return false
  }
  return false
}

/**
 * 连通性测试目标白名单：仅允许 http/https，且拒绝回环 / 链路本地地址。
 * 目的：防止已登录用户借本接口探测内网（云元数据、本机服务、docker 内部）。
 * 仍放行公网与用户自建局域网（192.168/10/172.16），符合「测试我的 migpt 服务可达性」用途。
 */
async function assertSafeTestTarget(rawUrl: unknown): Promise<string> {
  if (typeof rawUrl !== 'string' || !rawUrl) {
    throw new BadRequestError('url 必填')
  }
  let u: URL
  try {
    u = new URL(rawUrl)
  } catch {
    throw new BadRequestError('url 格式非法')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new BadRequestError('仅支持 http/https')
  }
  const host = u.hostname
  if (isLoopbackOrLinkLocal(host)) {
    throw new BadRequestError('目标地址不允许')
  }
  if (!net.isIP(host)) {
    try {
      const { address } = await dns.lookup(host)
      if (isLoopbackOrLinkLocal(address))
        throw new BadRequestError('目标地址不允许')
    } catch (e) {
      if (e instanceof BadRequestError) throw e
      throw new BadRequestError('无法解析目标主机')
    }
  }
  return u.origin
}

export function registerTestRoutes({ app }: RouteContext): void {
  app.post(
    `${API_PREFIX}/test`,
    asyncHandler(async (req, res) => {
      const origin = await assertSafeTestTarget(req.body?.url)
      const ping = `${origin.replace(/\/+$/, '')}/ping`
      try {
        const fetchRes = await fetch(ping, {
          method: 'POST',
          signal: AbortSignal.timeout(500),
        })
        res.json({ success: fetchRes.ok })
      } catch {
        res.json({ success: false })
      }
    }),
  )

  app.post(`${API_PREFIX}/test/audio`, (req, res) => {
    // TTS 配置含密钥，必须走请求体而非 URL（避免进入访问日志 / 浏览器历史）
    const raw = (req.body as { ttsConfig?: unknown })?.ttsConfig
    let options: Record<string, unknown>
    try {
      options = typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch {
      fail(res, 400, 'ttsConfig 不是合法 JSON')
      return
    }
    if (!options || typeof options !== 'object') {
      fail(res, 400, 'ttsConfig 必填')
      return
    }
    const testTTS = createTTS(options)
    streamTTSResponse(res, (stream) =>
      testTTS({
        text: '配置成功！',
        stream,
        speaker: options.defaultSpeaker as string | undefined,
      }),
    )
  })
}
