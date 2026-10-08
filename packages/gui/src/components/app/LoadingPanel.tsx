/* ══ 加载骨架面板 ══ */

export function LoadingPanel() {
  return (
    <div className="panel">
      <div className="loading">
        <div style={{ width: '100%' }}>
          <div className="skel" />
          <div className="skel" />
          <div className="skel" />
        </div>
      </div>
    </div>
  )
}
