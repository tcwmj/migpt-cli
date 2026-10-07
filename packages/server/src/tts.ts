// ── TTS 流式响应工具 ──────────────────────────────────────────
// 把合成音频以 chunked 方式写回 HTTP 响应；供设备端 /:secret/tts/tts.mp3
// 与面板 /api/test/audio 复用，避免两处重复的流式与错误处理逻辑。
import { Readable } from 'node:stream'
import type { Response } from 'express'

/**
 * 执行 TTS 合成并流式写回响应。
 * @param res  Express 响应对象
 * @param run  接收可写流并返回引擎结果；返回空值表示配置不完整
 */
export function streamTTSResponse(
  res: Response,
  run: (stream: Readable) => Promise<unknown>,
) {
  const audioStream = new Readable({ read() {} })
  run(audioStream).then((buffer) => {
    if (!buffer) audioStream.destroy(new Error('没有把配置填写完整'))
  })

  let headersSent = false
  audioStream.on('data', (chunk: Buffer) => {
    if (
      (chunk.length === 3 && chunk.toString('utf8') === '404') ||
      (chunk.length === 5 && chunk.toString('utf8') === 'error')
    ) {
      audioStream.destroy(new Error('配置填写有误'))
      return
    }
    if (!headersSent) {
      res.writeHead(200, {
        'Transfer-Encoding': 'chunked',
        'Content-Type': 'audio/mp3',
      })
      headersSent = true
    }
    res.write(chunk)
  })
  audioStream.on('end', () => res.end())
  audioStream.once('error', (error: Error) => {
    if (!headersSent) {
      res.status(400).send(error.message || 'Internal Server Error')
    } else {
      res.end()
    }
  })
}
