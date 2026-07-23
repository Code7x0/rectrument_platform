"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Catches client render crashes (e.g. React 19 removeChild during portal
 * teardown) so the dashboard does not stick on a blank white page.
 */
export class ClientErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || "Something went wrong",
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ClientErrorBoundary]", error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-lg font-semibold text-[#0F172A]">
            This view failed to load
          </h2>
          <p className="max-w-md text-sm text-[#64748B]">{this.state.message}</p>
          <Button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
