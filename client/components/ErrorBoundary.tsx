import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 text-red-600" data-testid="error-boundary">
          <h2 className="font-bold">Something went wrong</h2>
          <pre className="mt-2 text-sm whitespace-pre-wrap">{this.state.error.message}</pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-4 px-3 py-1 bg-red-100 rounded hover:bg-red-200"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
