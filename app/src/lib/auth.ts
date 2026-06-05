import { supabase } from "@/lib/supabase";

// ─── Password hashing using Web Crypto API (SHA-256) ───
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
}

// ─── Types ───
export interface AppUser {
  id: string;
  username: string;
  role: "admin" | "user";
  is_approved: boolean;
  created_at: string;
  last_login?: string;
}

// ─── Auth Token (simple: base64 encoded user.id:timestamp) ───
const AUTH_KEY = "project_progress_auth";

export function saveAuthToken(user: AppUser): void {
  const token = {
    userId: user.id,
    username: user.username,
    role: user.role,
    timestamp: Date.now(),
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(token));
}

export function getAuthToken(): AppUser | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const token = JSON.parse(raw);
    // Token expires after 30 days
    if (Date.now() - token.timestamp > 30 * 24 * 60 * 60 * 1000) {
      clearAuthToken();
      return null;
    }
    return {
      id: token.userId,
      username: token.username,
      role: token.role,
      is_approved: true,
      created_at: "",
    };
  } catch {
    clearAuthToken();
    return null;
  }
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_KEY);
}

// ─── API functions ───

export async function loginUser(username: string, password: string): Promise<AppUser> {
  const passwordHash = await hashPassword(password);

  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) {
    throw new Error("用户名或密码错误");
  }

  if (data.password_hash !== passwordHash) {
    throw new Error("用户名或密码错误");
  }

  if (!data.is_approved) {
    throw new Error("账户尚未通过审批，请联系管理员");
  }

  // Update last_login
  await supabase
    .from("app_users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", data.id);

  const user: AppUser = {
    id: data.id,
    username: data.username,
    role: data.role,
    is_approved: data.is_approved,
    created_at: data.created_at,
    last_login: new Date().toISOString(),
  };

  saveAuthToken(user);
  return user;
}

export async function registerUser(username: string, password: string): Promise<AppUser> {
  // Validate
  if (username.length < 3) throw new Error("用户名至少需要3个字符");
  if (password.length < 4) throw new Error("密码至少需要4个字符");

  const passwordHash = await hashPassword(password);
  const userId = "user-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

  const { error } = await supabase.from("app_users").insert({
    id: userId,
    username,
    password_hash: passwordHash,
    role: "user",
    is_approved: true, // Auto-approve for simplicity; admin can change later
    created_at: new Date().toISOString(),
  });

  if (error) {
    if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
      throw new Error("该用户名已被注册");
    }
    throw new Error("注册失败: " + error.message);
  }

  const user: AppUser = {
    id: userId,
    username,
    role: "user",
    is_approved: true,
    created_at: new Date().toISOString(),
  };

  saveAuthToken(user);
  return user;
}

// ─── Admin functions ───

export async function getAllUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error("获取用户列表失败: " + error.message);

  return (data || []).map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    is_approved: u.is_approved,
    created_at: u.created_at,
    last_login: u.last_login,
  }));
}

export async function updateUserRole(userId: string, role: "admin" | "user"): Promise<void> {
  const { error } = await supabase
    .from("app_users")
    .update({ role })
    .eq("id", userId);

  if (error) throw new Error("更新用户权限失败: " + error.message);
}

export async function updateUserApproval(userId: string, isApproved: boolean): Promise<void> {
  const { error } = await supabase
    .from("app_users")
    .update({ is_approved: isApproved })
    .eq("id", userId);

  if (error) throw new Error("更新用户审批状态失败: " + error.message);
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from("app_users")
    .delete()
    .eq("id", userId);

  if (error) throw new Error("删除用户失败: " + error.message);
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
  const { data } = await supabase
    .from("app_users")
    .select("password_hash")
    .eq("id", userId)
    .single();

  if (!data) throw new Error("用户不存在");

  const oldHash = await hashPassword(oldPassword);
  if (data.password_hash !== oldHash) {
    throw new Error("原密码不正确");
  }

  const newHash = await hashPassword(newPassword);
  const { error } = await supabase
    .from("app_users")
    .update({ password_hash: newHash })
    .eq("id", userId);

  if (error) throw new Error("修改密码失败: " + error.message);
}
