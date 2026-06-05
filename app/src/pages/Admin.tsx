import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Users, Shield, ShieldAlert, UserX, RefreshCw, CheckCircle2,
  XCircle, ArrowLeft, Trash2, Clock, UserCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsers, updateUserRole, updateUserApproval, deleteUser } from "@/lib/auth";
import type { AppUser } from "@/lib/auth";
import { toast, Toaster } from "sonner";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

function formatDate(isoStr: string): string {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllUsers();
      setUsers(all);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取用户列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate, fetchUsers]);

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as "admin" | "user" } : u))
      );
      toast.success(`用户权限已更新为 ${newRole === "admin" ? "管理员" : "普通用户"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUserApproval(userId, !currentStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_approved: !currentStatus } : u))
      );
      toast.success(currentStatus ? "用户已被禁用" : "用户已通过审批");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("用户已删除");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleteUserId(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC]">
      {/* Header */}
      <header className="h-14 md:h-16 sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-[#E2E8F0] flex items-center px-3 sm:px-4 md:px-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[#64748B] hover:text-[#334155] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">返回项目</span>
        </button>
        <div className="flex-1" />
        <h1 className="text-lg font-bold text-[#1E293B]">用户管理</h1>
        <div className="flex-1" />
      </header>

      <div className="max-w-[1000px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] flex items-center justify-center">
              <Users className="w-5 h-5 text-[#64748B]" />
            </div>
            <div>
              <p className="text-[1.375rem] font-bold text-[#1E293B]">{users.length}</p>
              <p className="text-xs text-[#94A3B8]">总用户数</p>
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-[1.375rem] font-bold text-[#1E293B]">
                {users.filter((u) => u.role === "admin").length}
              </p>
              <p className="text-xs text-[#94A3B8]">管理员</p>
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-[1.375rem] font-bold text-[#1E293B]">
                {users.filter((u) => u.is_approved).length}
              </p>
              <p className="text-xs text-[#94A3B8]">已激活</p>
            </div>
          </div>
        </motion.div>

        {/* Actions bar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#1E293B]">用户列表</h2>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#64748B] hover:text-[#334155] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-lg text-sm text-[#E11D48]">
            {error}
          </div>
        )}

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#E2E8F0] border-t-[#3B82F6] rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="w-12 h-12 text-[#CBD5E1] mb-3" />
              <p className="text-sm text-[#94A3B8]">暂无用户</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">用户名</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">角色</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden sm:table-cell">状态</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden sm:table-cell">注册时间</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden md:table-cell">最后登录</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            u.role === "admin" ? "bg-[#EFF6FF] text-[#3B82F6]" : "bg-[#F1F5F9] text-[#64748B]"
                          }`}>
                            {u.username[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-[#334155]">{u.username}</span>
                          {u.role === "admin" && (
                            <Shield className="w-3.5 h-3.5 text-[#3B82F6]" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-[#EFF6FF] text-[#2563EB]"
                            : "bg-[#F1F5F9] text-[#64748B]"
                        }`}>
                          {u.role === "admin" ? "管理员" : "普通用户"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`flex items-center gap-1 text-xs font-medium ${
                          u.is_approved ? "text-[#059669]" : "text-[#F43F5E]"
                        }`}>
                          {u.is_approved ? (
                            <><CheckCircle2 className="w-3 h-3" /> 已激活</>
                          ) : (
                            <><XCircle className="w-3 h-3" /> 已禁用</>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#94A3B8] hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(u.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#94A3B8] hidden md:table-cell">
                        {u.last_login ? formatDate(u.last_login) : "从未登录"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle role */}
                          <button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#3B82F6] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                            title={u.role === "admin" ? "降级为普通用户" : "提升为管理员"}
                          >
                            {u.role === "admin" ? (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            ) : (
                              <Shield className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Toggle approval */}
                          <button
                            onClick={() => handleToggleApproval(u.id, u.is_approved)}
                            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#059669] hover:bg-[#ECFDF5] transition-colors cursor-pointer"
                            title={u.is_approved ? "禁用用户" : "激活用户"}
                          >
                            {u.is_approved ? (
                              <XCircle className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete user */}
                          <button
                            onClick={() => setDeleteUserId(u.id)}
                            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F43F5E] hover:bg-[#FFF1F2] transition-colors cursor-pointer"
                            title="删除用户"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent className="max-w-[380px] w-[90vw] p-6 bg-white rounded-2xl shadow-[0_16px_32px_rgba(0,0,0,0.15)] border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-[#1E293B]">删除用户</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#64748B] mt-2">
              确定要删除此用户吗？此操作不可恢复。该用户将无法再登录系统。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex justify-end gap-3">
            <AlertDialogCancel
              onClick={() => setDeleteUserId(null)}
              className="px-5 py-2 bg-[#F1F5F9] text-[#334155] text-sm font-medium rounded-lg h-10 hover:bg-[#E2E8F0] transition-colors cursor-pointer"
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && handleDeleteUser(deleteUserId)}
              className="px-5 py-2 bg-[#EF4444] text-white text-sm font-semibold rounded-lg h-10 hover:bg-[#DC2626] transition-colors cursor-pointer"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster position="bottom-center" />
    </div>
  );
}
