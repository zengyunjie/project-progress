import { Routes, Route } from "react-router";
import Dashboard from "./pages/Dashboard";
import Board from "./pages/Board";
import HistoryPage from "./pages/History";
import Categories from "./pages/Categories";
import AttachmentsList from "./pages/AttachmentsList";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/board" element={<Board />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/attachments" element={<AttachmentsList />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
