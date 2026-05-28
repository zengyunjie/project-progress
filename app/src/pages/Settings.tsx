import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud,
  CloudOff,
  Upload,
  Download,
  LogIn,
  LogOut,
  User,
  Database,
  Trash2,
  FileDown,
  FileUp,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Settings as SettingsIcon,
  Shield,
  HardDrive,
  Info,
  Wifi,
  WifiOff,
  KeyRound,
  Clock,
  Save,
  TestTubes,
  RotateCw,
  Sparkles,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useDailyDigest } from "@/hooks/useDailyDigest";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useTaskManager } from "@/hooks/useTaskManager";
import {
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  hasFirebaseConfig,
} from "@/lib/firebase";
import type { FirebaseOptions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/* ═══════════════════════════════════════════
   Settings Page — Kevin's Empire
   ═══════════════════════════════════════════ */

const CONFIG_KEY = "ke-empire-firebase-config";
const LAST_SYNC_KEY = "ke-empire-last-sync";

const inputFields = [
  { key: "apiKey" as const, label: "API Key", placeholder: "AIzaSy..." },
  { key: "authDomain" as const, label: "Auth Domain", placeholder: "your-app.firebaseapp.com" },
  { key: "projectId" as const, label: "Project ID", placeholder: "your-project-id" },
  { key: "storageBucket" as const, label: "Storage Bucket", placeholder: "your-app.appspot.com" },
  { key: "messagingSenderId" as const, label: "Messaging Sender ID", placeholder: "123456789" },
  { key: "appId" as const, label: "App ID", placeholder: "1:123456:web:abcdef" },
] as const;

type ConfigKey = (typeof inputFields)[number]["key"];

/* ─────────────── Helpers ─────────────── */

function getSavedConfig(): Record<string, string> {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  // Seed from the centralized firebase config if present
  const fbConfig = getStoredFirebaseConfig();
  const seeded: Record<string, string> = {};
  if (fbConfig.apiKey) seeded.apiKey = fbConfig.apiKey;
  if (fbConfig.authDomain) seeded.authDomain = fbConfig.authDomain;
  if (fbConfig.projectId) seeded.projectId = fbConfig.projectId;
  if (fbConfig.storageBucket) seeded.storageBucket = fbConfig.storageBucket;
  if (fbConfig.messagingSenderId) seeded.messagingSenderId = fbConfig.messagingSenderId;
  if (fbConfig.appId) seeded.appId = fbConfig.appId;
  return seeded;
}

function saveConfigToStorage(config: Record<string, string>) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch { return null; }
}

function setLastSyncTime(time: string) {
  localStorage.setItem(LAST_SYNC_KEY, time);
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatSyncTime(iso: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─────────────── Section Card Wrapper ─────────────── */
function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  delay = 0,
}: {
  icon: typeof Cloud;
  title: string;
  description?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] flex items-center justify-center shrink-0">
              <Icon className="w-[18px] h-[18px] text-[#14B8A6]" />
            </div>
            <div>
              <CardTitle className="text-[1rem] font-semibold text-[#1E293B]">
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="text-[0.8125rem] text-[#94A3B8] mt-0.5">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

/* ─────────────── Status Badge ─────────────── */
function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: online ? "#ECFDF5" : "#F1F5F9",
        color: online ? "#059669" : "#64748B",
      }}
    >
      {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {online ? "Online" : "Offline"}
    </span>
  );
}

