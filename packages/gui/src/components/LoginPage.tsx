/* ══ LoginPage ══ */
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { I, MiLogo } from '../icons.tsx'
import { Button, Field } from './atoms/index.ts'
import heroImg from '../assets/speaker-hero-multi.jpg'

export function LoginPage({
  onLogin,
  error,
}: {
  onLogin: (u: string, p: string) => Promise<void>
  error: string
}) {
  // 非受控输入：浏览器自动填充只改 DOM 值、不触发 React onChange，
  // 提交时直接读 DOM 值；空值由原生 required 校验拦截，按钮无需依赖输入状态禁用
  const uRef = useRef<HTMLInputElement>(null)
  const pRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const u = uRef.current?.value ?? ''
    const p = pRef.current?.value ?? ''
    // 提交时立即清空密码框：浏览器密码管理器在 submit 后异步读取表单值用于
    // 「保存密码」，读到空值即不会保存/弹出提示。失败时需重新输入（安全取舍）。
    if (pRef.current) pRef.current.value = ''
    if (!u || !p) return
    setBusy(true)
    Promise.resolve(onLogin(u, p)).finally(() => setBusy(false))
  }
  return (
    <div className="login-page">
      {/* 左：满铺主视觉，标语沉于音箱下方 */}
      <div className="login-hero">
        <img className="login-hero-bg" src={heroImg} alt="" />
        <div className="login-hero-scrim" />
        <div className="mi-brand">
          <MiLogo size={30} />
          <b>MiGPT</b>
        </div>
        <div className="login-hero-inner">
          <h1>多台音箱，一个大脑</h1>
        </div>
      </div>

      {/* 右侧：登录表单 */}
      <div className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <h2>MiGPT 控制面板</h2>
          {error && (
            <div className="notice bad">
              <I n="warning" size={15} /> {error}
            </div>
          )}
          <Field label="用户名" required icon="user">
            <input
              ref={uRef}
              name="username"
              defaultValue="admin"
              required
              autoFocus
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </Field>
          <Field label="密码" required icon="lock">
            <input
              ref={pRef}
              name="password"
              type={showPwd ? 'text' : 'password'}
              required
              placeholder="请输入密码"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="pwd-toggle"
              onClick={() => setShowPwd(!showPwd)}
              aria-label={showPwd ? '隐藏密码' : '显示密码'}
            >
              <I n={showPwd ? 'eyeClosed' : 'eye'} size={16} />
            </button>
          </Field>
          <Button
            type="submit"
            variant="primary"
            className="login-btn"
            icon="lock"
            disabled={busy}
          >
            {busy ? '登录中…' : '登录'}
          </Button>
        </form>
        <div className="login-foot">v{__APP_VERSION__} · migpt-server</div>
      </div>
    </div>
  )
}
