import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-red-950 text-white p-8 font-mono">
                    <h1 className="text-2xl text-red-400 mb-4">⚠️ Something went wrong</h1>
                    <div className="bg-black/50 p-4 rounded-lg mb-4">
                        <h2 className="text-red-300 mb-2">Error:</h2>
                        <pre className="text-sm overflow-auto whitespace-pre-wrap">
                            {this.state.error?.toString()}
                        </pre>
                    </div>
                    {this.state.errorInfo && (
                        <div className="bg-black/50 p-4 rounded-lg">
                            <h2 className="text-red-300 mb-2">Stack trace:</h2>
                            <pre className="text-xs overflow-auto whitespace-pre-wrap">
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </div>
                    )}
                    <button
                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded"
                        onClick={() => window.location.reload()}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
