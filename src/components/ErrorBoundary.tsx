import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-4 max-w-md mx-auto p-8">
            <div className="h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Terjadi Kesalahan</h2>
            <p className="text-sm text-slate-500">
              Halaman ini mengalami error. Silakan coba muat ulang.
            </p>
            {this.state.error && (
              <details className="text-left bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
                <summary className="cursor-pointer font-medium text-slate-600">Detail Error</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">{this.state.error.message}</pre>
              </details>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white font-medium text-sm hover:bg-teal-700 transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              Muat Ulang
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
