import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <HashRouter>
      <App />
    </HashRouter>
  </ErrorBoundary>
);
