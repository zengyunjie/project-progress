import { useState, useEffect, useCallback, useRef } from "react";
import type { Task, CustomCategory } from "@/types";
import {
  getFirebaseApp, hasFirebaseConfig,
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut,
  doc, setDoc, getDoc, onSnapshot,
} from "@/lib/firebase";
import type { User, Unsubscribe } from "@/lib/firebase";

export interface SyncState {
  isConfigured: boolean;
  user: User | null;
  isLoading: boolean;
  lastSync: string | null;
  syncError: string | null;
}

const COLLECTION_NAME = "kevin-empire-data";

export function useCloudSync() {
  const [state, setState] = useState<SyncState>({
    isConfigured: hasFirebaseConfig(),
    user: null,
    isLoading: false,
    lastSync: null,
    syncError: null,
  });

  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const fb = getFirebaseApp();
    if (!fb) {
      setState((s) => ({ ...s, isConfigured: false, user: null }));
      return;
    }

    setState((s) => ({ ...s, isConfigured: true }));

    const unsub = onAuthStateChanged(fb.auth, (user) => {
      setState((s) => ({ ...s, user, isLoading: false }));
    });

    return () => unsub();
  }, []);

  // Sign in with Google
  const signIn = useCallback(async () => {
    const fb = getFirebaseApp();
    if (!fb) return;
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(fb.auth, provider);
    } catch (err: any) {
      setState((s) => ({ ...s, isLoading: false, syncError: err.message }));
    }
  }, []);

  // Sign out
  const signOutUser = useCallback(async () => {
    const fb = getFirebaseApp();
    if (!fb) return;
    try {
      await signOut(fb.auth);
      // Stop listening
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    } catch { /* ignore */ }
  }, []);

  // Upload data to cloud
  const uploadToCloud = useCallback(async (tasks: Task[], customCategories: CustomCategory[]) => {
    const fb = getFirebaseApp();
    if (!fb || !state.user) return false;
    try {
      const dataDoc = doc(fb.db, COLLECTION_NAME, state.user.uid);
      await setDoc(dataDoc, {
        tasks,
        customCategories,
        updatedAt: new Date().toISOString(),
      });
      setState((s) => ({ ...s, lastSync: new Date().toLocaleString(), syncError: null }));
      return true;
    } catch (err: any) {
      setState((s) => ({ ...s, syncError: err.message }));
      return false;
    }
  }, [state.user]);

  // Download data from cloud
  const downloadFromCloud = useCallback(async (): Promise<{ tasks: Task[]; customCategories: CustomCategory[] } | null> => {
    const fb = getFirebaseApp();
    if (!fb || !state.user) return null;
    try {
      const dataDoc = doc(fb.db, COLLECTION_NAME, state.user.uid);
      const snapshot = await getDoc(dataDoc);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setState((s) => ({ ...s, lastSync: new Date().toLocaleString(), syncError: null }));
        return {
          tasks: data.tasks || [],
          customCategories: data.customCategories || [],
        };
      }
      return null;
    } catch (err: any) {
      setState((s) => ({ ...s, syncError: err.message }));
      return null;
    }
  }, [state.user]);

  // Listen to cloud changes in real-time
  const startRealtimeSync = useCallback((onDataChange: (tasks: Task[], categories: CustomCategory[]) => void) => {
    const fb = getFirebaseApp();
    if (!fb || !state.user) return () => {};

    // Stop previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const dataDoc = doc(fb.db, COLLECTION_NAME, state.user.uid);
    const unsub = onSnapshot(dataDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onDataChange(data.tasks || [], data.customCategories || []);
        setState((s) => ({ ...s, lastSync: new Date().toLocaleString() }));
      }
    }, (err) => {
      setState((s) => ({ ...s, syncError: err.message }));
    });

    unsubscribeRef.current = unsub;
    return unsub;
  }, [state.user]);

  // Stop realtime sync
  const stopRealtimeSync = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
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
