#!/usr/bin/env node
/**
 * 设备服务启动诊断工具
 * 使用方法: npx tsx scripts/diagnose-device.ts [设备ID]
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

// 数据目录：与运行时一致，支持 MIGPTGUI_HOME / DATA_DIR 环境变量覆盖（前者优先），
// 便于在挂载到自定义路径的部署上直接诊断
const dataDir = resolve(
  (process.env.MIGPTGUI_HOME || process.env.DATA_DIR || '').trim() ||
    join(homedir(), '.migptgui'),
)

// 读取设备配置
function readJSON(path: string): any {
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'))
    }
  } catch (e) {
    console.error(`  ❌ 读取失败: ${path}`)
  }
  return null
}

// 诊断设备
async function diagnoseDevice(deviceId: string) {
  console.log(`\n🔍 诊断设备: ${deviceId}`)
  console.log('─'.repeat(50))

  const deviceDir = join(dataDir, 'devices', deviceId)

  // 1. 检查设备目录
  if (!existsSync(deviceDir)) {
    console.error('❌ 设备目录不存在')
    return
  }

  // 2. 读取设备元数据
  const metaPath = join(deviceDir, 'meta.json')
  const meta = readJSON(metaPath)

  if (!meta) {
    console.error('❌ 设备元数据不存在')
    return
  }

  console.log('✅ 设备元数据:')
  console.log(`   名称: ${meta.alias}`)
  console.log(`   设备ID: ${meta.did}`)
  console.log(`   账号ID: ${meta.accountId || '未指定'}`)
  console.log(`   角色ID: ${meta.roleId || '未指定'}`)
  console.log(`   思考服务: ${meta.thinkServiceIds?.join(', ') || '未指定'}`)
  console.log(`   语音服务: ${meta.voiceId || '未指定'}`)

  // 3. 检查设备配置
  const configPath = join(deviceDir, 'migptgui.json')
  const config = readJSON(configPath)

  if (!config) {
    console.error('❌ 设备配置不存在')
    return
  }

  console.log('\n✅ 设备配置:')

  // 检查 bot 配置
  if (!config.config?.bot?.name) {
    console.error('   ❌ bot.name 未配置')
  } else {
    console.log(`   bot.name: ${config.config.bot.name}`)
  }

  // 检查 speaker 配置
  if (!config.config?.speaker?.userId) {
    console.error('   ❌ speaker.userId 未配置')
  } else {
    console.log(`   speaker.userId: ${config.config.speaker.userId}`)
  }

  if (!config.config?.speaker?.password) {
    console.error('   ❌ speaker.password 未配置')
  } else {
    console.log(
      `   speaker.password: ${config.config.speaker.password ? '***' : '空'}`,
    )
  }

  // 检查思考服务配置
  console.log('\n📡 思考服务配置:')
  if (!config.env?.OPENAI_API_KEY) {
    console.error('   ❌ OPENAI_API_KEY 未配置')
  } else {
    console.log(
      `   OPENAI_API_KEY: ${config.env.OPENAI_API_KEY.substring(0, 10)}...`,
    )
  }

  if (!config.env?.OPENAI_MODEL) {
    console.error('   ❌ OPENAI_MODEL 未配置')
  } else {
    console.log(`   OPENAI_MODEL: ${config.env.OPENAI_MODEL}`)
  }

  if (!config.env?.OPENAI_BASE_URL) {
    console.log('   OPENAI_BASE_URL: 未配置 (使用默认)')
  } else {
    console.log(`   OPENAI_BASE_URL: ${config.env.OPENAI_BASE_URL}`)
  }

  // 4. 检查账号凭据
  console.log('\n👤 账号凭据:')
  const miJsonPath = join(deviceDir, '.mi.json')
  const miJson = readJSON(miJsonPath)

  if (!miJson) {
    console.error('   ❌ .mi.json 不存在 (账号凭据未写入)')
  } else {
    console.log('   .mi.json 结构检查:')

    // 检查 mina 配置
    if (miJson.mina) {
      console.log(`   mina.userId: ${miJson.mina.userId || '❌ 缺失'}`)
      console.log(
        `   mina.password: ${miJson.mina.password ? '✅ 已设置' : '❌ 缺失'}`,
      )
      console.log(
        `   mina.pass.passToken: ${miJson.mina.pass?.passToken ? '✅ 已设置' : '❌ 缺失'}`,
      )

      if (miJson.mina.pass?.passToken) {
        console.log(
          `   passToken 前 20 字符: ${miJson.mina.pass.passToken.substring(0, 20)}...`,
        )
      }
    } else {
      console.error('   ❌ mina 配置缺失')
    }

    // 检查 miiot 配置
    if (miJson.miiot) {
      console.log(`   miiot.userId: ${miJson.miiot.userId || '❌ 缺失'}`)
      console.log(
        `   miiot.password: ${miJson.miiot.password ? '✅ 已设置' : '❌ 缺失'}`,
      )
      console.log(
        `   miiot.pass.passToken: ${miJson.miiot.pass?.passToken ? '✅ 已设置' : '❌ 缺失'}`,
      )
    } else {
      console.error('   ❌ miiot 配置缺失')
    }

    // 检查是否使用 passToken 模式
    const isPassTokenMode =
      miJson.mina?.password === 'passToken-mode' ||
      miJson.miiot?.password === 'passToken-mode'
    if (isPassTokenMode) {
      console.log('\n   ✅ 使用 passToken 直接登录模式')
      console.log(
        '   说明: 如果 passToken 有效，将直接使用它登录，不需要真实密码',
      )
    }
  }

  // 5. 检查账号配置
  if (meta.accountId) {
    console.log('\n🔐 账号配置:')
    const accountsPath = join(dataDir, 'accounts.json')
    const accounts = readJSON(accountsPath) || []
    const account = accounts.find((a: any) => a.id === meta.accountId)

    if (!account) {
      console.error(`   ❌ 账号 ${meta.accountId} 不存在`)
    } else {
      console.log(`   名称: ${account.name}`)
      console.log(`   小米ID: ${account.miUserId}`)
      if (!account.passToken) {
        console.error('   ❌ passToken 未配置')
      } else {
        console.log(`   passToken: ${account.passToken.substring(0, 10)}...`)
      }
    }
  }

  // 6. 检查角色配置
  if (meta.roleId) {
    console.log('\n🎭 角色配置:')
    const rolesPath = join(dataDir, 'roles.json')
    const roles = readJSON(rolesPath) || []
    const role = roles.find((r: any) => r.id === meta.roleId)

    if (!role) {
      console.error(`   ❌ 角色 ${meta.roleId} 不存在`)
    } else {
      console.log(`   名称: ${role.name}`)
      console.log(`   唤醒词: ${role.wakeUpKeywords?.join(', ') || '未配置'}`)
    }
  }

  // 7. 检查思考服务配置
  if (meta.thinkServiceIds?.length > 0) {
    console.log('\n🤖 思考服务:')
    const thinkServicesPath = join(dataDir, 'think-services.json')
    const thinkServices = readJSON(thinkServicesPath) || []

    for (const id of meta.thinkServiceIds) {
      const service = thinkServices.find((s: any) => s.id === id)
      if (!service) {
        console.error(`   ❌ 思考服务 ${id} 不存在`)
      } else {
        console.log(`   ${service.name}:`)
        console.log(`     提供商: ${service.provider}`)
        console.log(`     模型: ${service.model}`)
        if (!service.apiKey) {
          console.error('     ❌ API Key 未配置')
        } else {
          console.log(`     API Key: ${service.apiKey.substring(0, 10)}...`)
        }
        if (service.limitReached) {
          console.error('     ⚠️  已达到使用限额')
        }
      }
    }
  }

  // 8. 检查语音服务配置
  if (meta.voiceId) {
    console.log('\n🔊 语音服务:')
    const voiceServicesPath = join(dataDir, 'voice-services.json')
    const voiceServices = readJSON(voiceServicesPath) || []
    const service = voiceServices.find((s: any) => s.id === meta.voiceId)

    if (!service) {
      console.error(`   ❌ 语音服务 ${meta.voiceId} 不存在`)
    } else {
      console.log(`   ${service.name}:`)
      console.log(`     提供商: ${service.provider}`)
      console.log(`     内置: ${service.builtin ? '是' : '否'}`)
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log('💡 建议:')
  console.log('   1. 检查上述 ❌ 标记的问题')
  console.log('   2. 查看设备日志获取详细错误信息')
  console.log('   3. 确保小米账号的 passToken 有效')
  console.log('   4. 确保思考服务的 API Key 有效且有余额')
  console.log('')
}

// 列出所有设备
function listDevices() {
  const devicesDir = join(dataDir, 'devices')

  if (!existsSync(devicesDir)) {
    console.log('❌ 设备目录不存在')
    return []
  }

  const devices = readdirSync(devicesDir).filter((name: string) => {
    const metaPath = join(devicesDir, name, 'meta.json')
    return existsSync(metaPath)
  })

  return devices
}

// 主程序
async function main() {
  console.log('\n🔧 MiGPT 设备服务诊断工具')
  console.log('═'.repeat(50))

  const deviceId = process.argv[2]

  if (deviceId) {
    await diagnoseDevice(deviceId)
  } else {
    const devices = listDevices()

    if (devices.length === 0) {
      console.log('\n❌ 未找到任何设备')
      console.log('请先在控制面板中添加设备')
      return
    }

    console.log(`\n找到 ${devices.length} 个设备:\n`)

    for (const device of devices) {
      const metaPath = join(dataDir, 'devices', device, 'meta.json')
      const meta = readJSON(metaPath)
      console.log(`  - ${device} (${meta?.alias || '未命名'})`)
    }

    console.log(`\n使用方法: npx tsx scripts/diagnose-device.ts <设备ID>`)
    console.log('─'.repeat(50))
  }
}

main().catch(console.error)
