/* ══ ProfileView ══ */

export function ProfileView(props: {
  onPwd: () => void
  onLogout: () => void
}) {
  const { onPwd, onLogout } = props
  return (
    <section data-view="profile" className="on">
      <div className="profile">
        <div className="pset">
          <div className="pcard-block">
            <h4>账号信息</h4>
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
