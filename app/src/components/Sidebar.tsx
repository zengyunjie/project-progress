import { useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  KanbanSquare,
  History,
  Grid3X3,
  Paperclip,
  Settings,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
} from "lucide-react";
import { useEffect } from "react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  isMobile: boolean;
  isAdmin?: boolean;
}

const navItems = [
  { path: "/", label: "任务面板", icon: LayoutDashboard },
  { path: "/board", label: "项目看板", icon: KanbanSquare },
  { path: "/history", label: "更新历史", icon: History },
  { path: "/categories", label: "分类总览", icon: Grid3X3 },
  { path: "/attachments", label: "附件清单", icon: Paperclip },
  { path: "/settings", label: "系统设置", icon: Settings },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, isMobile, isAdmin }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/" || location.pathname === "/index.html";
    return location.pathname === path;
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose();
  }, [location.pathname]);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - desktop: always visible; mobile: slides in/out */}
      <motion.aside
        initial={false}
        animate={{
          width: collapsed && !isMobile ? 72 : 240,
          x: isMobile ? (mobileOpen ? 0 : -240) : 0,
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 h-full z-50 bg-[#0F172A] text-white flex flex-col border-r border-[#1E293B]"
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-[#1E293B] shrink-0">
          <button
            onClick={() => navigate("/")}
            className="shrink-0 w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center hover:bg-[#2563EB] transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 text-white" />
          </button>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-white font-bold text-lg tracking-tight whitespace-nowrap overflow-hidden"
            >
              项目进度管理
            </motion.span>
          )}
          {/* Close button on mobile */}
          {isMobile && (
            <button
              onClick={onMobileClose}
              className="ml-auto p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) onMobileClose();
                }}
                className={`
                  flex items-center gap-3 rounded-lg transition-all duration-150 cursor-pointer
                  ${collapsed && !isMobile ? "justify-center px-0 py-2.5" : "px-3 py-2.5"}
                  ${active
                    ? "bg-[#3B82F6]/20 text-[#60A5FA]"
                    : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#E2E8F0]"
                  }
                `}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${active ? "text-[#60A5FA]" : ""}`} />
                {(!collapsed || isMobile) && (
                  <span className={`text-sm font-medium whitespace-nowrap ${active ? "font-semibold" : ""}`}>
                    {item.label}
                  </span>
                )}
                {(!collapsed || isMobile) && active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                )}
              </button>
            );
          })}

          {/* Admin link */}
          {isAdmin && (
            <button
              onClick={() => {
                navigate("/admin");
                if (isMobile) onMobileClose();
              }}
              className={`
                flex items-center gap-3 rounded-lg transition-all duration-150 cursor-pointer
                ${collapsed && !isMobile ? "justify-center px-0 py-2.5 mt-2" : "px-3 py-2.5 mt-2"}
                ${location.pathname === "/admin"
                  ? "bg-[#F59E0B]/20 text-[#FBBF24]"
                  : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#FBBF24]"
                }
              `}
              title={collapsed ? "用户管理" : undefined}
            >
              <Shield className={`w-5 h-5 shrink-0 ${location.pathname === "/admin" ? "text-[#FBBF24]" : ""}`} />
              {(!collapsed || isMobile) && (
                <span className={`text-sm font-medium whitespace-nowrap ${location.pathname === "/admin" ? "font-semibold" : ""}`}>
                  用户管理
                </span>
              )}
            </button>
          )}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="border-t border-[#1E293B] p-2 hidden lg:block">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-lg text-[#64748B] hover:text-[#E2E8F0] hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
