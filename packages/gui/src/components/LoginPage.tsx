/* ══ LoginPage ══ */
import { useState } from 'react'
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
  const [u, setU] = useState('admin')
  const [p, setP] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = () => {
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
        <div className="login-card">
          <h2>MiGPT 控制面板</h2>
          {error && (
            <div className="notice bad">
              <I n="warning" size={15} /> {error}
            </div>
          )}
          <Field label="用户名" required icon="user">
            <input
              value={u}
              onChange={(e) => setU(e.target.value)}
              autoFocus
              placeholder="请输入用户名"
            />
          </Field>
          <Field label="密码" required icon="lock">
            <input
              type="password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              placeholder="请输入密码"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submit()
                }
              }}
            />
          </Field>
          <Button
            variant="primary"
            className="login-btn"
            icon="lock"
            disabled={busy || !u || !p}
            onClick={submit}
          >
            {busy ? '登录中…' : '登录'}
          </Button>
        </div>
        <div className="login-foot">v{__APP_VERSION__} · migpt-server</div>
      </div>
    </div>
  )
}
