#!/usr/bin/env node
/**
 * 测试 passToken 直接登录
 * 验证是否可以绕过 userId/password 生成 passToken 的步骤
 */

const fs = require('node:fs')
const path = require('node:path')
const { homedir } = require('node:os')

// 数据目录
const dataDir = path.join(homedir(), '.migptgui')

// 测试 passToken 登录
async function testPassTokenLogin() {
  console.log('🔍 测试 passToken 直接登录')
  console.log('─'.repeat(50))

  // 1. 读取账号配置
  const accountsPath = path.join(dataDir, 'accounts.json')
  const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'))
  const account = accounts[0]

  if (!account) {
    console.error('❌ 未找到账号配置')
    return
  }

  console.log(`✅ 账号: ${account.name}`)
  console.log(`   小米ID: ${account.miUserId}`)
  console.log(`   passToken: ${account.passToken ? account.passToken.substring(0, 20) + '...' : '未配置'}`)

  // 2. 检查设备目录
  const devicesDir = path.join(dataDir, 'devices')
  const devices = fs.readdirSync(devicesDir).filter(name => {
    const metaPath = path.join(devicesDir, name, 'meta.json')
    return fs.existsSync(metaPath)
  })

  if (devices.length === 0) {
    console.log('\n❌ 未找到设备')
    return
  }

  console.log(`\n📱 找到 ${devices.length} 个设备:`)

  for (const deviceId of devices) {
    const deviceDir = path.join(devicesDir, deviceId)
    const metaPath = path.join(deviceDir, 'meta.json')
    const miJsonPath = path.join(deviceDir, '.mi.json')

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    console.log(`\n   ${meta.alias} (${deviceId})`)

    // 检查 .mi.json 文件
    if (!fs.existsSync(miJsonPath)) {
      console.error('   ❌ .mi.json 文件不存在')
      continue
    }

    const miJson = JSON.parse(fs.readFileSync(miJsonPath, 'utf-8'))
    console.log('   .mi.json 结构:')

    // 检查 mina 配置
    if (miJson.mina) {
      console.log(`     mina.userId: ${miJson.mina.userId || '❌ 缺失'}`)
      console.log(`     mina.password: ${miJson.mina.password ? '✅ 已设置' : '❌ 缺失'}`)
      console.log(`     mina.pass.passToken: ${miJson.mina.pass?.passToken ? '✅ 已设置' : '❌ 缺失'}`)
    } else {
      console.error('     ❌ mina 配置缺失')
    }

    // 检查 miiot 配置
    if (miJson.miiot) {
      console.log(`     miiot.userId: ${miJson.miiot.userId || '❌ 缺失'}`)
      console.log(`     miiot.password: ${miJson.miiot.password ? '✅ 已设置' : '❌ 缺失'}`)
      console.log(`     miiot.pass.passToken: ${miJson.miiot.pass?.passToken ? '✅ 已设置' : '❌ 缺失'}`)
    } else {
      console.error('     ❌ miiot 配置缺失')
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log('💡 说明:')
  console.log('   1. 如果 passToken 有效，mi-service-lite 会直接使用它登录')
  console.log('   2. password 字段仅在 passToken 无效时使用')
  console.log('   3. 使用 "passToken-mode" 作为虚拟密码，表示直接使用 passToken')
  console.log('')
}

// 修复设备的 .mi.json 文件
async function fixDeviceMiJson() {
  console.log('\n🔧 修复设备的 .mi.json 文件')
  console.log('─'.repeat(50))

  const accountsPath = path.join(dataDir, 'accounts.json')
  const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'))
  const account = accounts[0]

  if (!account || !account.passToken) {
    console.error('❌ 未找到账号或 passToken')
    return
  }

  const devicesDir = path.join(dataDir, 'devices')
  const devices = fs.readdirSync(devicesDir).filter(name => {
    const metaPath = path.join(devicesDir, name, 'meta.json')
    return fs.existsSync(metaPath)
  })

  for (const deviceId of devices) {
    const deviceDir = path.join(devicesDir, deviceId)
    const metaPath = path.join(deviceDir, 'meta.json')
    const miJsonPath = path.join(deviceDir, '.mi.json')

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))

    // 只修复属于当前账号的设备
    if (meta.accountId !== account.id) {
      console.log(`   跳过 ${meta.alias} (不同账号)`)
      continue
    }

    console.log(`   修复 ${meta.alias} (${deviceId})`)

    // 创建新的 .mi.json 文件
    const miJson = {
      mina: {
        userId: account.miUserId,
        password: account.miPassword || 'passToken-mode',
        pass: { passToken: account.passToken },
      },
      miiot: {
        userId: account.miUserId,
        password: account.miPassword || 'passToken-mode',
        pass: { passToken: account.passToken },
      },
    }

    fs.writeFileSync(miJsonPath, JSON.stringify(miJson, null, 2), 'utf-8')
    console.log('     ✅ 已更新 .mi.json')
  }

  console.log('\n' + '─'.repeat(50))
}

// 主程序
async function main() {
  console.log('\n🔧 MiGPT passToken 登录测试工具')
  console.log('═'.repeat(50))

  await testPassTokenLogin()

  const fix = process.argv[2]
  if (fix === '--fix') {
    await fixDeviceMiJson()
  } else {
    console.log('💡 如需修复设备的 .mi.json 文件，请运行:')
    console.log('   node scripts/test-passtoken.js --fix')
  }
}

main().catch(console.error)