import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox, TrendingUp, Check, AlertTriangle, Search, Bell, X,
  Plus, Pencil, Trash2, History, Calendar, Clock, ChevronDown,
  ChevronRight, OctagonX, Paperclip, FileText, SlidersHorizontal,
  GripVertical, Download, Upload, Undo2, Eye, RefreshCw,
} from "lucide-react";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task, FilterType } from "@/types";
import { useTaskManager } from "@/hooks/useTaskManager";
import { useDailyDigest } from "@/hooks/useDailyDigest";
import Layout from "@/components/Layout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function isOverdue(task: Task): boolean {
  return task.status === "overdue";
}

function getStatusBadge(task: Task): { text: string; bg: string; textColor: string } {
  if (task.status === "terminated") return { text: "已终止", bg: "#F1F5F9", textColor: "#64748B" };
  if (task.status === "completed") return { text: "已完成", bg: "#ECFDF5", textColor: "#059669" };
  if (task.status === "overdue") return { text: "已逾期", bg: "#FFF1F2", textColor: "#E11D48" };
  const today = new Date(getToday());
  const deadline = new Date(task.deadline);
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 3 && diffDays >= 0) return { text: "即将到期", bg: "#FFFBEB", textColor: "#D97706" };
  return { text: "进行中", bg: "#EFF6FF", textColor: "#2563EB" };
}

function getBorderColor(task: Task): string {
  if (task.status === "terminated") return "#94A3B8";
  if (task.status === "completed") return "#10B981";
  if (task.status === "overdue") return "#F43F5E";
  const today = new Date(getToday());
  const deadline = new Date(task.deadline);
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 3 && diffDays >= 0) return "#F59E0B";
  return "#3B82F6";
}

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

function isDueSoon(task: Task): boolean {
  if (task.status === "completed") return false;
  const today = new Date(getToday());
  const deadline = new Date(task.deadline);
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 3;
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ─────────────── Stats Card ─────────────── */
function StatsCard({
  icon: Icon, iconColor, iconBg, value, label, delay,
}: {
  icon: typeof Inbox;
  iconColor: string;
  iconBg: string;
  value: number;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
      className="bg-white border border-[#E2E8F0] rounded-xl p-5 cursor-default transition-shadow duration-200"
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: iconBg }}>
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <p className="text-[1.875rem] font-bold text-[#1E293B] leading-tight tabular-nums">{value}</p>
      <p className="text-xs text-[#94A3B8] mt-0.5">{label}</p>
    </motion.div>
  );
}

