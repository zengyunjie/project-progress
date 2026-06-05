import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "framer-motion";
import { Eye, EyeOff, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("请输入用户名");
      return;
    }
    if (username.trim().length < 3) {
      setError("用户名至少需要3个字符");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }
    if (password.length < 4) {
      setError("密码至少需要4个字符");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      await register(username.trim(), password);
      toast.success("注册成功！");
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#F8FAFC] via-[#EFF6FF] to-[#F1F5F9] p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px]"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-14 h-14 rounded-2xl bg-[#3B82F6] flex items-center justify-center mb-4 shadow-[0_8px_24px_rgba(59,130,246,0.3)]"
          >
            <CheckCircle2 className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-[#1E293B]">创建新账户</h1>
          <p className="text-sm text-[#94A3B8] mt-1">注册后即可使用项目进度管理系统</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-4 py-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-lg text-sm text-[#E11D48]"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-[0.8125rem] font-medium text-[#64748B] mb-1.5">
                用户名
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="至少3个字符"
                autoComplete="username"
                className="h-11 rounded-lg px-4 text-sm bg-[#F1F5F9] border-0 focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all"
              />
            </div>

            <div>
              <label className="block text-[0.8125rem] font-medium text-[#64748B] mb-1.5">
                密码
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少4个字符"
                  autoComplete="new-password"
                  className="h-11 rounded-lg px-4 pr-10 text-sm bg-[#F1F5F9] border-0 focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[0.8125rem] font-medium text-[#64748B] mb-1.5">
                确认密码
              </label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                autoComplete="new-password"
                className="h-11 rounded-lg px-4 text-sm bg-[#F1F5F9] border-0 focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={submitting}
              className="mt-1 flex items-center justify-center gap-2 w-full h-11 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg hover:bg-[#2563EB] transition-colors shadow-[0_4px_12px_rgba(59,130,246,0.3)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  注册中...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  注册
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#94A3B8]">
              已有账户？{" "}
              <Link
                to="/login"
                className="text-[#3B82F6] font-medium hover:text-[#2563EB] transition-colors"
              >
                立即登录
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
      <Toaster position="bottom-center" />
    </div>
  );
}
