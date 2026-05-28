import { Routes, Route } from "react-router";
import Dashboard from "./pages/Dashboard";
import Board from "./pages/Board";
import HistoryPage from "./pages/History";
import Categories from "./pages/Categories";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/board" element={<Board />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/categories" element={<Categories />} />
    </Routes>
  );
}
