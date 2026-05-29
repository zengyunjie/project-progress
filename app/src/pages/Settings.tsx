import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Cloud,
  CloudOff,
  Upload,
  Download,
  Database,
  Trash2,
  FileDown,
  FileUp,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Settings as SettingsIcon,
  HardDrive,
  Info,
  Wifi,
  Clock,
  Sparkles,
  Zap,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useDailyDigest } from "@/hooks/useDailyDigest";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useTaskManager } from "@/hooks/useTaskManager";
import { Button } from "@/components/ui/button";
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

/* ===========================================
   Settings Page — Kevin's Empire
   Now powered by Supabase
   =========================================== */

const LAST_SYNC_KEY = "ke-empire-last-sync";

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

/* ─────────────── Section Card ─────────────── */
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
            <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
              <Icon className="w-[18px] h-[18px] text-[#4F46E5]" />
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
        backgroundColor: online ? "#ECFDF5" : "#FEF3C7",
        color: online ? "#059669" : "#D97706",
      }}
    >
      {online ? <Wifi className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
      {online ? "Connected" : "Offline"}
    </span>
  );
}

/* ===========================================
   MAIN SETTINGS PAGE
   =========================================== */
export default function Settings() {
  const digest = useDailyDigest();
  const cloudSync = useCloudSync();
  const taskManager = useTaskManager();

  // ── Real-time sync ──
  const [realtimeSync, setRealtimeSync] = useState(false);
  const realtimeCleanupRef = useRef<(() => void) | null>(null);

  // ── Clear Data Dialog ──
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // ── Connection check ──
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : false;

  // ── Handlers ──

  const handleUploadToCloud = async () => {
    try {
      const tasks = taskManager.tasks;
      const categories = taskManager.allCategories || [];

      const result = await cloudSync.uploadToCloud(tasks, categories);
      if (result) {
        const now = new Date().toISOString();
        setLastSyncTime(now);
        toast.success(`Uploaded ${tasks.length} tasks to Supabase`);
      } else {
        toast.error("Upload failed. Check your connection.");
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
        toast.success(
          `Downloaded ${result.tasks.length} tasks from Supabase. Refresh to apply.`
        );
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
      if (realtimeCleanupRef.current) realtimeCleanupRef.current();

      realtimeCleanupRef.current = cloudSync.startRealtimeSync(
        (tasks, _categories) => {
          toast.info(`Real-time update: ${tasks.length} tasks synced`, {
            duration: 2000,
          });
        }
      );
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
        version: "2.0.0",
        backend: "Supabase",
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

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.tasks || !Array.isArray(data.tasks)) {
          throw new Error("Invalid backup file format");
        }
        const success = await taskManager.importData(
          JSON.stringify({ tasks: data.tasks, categories: data.categories || [] })
        );
        if (success) {
          toast.success(`Imported ${data.tasks.length} tasks. Data synced to Supabase.`);
        } else {
          toast.error("Import failed");
        }
      } catch {
        toast.error("Failed to import. Invalid file format.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleClearAllData = async () => {
    await taskManager.clearAllData();
    localStorage.removeItem(LAST_SYNC_KEY);
    setRealtimeSync(false);
    cloudSync.stopRealtimeSync();
    setClearDialogOpen(false);
    toast.success("All data has been cleared from local and cloud.");
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
      onNewTask={() => { /* no-op */ }}
    >
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-[#4F46E5]" />
            </div>
            <div>
              <h1 className="text-[1.75rem] font-bold text-[#1E293B] tracking-tight leading-tight">
                Settings
              </h1>
              <p className="text-[0.9375rem] text-[#94A3B8]">
                Supabase cloud sync · real-time collaboration · data management
              </p>
            </div>
          </div>
        </motion.div>

        {/* Settings Sections */}
        <div className="flex flex-col gap-6">

          {/* ─── Cloud Sync — Supabase ─── */}
          <SectionCard
            icon={Cloud}
            title="Cloud Sync · Supabase"
            description="Real-time multi-device sync powered by Supabase"
            delay={0.1}
          >
            {/* Connection Status */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 bg-[#F0FDF4] rounded-xl border border-[#BBF7D0]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-[#16A34A]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#166534]">
                      Supabase Connected
                    </p>
                    <p className="text-xs text-[#15803D]">
                      Anonymous access · real-time enabled · all devices synced
                    </p>
                  </div>
                </div>
                <StatusBadge online={isOnline} />
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Your data is stored in Supabase PostgreSQL and synced across all devices
                in real-time. No login required — just open the URL and start working.
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-1 text-[#4F46E5] hover:text-[#4338CA] font-medium transition-colors"
                >
                  Learn more
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#E2E8F0] my-6" />

            {/* Sync Actions */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[#334155] flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#94A3B8]" />
                Sync Actions
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={handleUploadToCloud}
                  variant="outline"
                  className="h-10 justify-start text-sm font-medium border-[#E2E8F0] text-[#475569] hover:bg-[#EEF2FF] hover:text-[#4338CA] hover:border-[#4F46E5]/30 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center mr-3 shrink-0">
                    <Upload className="w-4 h-4 text-[#4F46E5]" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">Upload to Cloud</div>
                    <div className="text-[0.6875rem] text-[#94A3B8]">Backup local data</div>
                  </div>
                </Button>

                <Button
                  onClick={handleDownloadFromCloud}
                  variant="outline"
                  className="h-10 justify-start text-sm font-medium border-[#E2E8F0] text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#3B82F6]/30 transition-all"
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

              {/* Real-time Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-[#4F46E5]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#334155]">Real-time Sync</p>
                    <p className="text-xs text-[#94A3B8]">
                      {realtimeSync
                        ? "Listening for cloud changes..."
                        : "Auto-sync changes across all devices"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={realtimeSync}
                  onCheckedChange={handleToggleRealtimeSync}
                />
              </div>

              {/* Last Sync */}
              <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                <Clock className="w-3.5 h-3.5" />
                <span>Last synced:</span>
                <span className="font-medium text-[#64748B]">
                  {formatSyncTime(
                    cloudSync.lastSync
                      ? new Date(cloudSync.lastSync).toISOString()
                      : getLastSyncTime()
                  )}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* ─── Data Management ─── */}
          <SectionCard
            icon={Database}
            title="Data Management"
            description="Export, import, or clear your task data"
            delay={0.2}
          >
            <div className="flex flex-col gap-3">
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
                  <div className="text-[0.6875rem] text-[#94A3B8]">
                    Download all tasks as JSON backup
                  </div>
                </div>
              </Button>

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
                      <div className="text-[0.6875rem] text-[#94A3B8]">
                        Restore from JSON backup &amp; sync to cloud
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              <div className="h-px bg-[#E2E8F0] my-2" />

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
                  <div className="text-[0.6875rem] text-[#94A3B8]">
                    Delete all data (local + cloud)
                  </div>
                </div>
              </Button>
            </div>
          </SectionCard>

          {/* ─── About ─── */}
          <SectionCard icon={Info} title="About" delay={0.3}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-7 h-7 text-[#4F46E5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B]">
                    Kevin&apos;s Empire
                  </h3>
                  <p className="text-sm text-[#94A3B8]">
                    Task Management · Powered by Supabase
                  </p>
                </div>
                <span className="ml-auto px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-mono font-medium">
                  v2.0.0
                </span>
              </div>

              <p className="text-sm text-[#64748B] leading-relaxed">
                Kevin&apos;s Empire is a multi-device task management application powered
                by Supabase PostgreSQL. All changes sync in real-time across every device —
                no login required. Features include progress tracking with history,
                categorized tasks, daily digest notifications, and instant cloud synchronization.
              </p>

              <div className="grid grid-cols-3 gap-3 mt-1">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <p className="text-[0.6875rem] uppercase tracking-wider text-[#94A3B8] font-medium mb-1">
                    Tasks
                  </p>
                  <p className="text-lg font-bold text-[#1E293B]">{taskManager.tasks.length}</p>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <p className="text-[0.6875rem] uppercase tracking-wider text-[#94A3B8] font-medium mb-1">
                    Backend
                  </p>
                  <p className="text-lg font-bold text-[#16A34A]">Supabase</p>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <p className="text-[0.6875rem] uppercase tracking-wider text-[#94A3B8] font-medium mb-1">
                    Sync
                  </p>
                  <p className="text-lg font-bold text-[#4F46E5]">
                    {realtimeSync ? "Live" : "Manual"}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Clear Data Dialog */}
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
              and categories from BOTH local storage and Supabase cloud.
              This action cannot be undone.
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
