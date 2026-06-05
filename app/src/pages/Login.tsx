import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("请填写用户名和密码");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await login(username.trim(), password);
      toast.success("登录成功");
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  };

  // If already logged in, redirect
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
          <h1 className="text-2xl font-bold text-[#1E293B]">项目进度管理系统</h1>
          <p className="text-sm text-[#94A3B8] mt-1">登录以继续</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Error banner */}
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

            {/* Username */}
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#64748B] mb-1.5">
                用户名
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                className="h-11 rounded-lg px-4 text-sm bg-[#F1F5F9] border-0 focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#64748B] mb-1.5">
                密码
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
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

            {/* Submit */}
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
                  登录中...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  登录
                </>
              )}
            </motion.button>
          </form>

          {/* Register link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#94A3B8]">
              还没有账户？{" "}
              <Link
                to="/register"
                className="text-[#3B82F6] font-medium hover:text-[#2563EB] transition-colors"
              >
                立即注册
              </Link>
            </p>
          </div>
        </div>

        {/* Default hint */}
        <p className="text-center text-xs text-[#CBD5E1] mt-4">
          默认管理员: admin / admin
        </p>
      </motion.div>
      <Toaster position="bottom-center" />
    </div>
  );
}
