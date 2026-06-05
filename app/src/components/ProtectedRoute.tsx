import { Navigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F8FAFC] gap-4">
        <div className="w-10 h-10 border-4 border-[#E2E8F0] border-t-[#3B82F6] rounded-full animate-spin" />
        <p className="text-sm text-[#64748B] font-medium">加载中...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
