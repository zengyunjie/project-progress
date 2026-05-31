import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { CheckCircle2, Plus, LayoutDashboard, History, Grid3X3, Menu, X, Download, Upload, Paperclip } from "lucide-react";

interface NavbarProps {
  dailyDigestEnabled: boolean;
  onToggleDigest: () => void;
  onNewTask: () => void;
  onExport?: () => void;
  onImport?: () => void;
}

export default function Navbar({ dailyDigestEnabled, onToggleDigest, onNewTask, onExport, onImport }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDashboard = location.pathname === "/" || location.pathname === "/index.html";
  const isHistory = location.pathname === "/history";
  const isCategories = location.pathname === "/categories";
  const isAttachments = location.pathname === "/attachments";

  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 h-16 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E2E8F0]"
    >
      <div className="max-w-[1280px] mx-auto h-full flex items-center justify-between px-6">
        {/* Logo */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="w-5 h-5 rounded-full bg-[#3B82F6] flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[#1E293B] font-bold text-[1.875rem] tracking-tight leading-tight">项目进度管理</span>
        </motion.button>

        {/* Desktop Nav Links */}
        <div className="hidden sm:flex items-center gap-6">
          <button onClick={() => navigate("/")} className="relative text-sm font-medium transition-colors duration-150 cursor-pointer"
            style={{ color: isDashboard ? "#2563EB" : "#64748B", fontWeight: isDashboard ? 600 : 500 }}>
            任务面板
            {isDashboard && <motion.div layoutId="nav-underline" className="absolute -bottom-[18px] left-0 right-0 h-0.5 bg-[#3B82F6]" transition={{ duration: 0.25 }} />}
          </button>
          <button onClick={() => navigate("/history")} className="relative text-sm font-medium transition-colors duration-150 cursor-pointer"
            style={{ color: isHistory ? "#2563EB" : "#64748B", fontWeight: isHistory ? 600 : 500 }}>
            更新历史
            {isHistory && <motion.div layoutId="nav-underline" className="absolute -bottom-[18px] left-0 right-0 h-0.5 bg-[#3B82F6]" transition={{ duration: 0.25 }} />}
          </button>
          <button onClick={() => navigate("/categories")} className="relative text-sm font-medium transition-colors duration-150 cursor-pointer"
            style={{ color: isCategories ? "#2563EB" : "#64748B", fontWeight: isCategories ? 600 : 500 }}>
            分类总览
            {isCategories && <motion.div layoutId="nav-underline" className="absolute -bottom-[18px] left-0 right-0 h-0.5 bg-[#3B82F6]" transition={{ duration: 0.25 }} />}
          </button>
          <button onClick={() => navigate("/attachments")} className="relative text-sm font-medium transition-colors duration-150 cursor-pointer"
            style={{ color: isAttachments ? "#2563EB" : "#64748B", fontWeight: isAttachments ? 600 : 500 }}>
            附件清单
            {isAttachments && <motion.div layoutId="nav-underline" className="absolute -bottom-[18px] left-0 right-0 h-0.5 bg-[#3B82F6]" transition={{ duration: 0.25 }} />}
          </button>
        </div>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Import / Export */}
          {onImport && (
            <button onClick={onImport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#334155] transition-colors cursor-pointer" title="导入数据">
              <Upload className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">导入</span>
            </button>
          )}
          {onExport && (
            <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#334155] transition-colors cursor-pointer" title="导出数据">
              <Download className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">导出</span>
            </button>
          )}

          {/* Daily Digest Toggle */}
          <button onClick={onToggleDigest} className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors duration-150 cursor-pointer">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dailyDigestEnabled ? "#3B82F6" : "#CBD5E1" }} />
            <span className="text-[0.8125rem] font-medium text-[#475569]">
              每日提醒: {dailyDigestEnabled ? "开" : "关"}
            </span>
          </button>

          {/* New Task Button */}
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
            onClick={onNewTask}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg h-9 hover:bg-[#60A5FA] transition-colors duration-150 cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            新建任务
          </motion.button>
        </div>

        {/* Mobile Menu Button */}
        <button className="sm:hidden p-2 cursor-pointer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-5 h-5 text-[#64748B]" /> : <Menu className="w-5 h-5 text-[#64748B]" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
          className="sm:hidden absolute top-16 left-0 right-0 bg-white border-b border-[#E2E8F0] shadow-lg px-6 py-4 flex flex-col gap-3">
          <button onClick={() => { navigate("/"); setMobileMenuOpen(false); }} className="flex items-center gap-2 text-sm font-medium py-2 cursor-pointer"
            style={{ color: isDashboard ? "#2563EB" : "#64748B" }}>
            <LayoutDashboard className="w-4 h-4" /> 任务面板
          </button>
          <button onClick={() => { navigate("/history"); setMobileMenuOpen(false); }} className="flex items-center gap-2 text-sm font-medium py-2 cursor-pointer"
            style={{ color: isHistory ? "#2563EB" : "#64748B" }}>
            <History className="w-4 h-4" /> 更新历史
          </button>
          <button onClick={() => { navigate("/categories"); setMobileMenuOpen(false); }} className="flex items-center gap-2 text-sm font-medium py-2 cursor-pointer"
            style={{ color: isCategories ? "#2563EB" : "#64748B" }}>
            <Grid3X3 className="w-4 h-4" /> 分类总览
          </button>
          <button onClick={() => { navigate("/attachments"); setMobileMenuOpen(false); }} className="flex items-center gap-2 text-sm font-medium py-2 cursor-pointer"
            style={{ color: isAttachments ? "#2563EB" : "#64748B" }}>
            <Paperclip className="w-4 h-4" /> 附件清单
          </button>
          <div className="border-t border-[#E2E8F0] pt-3 flex flex-col gap-3">
            {onExport && (
              <button onClick={() => { onExport(); setMobileMenuOpen(false); }} className="flex items-center gap-2 text-sm font-medium text-[#475569] py-2 cursor-pointer">
                <Download className="w-4 h-4" /> 导出数据
              </button>
            )}
            {onImport && (
              <button onClick={() => { onImport(); setMobileMenuOpen(false); }} className="flex items-center gap-2 text-sm font-medium text-[#475569] py-2 cursor-pointer">
                <Upload className="w-4 h-4" /> 导入数据
              </button>
            )}
            <button onClick={() => { onNewTask(); setMobileMenuOpen(false); }}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg cursor-pointer">
              <Plus className="w-4 h-4" /> 新建任务
            </button>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
