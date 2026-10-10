#!/usr/bin/env node
// ── npm audit 门控：生产依赖 high/critical 漏洞，白名单外的新增即失败 ──
// 用法：node scripts/audit-gate.mjs <audit-json-path> [已知GHSA...]
// 背景：部分上游公告（如 mi-gpt 依赖链的 basic-ftp DoS）在仓库内无法安全修复，
// 但门禁必须继续拦截「新增」高危漏洞——因此按 GHSA 编号显式豁免并强制注释原因。
import fs from 'node:fs'

const [reportPath, ...known] = process.argv.slice(2)
if (!reportPath) {
  console.error('用法：audit-gate.mjs <audit.json> [GHSA-xxxx ...]')
  process.exit(2)
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
const knownSet = new Set(known.filter((g) => g.startsWith('GHSA-')))

// 收集所有 high/critical 公告的 GHSA 编号（via 数组里的对象即公告本体）
const found = new Set()
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via ?? []) {
    if (typeof via !== 'object') continue
    if (via.severity !== 'high' && via.severity !== 'critical') continue
    const m = String(via.url ?? '').match(/GHSA-[\w-]+/)
    if (m) found.add(m[0])
  }
}

const unknown = [...found].filter((g) => !knownSet.has(g))
if (unknown.length) {
  console.error(`发现未登记的高危漏洞（GHSA）：\n  ${unknown.join('\n  ')}`)
  console.error('修复依赖，或确认无法修复后将其加入 CI 豁免清单并注明原因。')
  process.exit(1)
}
console.log(
  `生产依赖 high/critical 检查通过。已知 ${found.size} 项均在豁免清单：${[...knownSet].join(', ') || '（无）'}`,
)
