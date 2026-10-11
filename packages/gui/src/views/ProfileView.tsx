/* ══ ProfileView ══ */
import { useRef, useState } from 'react'
import {
  exportBackupData,
  importBackupData,
  type ImportCounts,
} from '../apis.ts'

export function ProfileView(props: {
  onPwd: () => void
  onLogout: () => void
  showToast: (msg: string) => void
  onDataChanged: () => void
}) {
  const { onPwd, onLogout, showToast, onDataChanged } = props
  const fileRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  /* ── 导出：下载脱敏备份包 ── */
  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      await exportBackupData()
      showToast('已导出备份文件（含完整凭据，请妥善保管、勿随意分享）')
    } catch (e) {
      showToast('导出失败：' + (e as Error).message)
    } finally {
      setExporting(false)
    }
  }

  /* ── 导入：选择本地 JSON 备份包并恢复 ── */
  const handleFile = async (file: File) => {
    if (
      !window.confirm(
        '导入会以备份内容为准恢复数据：凭据、角色、模型、语音、型号、会话将被备份快照整体替换（备份里没有的将被清除）。此操作不可撤销。\n\n强烈建议先执行一次「导出用户数据」保存当前状态。确定继续导入吗？',
      )
    )
      return
    setImporting(true)
    try {
      const { imported } = await importBackupData(file)
      onDataChanged()
      showToast('导入成功：' + summary(imported))
    } catch (e) {
      showToast('导入失败：' + (e as Error).message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section data-view="profile" className="on">
      <div className="profile">
        <div className="pset">
          <div className="pcard-block">
            <h4>凭据信息</h4>
            <div className="pcard-set">
              <div className="pi">
                <span className="lbl">登录账号</span>
                <span className="val">admin</span>
              </div>
              <div className="pi">
                <span className="lbl">身份</span>
                <span className="val">超级管理员</span>
              </div>
              <div className="pi click" onClick={onPwd}>
                <span className="lbl">修改密码</span>
                <span className="val">立即修改 ›</span>
              </div>
            </div>
          </div>
          <div className="pcard-block">
            <h4>数据备份与恢复</h4>
            <div className="pcard-set">
              <div
                className={'pi click' + (exporting ? ' disabled' : '')}
                onClick={handleExport}
              >
                <span className="lbl">
                  导出用户数据
                  <small>
                    打包全部配置为 ZIP
                    下载（含明文凭据，导入新环境即可直接运行）
                  </small>
                </span>
                <span className="val">
                  {exporting ? '导出中…' : '立即导出 ›'}
                </span>
              </div>
              <div
                className={'pi click' + (importing ? ' disabled' : '')}
                onClick={() => !importing && fileRef.current?.click()}
              >
                <span className="lbl">
                  导入用户数据
                  <small>选择此前导出的备份文件，按备份快照恢复本机数据</small>
                </span>
                <span className="val">
                  {importing ? '导入中…' : '选择文件 ›'}
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/zip,application/json,.zip,.json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFile(f)
                }}
              />
            </div>
          </div>
          <div className="pcard-block">
            <h4>基础设置</h4>
            <div className="pcard-set">
              <div className="pi">
                <span className="lbl">界面语言</span>
                <span className="val">简体中文</span>
              </div>
              <div className="pi">
                <span className="lbl">时区</span>
                <span className="val">UTC+8 · 中国标准时间</span>
              </div>
              <div className="pi">
                <span className="lbl">主题模式</span>
                <span className="val muted">浅色</span>
              </div>
            </div>
          </div>
          <div className="pcard-block">
            <h4>通知与安全</h4>
            <div className="pcard-set">
              <div className="pi">
                <span className="lbl">
                  设备异常提醒
                  <small>设备离线或服务异常时推送通知</small>
                </span>
                <span className="val">
                  <span className="sw off" />
                </span>
              </div>
              <div className="pi">
                <span className="lbl">
                  双重验证
                  <small>登录时需要额外验证码</small>
                </span>
                <span className="val">
                  <span className="sw off" />
                </span>
              </div>
              <div className="pi">
                <span className="lbl">
                  登录认证
                  <small>面板访问需要账号密码</small>
                </span>
                <span className="val">
                  <span className="sw on" />
                </span>
              </div>
            </div>
          </div>
          <div className="pcard-block">
            <h4>其他</h4>
            <div className="pcard-set">
              <div className="pi">
                <span className="lbl">版本信息</span>
                <span className="val">v{__APP_VERSION__}</span>
              </div>
              <div className="pi click danger" onClick={onLogout}>
                <span className="lbl">退出登录</span>
                <span className="val">立即退出 ›</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** 导入结果摘要：只列出非零项，省略空类别 */
function summary(c: ImportCounts): string {
  const parts: [keyof ImportCounts, string][] = [
    ['credentials', '凭据'],
    ['robots', '角色'],
    ['models', '模型'],
    ['voices', '语音'],
    ['speakerModels', '型号'],
    ['conversations', '会话'],
    ['devices', '设备'],
  ]
  const shown = parts
    .filter(([k]) => c[k] > 0)
    .map(([k, label]) => `${label} ${c[k]}`)
  return shown.length ? shown.join('、') : '无数据变更'
}
