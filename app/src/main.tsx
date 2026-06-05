import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </ErrorBoundary>
);
