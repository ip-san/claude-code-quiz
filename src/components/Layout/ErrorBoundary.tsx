import { Component, type ReactNode } from 'react'
import { trackError } from '@/lib/analytics'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  retryCount: number
}

/** DOM mismatch errors caused by browser extensions/translation modifying React-managed nodes */
const DOM_MISMATCH_PATTERNS = [
  'insertBefore',
  'removeChild',
  'appendChild',
  'The node to be removed is not a child',
  'The node before which the new node',
]

function isDOMMismatchError(error: Error): boolean {
  return DOM_MISMATCH_PATTERNS.some((p) => error.message.includes(p))
}

const MAX_AUTO_RETRIES = 1

/**
 * React Error Boundary — catches render errors and shows fallback UI.
 *
 * DOM mismatch errors (from browser translation/extensions modifying the DOM)
 * are auto-retried once, since a fresh render usually resolves them.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, retryCount: 0 }
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('Quiz app error:', error)

    if (isDOMMismatchError(error) && this.state.retryCount < MAX_AUTO_RETRIES) {
      // Auto-retry: DOM mismatch from browser extensions/translation is transient
      this.setState((prev) => ({ hasError: false, retryCount: prev.retryCount + 1 }))
      return
    }

    trackError(error.message, 'react_boundary')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-claude-cream px-4">
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
