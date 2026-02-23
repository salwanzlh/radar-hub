import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 bg-status-error-light rounded-[14px] flex items-center justify-center mx-auto mb-4">
              <span className="text-status-error text-xl font-bold">!</span>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Something went wrong</h3>
            <p className="text-sm text-text-secondary mb-4">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-5 py-2.5 text-sm bg-brand-accent text-text-primary rounded-xl hover:bg-brand-accent-hover transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
