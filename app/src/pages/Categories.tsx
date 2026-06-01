import { useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Clock, CheckCircle2, ChevronRight,
  AlertTriangle, TrendingUp, Inbox, Plus, GripHorizontal,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useTaskManager } from "@/hooks/useTaskManager";
import { useDailyDigest } from "@/hooks/useDailyDigest";
import type { Task, CustomCategory } from "@/types";

/* ─────────────── Helpers ─────────────── */

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function formatDateTimeShort(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function getStatusBadge(task: Task): { text: string; bg: string; textColor: string; dot: string } {
  if (task.status === "terminated") return { text: "已终止", bg: "#F1F5F9", textColor: "#94A3B8", dot: "#94A3B8" };
  if (task.status === "completed") return { text: "已完成", bg: "#ECFDF5", textColor: "#059669", dot: "#10B981" };
  if (task.status === "overdue") return { text: "已逾期", bg: "#FFF1F2", textColor: "#E11D48", dot: "#F43F5E" };
  const today = new Date(getToday());
  const deadline = new Date(task.deadline);
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 3 && diffDays >= 0) return { text: "即将到期", bg: "#FFFBEB", textColor: "#D97706", dot: "#F59E0B" };
  return { text: "进行中", bg: "#EFF6FF", textColor: "#2563EB", dot: "#3B82F6" };
}

/* ─────────────── Overview Stats ─────────────── */

