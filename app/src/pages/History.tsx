import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Search, Clock, TrendingUp,
  BarChart3, ChevronDown, X, Quote, Pencil, Filter,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import Layout from "@/components/Layout";
import { useDailyDigest } from "@/hooks/useDailyDigest";
import { useTaskManager } from "@/hooks/useTaskManager";
import type { Task, ProgressEntry } from "@/types";

const statusColors: Record<Task["status"], string> = {
  active: "#3B82F6", completed: "#10B981", overdue: "#F43F5E", terminated: "#94A3B8",
};
const statusBgColors: Record<Task["status"], string> = {
  active: "#EFF6FF", completed: "#ECFDF5", overdue: "#FFF1F2", terminated: "#F1F5F9",
};
const statusTextColors: Record<Task["status"], string> = {
  active: "#2563EB", completed: "#059669", overdue: "#E11D48", terminated: "#64748B",
};

const statusLabels: Record<Task["status"], string> = {
  active: "进行中", completed: "已完成", overdue: "已逾期", terminated: "已终止",
};

function getRelativeTimeLabel(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} 天前`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} 个月前`;
}

function formatDayHeader(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "今天";
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return format(date, "M月d日 EEE");
}

function formatMonthHeader(date: Date): string {
  return format(date, "yyyy年M月");
}

interface FlattenedEntry extends ProgressEntry {
  task: Task;
  previousProgress: number | null;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debounced;
}

const easeOut = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

