import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Bell,
  Menu,
  Download,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
  dailyDigestEnabled?: boolean;
  onToggleDigest?: () => void;
  onNewTask?: () => void;
  onExport?: () => void;
  onImport?: () => void;
}

export default function Layout({
  children,
  dailyDigestEnabled = false,
  onToggleDigest,
  onNewTask,
  onExport,
  onImport,
}: LayoutProps) {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size (matches sidebar overlay at lg=1024px)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="min-h-[100dvh] flex bg-[#F8FAFC]">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col min-h-[100dvh] transition-all duration-300 w-full"
        style={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? 72 : 240) }}
      >
        {/* Top Bar */}
        <header className="h-14 md:h-16 sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-[#E2E8F0] flex items-center justify-between px-3 sm:px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 -ml-1 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] active:bg-[#E2E8F0] cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="打开菜单"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile/Tablet logo */}
            <button
              onClick={() => navigate("/")}
              className="lg:hidden flex items-center gap-1.5 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#3B82F6] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-[#1E293B] font-bold text-sm tracking-tight">项目进度</span>
            </button>

            {/* Search placeholder */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#F1F5F9] rounded-lg text-sm text-[#94A3B8]">
              <Search className="w-4 h-4" />
              <span>搜索任务...</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Import / Export */}
            {onImport && (
              <button
                onClick={onImport}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#334155] transition-colors cursor-pointer min-w-[36px] min-h-[36px] justify-center"
                title="导入数据"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="text-xs font-medium hidden sm:inline">导入</span>
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#334155] transition-colors cursor-pointer min-w-[36px] min-h-[36px] justify-center"
                title="导出数据"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="text-xs font-medium hidden sm:inline">导出</span>
              </button>
            )}

            {/* Daily Digest Toggle */}
            {onToggleDigest && (
              <button
                onClick={onToggleDigest}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors duration-150 cursor-pointer min-w-[36px] min-h-[36px] justify-center"
              >
                <Bell className="w-3.5 h-3.5" style={{ color: dailyDigestEnabled ? "#3B82F6" : "#CBD5E1" }} />
                <span className="text-[0.75rem] font-medium text-[#475569] hidden sm:inline">
                  {dailyDigestEnabled ? "提醒开" : "提醒关"}
                </span>
              </button>
            )}

            {/* New Task Button */}
            {onNewTask && (
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNewTask}
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 bg-[#3B82F6] text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#2563EB] transition-colors duration-150 cursor-pointer shadow-[0_2px_8px_rgba(59,130,246,0.3)] min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">新建任务</span>
                <span className="sm:hidden">新建</span>
              </motion.button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

        {/* Footer */}
        <Footer sidebarCollapsed={sidebarCollapsed} />
      </div>
    </div>
  );
}
