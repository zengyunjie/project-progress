import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, Inbox, History, ChevronDown } from "lucide-react";
import Layout from "@/components/Layout";
import { useTaskManager } from "@/hooks/useTaskManager";
import { useDailyDigest } from "@/hooks/useDailyDigest";
import type { Task } from "@/types";

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

function getWeekday(dateStr: string): string {
  if (!dateStr) return "";
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const d = new Date(dateStr + "T00:00:00");
  return weekdays[d.getDay()];
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateTimeShort(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("zh-CN", { month: "long", day: "numeric" }) +
    " " + d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function isDueSoon(task: Task): boolean {
  if (task.status === "completed") return false;
  const today = new Date(new Date().toISOString().split("T")[0]);
  const deadline = new Date(task.deadline);
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 3;
}

function getStatusBadge(task: Task): { text: string; bg: string; textColor: string } {
  if (task.status === "completed") return { text: "已完成", bg: "#ECFDF5", textColor: "#059669" };
  if (task.status === "overdue") return { text: "已逾期", bg: "#FFF1F2", textColor: "#E11D48" };
  return { text: "进行中", bg: "#EFF6FF", textColor: "#2563EB" };
}

/* ─────────────── Task Card ─────────────── */
function TaskCard({ task, index }: { task: Task; index: number }) {
  const navigate = useNavigate();
  const badge = getStatusBadge(task);
  const completedDate = task.progress === 100 && task.history.length > 0
    ? task.history[task.history.length - 1].timestamp : null;

  return (
    <motion.div layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1], layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
      className="bg-white rounded-lg border border-[#E2E8F0] p-3.5 shadow-sm hover:shadow-md hover:border-[#CBD5E1] transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/?taskId=${task.id}`)}>
      <p className="font-mono text-[0.6875rem] text-[#94A3B8] mb-1">#{index + 1}</p>
      <p className="text-sm font-semibold text-[#1E293B] truncate mb-2.5" title={task.name}>{task.name}</p>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="h-[6px] rounded-full bg-[#E2E8F0] overflow-hidden" style={{ width: 100 }}>
          <motion.div className="h-full rounded-full bg-[#3B82F6]"
            initial={{ width: 0 }} animate={{ width: `${task.progress}%` }}
            transition={{ duration: 0.6, delay: index * 0.06 + 0.2, ease: "easeOut" }} />
        </div>
        <span className="text-xs font-medium text-[#475569] tabular-nums">{task.progress}%</span>
      </div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Clock className="w-3 h-3 text-[#94A3B8]" />
        <span className={`text-xs ${isDueSoon(task) ? "text-[#D97706]" : task.status === "overdue" ? "text-[#F43F5E]" : "text-[#3B82F6]"}`}>
          截止: {formatDate(task.deadline)} {getWeekday(task.deadline)}
        </span>
      </div>
      {completedDate && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
          <span className="text-xs text-[#059669]">完成于: {formatDateTime(completedDate)}</span>
        </div>
      )}
      <div className="mt-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.6875rem] font-medium"
          style={{ backgroundColor: badge.bg, color: badge.textColor }}>{badge.text}</span>
      </div>
      {task.history.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex items-start gap-1.5">
          <History className="w-3 h-3 text-[#94A3B8] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[0.6875rem] text-[#94A3B8] font-mono">{formatDateTimeShort(task.history[task.history.length - 1].timestamp)}</p>
            <p className="text-xs text-[#64748B] truncate">{task.history[task.history.length - 1].note}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ─────────────── Board Column ─────────────── */
function BoardColumn({
  categoryName, categoryColor, tasks, columnIndex,
}: {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  tasks: Task[];
  columnIndex: number;
}) {
  const headerBg = `${categoryColor}15`;
  const [showTerminated, setShowTerminated] = useState(false);
  const activeTasks = tasks.filter((t) => t.status !== "terminated");
  const terminatedTasks = tasks.filter((t) => t.status === "terminated");

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: columnIndex * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 min-w-0 flex flex-col rounded-xl border border-[#E2E8F0] bg-white overflow-hidden"
      style={{ borderTopWidth: 3, borderTopColor: categoryColor }}>
      <div className="px-4 py-3.5 flex items-center justify-between" style={{ backgroundColor: headerBg }}>
        <h3 className="text-sm font-semibold text-[#1E293B] truncate">{categoryName}</h3>
        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full text-xs font-bold text-white tabular-nums"
          style={{ backgroundColor: categoryColor }}>{tasks.length}</span>
      </div>
      <div className="flex-1 p-3 flex flex-col gap-2.5 min-h-[120px]">
        {tasks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center py-10 text-[#94A3B8]">
            <Inbox className="w-8 h-8 mb-2 text-[#CBD5E1]" />
            <p className="text-sm">此分类暂无项目</p>
          </motion.div>
        ) : (<>
          {activeTasks.map((task, idx) => (<TaskCard key={task.id} task={task} index={idx} />))}
          {terminatedTasks.length > 0 && (
            <div className="mt-1">
              <button onClick={() => setShowTerminated(!showTerminated)}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md bg-[#F8FAFC] text-xs text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#64748B] transition-all duration-200 cursor-pointer">
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showTerminated ? "" : "-rotate-90"}`} />
                <span>已终止 ({terminatedTasks.length})</span>
              </button>
              <AnimatePresence>
                {showTerminated && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="flex flex-col gap-2 mt-2">
                      {terminatedTasks.map((task, idx) => (<TaskCard key={task.id} task={task} index={idx} />))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>)}
      </div>
    </motion.div>
  );
}

/* ─────────────── Stat Card ─────────────── */
function StatCard({ label, value, color, bg, delay }: { label: string; value: number; color: string; bg: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3.5 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div>
        <p className="text-xl font-bold text-[#1E293B] leading-tight tabular-nums">{value}</p>
        <p className="text-xs text-[#94A3B8]">{label}</p>
      </div>
    </motion.div>
  );
}

/* ─────────────── Board Page ─────────────── */
export default function Board() {
  const navigate = useNavigate();
  const { tasks, allCategories } = useTaskManager();
  const digest = useDailyDigest();

  const grouped = useMemo(() => {
    const result: Record<string, Task[]> = {};
    allCategories.forEach((cat) => {
      result[cat.id] = tasks.filter((t) => t.category === cat.id);
    });
    return result;
  }, [tasks, allCategories]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.progress === 100).length;
    const categoryStats = allCategories.map((cat) => ({
      name: cat.name, color: cat.color,
      count: tasks.filter((t) => t.category === cat.id).length,
    }));
    return { total, completed, categoryStats };
  }, [tasks, allCategories]);

  return (
    <Layout dailyDigestEnabled={digest.enabled} onToggleDigest={digest.toggleEnabled} onNewTask={() => navigate("/")}>
      <div className="max-w-[1280px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-4 sm:mb-6">
          <h1 className="font-bold text-[#1E293B] tracking-tight text-[1.75rem] sm:text-[2rem] md:text-[2.5rem]" style={{ lineHeight: 1.15 }}>项目看板</h1>
          <p className="text-sm text-[#94A3B8] mt-1.5">按分类查看所有项目</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-6 sm:mb-8">
          <StatCard label="项目总数" value={stats.total} color="#3B82F6" bg="#EFF6FF" delay={0} />
          {stats.categoryStats.map((stat, idx) => (
            <StatCard key={stat.name} label={stat.name} value={stat.count} color={stat.color} bg={`${stat.color}15`} delay={0.05 * (idx + 1)} />
          ))}
          <StatCard label="已完成" value={stats.completed} color="#10B981" bg="#ECFDF5" delay={0.05 * (stats.categoryStats.length + 1)} />
        </div>

        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-5 overflow-x-auto pb-2 -mx-1 px-1">
          {allCategories.map((cat, idx) => (
            <div key={cat.id} className="lg:flex-1 lg:min-w-0 min-w-[260px] sm:min-w-[300px]">
              <BoardColumn key={cat.id} categoryId={cat.id}
                categoryName={cat.name} categoryColor={cat.color}
                tasks={grouped[cat.id] || []} columnIndex={idx} />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
