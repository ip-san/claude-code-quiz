import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * React Error Boundary — catches render errors and shows fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('Quiz app error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center bg-claude-cream px-4" style={{ minHeight: '100dvh' }}>
          <div className="text-center">
            <p className="mb-4 text-lg font-semibold text-claude-dark">エラーが発生しました</p>
            <p className="mb-6 text-sm text-stone-500">アプリを再読み込みしてください</p>
            <button
              onClick={() => window.location.reload()}
              className="tap-highlight rounded-2xl bg-claude-orange px-6 py-3 text-base font-semibold text-white"
            >
              再読み込み
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
