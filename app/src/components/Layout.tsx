import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Bell,
  Menu,
  Download,
  Upload,
} from "lucide-react";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
        className="flex-1 flex flex-col min-h-[100dvh] transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 72 : 240 }}
      >
        {/* Top Bar */}
        <header className="h-16 sticky top-0 z-30 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search placeholder */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#F1F5F9] rounded-lg text-sm text-[#94A3B8]">
              <Search className="w-4 h-4" />
              <span>搜索任务...</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Import / Export */}
            {onImport && (
              <button
                onClick={onImport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#334155] transition-colors cursor-pointer"
                title="导入数据"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="text-xs font-medium hidden sm:inline">导入</span>
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#334155] transition-colors cursor-pointer"
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors duration-150 cursor-pointer"
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
                className="flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg hover:bg-[#2563EB] transition-colors duration-150 cursor-pointer shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">新建任务</span>
              </motion.button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <Footer sidebarCollapsed={sidebarCollapsed} />
      </div>
    </div>
  );
}
