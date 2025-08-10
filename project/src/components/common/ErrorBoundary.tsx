import React from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle="Sorry, an unexpected error occurred. Please refresh the page and try again."
          extra={[
            <Button type="primary" key="refresh" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>,
            <Button key="home" onClick={() => window.location.href = '/'}>
              Go to Dashboard
            </Button>,
          ]}
        />
      );
    }

    return this.props.children;
  }
}