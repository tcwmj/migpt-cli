import { useEffect, useRef, useState } from 'react'
import type { ProviderDef } from '../../constants.ts'

/**
 * 供应商品牌 Logo 徽标。
 * 优先渲染官方 Logo 图（注册表 logo 字段，取自 Simple Icons 官方品牌资源 CDN，
 * 以品牌主色着色）；无官方 Logo 或加载失败时回退为「品牌色块 + 官方标识字符」。
 */
export function ProviderLogo({
  p,
  size = 22,
}: {
  p?: ProviderDef
  size?: number
}) {
  const [imgErr, setImgErr] = useState(false)
  if (!p) return null
  if (p.logo && !imgErr) {
    return (
      <img
        className="pv-logo"
        src={p.logo}
        width={size}
        height={size}
        alt=""
        onError={() => setImgErr(true)}
      />
    )
  }
  return (
    <span
      className="pv-logo"
      style={{ background: p.color, width: size, height: size }}
      aria-hidden
    >
      {p.mark}
    </span>
  )
}

/** 带 Logo 的供应商徽标（列表 / 详情行内展示） */
export function ProviderBadge({ p }: { p?: ProviderDef }) {
  if (!p) return null
  return (
    <span className="pv-badge">
      <ProviderLogo p={p} size={18} />
      {p.name}
    </span>
  )
}

/**
 * 供应商下拉选择器：触发按钮展示当前供应商（Logo + 名称 + 说明），
 * 展开列表每项含 Logo、名称、备注（badge 角标），选中项打勾。
 * 需携带 Logo，故自绘下拉而非原生 select。
 */
export function ProviderPicker(props: {
  providers: Record<string, ProviderDef>
  value: string
  onPick: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const cur = props.providers[props.value]

  // 点击外部 / Esc 关闭下拉
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={'pv-sel' + (open ? ' open' : '')} ref={boxRef}>
      <button
        type="button"
        className="pv-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {cur ? (
          <>
            <ProviderLogo p={cur} size={20} />
            <b>{cur.name}</b>
            {cur.hint && <i>{cur.hint}</i>}
          </>
        ) : (
          <b>选择供应商</b>
        )}
        <span className="pv-caret" aria-hidden />
      </button>
      {open && (
        <div className="pv-menu" role="listbox" aria-label="选择供应商">
          {Object.entries(props.providers).map(([k, p]) => {
            const on = props.value === k
            return (
              <button
                type="button"
                key={k}
                role="option"
                aria-selected={on}
                className={'pv-opt' + (on ? ' on' : '')}
                onClick={() => {
                  props.onPick(k)
                  setOpen(false)
                }}
              >
                <ProviderLogo p={p} size={22} />
                <span className="pv-txt">
                  <b>{p.name}</b>
                  {p.hint && <i>{p.hint}</i>}
                </span>
                {p.badge && <span className="pv-flag">{p.badge}</span>}
                {on && <span className="pv-check" aria-hidden />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
