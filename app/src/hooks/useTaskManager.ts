import { useState, useEffect, useCallback } from "react";
import type { Task, ProgressEntry, Attachment, CustomCategory } from "@/types";
import { DEFAULT_CATEGORIES } from "@/types";

const TASKS_KEY = "project-tracker-tasks";
const CATEGORIES_KEY = "project-tracker-categories";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getStatus(task: Task): Task["status"] {
  if (task.status === "terminated") return "terminated";
  if (task.progress === 100) return "completed";
  const today = new Date(getToday());
  const deadline = new Date(task.deadline);
  if (deadline < today) return "overdue";
  return "active";
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as T;
  } catch { /* ignore */ }
  return fallback;
}

export function useTaskManager() {
  const [tasks, setTasks] = useState<Task[]>(() => loadFromStorage<Task[]>(TASKS_KEY, []));
  const [allCategories, setAllCategories] = useState<CustomCategory[]>(() =>
    loadFromStorage<CustomCategory[]>(CATEGORIES_KEY, DEFAULT_CATEGORIES)
  );

  // Recalculate statuses on load
  useEffect(() => {
    const needsUpdate = tasks.some((t) => {
      const correct = getStatus(t);
      return t.status !== correct;
    });
    if (needsUpdate) {
      setTasks((prev) => prev.map((t) => ({ ...t, status: getStatus(t) })));
    }
  }, []);

  // Persist tasks
  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // Persist categories
  useEffect(() => {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(allCategories));
  }, [allCategories]);

  const addTask = useCallback((data: {
    name: string;
    category: string;
    createdDate: string;
    deadline: string;
    progress: number;
    note?: string;
  }): Task => {
    const task: Task = {
      id: generateId(),
      name: data.name,
      category: data.category,
      createdDate: data.createdDate,
      deadline: data.deadline,
      progress: data.progress,
      status: "active",
      attachments: [],
      history: [{
        id: generateId(),
        taskId: "",
        timestamp: new Date().toISOString(),
        progress: data.progress,
        note: data.note || "创建任务",
      }],
    };
    task.history[0].taskId = task.id;
    task.status = getStatus(task);
    setTasks((prev) => [task, ...prev]);
    return task;
  }, []);

  const updateTask = useCallback((taskId: string, data: {
    name?: string;
    category?: string;
    createdDate?: string;
    deadline?: string;
    progress?: number;
    note?: string;
  }): Task | null => {
    let result: Task | null = null;
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const updated = { ...task };
        if (data.name !== undefined) updated.name = data.name;
        if (data.category !== undefined) updated.category = data.category;
        if (data.createdDate !== undefined) updated.createdDate = data.createdDate;
        if (data.deadline !== undefined) updated.deadline = data.deadline;

        const hasNote = data.note !== undefined && data.note.trim() !== "";
        const progressChanged = data.progress !== undefined && data.progress !== task.progress;

        if (data.progress !== undefined) {
          updated.progress = Math.max(0, Math.min(100, data.progress));
        }

        if (progressChanged || hasNote) {
          const entry: ProgressEntry = {
            id: generateId(),
            taskId: task.id,
            timestamp: new Date().toISOString(),
            progress: updated.progress,
            note: hasNote ? data.note!.trim() : `进度更新至 ${updated.progress}%`,
          };
          updated.history = [...updated.history, entry];
        }

        updated.status = getStatus(updated);
        result = updated;
        return updated;
      })
    );
    return result;
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const toggleComplete = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const completed = task.progress === 100;
        const newProgress = completed ? 0 : 100;
        const entry: ProgressEntry = {
          id: generateId(),
          taskId: task.id,
          timestamp: new Date().toISOString(),
          progress: newProgress,
          note: completed ? "重新打开" : "标记完成",
        };
        const updated = {
          ...task,
          progress: newProgress,
          history: [...task.history, entry],
        };
        updated.status = getStatus(updated);
        return updated;
      })
    );
  }, []);

  const terminateTask = useCallback((taskId: string): Task | null => {
    let result: Task | null = null;
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const updated = { ...task, status: "terminated" as const };
        updated.history = [...updated.history, {
          id: generateId(),
          taskId: task.id,
          timestamp: new Date().toISOString(),
          progress: task.progress,
          note: "项目已终止",
        }];
        result = updated;
        return updated;
      })
    );
    return result;
  }, []);

  const addCustomCategory = useCallback((name: string, color: string): CustomCategory => {
    const newCat: CustomCategory = {
      id: "custom-" + generateId(),
      name,
      color,
    };
    setAllCategories((prev) => [...prev, newCat]);
    return newCat;
  }, []);

  const updateCategory = useCallback((categoryId: string, data: { name?: string; color?: string }) => {
    setAllCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat;
        return { ...cat, ...data };
      })
    );
  }, []);

  const deleteCategory = useCallback((categoryId: string) => {
    const cat = allCategories.find((c) => c.id === categoryId);
    if (!cat) return;
    // Check if any tasks use this category
    const tasksUsing = tasks.filter((t) => t.category === categoryId);
    if (tasksUsing.length > 0) {
      // Move tasks to first available category
      const fallbackId = allCategories.find((c) => c.id !== categoryId)?.id;
      if (fallbackId) {
        setTasks((prev) =>
          prev.map((t) => (t.category === categoryId ? { ...t, category: fallbackId } : t))
        );
      }
    }
    setAllCategories((prev) => prev.filter((c) => c.id !== categoryId));
  }, [tasks, allCategories]);

  const addAttachment = useCallback(async (taskId: string, file: File) => {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const attachment: Attachment = {
      id: generateId(),
      name: file.name,
      size: file.size,
      dataUrl,
    };

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          attachments: [...(task.attachments || []), attachment],
        };
      })
    );
  }, []);

  const removeAttachment = useCallback((taskId: string, attachmentId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          attachments: (task.attachments || []).filter((a) => a.id !== attachmentId),
        };
      })
    );
  }, []);

  const exportData = useCallback((): string => {
    const data = {
      tasks,
      categories: allCategories,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }, [tasks, allCategories]);

  const importData = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json);
      if (data.tasks && Array.isArray(data.tasks)) {
        setTasks(data.tasks.map((t: Task) => ({ ...t, status: getStatus(t) })));
      }
      if (data.categories && Array.isArray(data.categories)) {
        setAllCategories(data.categories);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearAllData = useCallback(() => {
    if (confirm("确定要清除所有数据吗？此操作不可撤销！")) {
      setTasks([]);
      setAllCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  return {
    tasks,
    allCategories,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    terminateTask,
    addCustomCategory,
    updateCategory,
    deleteCategory,
    addAttachment,
    removeAttachment,
    exportData,
    importData,
    clearAllData,
  };
}
