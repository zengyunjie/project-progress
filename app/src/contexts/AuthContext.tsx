import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AppUser } from "@/lib/auth";
import {
  getAuthToken,
  clearAuthToken,
  loginUser,
  registerUser,
} from "@/lib/auth";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AppUser>;
  register: (username: string, password: string) => Promise<AppUser>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing auth on mount
  useEffect(() => {
    const saved = getAuthToken();
    if (saved) {
      setUser(saved);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<AppUser> => {
    const u = await loginUser(username, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (username: string, password: string): Promise<AppUser> => {
    const u = await registerUser(username, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin: user?.role === "admin",
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