/* ─────────────── Delete Confirmation ─────────────── */
function DeleteModal({ task, open, onClose, onConfirm }: {
  task: Task | null; open: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[400px] w-[90vw] p-6 bg-white rounded-2xl shadow-[0_16px_32px_rgba(0,0,0,0.15)] border-0 gap-0">
        <div className="flex flex-col items-center text-center">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 rounded-full bg-[#FFF1F2] flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5 text-[#F43F5E]" />
          </motion.div>
          <h3 className="text-xl font-semibold text-[#1E293B] mb-2">删除任务？</h3>
          <p className="text-sm text-[#64748B] mb-6">
            这将永久删除「{task?.name}」及其所有进度历史记录。
          </p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-5 py-2 bg-[#F1F5F9] text-[#334155] text-sm font-medium rounded-lg h-10 hover:bg-[#E2E8F0] transition-colors cursor-pointer">
              取消
            </button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onConfirm}
              className="px-5 py-2 bg-[#F43F5E] text-white text-sm font-semibold rounded-lg h-10 hover:bg-[#E11D48] transition-colors cursor-pointer">
              确认删除
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── Sortable Task Card Wrapper ─────────────── */
function SortableTaskCard({ task, index, allCategories, onToggleComplete, onEdit, onDelete, onHistory, onDeadlineClick, onNameClick }: {
  task: Task;
  index: number;
  allCategories: { id: string; name: string; color: string }[];
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onHistory: (task: Task) => void;
  onDeadlineClick: (task: Task) => void;
  onNameClick: (task: Task) => void;
}) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const badge = getStatusBadge(task);
  const borderColor = getBorderColor(task);
  const completed = task.status === "completed";
  const terminated = task.status === "terminated";

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div layout
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0 }}
        transition={{ opacity: { duration: 0.35 }, y: { duration: 0.35 }, layout: { duration: 0.3 }, delay: index < 10 ? index * 0.08 : 0 }}
        whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
        id={`task-card-${task.id}`}
        className={`bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#CBD5E1] transition-all duration-200`}
        style={{ borderLeftWidth: "3px", borderLeftColor: borderColor }}
      >
        {/* Row 1: Drag Handle + Checkbox + Name + Badge */}
        <div className="flex items-start gap-2">
          <div {...attributes} {...listeners}
            className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 rounded text-[#CBD5E1] hover:text-[#94A3B8] hover:bg-[#F1F5F9] transition-colors mt-0.5">
            <GripVertical className="w-4 h-4" />
          </div>
          <button onClick={() => !terminated && onToggleComplete(task.id)}
            className={`shrink-0 mt-0.5 ${terminated ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`} disabled={terminated}>
            <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all duration-200 ${
              completed ? "bg-[#3B82F6] border-[#3B82F6]" : "bg-white border-[#CBD5E1] hover:border-[#60A5FA]"}`}>
              {completed && (
                <motion.svg initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2, delay: 0.1 }} width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <motion.path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2, delay: 0.1 }} />
                </motion.svg>
              )}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => onNameClick(task)}
                className={`text-sm font-semibold truncate text-left cursor-pointer ${completed || terminated ? "line-through text-[#94A3B8] opacity-70" : "text-[#334155] hover:text-[#3B82F6] transition-colors"}`}>
                <span className="font-mono text-xs text-[#94A3B8] mr-1">#{index + 1}</span>
                {task.name}
              </button>
              {(() => {
                const catInfo = allCategories.find((c) => c.id === task.category);
                if (!catInfo) return null;
                return <span className="shrink-0 px-2 py-0.5 rounded-full text-[0.625rem] font-medium whitespace-nowrap" style={{ backgroundColor: catInfo.color + "20", color: catInfo.color }}>{catInfo.name}</span>;
              })()}
              <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap" style={{ backgroundColor: badge.bg, color: badge.textColor }}>{badge.text}</span>
            </div>
          </div>
        </div>

        {/* Row 2: Dates */}
        <div className="flex items-center gap-3 sm:gap-4 mt-2 ml-[28px] flex-wrap">
          <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
            <Calendar className="w-3 h-3" />
            <span className="font-mono">创建: {formatDate(task.createdDate)} {getWeekday(task.createdDate)}</span>
          </div>
          <div className={`flex items-center gap-1 text-xs ${isOverdue(task) ? "text-[#F43F5E]" : isDueSoon(task) ? "text-[#D97706]" : "text-[#94A3B8]"}`}>
            <Clock className="w-3 h-3" />
            {isOverdue(task) && <AlertTriangle className="w-3 h-3" />}
            {isDueSoon(task) && !isOverdue(task) && <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />}
            <button onClick={(e) => { e.stopPropagation(); onDeadlineClick(task); }}
              className="font-mono hover:underline hover:text-[#3B82F6] transition-colors cursor-pointer"
              title="点击修改截止日期">
              截止: {formatDate(task.deadline)} {getWeekday(task.deadline)}
            </button>
          </div>
          {isDueSoon(task) && !isOverdue(task) && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] text-[0.625rem] font-semibold border border-[#FEF3C7]">即将到期</span>
          )}
        </div>

        {/* Row 3: Progress + Actions */}
        <div className="flex items-end justify-between mt-3 ml-[28px] gap-2">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#94A3B8] hidden sm:inline">进度</span>
              <div className="w-[80px] sm:w-[120px] md:w-[160px] h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                <motion.div
                  key={`pb-${task.id}-${task.progress}`}
                  initial={{ width: 0 }} animate={{ width: `${task.progress}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: terminated ? "#94A3B8" : completed ? "#10B981" : task.status === "overdue" ? "#FB7185" : "#3B82F6" }} />
              </div>
              <span className="text-xs font-semibold text-[#475569] tabular-nums">{task.progress}%</span>
            </div>
            {task.history.length > 0 && (
              <div className="flex flex-col gap-1 mt-2">
                {[...task.history].reverse().slice(0, 3).map((entry) => (
                  <div key={entry.id} className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                    <History className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono text-[#94A3B8] shrink-0">{formatDateTime(entry.timestamp)}</span>
                    <span className="text-[#CBD5E1] shrink-0">—</span>
                    <span className="text-[#64748B] truncate">{entry.note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(task)} className="w-8 h-8 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#3B82F6] hover:bg-[#EFF6FF] transition-all duration-150 cursor-pointer" title="编辑">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onHistory(task)} className="w-8 h-8 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#3B82F6] hover:bg-[#EFF6FF] transition-all duration-150 cursor-pointer" title="查看历史">
              <History className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(task)} className="w-8 h-8 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#F43F5E] hover:bg-[#FFF1F2] transition-all duration-150 cursor-pointer" title="删除">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════ MAIN DASHBOARD ═══════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    tasks, addTask, updateTask, deleteTask, toggleComplete,
    terminateTask, restoreTask, deleteHistoryEntry, allCategories, addCustomCategory,
    updateCategory, deleteCategory,
    addAttachment, removeAttachment, updateAttachment, exportData, importData, clearAllData,
    reorderTasks, loading, error, refreshData,
  } = useTaskManager();
  const digest = useDailyDigest();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "deadline" | "progress-high" | "progress-low">("newest");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [digestDismissed, setDigestDismissed] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskData, setDeleteTaskData] = useState<Task | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Modal form
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("new-product");
  const [formCreated, setFormCreated] = useState(getToday());
  const [formDeadline, setFormDeadline] = useState("");
  const [formProgress, setFormProgress] = useState<number>(0);
  const [formNote, setFormNote] = useState("");
  const [formErrors, setFormErrors] = useState<{ name?: string; deadline?: string }>({});
  const [showHistory, setShowHistory] = useState(false);

  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showCategoryManageDialog, setShowCategoryManageDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6");

  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [showTerminated, setShowTerminated] = useState(false);

  // Clear data confirmation
  const [clearDataOpen, setClearDataOpen] = useState(false);
  const [clearDataConfirmText, setClearDataConfirmText] = useState("");
  const [clearDataClearing, setClearDataClearing] = useState(false);

  // Attachment preview
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; dataUrl: string } | null>(null);

  // Inline deadline editing
  const [inlineDeadlineTask, setInlineDeadlineTask] = useState<Task | null>(null);
  const [inlineDeadlineValue, setInlineDeadlineValue] = useState("");

  // Right-side drawer for task history
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);
  const handleNameClick = useCallback((task: Task) => {
    setDrawerTask((prev) => prev?.id === task.id ? null : task);
  }, []);

  // Delete history entry confirmation
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [deleteEntryTaskId, setDeleteEntryTaskId] = useState<string>("");
  const confirmDeleteEntry = useCallback(async () => {
    if (!deleteEntryId || !deleteEntryTaskId) return;
    await deleteHistoryEntry(deleteEntryTaskId, deleteEntryId);
    setDeleteEntryId(null);
    setDeleteEntryTaskId("");
    // Refresh drawer task with updated history
    const updated = tasks.find((t) => t.id === deleteEntryTaskId);
    if (updated) setDrawerTask({ ...updated });
  }, [deleteEntryId, deleteEntryTaskId, deleteHistoryEntry, tasks]);

  const openInlineDeadline = useCallback((task: Task) => {
    setInlineDeadlineTask(task);
    setInlineDeadlineValue(task.deadline);
  }, []);

  const handleInlineDeadlineSave = useCallback(() => {
    if (inlineDeadlineTask && inlineDeadlineValue && inlineDeadlineValue !== inlineDeadlineTask.deadline) {
      updateTask(inlineDeadlineTask.id, { deadline: inlineDeadlineValue });
      toast.success("截止日期已更新");
    }
    setInlineDeadlineTask(null);
    setInlineDeadlineValue("");
  }, [inlineDeadlineTask, inlineDeadlineValue, updateTask]);

  const handleRestore = useCallback((task: Task) => {
    restoreTask(task.id);
    toast.success("项目已恢复");
  }, [restoreTask]);

  const handleClearData = useCallback(async () => {
    setClearDataClearing(true);
    try {
      await clearAllData();
      toast.success("所有数据已清除");
      setClearDataOpen(false);
      setClearDataConfirmText("");
    } finally {
      setClearDataClearing(false);
    }
  }, [clearAllData]);

  // Hash navigation
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]taskId=([^&]+)/);
    if (match) {
      const taskId = match[1];
      setHighlightedTaskId(taskId);
      setTimeout(() => {
        const el = document.getElementById(`task-card-${taskId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
      const timeout = setTimeout(() => setHighlightedTaskId(null), 4000);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "active").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdueCount = tasks.filter((t) => t.status === "overdue").length;
    return { total, inProgress, completed, overdue: overdueCount };
  }, [tasks]);

  const digestCounts = useMemo(() => {
    const todayStr = getToday();
    const dueToday = tasks.filter((t) => t.deadline === todayStr && t.status !== "completed").length;
    const overdueCount = tasks.filter((t) => t.status === "overdue").length;
    return { dueToday, overdue: overdueCount };
  }, [tasks]);

  const terminatedTasks = useMemo(() => tasks.filter((t) => t.status === "terminated"), [tasks]);

  // Filtered & sorted
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (!showTerminated) result = result.filter((t) => t.status !== "terminated");
    if (filter === "in-progress") result = result.filter((t) => t.status === "active");
    else if (filter === "completed") result = result.filter((t) => t.status === "completed");
    else if (filter === "overdue") result = result.filter((t) => t.status === "overdue");
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "newest": result.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()); break;
      case "oldest": result.sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()); break;
      case "deadline": result.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()); break;
      case "progress-high": result.sort((a, b) => b.progress - a.progress); break;
      case "progress-low": result.sort((a, b) => a.progress - b.progress); break;
    }
    return result;
  }, [tasks, filter, search, sortBy, showTerminated]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredTasks.findIndex((t) => t.id === active.id);
    const newIndex = filteredTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(filteredTasks, oldIndex, newIndex);
    const reorderedIds = newOrder.map((t) => t.id);
    reorderTasks(reorderedIds);
  }, [filteredTasks, reorderTasks]);

  // Modal helpers
  const getDefaultDeadline = (createdDate: string) => {
    const d = new Date(createdDate + "T00:00:00");
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  };

  const openNewTask = () => {
    setEditingTask(null);
    setFormName("");
    setFormCategory("new-product");
    const today = getToday();
    setFormCreated(today);
    setFormDeadline(getDefaultDeadline(today));
    setFormProgress(0);
    setFormNote("");
    setFormErrors({});
    setShowHistory(false);
    setModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setFormName(task.name);
    setFormCategory(task.category);
    setFormCreated(task.createdDate);
    setFormDeadline(task.deadline);
    setFormProgress(task.progress);
    setFormNote("");
    setFormErrors({});
    setShowHistory(false);
    setModalOpen(true);
  };

  const handleSaveTask = () => {
    const newErrors: { name?: string; deadline?: string } = {};
    if (!formName.trim()) newErrors.name = "请输入项目名称";
    if (!formDeadline) newErrors.deadline = "请选择截止日期";
    if (formDeadline && formCreated && formDeadline < formCreated) {
      newErrors.deadline = "截止日期不能早于创建日期";
    }
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    if (editingTask) {
      let finalProgress = formProgress;
      const hasNote = formNote.trim() !== "";
      const progressUnchanged = formProgress === editingTask.progress;
      if (hasNote && progressUnchanged) {
        finalProgress = Math.min(100, editingTask.progress + 5);
      }
      updateTask(editingTask.id, {
        name: formName.trim(),
        category: formCategory,
        createdDate: formCreated,
        deadline: formDeadline,
        progress: finalProgress,
        note: formNote,
      });
      toast.success("任务已更新");
    } else {
      addTask({
        name: formName.trim(),
        category: formCategory,
        createdDate: formCreated,
        deadline: formDeadline,
        progress: formProgress,
        note: formNote,
      });
      toast.success("任务已创建");
    }
    setModalOpen(false);
  };

  const handleDelete = (task: Task) => {
    setDeleteTaskData(task);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTaskData) {
      deleteTask(deleteTaskData.id);
      setDeleteOpen(false);
      setDeleteTaskData(null);
      toast.success("任务已删除");
    }
  };

  const handleTerminate = useCallback((task: Task) => {
    terminateTask(task.id);
    setModalOpen(false);
    setEditingTask(null);
    toast.success("项目已终止");
  }, [terminateTask]);

  // Export / Import handlers
  const handleExport = useCallback(() => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `项目进度数据_${getToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("数据已导出");
  }, [exportData]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const ok = await importData(text);
      if (ok) {
        toast.success("数据导入成功！数据已同步到云端。");
      } else {
        toast.error("导入失败：文件格式不正确");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [importData]);

  const showDigest = digest.enabled && !digestDismissed && (digestCounts.dueToday > 0 || digestCounts.overdue > 0);

  const filterCounts = useMemo(() => ({
    all: tasks.length,
    "in-progress": tasks.filter((t) => t.status === "active").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
  }), [tasks]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F8FAFC] gap-4">
        <div className="w-10 h-10 border-4 border-[#E2E8F0] border-t-[#3B82F6] rounded-full animate-spin" />
        <p className="text-sm text-[#64748B] font-medium">正在加载数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F8FAFC] gap-4 p-8">
        <div className="w-16 h-16 rounded-full bg-[#FFF1F2] flex items-center justify-center text-2xl">⚠️</div>
        <h2 className="text-lg font-bold text-[#1E293B]">数据加载失败</h2>
        <p className="text-sm text-[#64748B] text-center max-w-sm">{error}</p>
        <button
          onClick={() => refreshData()}
          className="px-5 py-2.5 bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-[#2563EB] transition-colors cursor-pointer"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <Layout
      dailyDigestEnabled={digest.enabled}
      onToggleDigest={digest.toggleEnabled}
      onNewTask={openNewTask}
      onExport={handleExport}
      onImport={handleImport}
    >
      {/* Hidden file input for import */}
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />

      <div className="max-w-[1280px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 flex gap-4 md:gap-6">
        {/* Sidebar */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="hidden lg:block w-[220px] xl:w-[240px] shrink-0 bg-white border-r border-[#E2E8F0] min-h-[calc(100dvh-64px-64px)] sticky top-16 p-4 xl:p-5"
        >
          <p className="text-xs text-[#94A3B8] uppercase tracking-widest mb-3 font-medium">筛选</p>
          <div className="flex flex-col gap-1">
            {([{ k: "all" as FilterType, l: "全部任务" }, { k: "in-progress" as FilterType, l: "进行中" }, { k: "completed" as FilterType, l: "已完成" }, { k: "overdue" as FilterType, l: "已逾期" }]).map(({ k, l }, i) => (
              <motion.button key={k} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
                onClick={() => setFilter(k)}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all duration-150 cursor-pointer ${
                  filter === k
                    ? k === "overdue" ? "bg-[#FFF1F2] text-[#E11D48] font-medium border-l-2 border-[#F43F5E]"
                    : "bg-[#EFF6FF] text-[#2563EB] font-medium border-l-2 border-[#3B82F6]"
                    : k === "overdue" ? "text-[#F43F5E] hover:bg-[#FFF1F2]" : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#334155]"
                }`}
              >
                <span>{l}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] tabular-nums">{filterCounts[k]}</span>
              </motion.button>
            ))}
          </div>

          <p className="text-xs text-[#94A3B8] uppercase tracking-widest mt-8 mb-3 font-medium">概览</p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm"><span className="text-[#64748B]">任务总数</span><span className="font-semibold text-[#334155] text-base tabular-nums">{stats.total}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#64748B]">今日到期</span><span className={`font-semibold text-base tabular-nums ${digestCounts.dueToday > 0 ? "text-[#F59E0B]" : "text-[#334155]"}`}>{digestCounts.dueToday}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#64748B]">已逾期</span><span className={`font-semibold text-base tabular-nums ${stats.overdue > 0 ? "text-[#F43F5E]" : "text-[#334155]"}`}>{stats.overdue}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#64748B]">完成率</span><span className="font-semibold text-[#3B82F6] text-base tabular-nums">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span></div>
          </div>

          <p className="text-xs text-[#94A3B8] uppercase tracking-widest mt-8 mb-3 font-medium">状态图例</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[0.8125rem] text-[#64748B]"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> 正常进行</div>
            <div className="flex items-center gap-2 text-[0.8125rem] text-[#64748B]"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> 即将到期</div>
            <div className="flex items-center gap-2 text-[0.8125rem] text-[#64748B]"><span className="w-2 h-2 rounded-full bg-[#F43F5E]" /> 已逾期</div>
            <div className="flex items-center gap-2 text-[0.8125rem] text-[#64748B]"><span className="w-2 h-2 rounded-full bg-[#10B981]" /> 已完成</div>
          </div>

          <p className="text-xs text-[#94A3B8] uppercase tracking-widest mt-8 mb-3 font-medium">操作</p>
          <button onClick={() => setShowCategoryManageDialog(true)} className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-[#3B82F6] hover:bg-[#EFF6FF] transition-colors cursor-pointer">
            <SlidersHorizontal className="w-4 h-4" /> 管理分类颜色
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#334155] transition-colors cursor-pointer">
            <Download className="w-4 h-4" /> 导出数据
          </button>
          <button onClick={handleImport} className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#334155] transition-colors cursor-pointer">
            <Upload className="w-4 h-4" /> 导入数据
          </button>
          <button onClick={() => setClearDataOpen(true)} className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-[#F43F5E] hover:bg-[#FFF1F2] transition-colors cursor-pointer mt-1">
            <Trash2 className="w-4 h-4" /> 清除全部数据
          </button>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Daily Digest Banner */}
          <AnimatePresence>
            {showDigest && (
              <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4, delay: 0.5 }}
                className="mb-6 flex items-center gap-3 px-5 py-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl">
                <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
                  <Bell className="w-[18px] h-[18px] text-[#3B82F6] shrink-0" />
                </motion.div>
                <p className="text-sm text-[#1D4ED8] flex-1">
                  今日任务摘要 —{" "}
                  <span className="font-semibold text-[#2563EB]">{digestCounts.dueToday} 个任务</span> 今日到期，
                  <span className="font-semibold text-[#2563EB]">{digestCounts.overdue} 个已逾期</span>
                </p>
                <button onClick={() => setFilter("overdue")} className="text-sm font-medium text-[#3B82F6] hover:underline cursor-pointer shrink-0">查看详情</button>
                <button onClick={() => setDigestDismissed(true)} className="p-1 cursor-pointer shrink-0"><X className="w-4 h-4 text-[#3B82F6] hover:text-[#2563EB]" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <StatsCard icon={Inbox} iconColor="#64748B" iconBg="#F1F5F9" value={stats.total} label="任务总数" delay={0.1} />
            <StatsCard icon={TrendingUp} iconColor="#3B82F6" iconBg="#EFF6FF" value={stats.inProgress} label="进行中" delay={0.2} />
            <StatsCard icon={Check} iconColor="#10B981" iconBg="#ECFDF5" value={stats.completed} label="已完成" delay={0.3} />
            <StatsCard icon={AlertTriangle} iconColor="#F43F5E" iconBg="#FFF1F2" value={stats.overdue} label="已逾期" delay={0.4} />
          </div>

          {/* Mobile Filter Pills */}
          <div className="lg:hidden flex gap-1.5 sm:gap-2 mb-3 sm:mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {[{ k: "all" as FilterType, l: "全部" }, { k: "in-progress" as FilterType, l: "进行中" }, { k: "completed" as FilterType, l: "已完成" }, { k: "overdue" as FilterType, l: "已逾期" }].map(({ k, l }) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  filter === k ? "bg-[#EFF6FF] text-[#2563EB]" : "bg-white text-[#64748B] border border-[#E2E8F0]"
                }`}>
                {l} <span className="tabular-nums">({filterCounts[k]})</span>
              </button>
            ))}
          </div>

          {/* Search & Sort Bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div className="relative flex-1 md:max-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索任务名称..."
                className="h-10 pl-10 pr-4 rounded-lg bg-[#F1F5F9] border-0 text-sm text-[#64748B] placeholder:text-[#94A3B8] focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all" />
            </div>
            <div className="relative">
              <button onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1.5 h-10 px-4 bg-[#F1F5F9] rounded-lg text-sm text-[#64748B] hover:bg-[#E2E8F0] transition-colors cursor-pointer">
                <ChevronDown className="w-3.5 h-3.5" /> 排序
              </button>
              <AnimatePresence>
                {showSortDropdown && (<>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
                    className="absolute right-0 top-12 z-20 bg-white rounded-xl border border-[#E2E8F0] shadow-[0_8px_24px_rgba(0,0,0,0.1)] py-1 min-w-[180px]">
                    {[
                      { key: "newest" as const, label: "最新优先" },
                      { key: "oldest" as const, label: "最早优先" },
                      { key: "deadline" as const, label: "按截止日期" },
                      { key: "progress-high" as const, label: "进度高→低" },
                      { key: "progress-low" as const, label: "进度低→高" },
                    ].map((opt) => (
                      <button key={opt.key} onClick={() => { setSortBy(opt.key); setShowSortDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${sortBy === opt.key ? "text-[#2563EB] font-medium bg-[#EFF6FF]" : "text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                </>)}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Task List */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredTasks.length === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-16">
                      {search || filter !== "all" ? (<>
                        <Search className="w-12 h-12 text-[#CBD5E1] mb-4" />
                        <p className="text-lg font-semibold text-[#64748B]">没有匹配的任务</p>
                        <p className="text-sm text-[#94A3B8] mt-1">试试调整搜索条件或筛选器</p>
                        <button onClick={() => { setSearch(""); setFilter("all"); }} className="mt-3 text-sm font-medium text-[#3B82F6] hover:underline cursor-pointer">清除筛选</button>
                      </>) : (<>
                        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                          <Inbox className="w-16 h-16 text-[#CBD5E1] mb-4" />
                        </motion.div>
                        <p className="text-xl font-semibold text-[#64748B]">还没有任务</p>
                        <p className="text-sm text-[#94A3B8] mt-1">创建第一个任务开始管理吧</p>
                        <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={openNewTask}
                          className="mt-4 flex items-center gap-1.5 px-5 py-2.5 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg cursor-pointer">
                          <Plus className="w-4 h-4" /> 创建任务
                        </motion.button>
                      </>)}
                    </motion.div>
                  ) : (
                    filteredTasks.map((task, index) => {
                      const borderColor = getBorderColor(task);

                      return (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          index={index}
                          allCategories={allCategories}
                          onToggleComplete={toggleComplete}
                          onEdit={openEditTask}
                          onDelete={handleDelete}
                          onHistory={(t) => navigate(`/history?taskId=${t.id}`)}
                          onDeadlineClick={openInlineDeadline}
                          onNameClick={handleNameClick}
                        />
                      );
                    })
                  )}
                </AnimatePresence>

                {/* Terminated Projects */}
                {terminatedTasks.length > 0 && (
                  <div className="mt-4">
                    <button onClick={() => setShowTerminated(!showTerminated)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F1F5F9] hover:border-[#CBD5E1] transition-all duration-200 cursor-pointer w-full">
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showTerminated ? "rotate-90" : ""}`} />
                      <span className="font-medium">已终止项目</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#E2E8F0] text-[#64748B] tabular-nums">{terminatedTasks.length}</span>
                    </button>
                    <AnimatePresence>
                      {showTerminated && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                          <div className="flex flex-col gap-3 mt-3">
                            {terminatedTasks.map((task, index) => (
                              <motion.div key={task.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.08 }}
                                className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 opacity-70"
                                style={{ borderLeftWidth: "3px", borderLeftColor: "#94A3B8" }}>
                                <div className="flex items-center gap-4">
                                  <span className="font-mono text-xs text-[#94A3B8]">#{index + 1}</span>
                                  <span className="flex-1 text-sm font-semibold text-[#64748B] line-through truncate">{task.name}</span>
                                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#64748B]">已终止</span>
                                  <button onClick={() => handleRestore(task)}
                                    className="w-8 h-8 flex items-center justify-center rounded-md text-[#F59E0B] hover:text-[#D97706] hover:bg-[#FFFBEB] cursor-pointer transition-all" title="恢复项目">
                                    <Undo2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => openEditTask(task)} className="w-8 h-8 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#3B82F6] cursor-pointer" title="编辑"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDelete(task)} className="w-8 h-8 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#F43F5E] cursor-pointer" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Task Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) setModalOpen(false); }}>
        <DialogContent className="max-w-[560px] w-[90vw] max-h-[85vh] overflow-y-auto p-8 bg-white rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.15)] border-0 gap-0">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-[1.875rem] font-semibold text-[#1E293B] tracking-tight">
              {editingTask ? "编辑任务" : "新建任务"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {/* Project Name */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <label className="block text-[0.8125rem] font-medium text-[#64748B] mb-1">项目名称 <span className="text-[#F43F5E]">*</span></label>
              <Input value={formName} onChange={(e) => { setFormName(e.target.value); if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="输入项目名称..."
                className={`h-11 rounded-lg px-4 text-sm bg-[#F1F5F9] border-0 focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all ${formErrors.name ? "ring-2 ring-[#F43F5E]" : ""}`} />
              {formErrors.name && <p className="text-xs text-[#F43F5E] mt-1">{formErrors.name}</p>}
            </motion.div>

            {/* Category */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[0.8125rem] font-medium text-[#64748B]">分类 <span className="text-[#F43F5E]">*</span></label>
                <button onClick={() => setShowCategoryDialog(true)}
                  className="text-[0.6875rem] text-[#3B82F6] hover:text-[#2563EB] font-medium cursor-pointer transition-colors" type="button">+ 新建分类</button>
                <button onClick={() => setShowCategoryManageDialog(true)}
                  className="text-[0.6875rem] text-[#64748B] hover:text-[#334155] font-medium cursor-pointer transition-colors" type="button">管理分类</button>
              </div>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v)}>
                <SelectTrigger className="h-11 rounded-lg px-4 text-sm bg-[#F1F5F9] border-0 focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all w-full">
                  <SelectValue placeholder="选择分类..." />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />{cat.name}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* Date Row */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[0.8125rem] font-medium text-[#64748B] mb-1">创建日期</label>
                <Input type="date" value={formCreated} onChange={(e) => { setFormCreated(e.target.value); if (!editingTask) setFormDeadline(getDefaultDeadline(e.target.value)); }}
                  className="h-11 rounded-lg px-4 text-sm bg-[#F1F5F9] border-0 focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all" />
              </div>
              <div className="flex-1">
                <label className="block text-[0.8125rem] font-medium text-[#64748B] mb-1">截止日期 <span className="text-[#F43F5E]">*</span></label>
                <Input type="date" value={formDeadline} onChange={(e) => { setFormDeadline(e.target.value); if (formErrors.deadline) setFormErrors((p) => ({ ...p, deadline: undefined })); }}
                  className={`h-11 rounded-lg px-4 text-sm bg-[#F1F5F9] border-0 focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all ${formErrors.deadline ? "ring-2 ring-[#F43F5E]" : ""}`} />
                {formErrors.deadline && <p className="text-xs text-[#F43F5E] mt-1">{formErrors.deadline}</p>}
              </div>
            </motion.div>

            {/* Progress Slider */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[0.8125rem] font-medium text-[#64748B]">进度</label>
                <span className="px-3 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-semibold tabular-nums">{formProgress}%</span>
              </div>
              <Slider value={[formProgress]} onValueChange={(v) => setFormProgress(v[0])} max={100} step={1} className="w-full" />
            </motion.div>

            {/* Progress Note */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <label className="block text-[0.8125rem] font-medium text-[#64748B] mb-1">更新备注 (可选)</label>
              <Textarea value={formNote} onChange={(e) => setFormNote(e.target.value.slice(0, 200))}
                placeholder="描述本次更新的内容..."
                rows={3} className="rounded-lg px-4 py-3 text-sm bg-[#F1F5F9] border-0 focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all resize-none" />
              <p className="text-xs text-[#94A3B8] mt-1 text-right tabular-nums">{formNote.length}/200</p>
            </motion.div>

            {/* History */}
            {editingTask && editingTask.history.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
                <button onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1 text-sm text-[#64748B] hover:text-[#334155] transition-colors cursor-pointer">
                  {showHistory ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  查看更新历史 ({editingTask.history.length} 条记录)
                </button>
                <AnimatePresence>
                  {showHistory && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                      <ScrollArea className="max-h-[200px] mt-2">
                        <div className="flex flex-col gap-2">
                          {[...editingTask.history].reverse().map((entry) => (
                            <div key={entry.id} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded-md bg-[#F8FAFC]">
                              <span className="font-mono text-[#94A3B8] shrink-0 min-w-[130px]">{formatDateTime(entry.timestamp)}</span>
                              <div className="w-12 h-1 bg-[#E2E8F0] rounded-full overflow-hidden shrink-0">
                                <div className="h-full bg-[#3B82F6] rounded-full transition-all duration-500" style={{ width: `${entry.progress}%` }} />
                              </div>
                              <span className="font-mono text-[#475569] font-semibold shrink-0 w-8 tabular-nums">{entry.progress}%</span>
                              <span className="text-[#64748B] truncate">{entry.note}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Attachments */}
            {editingTask && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#64748B]">附件</label>
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#CBD5E1] rounded-lg text-xs text-[#64748B] hover:border-[#94A3B8] hover:bg-[#F8FAFC] transition-all cursor-pointer w-fit">
                    <Paperclip className="w-3.5 h-3.5" /> 上传文件
                    <input type="file" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file || !editingTask) return;
                      await addAttachment(editingTask.id, file); e.target.value = "";
                    }} />
                  </label>
                  {editingTask.attachments && editingTask.attachments.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      {editingTask.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 py-2 px-3 rounded-md bg-[#F8FAFC] text-xs border border-[#E2E8F0] group hover:border-[#CBD5E1] transition-all">
                          <FileText className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                          <span className="flex-1 truncate text-[#475569] font-medium">{att.name}</span>
                          <span className="text-[#94A3B8] font-mono text-[0.625rem] shrink-0 tabular-nums">{(att.size / 1024).toFixed(1)} KB</span>
                          <button onClick={() => setPreviewAttachment({ name: att.name, dataUrl: att.dataUrl })}
                            className="w-6 h-6 flex items-center justify-center rounded text-[#3B82F6] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all cursor-pointer shrink-0" title="预览">
                            <Eye className="w-3 h-3" />
                          </button>
                          <label className="w-6 h-6 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#3B82F6] hover:bg-[#EFF6FF] transition-all cursor-pointer shrink-0" title="替换">
                            <RefreshCw className="w-3 h-3" />
                            <input type="file" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file || !editingTask) return;
                              await updateAttachment(editingTask.id, att.id, file); e.target.value = "";
                            }} />
                          </label>
                          <button onClick={() => removeAttachment(editingTask.id, att.id)}
                            className="w-6 h-6 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#F43F5E] hover:bg-[#FFF1F2] transition-all cursor-pointer shrink-0" title="删除">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Footer Buttons */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="flex justify-between items-center mt-4">
              {editingTask && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => handleTerminate(editingTask)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#FFF1F2] text-[#F43F5E] text-sm font-semibold rounded-lg h-10 hover:bg-[#FFE4E6] transition-colors cursor-pointer">
                  <OctagonX className="w-4 h-4" /> 终止项目
                </motion.button>
              )}
              <div className="flex justify-end gap-3 ml-auto">
                <button onClick={() => setModalOpen(false)}
                  className="px-5 py-2 bg-[#F1F5F9] text-[#334155] text-sm font-medium rounded-lg h-10 hover:bg-[#E2E8F0] transition-colors cursor-pointer">取消</button>
                <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={handleSaveTask}
                  className="px-5 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg h-10 hover:bg-[#60A5FA] transition-colors shadow-[0_4px_12px_rgba(59,130,246,0.3)] cursor-pointer">保存</motion.button>
              </div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-[400px] w-[90vw] p-6 bg-white rounded-2xl shadow-[0_16px_32px_rgba(0,0,0,0.15)] border-0 gap-0">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold text-[#1E293B]">新建分类</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#64748B] mb-1">分类名称</label>
              <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="输入分类名称..."
                className="h-11 rounded-lg px-4 text-sm bg-[#F1F5F9] border-0 focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all" />
            </div>
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#64748B] mb-2">颜色</label>
              <div className="flex gap-2 flex-wrap">
                {["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"].map((color) => (
                  <button key={color} onClick={() => setNewCategoryColor(color)} type="button"
                    className={`w-8 h-8 rounded-full transition-all cursor-pointer ${newCategoryColor === color ? "ring-2 ring-offset-2 ring-[#334155]" : ""}`}
                    style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => { setShowCategoryDialog(false); setNewCategoryName(""); setNewCategoryColor("#3B82F6"); }}
                className="px-5 py-2 bg-[#F1F5F9] text-[#334155] text-sm font-medium rounded-lg h-10 hover:bg-[#E2E8F0] transition-colors cursor-pointer">取消</button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  if (!newCategoryName.trim()) return;
                  const newCat = await addCustomCategory(newCategoryName.trim(), newCategoryColor);
                  setFormCategory(newCat.id);
                  setShowCategoryDialog(false);
                  setNewCategoryName("");
                  setNewCategoryColor("#3B82F6");
                }}
                className="px-5 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg h-10 hover:bg-[#60A5FA] transition-colors cursor-pointer">添加</motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteModal task={deleteTaskData} open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={confirmDelete} />

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={clearDataOpen} onOpenChange={(open) => { if (!open) { setClearDataOpen(false); setClearDataConfirmText(""); } }}>
        <DialogContent className="max-w-[440px] w-[90vw] p-8 bg-white rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.15)] border-0 gap-0">
          <div className="flex flex-col items-center text-center">
            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="w-14 h-14 rounded-full bg-[#FFF1F2] flex items-center justify-center mb-5">
              <AlertTriangle className="w-7 h-7 text-[#F43F5E]" />
            </motion.div>
            <h3 className="text-[1.25rem] font-bold text-[#1E293B] mb-2">⚠️ 清除全部数据</h3>
            <div className="w-full bg-[#FFF1F2] border border-[#FECDD3] rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-[#BE123C] font-medium mb-2">此操作将执行以下不可逆操作：</p>
              <ul className="text-xs text-[#E11D48] space-y-1.5 list-disc list-inside">
                <li>删除所有 <strong>任务</strong> 及其进度历史</li>
                <li>删除所有 <strong>附件</strong> 文件</li>
                <li>删除所有 <strong>自定义分类</strong></li>
                <li>重置分类为默认值（新产品开发 / 日常订单跟进 / 临时项目）</li>
              </ul>
            </div>
            <p className="text-sm text-[#64748B] mb-5">
              请在下方输入 <span className="font-bold text-[#F43F5E]">确认删除</span> 以继续：
            </p>
            <Input
              value={clearDataConfirmText}
              onChange={(e) => setClearDataConfirmText(e.target.value)}
              placeholder='输入 "确认删除"'
              className="h-11 w-full rounded-lg px-4 text-sm bg-[#F1F5F9] border-0 focus:bg-white focus:ring-2 focus:ring-[#F43F5E]/20 focus:border-[#F43F5E] transition-all text-center"
            />
            <div className="flex gap-3 mt-6 w-full">
              <button onClick={() => { setClearDataOpen(false); setClearDataConfirmText(""); }}
                className="flex-1 px-5 py-2.5 bg-[#F1F5F9] text-[#334155] text-sm font-medium rounded-lg h-11 hover:bg-[#E2E8F0] transition-colors cursor-pointer">
                取消
              </button>
              <motion.button
                whileHover={{ scale: clearDataConfirmText === "确认删除" && !clearDataClearing ? 1.02 : 1 }}
                whileTap={{ scale: clearDataConfirmText === "确认删除" && !clearDataClearing ? 0.98 : 1 }}
                onClick={handleClearData}
                disabled={clearDataConfirmText !== "确认删除" || clearDataClearing}
                className={`flex-1 px-5 py-2.5 text-sm font-semibold rounded-lg h-11 transition-all cursor-pointer ${
                  clearDataConfirmText === "确认删除" && !clearDataClearing
                    ? "bg-[#F43F5E] text-white hover:bg-[#E11D48] shadow-[0_4px_12px_rgba(244,63,94,0.3)]"
                    : "bg-[#F1F5F9] text-[#CBD5E1] cursor-not-allowed"
                }`}>
                {clearDataClearing ? "清除中..." : "确认删除全部数据"}
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachment Preview Dialog */}
      <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-[800px] w-[90vw] max-h-[85vh] p-0 bg-white rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.15)] border-0 gap-0 overflow-hidden">
          {previewAttachment && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#64748B] shrink-0" />
                  <span className="text-sm font-semibold text-[#1E293B] truncate">{previewAttachment.name}</span>
                </div>
                <button onClick={() => setPreviewAttachment(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors cursor-pointer shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-[#F8FAFC] flex items-center justify-center min-h-[300px]">
                {previewAttachment.dataUrl.startsWith("data:image/") ? (
                  <img src={previewAttachment.dataUrl} alt={previewAttachment.name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm" />
                ) : previewAttachment.dataUrl.startsWith("data:application/pdf") ? (
                  <iframe src={previewAttachment.dataUrl}
                    className="w-full h-[60vh] rounded-lg border border-[#E2E8F0]" title={previewAttachment.name} />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <FileText className="w-16 h-16 text-[#CBD5E1]" />
                    <p className="text-sm text-[#64748B]">无法预览此文件类型</p>
                    <a href={previewAttachment.dataUrl} download={previewAttachment.name}
                      className="text-sm font-medium text-[#3B82F6] hover:underline cursor-pointer">
                      点击下载
                    </a>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E2E8F0]">
                <a href={previewAttachment.dataUrl} download={previewAttachment.name}
                  className="px-4 py-2 bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-[#2563EB] transition-colors cursor-pointer">
                  下载文件
                </a>
                <button onClick={() => setPreviewAttachment(null)}
                  className="px-4 py-2 bg-[#F1F5F9] text-[#334155] text-sm font-medium rounded-lg hover:bg-[#E2E8F0] transition-colors cursor-pointer">
                  关闭
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Categories Dialog */}
      <Dialog open={showCategoryManageDialog} onOpenChange={setShowCategoryManageDialog}>
        <DialogContent className="max-w-[500px] w-[90vw] max-h-[75vh] overflow-hidden p-6 bg-white rounded-2xl shadow-[0_16px_32px_rgba(0,0,0,0.15)] border-0 gap-0 flex flex-col">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold text-[#1E293B]">管理分类颜色</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#94A3B8] mb-4 -mt-2">点击色块调整标签颜色，更改实时生效</p>
          <ScrollArea className="max-h-[380px] flex-1 -mx-2 px-2">
            <div className="flex flex-col gap-2.5 pr-1">
              {allCategories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all">
                  <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: cat.color }}>
                    <div className="w-3 h-3 rounded-full bg-white/40" />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-[#334155]">{cat.name}</span>
                  <div className="flex gap-1.5 items-center">
                    {["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316", "#84CC16", "#64748B", "#0EA5E9", "#D946EF"].map((color) => (
                      <button key={color} onClick={() => updateCategory(cat.id, { color })} type="button"
                        className={`w-[22px] h-[22px] rounded-full transition-all cursor-pointer hover:scale-125 hover:shadow-md ${
                          cat.color === color ? "ring-[2.5px] ring-offset-1 ring-[#334155] scale-110 shadow-md" : ""
                        }`}
                        style={{ backgroundColor: color }}
                        title={color} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-between mt-5 pt-4 border-t border-[#E2E8F0]">
            <button onClick={() => { setShowCategoryDialog(true); setShowCategoryManageDialog(false); }}
              className="px-4 py-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg cursor-pointer transition-colors">
              + 新建分类
            </button>
            <button onClick={() => { setShowCategoryManageDialog(false); toast.success("分类颜色已更新"); }}
              className="px-5 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg h-10 hover:bg-[#60A5FA] transition-colors cursor-pointer shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
              完成
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="bottom-center" className="md:!bottom-4 md:!right-4" />

      {/* Inline Deadline Editor */}
      <Dialog open={!!inlineDeadlineTask} onOpenChange={() => setInlineDeadlineTask(null)}>
        <DialogContent className="max-w-[360px] w-[90vw] p-6 bg-white rounded-2xl shadow-[0_16px_32px_rgba(0,0,0,0.15)] border-0 gap-0">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-semibold text-[#1E293B]">修改截止日期</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[#64748B]">
              项目: <span className="font-semibold text-[#334155]">{inlineDeadlineTask?.name}</span>
            </p>
            <Input
              type="date"
              value={inlineDeadlineValue}
              onChange={(e) => setInlineDeadlineValue(e.target.value)}
              className="h-11 rounded-lg px-4 text-sm bg-[#F1F5F9] border-0 focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all"
            />
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => setInlineDeadlineTask(null)}
                className="px-5 py-2 bg-[#F1F5F9] text-[#334155] text-sm font-medium rounded-lg h-10 hover:bg-[#E2E8F0] transition-colors cursor-pointer">取消</button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleInlineDeadlineSave}
                className="px-5 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg h-10 hover:bg-[#60A5FA] transition-colors shadow-[0_4px_12px_rgba(59,130,246,0.3)] cursor-pointer">保存</motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Right-side History Drawer */}
      <AnimatePresence>
        {drawerTask && (
          <>
            {/* Backdrop */}
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-black/20 z-[900]"
              onClick={() => setDrawerTask(null)}
            />
            {/* Drawer Panel */}
            <motion.div
              key="drawer-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="fixed top-0 right-0 h-full w-full md:w-[420px] max-w-[100vw] bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.12)] z-[950] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#EFF6FF] shrink-0">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[#1E293B] truncate">{drawerTask.name}</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {drawerTask.history.length} 条更新记录
                    </p>
                  </div>
                  <button
                    onClick={() => setDrawerTask(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#1E293B] hover:bg-[#E2E8F0] transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* History List */}
              <ScrollArea className="flex-1">
                <div className="px-5 py-4">
                  {drawerTask.history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <History className="w-10 h-10 text-[#CBD5E1] mb-3" />
                      <p className="text-sm text-[#94A3B8]">暂无更新记录</p>
                      <p className="text-xs text-[#CBD5E1] mt-1">编辑任务时添加备注即可创建记录</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {[...drawerTask.history].reverse().map((entry, idx) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.3) }}
                          className="bg-[#F8FAFC] rounded-xl p-3.5 border border-[#E2E8F0]"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono text-[#94A3B8]">{formatDateTime(entry.timestamp)}</span>
                            <span className="text-sm font-bold text-[#475569] tabular-nums">{entry.progress}%</span>
                          </div>
                          {entry.note && (
                            <p className="text-xs text-[#64748B] leading-relaxed">{entry.note}</p>
                          )}
                          {/* Delete button with confirmation */}
                          <div className="flex justify-end mt-2">
                            <AlertDialog open={deleteEntryId === entry.id} onOpenChange={(open) => !open && setDeleteEntryId(null)}>
                              <AlertDialogTrigger asChild>
                                <button
                                  onClick={() => { setDeleteEntryId(entry.id); setDeleteEntryTaskId(drawerTask.id); }}
                                  className="text-xs text-[#94A3B8] hover:text-[#EF4444] transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  删除
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-[380px] w-[90vw] p-6 bg-white rounded-2xl shadow-[0_16px_32px_rgba(0,0,0,0.15)] border-0">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-lg font-semibold text-[#1E293B]">确认删除</AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm text-[#64748B] mt-2">
                                    确定要删除这条更新记录吗？此操作不可恢复。
                                    {entry.note && (
                                      <span className="block mt-2 p-2 bg-[#F8FAFC] rounded-lg text-[#475569]">"{entry.note}"</span>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-4 flex justify-end gap-3">
                                  <AlertDialogCancel onClick={() => setDeleteEntryId(null)}
                                    className="px-5 py-2 bg-[#F1F5F9] text-[#334155] text-sm font-medium rounded-lg h-10 hover:bg-[#E2E8F0] transition-colors cursor-pointer"
                                  >
                                    取消
                                  </AlertDialogCancel>
                                  <AlertDialogAction onClick={confirmDeleteEntry}
                                    className="px-5 py-2 bg-[#EF4444] text-white text-sm font-semibold rounded-lg h-10 hover:bg-[#DC2626] transition-colors cursor-pointer"
                                  >
                                    确认删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8]">
                    创建于 {formatDateTime(drawerTask.createdDate)}
                  </span>
                  <button
                    onClick={() => { navigate(`/history?taskId=${drawerTask.id}`); setDrawerTask(null); }}
                    className="text-xs font-medium text-[#3B82F6] hover:text-[#2563EB] transition-colors cursor-pointer"
                  >
                    查看完整记录 →
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}
