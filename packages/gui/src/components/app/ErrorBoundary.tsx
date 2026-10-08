/* ══ ErrorBoundary：捕获渲染异常，展示兜底 UI ══ */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 16,
            padding: 32,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20 }}>页面出错了</h2>
          <pre
            style={{
              maxWidth: 600,
              padding: 16,
              borderRadius: 8,
              background: '#fef2f2',
              color: '#991b1b',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error?.message || '未知错误'}
          </pre>
          <button
            onClick={this.reset}
            style={{
              padding: '8px 24px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
