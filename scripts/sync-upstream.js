#!/usr/bin/env node
// 与上游仓库同步：fetch + merge (cross-platform)
// Usage: node scripts/sync-upstream.js

const { execSync } = require('node:child_process')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const git = (cmd) =>
  execSync(`git -C "${root}" ${cmd}`, { encoding: 'utf8' }).trim()

console.log('== sync upstream ==')
console.log()

// 1. fetch upstream
console.log('  fetching upstream...')
try {
  git('fetch upstream')
} catch {
  console.error('  fetch failed, check upstream remote config')
  process.exit(1)
}

// 2. current branch
const branch = git('branch --show-current')
console.log(`  current branch: ${branch}`)

// 3. merge upstream/main
console.log(`  merging upstream/main into ${branch}...`)
try {
  const out = git('merge upstream/main --no-edit')
  if (out) console.log(out)
  console.log()
  console.log('  done.')
} catch (e) {
  console.error('  merge conflict, resolve manually then: git merge --continue')
  process.exit(1)
}
