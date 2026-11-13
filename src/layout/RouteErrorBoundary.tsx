import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/shadcn/button'

type Props = {
  children: ReactNode
  /** Optional label for the recovery panel. */
  label?: string
}

type State = {
  error: Error | null
}

/**
 * Keeps the app shell (sidebar / top bar / scroll pane) mounted when a route
 * subtree throws during render. Without this, a single page crash unmounts
 * `.pd-app-main` content and the transparent content card shows empty shell.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RouteErrorBoundary]', error, info.componentStack)
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 py-10"
          role="alert"
          aria-label={this.props.label ?? 'Page error'}
        >
          <h1 className="m-0 text-base font-semibold text-foreground">
            This page hit an error
          </h1>
          <p className="m-0 text-sm text-muted-foreground">
            {this.state.error.message || 'Something went wrong while rendering.'}
          </p>
          <div>
            <Button type="button" size="sm" className="rounded-lg" onClick={this.handleRetry}>
              Try again
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
