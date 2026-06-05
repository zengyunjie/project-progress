import type { ReactNode } from "react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Bell,
  Menu,
  Download,
  Upload,
  CheckCircle2,
  FileJson,
  FileSpreadsheet,
  User,
  LogOut,
  Shield,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
  dailyDigestEnabled?: boolean;
  onToggleDigest?: () => void;
  onNewTask?: () => void;
  onExportJSON?: () => void;
  onExportExcel?: () => void;
  onImport?: () => void;
}

export default function Layout({
  children,
  dailyDigestEnabled = false,
  onToggleDigest,
  onNewTask,
  onExportJSON,
  onExportExcel,
  onImport,
}: LayoutProps) {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Detect mobile screen size (matches sidebar overlay at lg=1024px)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-[100dvh] flex bg-[#F8FAFC]">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        isMobile={isMobile}
        isAdmin={isAdmin}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col min-h-[100dvh] transition-[margin] duration-250 w-full"
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
            {/* Import */}
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

            {/* Export Dropdown */}
            {(onExportJSON || onExportExcel) && (
              <div ref={exportMenuRef} className="relative">
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#334155] transition-colors cursor-pointer min-w-[36px] min-h-[36px] justify-center"
                  title="导出数据"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium hidden sm:inline">导出</span>
                  <ChevronDown className="w-3 h-3 hidden sm:block" />
                </button>
                <AnimatePresence>
                  {exportMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-[#E2E8F0] shadow-[0_8px_24px_rgba(0,0,0,0.1)] py-1 min-w-[160px] z-50"
                    >
                      {onExportJSON && (
                        <button
                          onClick={() => { onExportJSON(); setExportMenuOpen(false); }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155] transition-colors cursor-pointer"
                        >
                          <FileJson className="w-4 h-4 text-[#F59E0B]" />
                          导出 JSON
                        </button>
                      )}
                      {onExportExcel && (
                        <button
                          onClick={() => { onExportExcel(); setExportMenuOpen(false); }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155] transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
                          导出 Excel
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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

            {/* User Menu */}
            {user && (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isAdmin ? "bg-[#EFF6FF] text-[#3B82F6]" : "bg-[#F1F5F9] text-[#64748B]"
                  }`}>
                    {user.username[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-[#334155] hidden sm:inline">
                    {user.username}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#94A3B8] hidden sm:block" />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-[#E2E8F0] shadow-[0_8px_24px_rgba(0,0,0,0.1)] py-1 min-w-[180px] z-50"
                    >
                      <div className="px-4 py-2.5 border-b border-[#F1F5F9]">
                        <p className="text-sm font-medium text-[#334155]">{user.username}</p>
                        <p className="text-xs text-[#94A3B8]">
                          {user.role === "admin" ? "管理员" : "普通用户"}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => { setUserMenuOpen(false); navigate("/admin"); }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155] transition-colors cursor-pointer"
                        >
                          <Shield className="w-4 h-4 text-[#3B82F6]" />
                          用户管理
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#FFF1F2] transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
