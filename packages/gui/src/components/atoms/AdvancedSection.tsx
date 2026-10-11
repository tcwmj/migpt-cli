import { useState } from 'react'
import {
  DEFAULT_SYSTEM_TEMPLATE,
  ROBOT_TEMPLATES,
  SYSTEM_TEMPLATE_VARIABLES,
} from '@migptgui/contracts'
import { I } from '../../icons.tsx'
import { Button, Field } from './index.ts'

/**
 * 高级功能折叠区（默认收起，lerio 式）。
 * 收纳「系统提示词」这类低频且易错的配置，避免主流程被术语淹没。
 */
export function AdvancedSection(props: {
  /** 当前系统提示词；undefined = 跟随内置默认 */
  value?: string
  onChange: (next: string | undefined) => void
  /** 引用该角色的设备数（用于展示生效提示） */
  refCount?: number
  /** 预览用的变量取值（角色名 / 称呼） */
  previewVars?: Record<string, string>
}) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState(false)
  const isDefault = props.value === undefined
  const isOff = props.value === ''

  return (
    <div className="grp adv">
      <button
        type="button"
        className="advbar"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="at">
          <span className={'cv' + (open ? ' on' : '')}>
            <I n="down" size={13} />
          </span>
          展示高级功能
        </span>
        <span className="ah">
          系统提示词 ·{' '}
          {isDefault ? '跟随内置默认' : isOff ? '已关闭' : '已自定义'}
        </span>
      </button>

      {open && (
        <div className="advbody">
          <Field
            label="系统提示词"
            tip="决定 AI 的身份设定、回答准则与输出格式。留空表示不注入系统提示词、使用内置默认模板；填写后完全以此为准。"
            hint={
              <>
                可用变量（写错会导致模型读不到对应信息）：
                {SYSTEM_TEMPLATE_VARIABLES.map((v) => (
                  <code key={v} className="var">
                    {`{{${v}}}`}
                  </code>
                ))}
              </>
            }
          >
            <textarea
              className="code"
              rows={12}
              value={props.value ?? ''}
              placeholder="留空则使用内置默认模板。点下方「写入默认模板」可载入完整内容后再修改。"
              onChange={(e) => props.onChange(e.target.value)}
            />
          </Field>
          <div className="advacts">
            <Button
              icon="download"
              onClick={() => props.onChange(DEFAULT_SYSTEM_TEMPLATE)}
            >
              写入默认模板
            </Button>
            <Button icon="eye" onClick={() => setPreview((v) => !v)}>
              {preview ? '收起预览' : '预览效果'}
            </Button>
            <Button
              variant="ghost"
              icon="refresh"
              onClick={() => props.onChange(undefined)}
            >
              恢复默认
            </Button>
            {!!props.refCount && (
              <span className="advnote">
                <I n="info" size={13} /> 保存后需重启引用该角色的{' '}
                {props.refCount} 台设备方可生效
              </span>
            )}
          </div>
          {preview && (
            <PreviewPane
              template={props.value}
              vars={props.previewVars || {}}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** 变量替换预览：把 {{var}} 替换为当前角色取值，直观看到最终提示词 */
function PreviewPane(props: {
  template?: string
  vars: Record<string, string>
}) {
  const src = props.template ?? DEFAULT_SYSTEM_TEMPLATE
  const rendered = src.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => {
    const v = props.vars[key]
    return v !== undefined ? v : whole
  })
  return <pre className="advpreview">{rendered}</pre>
}

/** 模板套用条：编辑既有角色时切换模板（点击即覆盖称呼/人设/播报词） */
export function TemplateBar(props: {
  templateId?: string
  onApply: (templateId: string) => void
}) {
  return (
    <div className="tplbar">
      <span className="lb">套用模板</span>
      {ROBOT_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={'tplchip' + (props.templateId === t.id ? ' on' : '')}
          title={t.tagline}
          onClick={() => props.onApply(t.id)}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}
