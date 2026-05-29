import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const DIGEST_KEY = "todoflow-digest-enabled";
const TIME_KEY = "todoflow-digest-time";
const LAST_SHOWN_KEY = "todoflow-digest-last-shown";

function loadEnabled(): boolean {
  try {
    const stored = localStorage.getItem(DIGEST_KEY);
    return stored ? JSON.parse(stored) : true;
  } catch {
    return true;
  }
}

function loadTime(): string {
  try {
    return localStorage.getItem(TIME_KEY) || "09:00";
  } catch {
    return "09:00";
  }
}

export function useDailyDigest() {
  const [enabled, setEnabled] = useState<boolean>(loadEnabled);
  const [digestTime, setDigestTime] = useState<string>(loadTime);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    localStorage.setItem(DIGEST_KEY, JSON.stringify(enabled));
  }, [enabled]);

  useEffect(() => {
    localStorage.setItem(TIME_KEY, digestTime);
  }, [digestTime]);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (next) {
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
          Notification.requestPermission().then((result) => {
            setPermission(result);
          });
        }
      }
      return next;
    });
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  // Schedule notification check — now queries Supabase instead of localStorage
  useEffect(() => {
    if (!enabled) return;
    if (permission !== "granted") return;

    const checkAndNotify = async () => {
      const now = new Date();
      const currentTime =
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0");

      if (currentTime === digestTime) {
        const lastShown = localStorage.getItem(LAST_SHOWN_KEY);
        const today = now.toISOString().split("T")[0];
        if (lastShown !== today) {
          localStorage.setItem(LAST_SHOWN_KEY, today);

          try {
            // Query Supabase for overdue + due-today tasks
            const todayStr = now.toISOString().split("T")[0];
            const { data: tasks } = await supabase
              .from("tasks")
              .select("deadline, status");

            if (tasks) {
              const dueToday = tasks.filter(
                (t: { deadline: string; status: string }) =>
                  t.deadline === todayStr && t.status !== "completed"
              ).length;
              const overdue = tasks.filter(
                (t: { status: string }) => t.status === "overdue"
              ).length;

              let body = "Your daily task digest is ready";
              if (dueToday > 0)
                body += ` — ${dueToday} task${dueToday > 1 ? "s" : ""} due today`;
              if (overdue > 0) body += `, ${overdue} overdue`;

              new Notification("TodoFlow Daily Digest", {
                body,
                icon: undefined,
                badge: undefined,
              });
            }
          } catch {
            new Notification("TodoFlow Daily Digest", {
              body: "Check your tasks for today!",
            });
          }
        }
      }
    };

    // Check every minute
    intervalRef.current = setInterval(checkAndNotify, 60000);
    checkAndNotify(); // Check immediately

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, digestTime, permission]);

  return {
    enabled,
    toggleEnabled,
    digestTime,
    setDigestTime,
    permission,
    requestPermission,
  };
}
