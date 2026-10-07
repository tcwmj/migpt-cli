/* ══ 展示工具：问候语、密钥尾部、场景与头像映射 ══ */
import livingImg from './assets/scene-living.jpg'
import studyImg from './assets/scene-study.jpg'
import closeImg from './assets/speaker-close.jpg'
import robotImg from './assets/avatar-robot.jpg'
import girlImg from './assets/avatar-girl.jpg'
import catImg from './assets/avatar-cat.jpg'

export const greeting = () => {
  const h = new Date().getHours()
  return h < 6 ? '凌晨好' : h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好'
}

export const keyTail = (k?: string) => {
  if (!k) return ''
  const t = k.slice(-5)
  return '…' + t
}

export const roomOf = (alias: string, did?: string) => {
  const s = (alias || '') + (did || '')
  if (s.includes('客餐厅')) return '客餐厅'
  if (s.includes('起居室')) return '起居室'
  if (s.includes('地下室')) return '地下室'
  return '未设置'
}

export const coverOf = (alias: string, did?: string) => {
  const r = roomOf(alias, did)
  return r === '起居室' ? studyImg : r === '地下室' ? closeImg : livingImg
}

export const avatarOf = (name: string) => {
  if (name.includes('MIX')) return girlImg
  if (name.includes('深夜')) return catImg
  return robotImg
}
