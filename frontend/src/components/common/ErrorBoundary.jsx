import React from "react";
import { AlertTriangle } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("OZOO ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6" data-testid="error-boundary">
          <div className="max-w-md text-center bg-card border border-border rounded-sm p-6">
            <AlertTriangle className="h-6 w-6 text-danger mx-auto mb-3" />
            <h2 className="text-sm font-semibold mb-1">Something went wrong on this screen</h2>
            <p className="text-xs text-muted-foreground mb-4">The rest of OZOO is still running. Reload to continue.</p>
            <button onClick={() => window.location.assign("/")} className="h-8 px-4 rounded-sm bg-primary text-primary-foreground text-sm">Back to Dashboard</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
