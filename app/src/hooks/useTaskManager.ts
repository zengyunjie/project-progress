import { useState, useEffect, useCallback, useRef } from "react";
import type { Task, ProgressEntry, Attachment, CustomCategory } from "@/types";
import { DEFAULT_CATEGORIES } from "@/types";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

// Map Supabase row → Task
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    createdDate: row.created_date as string,
    deadline: row.deadline as string,
    progress: row.progress as number,
    status: row.status as Task["status"],
    history: (row.history as ProgressEntry[]) || [],
    attachments: (row.attachments as Attachment[]) || [],
  };
}

// Map Category row
function rowToCategory(row: Record<string, unknown>): CustomCategory {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
  };
}

export function useTaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allCategories, setAllCategories] = useState<CustomCategory[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Skip realtime events that we triggered ourselves
  const suppressRealtimeRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── Initial Load ──
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        // Load categories first
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("*")
          .order("created_at", { ascending: true });

        if (catError) throw catError;
        if (!cancelled && catData && catData.length > 0) {
          setAllCategories(catData.map(rowToCategory));
        } else if (!cancelled) {
          // Seed defaults
          for (const cat of DEFAULT_CATEGORIES) {
            await supabase.from("categories").upsert({
              id: cat.id,
              name: cat.name,
              color: cat.color,
            });
          }
        }

        // Load tasks
        const { data: taskData, error: taskError } = await supabase
          .from("tasks")
          .select("*")
          .order("created_at", { ascending: false });

        if (taskError) throw taskError;
        if (!cancelled && taskData) {
          setTasks(taskData.map(rowToTask));
        }

        setCloudError(null);
      } catch (err: unknown) {
        if (!cancelled) {
          setCloudError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // ── Realtime Subscription ──
  useEffect(() => {
    const channel = supabase
      .channel("project-progress-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (suppressRealtimeRef.current) return;

          const row = payload.new as Record<string, unknown> | null;

          switch (payload.eventType) {
            case "INSERT":
              if (row) {
                setTasks((prev) => {
                  if (prev.find((t) => t.id === row.id)) return prev;
                  return [rowToTask(row), ...prev];
                });
              }
              break;
            case "UPDATE":
              if (row) {
                setTasks((prev) =>
                  prev.map((t) => (t.id === row.id ? { ...t, ...rowToTask(row) } : t))
                );
              }
              break;
            case "DELETE":
              setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
              break;
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        (payload) => {
          if (suppressRealtimeRef.current) return;

          const row = payload.new as Record<string, unknown> | null;

          switch (payload.eventType) {
            case "INSERT":
              if (row) {
                setAllCategories((prev) => {
                  if (prev.find((c) => c.id === row.id)) return prev;
                  return [...prev, rowToCategory(row)];
                });
              }
              break;
            case "UPDATE":
              if (row) {
                setAllCategories((prev) =>
                  prev.map((c) => (c.id === row.id ? rowToCategory(row) : c))
                );
              }
              break;
            case "DELETE":
              setAllCategories((prev) => prev.filter((c) => c.id !== payload.old.id));
              break;
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── CRUD: Add Task ──
  const addTask = useCallback(
    async (data: {
      name: string;
      category: string;
      createdDate: string;
      deadline: string;
      progress: number;
      note?: string;
    }): Promise<Task> => {
      const task: Task = {
        id: generateId(),
        name: data.name,
        category: data.category,
        createdDate: data.createdDate,
        deadline: data.deadline,
        progress: data.progress,
        status: "active",
        attachments: [],
        history: [
          {
            id: generateId(),
            taskId: "",
            timestamp: new Date().toISOString(),
            progress: data.progress,
            note: data.note || "创建任务",
          },
        ],
      };
      task.history[0].taskId = task.id;
      task.status = getStatus(task);

      // Optimistic update
      setTasks((prev) => [task, ...prev]);

      try {
        suppressRealtimeRef.current = true;
        await supabase.from("tasks").upsert({
          id: task.id,
          name: task.name,
          category: task.category,
          created_date: task.createdDate,
          deadline: task.deadline,
          progress: task.progress,
          status: task.status,
          history: task.history,
          attachments: task.attachments,
        });
      } catch (err: unknown) {
        setCloudError(err instanceof Error ? err.message : "Failed to save task");
      } finally {
        setTimeout(() => { suppressRealtimeRef.current = false; }, 500);
      }

      return task;
    },
    []
  );

  // ── CRUD: Update Task ──
  const updateTask = useCallback(
    async (
      taskId: string,
      data: {
        name?: string;
        category?: string;
        createdDate?: string;
        deadline?: string;
        progress?: number;
        note?: string;
      }
    ): Promise<Task | null> => {
      let captured: Task | null = null;

      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const updated = { ...task };
          if (data.name !== undefined) updated.name = data.name;
          if (data.category !== undefined) updated.category = data.category;
          if (data.createdDate !== undefined) updated.createdDate = data.createdDate;
          if (data.deadline !== undefined) updated.deadline = data.deadline;

          const hasNote = data.note !== undefined && data.note.trim() !== "";
          const progressChanged =
            data.progress !== undefined && data.progress !== task.progress;

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
          captured = updated;
          return updated;
        })
      );

      if (captured) {
        const t = captured as Task;
        try {
          suppressRealtimeRef.current = true;
          await supabase.from("tasks").upsert({
            id: t.id,
            name: t.name,
            category: t.category,
            created_date: t.createdDate,
            deadline: t.deadline,
            progress: t.progress,
            status: t.status,
            history: t.history,
            attachments: t.attachments,
          });
        } catch (err: unknown) {
          setCloudError(err instanceof Error ? err.message : "Failed to update task");
        } finally {
          setTimeout(() => { suppressRealtimeRef.current = false; }, 500);
        }
      }

      return captured;
    },
    []
  );

  // ── CRUD: Delete Task ──
  const deleteTask = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      suppressRealtimeRef.current = true;
      await supabase.from("tasks").delete().eq("id", taskId);
    } catch (err: unknown) {
      setCloudError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setTimeout(() => { suppressRealtimeRef.current = false; }, 500);
    }
  }, []);

  // ── Toggle Complete ──
  const toggleComplete = useCallback(async (taskId: string) => {
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

    // Sync to Supabase
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        const completed = task.progress === 100;
        const newProgress = completed ? 0 : 100;
        const entry: ProgressEntry = {
          id: generateId(),
          taskId: task.id,
          timestamp: new Date().toISOString(),
          progress: newProgress,
          note: completed ? "重新打开" : "标记完成",
        };

        suppressRealtimeRef.current = true;
        await supabase.from("tasks").upsert({
          id: task.id,
          name: task.name,
          category: task.category,
          created_date: task.createdDate,
          deadline: task.deadline,
          progress: newProgress,
          status: completed ? "active" : "completed",
          history: [...task.history, entry],
          attachments: task.attachments,
        });
      }
    } catch (err: unknown) {
      setCloudError(err instanceof Error ? err.message : "Failed to toggle task");
    } finally {
      setTimeout(() => { suppressRealtimeRef.current = false; }, 500);
    }
  }, [tasks]);

  // ── Terminate Task ──
  const terminateTask = useCallback(async (taskId: string): Promise<Task | null> => {
    let captured: Task | null = null;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const updated = { ...task, status: "terminated" as const };
        updated.history = [
          ...updated.history,
          {
            id: generateId(),
            taskId: task.id,
            timestamp: new Date().toISOString(),
            progress: task.progress,
            note: "项目已终止",
          },
        ];
        captured = updated;
        return updated;
      })
    );

    if (captured) {
      const t = captured as Task;
      try {
        suppressRealtimeRef.current = true;
        await supabase.from("tasks").upsert({
          id: t.id,
          name: t.name,
          category: t.category,
          created_date: t.createdDate,
          deadline: t.deadline,
          progress: t.progress,
          status: t.status,
          history: t.history,
          attachments: t.attachments,
        });
      } catch (err: unknown) {
        setCloudError(err instanceof Error ? err.message : "Failed to terminate task");
      } finally {
        setTimeout(() => { suppressRealtimeRef.current = false; }, 500);
      }
    }

    return captured;
  }, []);

  // ── Add Custom Category ──
  const addCustomCategory = useCallback(
    async (name: string, color: string): Promise<CustomCategory> => {
      const newCat: CustomCategory = {
        id: "custom-" + generateId(),
        name,
        color,
      };

      setAllCategories((prev) => [...prev, newCat]);

      try {
        suppressRealtimeRef.current = true;
        await supabase.from("categories").upsert({
          id: newCat.id,
          name: newCat.name,
          color: newCat.color,
        });
      } catch (err: unknown) {
        setCloudError(err instanceof Error ? err.message : "Failed to save category");
      } finally {
        setTimeout(() => { suppressRealtimeRef.current = false; }, 500);
      }

      return newCat;
    },
    []
  );

  // ── Update Category ──
  const updateCategory = useCallback(
    async (categoryId: string, data: { name?: string; color?: string }) => {
      setAllCategories((prev) =>
        prev.map((cat) => (cat.id === categoryId ? { ...cat, ...data } : cat))
      );

      try {
        suppressRealtimeRef.current = true;
        await supabase
          .from("categories")
          .update({ name: data.name, color: data.color })
          .eq("id", categoryId);
      } catch (err: unknown) {
        setCloudError(err instanceof Error ? err.message : "Failed to update category");
      } finally {
        setTimeout(() => { suppressRealtimeRef.current = false; }, 500);
      }
    },
    []
  );

  // ── Delete Category ──
  const deleteCategory = useCallback(
    async (categoryId: string) => {
      const cat = allCategories.find((c) => c.id === categoryId);
      if (!cat) return;

      // Move tasks to fallback category
      const tasksUsing = tasks.filter((t) => t.category === categoryId);
      if (tasksUsing.length > 0) {
        const fallbackId = allCategories.find((c) => c.id !== categoryId)?.id;
        if (fallbackId) {
          setTasks((prev) =>
            prev.map((t) =>
              t.category === categoryId ? { ...t, category: fallbackId } : t
            )
          );

          try {
            suppressRealtimeRef.current = true;
            for (const task of tasksUsing) {
              await supabase
                .from("tasks")
                .update({ category: fallbackId })
                .eq("id", task.id);
            }
          } catch {
            // silently fail
          } finally {
            setTimeout(() => { suppressRealtimeRef.current = false; }, 500);
          }
        }
      }

      setAllCategories((prev) => prev.filter((c) => c.id !== categoryId));

      try {
        suppressRealtimeRef.current = true;
        await supabase.from("categories").delete().eq("id", categoryId);
      } catch (err: unknown) {
        setCloudError(err instanceof Error ? err.message : "Failed to delete category");
      } finally {
        setTimeout(() => { suppressRealtimeRef.current = false; }, 500);
      }
    },
    [tasks, allCategories]
  );

  // ── Attachments ──
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

    // Sync to Supabase
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        suppressRealtimeRef.current = true;
        await supabase
          .from("tasks")
          .update({ attachments: [...(task.attachments || []), attachment] })
          .eq("id", taskId);
      }
    } catch {
      // silently fail
    } finally {
      setTimeout(() => { suppressRealtimeRef.current = false; }, 500);
    }
  }, [tasks]);

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

    try {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        const updated = (task.attachments || []).filter((a) => a.id !== attachmentId);
        suppressRealtimeRef.current = true;
        await supabase.from("tasks").update({ attachments: updated }).eq("id", taskId);
      }
    } catch {
      // silently fail
    } finally {
      setTimeout(() => { suppressRealtimeRef.current = false; }, 500);
    }
  }, [tasks]);

  // ── Export / Import / Clear ──
  const exportData = useCallback((): string => {
    const data = {
      tasks,
      categories: allCategories,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }, [tasks, allCategories]);

  const importData = useCallback(
    async (json: string): Promise<boolean> => {
      try {
        const data = JSON.parse(json);
        if (data.tasks && Array.isArray(data.tasks)) {
          const importedTasks = data.tasks.map((t: Task) => ({
            ...t,
            status: getStatus(t),
          }));
          setTasks(importedTasks);

          // Bulk upsert to Supabase
          suppressRealtimeRef.current = true;
          for (const task of importedTasks) {
            await supabase.from("tasks").upsert({
              id: task.id,
              name: task.name,
              category: task.category,
              created_date: task.createdDate,
              deadline: task.deadline,
              progress: task.progress,
              status: task.status,
              history: task.history,
              attachments: task.attachments,
            });
          }
        }
        if (data.categories && Array.isArray(data.categories)) {
          setAllCategories(data.categories);
          suppressRealtimeRef.current = true;
          for (const cat of data.categories) {
            await supabase.from("categories").upsert({
              id: cat.id,
              name: cat.name,
              color: cat.color,
            });
          }
        }
        setTimeout(() => { suppressRealtimeRef.current = false; }, 1000);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const clearAllData = useCallback(async () => {
    setTasks([]);
    setAllCategories(DEFAULT_CATEGORIES);

    try {
      suppressRealtimeRef.current = true;
      await supabase.from("tasks").delete().neq("id", "__never_match__");
      await supabase
        .from("categories")
        .delete()
        .neq("id", "__never_match__");
      // Re-seed defaults
      for (const cat of DEFAULT_CATEGORIES) {
        await supabase.from("categories").upsert({
          id: cat.id,
          name: cat.name,
          color: cat.color,
        });
      }
    } catch {
      // silently fail
    } finally {
      setTimeout(() => { suppressRealtimeRef.current = false; }, 1000);
    }
  }, []);

  return {
    tasks,
    allCategories,
    isLoading,
    cloudError,
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