/* ─────────────── Connection Status ─────────────── */
function ConnectionStatus({
  connected,
  message,
}: {
  connected: boolean;
  message: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
      style={{
        backgroundColor: connected ? "#ECFDF5" : "#FFFBEB",
        color: connected ? "#059669" : "#D97706",
      }}
    >
      {connected ? (
        <CheckCircle className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      {message}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   MAIN SETTINGS PAGE
   ═══════════════════════════════════════════ */
export default function Settings() {
  const digest = useDailyDigest();
  const cloudSync = useCloudSync();
  const taskManager = useTaskManager();

  // ── Firebase Config State ──
  const [config, setConfig] = useState<Record<ConfigKey, string>>(
    getSavedConfig as Record<ConfigKey, string>
  );
  const [configSaved, setConfigSaved] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // ── Clear Data Dialog ──
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // ── Real-time sync ──
  const [realtimeSync, setRealtimeSync] = useState(false);
  const realtimeCleanupRef = useRef<(() => void) | null>(null);

  // ── Derived ──
  const hasAnyConfig = Object.values(config).some((v) => v.trim() !== "");
  const allFieldsFilled = inputFields.every((f) => config[f.key]?.trim() !== "");
  const isConfigured = cloudSync.isConfigured;

  // ── Handlers ──

  const handleConfigChange = (key: ConfigKey, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setConfigSaved(false);
    setConnectionResult(null);
  };

  const handleSaveConfig = () => {
    saveConfigToStorage(config);

    // Also sync to the centralized firebase config
    const firebaseConfig: FirebaseOptions = {
      apiKey: config.apiKey || "",
      authDomain: config.authDomain || "",
      projectId: config.projectId || "",
      storageBucket: config.storageBucket || "",
      messagingSenderId: config.messagingSenderId || "",
      appId: config.appId || "",
    };
    saveFirebaseConfig(firebaseConfig);

    setConfigSaved(true);
    toast.success("Firebase configuration saved");
    setTimeout(() => setConfigSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    if (!allFieldsFilled) {
      toast.error("Please fill in all Firebase config fields first");
      return;
    }
    setTestingConnection(true);
    setConnectionResult(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const firebaseConfig: FirebaseOptions = {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
      };

      saveFirebaseConfig(firebaseConfig);
      setConnectionResult({
        success: true,
        message: "Connection successful! Firebase is ready to use.",
      });
      toast.success("Firebase connection successful");
    } catch {
      setConnectionResult({
        success: false,
        message: "Connection failed. Please check your configuration values.",
      });
      toast.error("Firebase connection failed");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await cloudSync.signIn();
      toast.success("Signed in successfully");
    } catch {
      toast.error("Sign in failed");
    }
  };

  const handleSignOut = async () => {
    try {
      await cloudSync.signOut();
      setRealtimeSync(false);
      toast.success("Signed out");
    } catch {
      toast.error("Sign out failed");
    }
  };

  const handleUploadToCloud = async () => {
    try {
      const tasks = taskManager.tasks;
      const categories = taskManager.allCategories || [];

      const result = await cloudSync.uploadToCloud(tasks, categories);
      if (result) {
        const now = new Date().toISOString();
        setLastSyncTime(now);
        toast.success(`Uploaded ${tasks.length} tasks to cloud`);
      } else {
        toast.error("Upload failed. Make sure you're signed in.");
      }
    } catch {
      toast.error("Upload failed");
    }
  };

  const handleDownloadFromCloud = async () => {
    try {
      const result = await cloudSync.downloadFromCloud();
      if (result) {
        const now = new Date().toISOString();
        setLastSyncTime(now);
        if (result.tasks) {
          localStorage.setItem("todoflow-tasks", JSON.stringify(result.tasks));
        }
        toast.success("Downloaded data from cloud. Refresh to see changes.");
      } else {
        toast.error("No cloud data found");
      }
    } catch {
      toast.error("Download failed");
    }
  };

  const handleToggleRealtimeSync = (enabled: boolean) => {
    setRealtimeSync(enabled);
    if (enabled) {
      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current();
      }
      realtimeCleanupRef.current = cloudSync.startRealtimeSync((tasks) => {
        if (tasks) {
          localStorage.setItem("todoflow-tasks", JSON.stringify(tasks));
        }
      });
      toast.success("Real-time sync enabled");
    } else {
      cloudSync.stopRealtimeSync();
      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current();
        realtimeCleanupRef.current = null;
      }
      toast.info("Real-time sync disabled");
    }
  };

  const handleExportData = () => {
    try {
      const tasks = taskManager.tasks;
      const categories = taskManager.allCategories || [];

      const exportData = {
        app: "Kevin's Empire",
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        tasks,
        categories,
      };

      const filename = `kevin-empire-backup-${new Date().toISOString().split("T")[0]}.json`;
      downloadJSON(exportData, filename);
      toast.success(`Exported ${tasks.length} tasks`);
    } catch {
      toast.error("Export failed");
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.tasks || !Array.isArray(data.tasks)) {
          throw new Error("Invalid backup file format");
        }
        localStorage.setItem("todoflow-tasks", JSON.stringify(data.tasks));
        toast.success(`Imported ${data.tasks.length} tasks. Refresh to see changes.`);
      } catch {
        toast.error("Failed to import. Invalid file format.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleClearAllData = () => {
    localStorage.removeItem("todoflow-tasks");
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
    setConfig({ apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" });
    setRealtimeSync(false);
    cloudSync.stopRealtimeSync();
    setClearDialogOpen(false);
    toast.success("All local data has been cleared. Refresh the page.");
  };

  // Sync error display
  useEffect(() => {
    if (cloudSync.syncError) {
      toast.error(cloudSync.syncError);
    }
  }, [cloudSync.syncError]);

  return (
    <Layout
      dailyDigestEnabled={digest.enabled}
      onToggleDigest={digest.toggleEnabled}
      onNewTask={() => { /* no-op on settings page */ }}
    >
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* ═══════════ Page Header ═══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-[#14B8A6]" />
            </div>
            <div>
              <h1 className="text-[1.75rem] font-bold text-[#1E293B] tracking-tight leading-tight">
                Settings
              </h1>
              <p className="text-[0.9375rem] text-[#94A3B8]">
                Configure cloud sync, manage your data, and app info
              </p>
            </div>
          </div>
        </motion.div>

        {/* ═══════════ Settings Sections ═══════════ */}
        <div className="flex flex-col gap-6">

          {/* ─────── Cloud Sync Configuration ─────── */}
          <SectionCard
            icon={Cloud}
            title="Cloud Sync Configuration"
            description="Connect your Firebase project to enable cloud backup and sync"
            delay={0.1}
          >
            {/* Firebase Config Form */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#334155] flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#94A3B8]" />
                  Firebase Configuration
                </h3>
                <div className="flex items-center gap-2">
                  {isConfigured && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-xs font-medium">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  )}
                  {configSaved && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-xs font-medium text-[#059669] flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Saved
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Config Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inputFields.map(({ key, label, placeholder }, idx) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + idx * 0.03 }}
                  >
                    <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1">
                      {label}
                    </label>
                    <Input
                      type="text"
                      value={config[key] || ""}
                      onChange={(e) => handleConfigChange(key, e.target.value)}
                      placeholder={placeholder}
                      className="h-9 text-sm bg-[#F8FAFC] border-[#E2E8F0] focus:bg-white focus:border-[#14B8A6] focus:ring-[#14B8A6]/20"
                    />
                  </motion.div>
                ))}
              </div>

              {/* Help Text */}
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Get these values from your Firebase Console &rarr; Project Settings &rarr; General &rarr; Your Apps &rarr; SDK Setup.
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-1 text-[#14B8A6] hover:text-[#0D9488] font-medium transition-colors"
                >
                  Open Firebase Console
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-1">
                <Button
                  onClick={handleSaveConfig}
                  disabled={!hasAnyConfig}
                  className="bg-[#14B8A6] hover:bg-[#0D9488] text-white h-9 text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Configuration
                </Button>
                <Button
                  onClick={handleTestConnection}
                  disabled={!allFieldsFilled || testingConnection}
                  variant="outline"
                  className="h-9 text-sm font-medium border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#334155] disabled:opacity-50"
                >
                  {testingConnection ? (
                    <RotateCw className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <TestTubes className="w-4 h-4 mr-1.5" />
                  )}
                  {testingConnection ? "Testing..." : "Test Connection"}
                </Button>
              </div>

              {/* Connection Result */}
              <AnimatePresence>
                {connectionResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <ConnectionStatus
                      connected={connectionResult.success}
                      message={connectionResult.message}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#E2E8F0] my-6" />

            {/* ── Authentication Section ── */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[#334155] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#94A3B8]" />
                Authentication
              </h3>

              {cloudSync.isLoading ? (
                <div className="flex items-center gap-3 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <RotateCw className="w-5 h-5 text-[#94A3B8] animate-spin" />
                  <p className="text-sm text-[#64748B]">Loading auth state...</p>
                </div>
              ) : !cloudSync.user ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-3"
                >
                  <p className="text-sm text-[#64748B]">
                    Sign in with Google to enable cloud sync features.
                  </p>
                  <Button
                    onClick={handleSignIn}
                    className="w-fit bg-white border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] h-10 px-5 text-sm font-medium shadow-sm"
                  >
                    <LogIn className="w-4 h-4 mr-2 text-[#14B8A6]" />
                    Sign in with Google
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-4"
                >
                  {/* User Profile Card */}
                  <div className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div className="w-12 h-12 rounded-full bg-[#14B8A6] flex items-center justify-center text-white text-lg font-semibold shrink-0 overflow-hidden">
                      {cloudSync.user.photoURL ? (
                        <img
                          src={cloudSync.user.photoURL}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1E293B] truncate">
                        {cloudSync.user.displayName || "User"}
                      </p>
                      <p className="text-xs text-[#94A3B8] truncate">
                        {cloudSync.user.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusBadge online={typeof navigator !== "undefined" ? navigator.onLine : false} />
                      </div>
                    </div>
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-[#E2E8F0] text-[#64748B] hover:text-[#F43F5E] hover:bg-[#FFF1F2] hover:border-[#F43F5E]/30"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1.5" />
                      Sign Out
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#E2E8F0] my-6" />

            {/* ── Sync Actions ── */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[#334155] flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#94A3B8]" />
                Sync Actions
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={handleUploadToCloud}
                  variant="outline"
                  disabled={!cloudSync.user}
                  className="h-10 justify-start text-sm font-medium border-[#E2E8F0] text-[#475569] hover:bg-[#F0FDFA] hover:text-[#0D9488] hover:border-[#14B8A6]/30 transition-all disabled:opacity-40"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center mr-3 shrink-0">
                    <Upload className="w-4 h-4 text-[#14B8A6]" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">Upload to Cloud</div>
                    <div className="text-[0.6875rem] text-[#94A3B8]">Backup local data</div>
                  </div>
                </Button>

                <Button
                  onClick={handleDownloadFromCloud}
                  variant="outline"
                  disabled={!cloudSync.user}
                  className="h-10 justify-start text-sm font-medium border-[#E2E8F0] text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#3B82F6]/30 transition-all disabled:opacity-40"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center mr-3 shrink-0">
                    <Download className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">Download from Cloud</div>
                    <div className="text-[0.6875rem] text-[#94A3B8]">Restore cloud data</div>
                  </div>
                </Button>
              </div>

              {/* Real-time Sync Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center shrink-0">
                    {realtimeSync ? (
                      <Cloud className="w-4 h-4 text-[#14B8A6]" />
                    ) : (
                      <CloudOff className="w-4 h-4 text-[#94A3B8]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#334155]">Real-time Sync</p>
                    <p className="text-xs text-[#94A3B8]">
                      {realtimeSync
                        ? "Listening for cloud changes..."
                        : "Automatically sync changes in real-time"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={realtimeSync}
                  onCheckedChange={handleToggleRealtimeSync}
                  disabled={!cloudSync.user}
                />
              </div>

              {/* Last Sync Time */}
              <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                <Clock className="w-3.5 h-3.5" />
                <span>Last synced:</span>
                <span className="font-medium text-[#64748B]">
                  {formatSyncTime(cloudSync.lastSync ? new Date(cloudSync.lastSync).toISOString() : getLastSyncTime())}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* ─────── Data Management ─────── */}
          <SectionCard
            icon={Database}
            title="Data Management"
            description="Export, import, or clear your local task data"
            delay={0.2}
          >
            <div className="flex flex-col gap-3">
              {/* Export */}
              <Button
                onClick={handleExportData}
                variant="outline"
                className="h-10 justify-start text-sm font-medium border-[#E2E8F0] text-[#475569] hover:bg-[#ECFDF5] hover:text-[#059669] hover:border-[#10B981]/30 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] flex items-center justify-center mr-3 shrink-0">
                  <FileDown className="w-4 h-4 text-[#10B981]" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">Export Data</div>
                  <div className="text-[0.6875rem] text-[#94A3B8]">Download all tasks as JSON</div>
                </div>
              </Button>

              {/* Import */}
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  id="import-file"
                  className="sr-only"
                />
                <label htmlFor="import-file" className="block cursor-pointer">
                  <div className="inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-10 px-4 py-2 border border-[#E2E8F0] text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#3B82F6]/30 w-full cursor-pointer bg-white">
                    <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center mr-1 shrink-0">
                      <FileUp className="w-4 h-4 text-[#3B82F6]" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Import Data</div>
                      <div className="text-[0.6875rem] text-[#94A3B8]">Restore from JSON backup</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#E2E8F0] my-2" />

              {/* Clear All Data */}
              <Button
                onClick={() => setClearDialogOpen(true)}
                variant="outline"
                className="h-10 justify-start text-sm font-medium border-[#E2E8F0] text-[#F43F5E] hover:bg-[#FFF1F2] hover:border-[#F43F5E]/30 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-[#FFF1F2] flex items-center justify-center mr-3 shrink-0">
                  <Trash2 className="w-4 h-4 text-[#F43F5E]" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">Clear All Data</div>
                  <div className="text-[0.6875rem] text-[#94A3B8]">Permanently delete all local data</div>
                </div>
              </Button>
            </div>
          </SectionCard>

          {/* ─────── About ─────── */}
          <SectionCard
            icon={Info}
            title="About"
            delay={0.3}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#F0FDFA] flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-7 h-7 text-[#14B8A6]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B]">
                    Kevin&apos;s Empire
                  </h3>
                  <p className="text-sm text-[#94A3B8]">Task Management</p>
                </div>
                <span className="ml-auto px-3 py-1 rounded-full bg-[#F1F5F9] text-[#64748B] text-xs font-mono font-medium">
                  v1.0.0
                </span>
              </div>

              <p className="text-sm text-[#64748B] leading-relaxed">
                Kevin&apos;s Empire is a powerful yet simple task management application designed
                to help you organize, track, and complete your projects efficiently. Features
                include progress tracking with history, categorized tasks, daily digest
                notifications, and cloud synchronization via Firebase.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <p className="text-[0.6875rem] uppercase tracking-wider text-[#94A3B8] font-medium mb-1">Tasks</p>
                  <TaskCount />
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <p className="text-[0.6875rem] uppercase tracking-wider text-[#94A3B8] font-medium mb-1">Storage</p>
                  <p className="text-lg font-bold text-[#1E293B]">Local</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ═══════════ Clear Data Confirmation Dialog ═══════════ */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="max-w-[420px] w-[90vw] bg-white rounded-2xl border-0 shadow-[0_24px_48px_rgba(0,0,0,0.15)]">
          <DialogHeader className="text-center sm:text-left">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-12 h-12 rounded-full bg-[#FFF1F2] flex items-center justify-center mb-4 sm:mx-0 mx-auto"
            >
              <AlertCircle className="w-6 h-6 text-[#F43F5E]" />
            </motion.div>
            <DialogTitle className="text-xl font-semibold text-[#1E293B]">
              Clear All Data?
            </DialogTitle>
            <DialogDescription className="text-sm text-[#64748B] mt-2">
              This will permanently delete all your tasks, progress history,
              and Firebase configuration from local storage. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3 sm:flex-row flex-col">
            <Button
              variant="outline"
              onClick={() => setClearDialogOpen(false)}
              className="flex-1 h-10 border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClearAllData}
              className="flex-1 h-10 bg-[#F43F5E] hover:bg-[#E11D48] text-white font-medium"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Clear Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

/* ─────────────── Sub-components ─────────────── */

function TaskCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("todoflow-tasks");
      if (raw) {
        const tasks = JSON.parse(raw);
        setCount(Array.isArray(tasks) ? tasks.length : 0);
      }
    } catch { /* ignore */ }
  }, []);
  return <p className="text-lg font-bold text-[#1E293B]">{count}</p>;
}
