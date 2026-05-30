import { useState, useEffect, useCallback } from "react";
import type { Task, ProgressEntry, Attachment, CustomCategory } from "@/types";
import { DEFAULT_CATEGORIES } from "@/types";
import { supabase } from "@/lib/supabase";

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

export function useTaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allCategories, setAllCategories] = useState<CustomCategory[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch all data from Supabase ───
  const fetchAllData = useCallback(async () => {
    try {
      // Fetch categories
      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: true });

      // Fetch tasks ordered by sort_order
      const { data: rawTasks } = await supabase
        .from("tasks")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: true });

      // Fetch progress entries
      const { data: entries } = await supabase
        .from("progress_entries")
        .select("*")
        .order("timestamp", { ascending: true });

      // Fetch attachments
      const { data: atts } = await supabase
        .from("attachments")
        .select("*");

      // Assemble tasks with nested history and attachments
      const assembledTasks: Task[] = (rawTasks || []).map((t, i) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        createdDate: t.created_date,
        deadline: t.deadline,
        progress: t.progress,
        status: t.status,
        sort_order: t.sort_order ?? i,
        history: (entries || [])
          .filter((e) => e.task_id === t.id)
          .map((e) => ({
            id: e.id,
            taskId: e.task_id,
            timestamp: e.timestamp,
            progress: e.progress,
            note: e.note,
          })),
        attachments: (atts || [])
          .filter((a) => a.task_id === t.id)
          .map((a) => ({
            id: a.id,
            name: a.name,
            size: a.size,
            dataUrl: a.data_url,
          })),
      }));

      // Recalculate statuses
      const updatedTasks = assembledTasks.map((t) => ({
        ...t,
        status: getStatus(t),
      }));

      setTasks(updatedTasks);

      if (cats && cats.length > 0) {
        setAllCategories(cats.map((c) => ({ id: c.id, name: c.name, color: c.color })));
      } else {
        setAllCategories(DEFAULT_CATEGORIES);
      }

      setError(null);
    } catch (e) {
      console.error("Failed to fetch data from Supabase:", e);
      setError("无法连接数据库，请检查网络连接");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ─── Realtime subscription for multi-client sync ───
  useEffect(() => {
    let tasksChannel: ReturnType<typeof supabase.channel> | null = null;
    let catsChannel: ReturnType<typeof supabase.channel> | null = null;
    let entriesChannel: ReturnType<typeof supabase.channel> | null = null;
    let attsChannel: ReturnType<typeof supabase.channel> | null = null;

    try {
      tasksChannel = supabase
        .channel("tasks-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks" },
          () => fetchAllData()
        )
        .subscribe();

      catsChannel = supabase
        .channel("categories-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "categories" },
          () => fetchAllData()
        )
        .subscribe();

      entriesChannel = supabase
        .channel("progress-entries-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "progress_entries" },
          () => fetchAllData()
        )
        .subscribe();

      attsChannel = supabase
        .channel("attachments-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "attachments" },
          () => fetchAllData()
        )
        .subscribe();
    } catch {
      // Realtime not available — app still works without live sync
    }

    return () => {
      if (tasksChannel) supabase.removeChannel(tasksChannel);
      if (catsChannel) supabase.removeChannel(catsChannel);
      if (entriesChannel) supabase.removeChannel(entriesChannel);
      if (attsChannel) supabase.removeChannel(attsChannel);
    };
  }, [fetchAllData]);

  // ─── CRUD Operations ───

  const addTask = useCallback(async (data: {
    name: string;
    category: string;
    createdDate: string;
    deadline: string;
    progress: number;
    note?: string;
  }): Promise<Task> => {
    const taskId = generateId();
    const entryId = generateId();
    const now = new Date().toISOString();

    const task: Task = {
      id: taskId,
      name: data.name,
      category: data.category,
      createdDate: data.createdDate,
      deadline: data.deadline,
      progress: data.progress,
      status: "active",
      history: [{
        id: entryId,
        taskId,
        timestamp: now,
        progress: data.progress,
        note: data.note || "创建任务",
      }],
      attachments: [],
      sort_order: 0,
    };
    task.status = getStatus(task);

    // Optimistic update
    setTasks((prev) => [task, ...prev]);

    // Write to Supabase
    await supabase.from("tasks").insert({
      id: taskId,
      name: data.name,
      category: data.category,
      created_date: data.createdDate,
      deadline: data.deadline,
      progress: data.progress,
      status: task.status,
      sort_order: 0,
    });

    await supabase.from("progress_entries").insert({
      id: entryId,
      task_id: taskId,
      timestamp: now,
      progress: data.progress,
      note: data.note || "创建任务",
    });

    return task;
  }, []);

  const updateTask = useCallback(async (taskId: string, data: {
    name?: string;
    category?: string;
    createdDate?: string;
    deadline?: string;
    progress?: number;
    note?: string;
  }): Promise<Task | null> => {
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
        updated.status = getStatus(updated);
        result = updated;
        return updated;
      })
    );

    // Build update payload
    const updatePayload: Record<string, unknown> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.createdDate !== undefined) updatePayload.created_date = data.createdDate;
    if (data.deadline !== undefined) updatePayload.deadline = data.deadline;
    if (data.progress !== undefined) updatePayload.progress = Math.max(0, Math.min(100, data.progress));
    if (result) updatePayload.status = result.status;
    updatePayload.updated_at = new Date().toISOString();

    await supabase.from("tasks").update(updatePayload).eq("id", taskId);

    // Add progress entry if progress or note changed
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return result;

    const hasNote = data.note !== undefined && data.note.trim() !== "";
    const progressChanged = data.progress !== undefined && data.progress !== task.progress;

    if (progressChanged || hasNote) {
      const newProgress = data.progress !== undefined ? Math.max(0, Math.min(100, data.progress)) : task.progress;
      const entryId = generateId();
      const entry: ProgressEntry = {
        id: entryId,
        taskId,
        timestamp: new Date().toISOString(),
        progress: newProgress,
        note: hasNote ? data.note!.trim() : `进度更新至 ${newProgress}%`,
      };

      // Optimistic history update
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          return { ...t, history: [...t.history, entry] };
        })
      );

      await supabase.from("progress_entries").insert({
        id: entryId,
        task_id: taskId,
        timestamp: entry.timestamp,
        progress: entry.progress,
        note: entry.note,
      });
    }

    return result;
  }, [tasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await supabase.from("tasks").delete().eq("id", taskId);
  }, []);

  const toggleComplete = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const completed = task.progress === 100;
    const newProgress = completed ? 0 : 100;
    const entryId = generateId();
    const now = new Date().toISOString();

    const updated = {
      ...task,
      progress: newProgress,
      history: [...task.history, {
        id: entryId,
        taskId,
        timestamp: now,
        progress: newProgress,
        note: completed ? "重新打开" : "标记完成",
      }],
    };
    updated.status = getStatus(updated);

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));

    await supabase.from("tasks").update({
      progress: newProgress,
      status: updated.status,
      updated_at: now,
    }).eq("id", taskId);

    await supabase.from("progress_entries").insert({
      id: entryId,
      task_id: taskId,
      timestamp: now,
      progress: newProgress,
      note: completed ? "重新打开" : "标记完成",
    });
  }, [tasks]);

  const terminateTask = useCallback(async (taskId: string): Promise<Task | null> => {
    let result: Task | null = null;
    const entryId = generateId();
    const now = new Date().toISOString();

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const updated = {
          ...task,
          status: "terminated" as const,
          history: [...task.history, {
            id: entryId,
            taskId,
            timestamp: now,
            progress: task.progress,
            note: "项目已终止",
          }],
        };
        result = updated;
        return updated;
      })
    );

    await supabase.from("tasks").update({
      status: "terminated",
      updated_at: now,
    }).eq("id", taskId);

    await supabase.from("progress_entries").insert({
      id: entryId,
      task_id: taskId,
      timestamp: now,
      progress: result?.progress ?? 0,
      note: "项目已终止",
    });

    return result;
  }, []);

  const restoreTask = useCallback(async (taskId: string): Promise<Task | null> => {
    let result: Task | null = null;
    const entryId = generateId();
    const now = new Date().toISOString();

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const restored = {
          ...task,
          status: "active" as const,
          history: [...task.history, {
            id: entryId,
            taskId,
            timestamp: now,
            progress: task.progress,
            note: "项目已恢复",
          }],
        };
        restored.status = getStatus(restored);
        result = restored;
        return restored;
      })
    );

    const task = tasks.find((t) => t.id === taskId);
    const restoredStatus = getStatus({ ...task!, status: "active" });

    await supabase.from("tasks").update({
      status: restoredStatus,
      updated_at: now,
    }).eq("id", taskId);

    await supabase.from("progress_entries").insert({
      id: entryId,
      task_id: taskId,
      timestamp: now,
      progress: task?.progress ?? 0,
      note: "项目已恢复",
    });

  }, [tasks]);

  const deleteHistoryEntry = useCallback(async (taskId: string, entryId: string) => {
    // Optimistic: remove entry from local state
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return { ...t, history: t.history.filter((h) => h.id !== entryId) };
      })
    );

    // Delete from Supabase
    await supabase.from("progress_entries").delete().eq("id", entryId).eq("task_id", taskId);
  }, []);

  const addCustomCategory = useCallback(async (name: string, color: string): Promise<CustomCategory> => {
    const newCat: CustomCategory = {
      id: "custom-" + generateId(),
      name,
      color,
    };
    setAllCategories((prev) => [...prev, newCat]);

    await supabase.from("categories").insert({
      id: newCat.id,
      name,
      color,
    });

    return newCat;
  }, []);

  const updateCategory = useCallback(async (categoryId: string, data: { name?: string; color?: string }) => {
    setAllCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat;
        return { ...cat, ...data };
      })
    );

    await supabase.from("categories").update(data).eq("id", categoryId);
  }, []);

  const deleteCategory = useCallback(async (categoryId: string) => {
    const cat = allCategories.find((c) => c.id === categoryId);
    if (!cat) return;

    const tasksUsing = tasks.filter((t) => t.category === categoryId);
    if (tasksUsing.length > 0) {
      const fallbackId = allCategories.find((c) => c.id !== categoryId)?.id;
      if (fallbackId) {
        setTasks((prev) =>
          prev.map((t) => (t.category === categoryId ? { ...t, category: fallbackId } : t))
        );
        // Update all affected tasks in Supabase
        for (const t of tasksUsing) {
          await supabase.from("tasks").update({ category: fallbackId }).eq("id", t.id);
        }
      }
    }
    setAllCategories((prev) => prev.filter((c) => c.id !== categoryId));
    await supabase.from("categories").delete().eq("id", categoryId);
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

    await supabase.from("attachments").insert({
      id: attachment.id,
      task_id: taskId,
      name: file.name,
      size: file.size,
      data_url: dataUrl,
    });
  }, []);

  const removeAttachment = useCallback(async (taskId: string, attachmentId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          attachments: (task.attachments || []).filter((a) => a.id !== attachmentId),
        };
      })
    );

    await supabase.from("attachments").delete().eq("id", attachmentId);
  }, []);

  const updateAttachment = useCallback(async (taskId: string, attachmentId: string, file: File) => {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          attachments: (task.attachments || []).map((a) =>
            a.id === attachmentId
              ? { ...a, name: file.name, size: file.size, dataUrl }
              : a
          ),
        };
      })
    );

    await supabase.from("attachments").update({
      name: file.name,
      size: file.size,
      data_url: dataUrl,
    }).eq("id", attachmentId);
  }, []);

  const exportData = useCallback((): string => {
    const data = {
      tasks,
      categories: allCategories,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }, [tasks, allCategories]);

  const importData = useCallback(async (json: string): Promise<boolean> => {
    try {
      const data = JSON.parse(json);
      if (!data.tasks || !Array.isArray(data.tasks)) return false;

      // Insert categories
      if (data.categories && Array.isArray(data.categories)) {
        for (const cat of data.categories) {
          await supabase.from("categories").upsert({
            id: cat.id,
            name: cat.name,
            color: cat.color,
          }, { onConflict: "id" });
        }
      }

      // Insert tasks with history and attachments
      for (const t of data.tasks) {
        await supabase.from("tasks").upsert({
          id: t.id,
          name: t.name,
          category: t.category,
          created_date: t.createdDate,
          deadline: t.deadline,
          progress: t.progress,
          status: getStatus(t),
        }, { onConflict: "id" });

        if (t.history && Array.isArray(t.history)) {
          for (const h of t.history) {
            await supabase.from("progress_entries").upsert({
              id: h.id,
              task_id: h.taskId || t.id,
              timestamp: h.timestamp,
              progress: h.progress,
              note: h.note,
            }, { onConflict: "id" });
          }
        }

        if (t.attachments && Array.isArray(t.attachments)) {
          for (const a of t.attachments) {
            await supabase.from("attachments").upsert({
              id: a.id,
              task_id: t.id,
              name: a.name,
              size: a.size,
              data_url: a.dataUrl,
            }, { onConflict: "id" });
          }
        }
      }

      // Refresh from DB
      await fetchAllData();
      return true;
    } catch (e) {
      console.error("Import failed:", e);
      return false;
    }
  }, [fetchAllData]);

  const clearAllData = useCallback(async () => {
    await supabase.from("attachments").delete().neq("id", "__none__");
    await supabase.from("progress_entries").delete().neq("id", "__none__");
    await supabase.from("tasks").delete().neq("id", "__none__");
    await supabase.from("categories").delete().neq("id", "__none__");

    // Re-insert default categories
    for (const cat of DEFAULT_CATEGORIES) {
      await supabase.from("categories").insert({ id: cat.id, name: cat.name, color: cat.color });
    }

    await fetchAllData();
  }, [fetchAllData]);

  const reorderTasks = useCallback(async (reorderedIds: string[]) => {
    // Optimistic update
    setTasks((prev) => {
      const taskMap = new Map(prev.map((t) => [t.id, t]));
      return reorderedIds
        .map((id, index) => {
          const task = taskMap.get(id);
          return task ? { ...task, sort_order: index } : null;
        })
        .filter(Boolean) as Task[];
    });

    // Update Supabase
    for (let i = 0; i < reorderedIds.length; i++) {
      await supabase
        .from("tasks")
        .update({ sort_order: i })
        .eq("id", reorderedIds[i]);
    }
  }, []);

  return {
    tasks,
    allCategories,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    terminateTask,
    restoreTask,
    addCustomCategory,
    updateCategory,
    deleteCategory,
    addAttachment,
    removeAttachment,
    updateAttachment,
    exportData,
    importData,
    clearAllData,
    reorderTasks,
    deleteHistoryEntry,
    refreshData: fetchAllData,
  };
}
