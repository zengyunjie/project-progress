import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "100vh", padding: 40,
          fontFamily: "system-ui, sans-serif", background: "#F8FAFC",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: "#FFF1F2",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, marginBottom: 20,
          }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>
            应用加载失败
          </h1>
          <p style={{ fontSize: 14, color: "#64748B", marginBottom: 16, maxWidth: 480, textAlign: "center" }}>
            {this.state.error?.message || "发生了未知错误"}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px", background: "#3B82F6", color: "#fff",
              border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
