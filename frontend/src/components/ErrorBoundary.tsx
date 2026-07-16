import * as React from 'react'
import { AlertTriangle } from 'lucide-react'

interface State {
  error: Error | null
}

/**
 * Catches render/runtime errors anywhere below it and shows a recoverable
 * fallback instead of a blank white screen. Wrap the whole app in one.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Hook a real error tracker (Sentry, etc.) in here for production.
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-(--color-background) px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-(--color-foreground)">Something went wrong</h1>
          <p className="mt-1 max-w-sm text-sm text-(--color-muted-foreground)">
            An unexpected error occurred. Reloading usually fixes it. If it keeps happening, contact support.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="cursor-pointer rounded-lg bg-(--color-primary) px-5 py-2.5 text-sm font-semibold text-(--color-primary-foreground) shadow-sm transition-colors hover:bg-emerald-700"
        >
          Reload page
        </button>
      </div>
    )
  }
}
