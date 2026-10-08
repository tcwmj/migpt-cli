/* ══ 通用错误文案 ══ */

/** 透出服务端 message；删除保护（409）附带的引用清单拼到末尾 */
export function errText(e: unknown): string {
  const err = e as Error & { refs?: { roles?: string[]; devices?: string[] } }
  if (err.refs) {
    const parts: string[] = []
    if (err.refs.devices?.length)
      parts.push('被设备引用：' + err.refs.devices.join('、'))
    if (err.refs.roles?.length)
      parts.push('被角色引用：' + err.refs.roles.join('、'))
    return err.message + (parts.length ? '（' + parts.join('；') + '）' : '')
  }
  return err.message || '操作失败'
}