function OverviewCard({ icon: Icon, label, value, color, bg, delay }: {
  icon: typeof Inbox; label: string; value: string | number; color: string; bg: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-[1.375rem] font-bold text-[#1E293B] leading-tight tabular-nums">{value}</p>
        <p className="text-xs text-[#94A3B8]">{label}</p>
      </div>
    </motion.div>
  );
}

/* ─────────────── Category Card ─────────────── */

function CategoryCard({
  category, tasks, index,
}: {
  category: CustomCategory;
  tasks: Task[];
  index: number;
}) {
  const navigate = useNavigate();
  const activeTasks = tasks.filter((t) => t.status !== "terminated");
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const overdueCount = tasks.filter((t) => t.status === "overdue").length;
  const terminatedCount = tasks.filter((t) => t.status === "terminated").length;
  const avgProgress = activeTasks.length > 0
    ? Math.round(activeTasks.reduce((sum, t) => sum + t.progress, 0) / activeTasks.length)
    : 0;

  // 最多展示最近 6 个项目，超出折叠
  const maxShow = 6;
  const [showAll, setShowAll] = useMemo(() => [false, () => {}], []);
  const visibleTasks = activeTasks.slice(0, maxShow);
  const hiddenCount = activeTasks.length - maxShow;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-300 flex flex-col"
    >
      {/* ── Category Header ── */}
      <div className="px-5 pt-5 pb-3 flex items-start gap-3">
        {/* Color indicator */}
        <div className="shrink-0 mt-0.5"
          style={{ width: 4, borderRadius: 2, height: 36, backgroundColor: category.color }} />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-[#1E293B] truncate">{category.name}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            <span className="text-xs text-[#94A3B8]">
              <span className="font-semibold text-[#475569] tabular-nums">{tasks.length}</span> 个项目
            </span>
            {completedCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#059669]">
                <CheckCircle2 className="w-3 h-3" /> {completedCount}
              </span>
            )}
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#E11D48]">
                <AlertTriangle className="w-3 h-3" /> {overdueCount}
              </span>
            )}
          </div>
        </div>
        {/* Avg progress ring */}
        {activeTasks.length > 0 && (
          <div className="shrink-0 flex flex-col items-center">
            <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke={category.color} strokeWidth="3"
                strokeDasharray={`${(avgProgress / 100) * 87.96} 87.96`} strokeLinecap="round" />
            </svg>
            <span className="text-[0.625rem] font-bold -mt-5 tabular-nums" style={{ color: category.color }}>{avgProgress}%</span>
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="mx-5 border-t border-[#F1F5F9]" />

      {/* ── Project List ── */}
      <div className="flex-1 px-3 py-2 flex flex-col gap-1">
        {visibleTasks.length === 0 && terminatedCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Inbox className="w-6 h-6 text-[#CBD5E1] mb-1.5" />
            <p className="text-xs text-[#94A3B8]">暂无项目</p>
          </div>
        ) : (
          <>
            {visibleTasks.map((task, idx) => (
              <TaskCardItem key={task.id} task={task} categoryColor={category.color} />
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={() => navigate("/")}
                className="flex items-center justify-center gap-1.5 py-1.5 text-xs text-[#94A3B8] hover:text-[#3B82F6] transition-colors cursor-pointer"
              >
                <GripHorizontal className="w-3 h-3" />
                还有 {hiddenCount} 个项目，去控制台查看
              </button>
            )}
            {terminatedCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 text-[0.625rem] text-[#94A3B8]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1]" />
                已终止 {terminatedCount} 个
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────── Compact Task Item ─────────────── */

function TaskCardItem({ task, categoryColor }: { task: Task; categoryColor: string }) {
  const navigate = useNavigate();
  const badge = getStatusBadge(task);
  const isCompleted = task.status === "completed";
  const isTerminated = task.status === "terminated";

  return (
    <motion.div
      whileHover={{ x: 1 }}
      onClick={() => navigate(`/?taskId=${task.id}`)}
      className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors duration-150"
    >
      {/* Status dot */}
      <div className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: badge.dot }} />

      {/* Name + deadline */}
      <div className="flex-1 min-w-0">
        <span className={`text-[0.8125rem] font-medium truncate block ${isCompleted || isTerminated ? "line-through text-[#94A3B8]" : "text-[#334155]"}`}>
          {task.name}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[0.625rem] text-[#94A3B8] flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />{formatDate(task.deadline)}
          </span>
          <span className="px-1.5 py-[1px] rounded-full text-[0.5625rem] font-medium"
            style={{ backgroundColor: badge.bg, color: badge.textColor }}>
            {badge.text}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1.5 shrink-0" style={{ width: 64 }}>
        <div className="flex-1 h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${task.progress}%`,
              backgroundColor: isTerminated ? "#94A3B8" : isCompleted ? "#10B981" : task.status === "overdue" ? "#F43F5E" : categoryColor,
            }} />
        </div>
        <span className="text-[0.625rem] font-mono font-semibold w-7 text-right text-[#475569] tabular-nums">{task.progress}%</span>
      </div>

      <ChevronRight className="w-3 h-3 text-[#CBD5E1] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </motion.div>
  );
}

/* ═══════════════════════ CATEGORIES PAGE ═══════════════════════ */

export default function Categories() {
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
    const completed = tasks.filter((t) => t.status === "completed").length;
    const active = tasks.filter((t) => t.status === "active").length;
    const overdue = tasks.filter((t) => t.status === "overdue").length;
    return { total, completed, active, overdue };
  }, [tasks]);

  return (
    <Layout dailyDigestEnabled={digest.enabled} onToggleDigest={digest.toggleEnabled}
      onNewTask={() => navigate("/")}>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-[1.75rem] sm:text-[2rem] md:text-[2.5rem] font-bold text-[#1E293B] tracking-tight leading-tight">
              分类总览
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1.5">按项目类别分组，墙纸视图一目了然</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg hover:bg-[#60A5FA] transition-colors cursor-pointer shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
              <Plus className="w-3.5 h-3.5" /> 新建任务
            </motion.button>
          </div>
        </motion.div>

        {/* ── Overview Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
          <OverviewCard icon={Inbox} label="项目总数" value={stats.total} color="#64748B" bg="#F1F5F9" delay={0} />
          <OverviewCard icon={TrendingUp} label="进行中" value={stats.active} color="#3B82F6" bg="#EFF6FF" delay={0.05} />
          <OverviewCard icon={CheckCircle2} label="已完成" value={stats.completed} color="#10B981" bg="#ECFDF5" delay={0.1} />
          <OverviewCard icon={AlertTriangle} label="已逾期" value={stats.overdue} color="#F43F5E" bg="#FFF1F2" delay={0.15} />
        </div>

        {/* ── Wallpaper Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
          {allCategories.map((cat, idx) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              tasks={grouped[cat.id] || []}
              index={idx}
            />
          ))}
        </div>

        {/* ── Empty State ── */}
        {tasks.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center py-20">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
              <Inbox className="w-16 h-16 text-[#CBD5E1] mb-4" />
            </motion.div>
            <p className="text-xl font-semibold text-[#64748B]">还没有项目</p>
            <p className="text-sm text-[#94A3B8] mt-1">创建第一个项目，开始按分类管理</p>
            <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/")}
              className="mt-4 flex items-center gap-1.5 px-5 py-2.5 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg cursor-pointer shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
              <Plus className="w-4 h-4" /> 创建第一个项目
            </motion.button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