export default function HistoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const digest = useDailyDigest();
  const { tasks } = useTaskManager();
  const taskIdFromUrl = searchParams.get("taskId");

  const [selectedTaskId, setSelectedTaskId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [detailEntry, setDetailEntry] = useState<FlattenedEntry | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (taskIdFromUrl) setSelectedTaskId(taskIdFromUrl); }, [taskIdFromUrl]);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allEntries: FlattenedEntry[] = useMemo(() => {
    const entries: FlattenedEntry[] = [];
    tasks.forEach((task) => {
      task.history.forEach((h, idx) => {
        entries.push({ ...h, task, previousProgress: idx > 0 ? task.history[idx - 1].progress : null });
      });
    });
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return entries;
  }, [tasks]);

  const filteredEntries = useMemo(() => {
    let result = allEntries;
    if (selectedTaskId !== "all") result = result.filter((e) => e.taskId === selectedTaskId);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((e) => e.note.toLowerCase().includes(q) || e.task.name.toLowerCase().includes(q));
    }
    return result;
  }, [allEntries, selectedTaskId, debouncedSearch]);

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, FlattenedEntry[]>>();
    filteredEntries.forEach((entry) => {
      const date = parseISO(entry.timestamp);
      const monthKey = formatMonthHeader(date);
      const dayKey = formatDayHeader(date);
      if (!map.has(monthKey)) map.set(monthKey, new Map());
      const monthMap = map.get(monthKey)!;
      if (!monthMap.has(dayKey)) monthMap.set(dayKey, []);
      monthMap.get(dayKey)!.push(entry);
    });
    return map;
  }, [filteredEntries]);

  const stats = useMemo(() => {
    const totalUpdates = allEntries.length;
    const uniqueTasks = new Set(allEntries.map((e) => e.taskId)).size;
    const latestUpdate = allEntries.length > 0 ? allEntries[0].timestamp : null;
    let totalIncrease = 0, increaseCount = 0;
    allEntries.forEach((e) => {
      if (e.previousProgress !== null && e.progress > e.previousProgress) {
        totalIncrease += e.progress - e.previousProgress; increaseCount++;
      }
    });
    const avgIncrease = increaseCount > 0 ? Math.round(totalIncrease / increaseCount) : 0;
    return { totalUpdates, uniqueTasks, latestUpdate, avgIncrease };
  }, [allEntries]);

  const handleSelectTask = useCallback((id: string) => {
    setSelectedTaskId(id); setDropdownOpen(false);
    if (id === "all") { const sp = new URLSearchParams(searchParams); sp.delete("taskId"); setSearchParams(sp, { replace: true }); }
    else setSearchParams({ taskId: id }, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleClearFilters = useCallback(() => {
    setSelectedTaskId("all"); setSearchQuery("");
  }, []);

  const selectedTaskName = useMemo(() => {
    if (selectedTaskId === "all") return "全部任务";
    return tasks.find((t) => t.id === selectedTaskId)?.name || "全部任务";
  }, [selectedTaskId, tasks]);

  return (
    <Layout dailyDigestEnabled={digest.enabled} onToggleDigest={digest.toggleEnabled} onNewTask={() => { }}>
      <div className="max-w-[1280px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeOut }}
              className="text-[1.75rem] sm:text-[2rem] md:text-[2.5rem] font-bold text-[#1E293B] tracking-[-0.02em] leading-[1.1]">更新历史</motion.h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1, ease: easeOut }}
              className="text-[0.9375rem] text-[#94A3B8] mt-2">追踪所有任务的每一次进度更新</motion.p>
          </div>
          <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15, ease: easeOut }}
            whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/")}
            className="flex items-center gap-2 self-start px-5 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-sm font-medium rounded-lg h-10 transition-colors cursor-pointer">
            <LayoutDashboard className="w-3.5 h-3.5" /> 任务面板
          </motion.button>
        </div>

        {/* Filter Bar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2, ease: easeOut }}
          className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2">
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-medium text-[#64748B] shrink-0">按任务筛选:</span>
              <button onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-sm font-medium rounded-lg h-10 transition-colors cursor-pointer min-w-[180px]">
                <span className="truncate">{selectedTaskName}</span>
                <ChevronDown className={`w-4 h-4 text-[#94A3B8] ml-auto transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.2 }}
                  style={{ originY: 0 }} className="absolute top-full left-[86px] mt-1 z-30 bg-white border border-[#E2E8F0] rounded-lg shadow-lg min-w-[220px] py-1.5">
                  <button onClick={() => handleSelectTask("all")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer ${selectedTaskId === "all" ? "bg-[#EFF6FF] text-[#2563EB] font-medium" : "text-[#475569] hover:bg-[#F8FAFC]"}`}>
                    <span className="w-2 h-2 rounded-full bg-[#94A3B8]" /> 全部任务
                    <span className="ml-auto text-[0.75rem] text-[#94A3B8]">{tasks.reduce((acc, t) => acc + t.history.length, 0)}</span>
                  </button>
                  {tasks.map((task) => (
                    <button key={task.id} onClick={() => handleSelectTask(task.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer ${selectedTaskId === task.id ? "bg-[#EFF6FF] text-[#2563EB] font-medium" : "text-[#475569] hover:bg-[#F8FAFC]"}`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusColors[task.status] }} />
                      <span className="truncate">{task.name}</span>
                      <span className="ml-auto text-[0.75rem] text-[#94A3B8] shrink-0">{task.history.length}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 sm:max-w-[360px] sm:ml-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
            <input type="text" placeholder="搜索更新备注..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#334155] placeholder:text-[#CBD5E1] focus:outline-none focus:border-[#3B82F6] focus:ring-[3px] focus:ring-[rgba(59,130,246,0.1)] transition-all" />
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25, ease: easeOut }}
          className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#94A3B8]" />
            <span className="text-[0.8125rem] font-semibold text-[#64748B]">历史概览</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { v: stats.totalUpdates, l: "更新总数", c: "#3B82F6", d: 0.3 },
              { v: stats.uniqueTasks, l: "追踪任务数", c: "#3B82F6", d: 0.4 },
              { v: stats.avgIncrease + "%", l: "平均进度增幅", c: "#F59E0B", d: 0.5, icon: true },
              { v: stats.latestUpdate ? getRelativeTimeLabel(parseISO(stats.latestUpdate)) : "—", l: "最近更新", c: "#10B981", d: 0.6 },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: item.d }}
                className="pl-4 border-l-2" style={{ borderLeftColor: item.c }}>
                <div className="text-[1.5rem] font-bold text-[#1E293B] leading-tight flex items-center gap-1 tabular-nums">
                  {item.icon && <TrendingUp className="w-4 h-4 text-[#F59E0B]" />}{item.v}
                </div>
                <div className="text-[0.75rem] text-[#94A3B8] mt-0.5">{item.l}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Timeline */}
        {filteredEntries.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-col items-center justify-center py-16">
            {allEntries.length === 0 ? (<>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                <Clock className="w-14 h-14 text-[#CBD5E1] mb-4" />
              </motion.div>
              <h3 className="text-[1.25rem] font-semibold text-[#64748B]">暂无更新</h3>
              <p className="text-sm text-[#94A3B8] mt-1">编辑任务后的进度更新将显示在这里</p>
              <button onClick={() => navigate("/")}
                className="mt-6 px-6 py-2.5 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg hover:bg-[#60A5FA] transition-colors cursor-pointer">前往任务面板</button>
            </>) : (<>
              <Filter className="w-12 h-12 text-[#CBD5E1] mb-4" />
              <h3 className="text-[1.125rem] font-semibold text-[#64748B]">没有匹配的更新</h3>
              <p className="text-sm text-[#94A3B8] mt-1">试试调整筛选条件</p>
              <button onClick={handleClearFilters}
                className="mt-4 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB] transition-colors cursor-pointer">清除筛选</button>
            </>)}
          </motion.div>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-[#3B82F6] opacity-20 hidden sm:block" />
            {Array.from(grouped.entries()).map(([month, daysMap]) => (
              <motion.div key={month} initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }} className="mb-8">
                <motion.div variants={{ hidden: { opacity: 0, scaleX: 0.8 }, visible: { opacity: 1, scaleX: 1, transition: { duration: 0.3 } } }} className="mb-4">
                  <div className="sticky top-16 z-10 bg-[#F8FAFC]/80 backdrop-blur-lg py-2">
                    <h2 className="text-[1.125rem] font-semibold text-[#334155] tracking-tight">{month}</h2>
                    <div className="w-full h-[2px] bg-[#E2E8F0] mt-2" />
                  </div>
                </motion.div>
                {Array.from(daysMap.entries()).map(([day, entries]) => (
                  <motion.div key={day} variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } } }} className="mb-6">
                    <div className="flex items-center gap-3 mb-3 ml-0 sm:ml-2">
                      <span className="text-sm font-medium text-[#64748B]">{day}</span>
                      <div className="flex-1 h-[1px] border-t border-dashed border-[#E2E8F0]" />
                    </div>
                    <div className="flex flex-col gap-3">
                      {entries.map((entry, entryIdx) => {
                        const statusColor = statusColors[entry.task.status];
                        const date = parseISO(entry.timestamp);
                        const isIncrease = entry.previousProgress !== null && entry.progress > entry.previousProgress;

                        return (
                          <motion.div key={entry.id}
                            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}
                            whileHover={{ y: -1, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                            onClick={() => setDetailEntry(entry)}
                            className="relative bg-white border border-[#E2E8F0] rounded-[10px] py-4 px-5 cursor-pointer transition-shadow duration-150 ml-0 sm:ml-[46px]"
                            style={{ borderLeftWidth: 3, borderLeftColor: statusColor }}>
                            <div className="absolute -left-[52px] top-5 w-[10px] h-[10px] rounded-full border-2 border-white hidden sm:block"
                              style={{ backgroundColor: statusColor, boxShadow: `0 0 0 2px ${statusColor}` }} />
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                              <span className="font-mono text-[0.8125rem] font-medium text-[#64748B]">{format(date, "HH:mm")}</span>
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/?taskId=${entry.taskId}`); }}
                                className="text-[0.9375rem] font-semibold text-[#334155] hover:text-[#2563EB] hover:underline transition-colors cursor-pointer">{entry.task.name}</button>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.75rem] font-medium"
                                style={{ backgroundColor: statusBgColors[entry.task.status], color: statusTextColors[entry.task.status] }}>{statusLabels[entry.task.status]}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mb-2">
                              <div className="flex items-center gap-1.5 font-mono text-[0.8125rem] tabular-nums">
                                {entry.previousProgress !== null ? (<>
                                  <span className="text-[#94A3B8]">{entry.previousProgress}%</span>
                                  <span className="text-[#CBD5E1]">→</span>
                                  <span className={`font-semibold ${isIncrease ? "text-[#2563EB]" : "text-[#64748B]"}`}>{entry.progress}%</span>
                                  {entry.progress === 100 && <span className="text-[#059669] font-semibold ml-1">完成!</span>}
                                </>) : (
                                  <span className="text-[#64748B] italic">创建 — 初始进度: {entry.progress}%</span>
                                )}
                              </div>
                              <div className="w-[120px] h-1 bg-[#E2E8F0] rounded-full overflow-hidden hidden sm:block">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${entry.progress}%` }}
                                  transition={{ duration: 0.5, ease: easeOut, delay: 0.2 + entryIdx * 0.06 }}
                                  className="h-full rounded-full" style={{ backgroundColor: statusColor }} />
                              </div>
                            </div>
                            {entry.note && (
                              <div className="flex items-start gap-1.5 mb-1.5">
                                <Quote className="w-3 h-3 text-[#CBD5E1] mt-0.5 shrink-0" />
                                <p className="text-[0.8125rem] text-[#64748B] leading-[1.5]">{entry.note}</p>
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                                <Pencil className="w-3 h-3" />
                                <span className="text-[0.75rem]">系统更新</span>
                              </div>
                              <span className="font-mono text-[0.75rem] text-[#94A3B8]">{format(date, "yyyy-MM-dd HH:mm:ss")}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailEntry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15, 23, 42, 0.5)" }}
            onClick={() => setDetailEntry(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, ease: easeOut }}
              onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[85vh] overflow-y-auto p-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <button onClick={() => navigate(`/?taskId=${detailEntry.taskId}`)}
                    className="text-[1.125rem] font-semibold text-[#2563EB] hover:underline transition-colors cursor-pointer">{detailEntry.task.name}</button>
                  <p className="font-mono text-[0.8125rem] text-[#94A3B8] mt-1">{format(parseISO(detailEntry.timestamp), "yyyy-MM-dd HH:mm:ss")}</p>
                </div>
                <button onClick={() => setDetailEntry(null)} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-[#94A3B8] hover:text-[#334155]" />
                </button>
              </div>
              <div className="h-[1px] bg-[#E2E8F0] my-4" />
              <div className="mb-5">
                  <p className="text-[0.8125rem] text-[#64748B] mb-2">进度更新</p>
                <div className="flex items-center gap-2 mb-3 tabular-nums">
                  {detailEntry.previousProgress !== null ? (<>
                    <span className="text-[1.5rem] font-bold text-[#1E293B]">{detailEntry.previousProgress}% → {detailEntry.progress}%</span>
                    {detailEntry.progress > detailEntry.previousProgress && (
                      <span className="text-[0.875rem] font-semibold text-[#3B82F6]">+{detailEntry.progress - detailEntry.previousProgress}%</span>
                    )}
                  </>) : (
                    <span className="text-[1.5rem] font-bold text-[#1E293B]">初始: {detailEntry.progress}%</span>
                  )}
                </div>
                <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${detailEntry.progress}%` }} transition={{ duration: 0.6, ease: easeOut }}
                    className="h-full rounded-full" style={{ backgroundColor: statusColors[detailEntry.task.status] }} />
                </div>
              </div>
              {detailEntry.note && (
                <div className="mb-5">
                  <p className="text-[0.8125rem] text-[#64748B] mb-2">更新备注</p>
                  <div className="bg-[#F1F5F9] rounded-xl p-4">
                    <p className="text-[0.875rem] text-[#475569] italic">{detailEntry.note}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <span className="font-mono text-[0.75rem] text-[#94A3B8]">{format(parseISO(detailEntry.timestamp), "yyyy-MM-dd HH:mm:ss")}</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.75rem] font-medium"
                  style={{ backgroundColor: statusBgColors[detailEntry.task.status], color: statusTextColors[detailEntry.task.status] }}>
                  {statusLabels[detailEntry.task.status]}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
