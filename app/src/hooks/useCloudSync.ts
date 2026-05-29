import { useState, useEffect, useCallback, useRef } from "react";
import type { Task, CustomCategory } from "@/types";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface SyncState {
  isConfigured: boolean;
  user: null; // Supabase anonymous — no auth
  isLoading: boolean;
  lastSync: string | null;
  syncError: string | null;
}

export function useCloudSync() {
  const [state, setState] = useState<SyncState>({
    isConfigured: true, // Always configured with Supabase
    user: null,
    isLoading: false,
    lastSync: null,
    syncError: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // No-op sign in/out (anonymous access)
  const signIn = useCallback(async () => {
    // No-op: Supabase anonymous access doesn't require sign-in
  }, []);

  const signOutUser = useCallback(async () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Upload data to cloud
  const uploadToCloud = useCallback(
    async (tasks: Task[], customCategories: CustomCategory[]) => {
      try {
        // Upsert all tasks
        for (const task of tasks) {
          await supabase.from("tasks").upsert({
            id: task.id,
            name: task.name,
            category: task.category,
            created_date: task.createdDate,
            deadline: task.deadline,
            progress: task.progress,
            status: task.status,
            history: task.history,
            attachments: task.attachments || [],
          });
        }

        // Upsert all categories
        for (const cat of customCategories) {
          await supabase.from("categories").upsert({
            id: cat.id,
            name: cat.name,
            color: cat.color,
          });
        }

        const now = new Date().toLocaleString();
        setState((s) => ({ ...s, lastSync: now, syncError: null }));
        return true;
      } catch (err: unknown) {
        setState((s) => ({
          ...s,
          syncError: err instanceof Error ? err.message : "Upload failed",
        }));
        return false;
      }
    },
    []
  );

  // Download data from cloud
  const downloadFromCloud = useCallback(async (): Promise<{
    tasks: Task[];
    customCategories: CustomCategory[];
  } | null> => {
    try {
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (taskError) throw taskError;

      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: true });

      if (catError) throw catError;

      const now = new Date().toLocaleString();
      setState((s) => ({ ...s, lastSync: now, syncError: null }));

      return {
        tasks: taskData.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          name: row.name as string,
          category: row.category as string,
          createdDate: row.created_date as string,
          deadline: row.deadline as string,
          progress: row.progress as number,
          status: row.status as Task["status"],
          history: (row.history as Task["history"]) || [],
          attachments: (row.attachments as Task["attachments"]) || [],
        })),
        customCategories: catData.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          name: row.name as string,
          color: row.color as string,
        })),
      };
    } catch (err: unknown) {
      setState((s) => ({
        ...s,
        syncError:
          err instanceof Error ? err.message : "Download failed",
      }));
      return null;
    }
  }, []);

  // Real-time sync via Supabase Realtime
  const startRealtimeSync = useCallback(
    (onDataChange: (tasks: Task[], categories: CustomCategory[]) => void) => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel("cloud-sync-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks" },
          async () => {
            // Re-fetch everything on any change
            const { data: taskData } = await supabase
              .from("tasks")
              .select("*")
              .order("created_at", { ascending: false });
            const { data: catData } = await supabase
              .from("categories")
              .select("*")
              .order("created_at", { ascending: true });

            const tasks = (taskData || []).map((row: Record<string, unknown>) => ({
              id: row.id as string,
              name: row.name as string,
              category: row.category as string,
              createdDate: row.created_date as string,
              deadline: row.deadline as string,
              progress: row.progress as number,
              status: row.status as Task["status"],
              history: (row.history as Task["history"]) || [],
              attachments: (row.attachments as Task["attachments"]) || [],
            }));

            const categories = (catData || []).map(
              (row: Record<string, unknown>) => ({
                id: row.id as string,
                name: row.name as string,
                color: row.color as string,
              })
            );

            onDataChange(tasks, categories);
            setState((s) => ({
              ...s,
              lastSync: new Date().toLocaleString(),
            }));
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "categories" },
          async () => {
            const { data: catData } = await supabase
              .from("categories")
              .select("*")
              .order("created_at", { ascending: true });

            const categories = (catData || []).map(
              (row: Record<string, unknown>) => ({
                id: row.id as string,
                name: row.name as string,
                color: row.color as string,
              })
            );

            // We don't have tasks here, just update categories
            const { data: taskData } = await supabase
              .from("tasks")
              .select("*")
              .order("created_at", { ascending: false });

            const tasks = (taskData || []).map((row: Record<string, unknown>) => ({
              id: row.id as string,
              name: row.name as string,
              category: row.category as string,
              createdDate: row.created_date as string,
              deadline: row.deadline as string,
              progress: row.progress as number,
              status: row.status as Task["status"],
              history: (row.history as Task["history"]) || [],
              attachments: (row.attachments as Task["attachments"]) || [],
            }));

            onDataChange(tasks, categories);
            setState((s) => ({
              ...s,
              lastSync: new Date().toLocaleString(),
            }));
          }
        )
        .subscribe();

      channelRef.current = channel;
      return () => {
        supabase.removeChannel(channel);
        channelRef.current = null;
      };
    },
    []
  );

  const stopRealtimeSync = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  return {
    ...state,
    signIn,
    signOut: signOutUser,
    uploadToCloud,
    downloadFromCloud,
    startRealtimeSync,
    stopRealtimeSync,
  };
}
