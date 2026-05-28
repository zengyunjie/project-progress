import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, type User } from "firebase/auth";

// Default empty config - user must configure via Settings page
const DEFAULT_CONFIG: FirebaseOptions = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

const FIREBASE_CONFIG_KEY = "ke-empire-firebase-config";

export function getStoredFirebaseConfig(): FirebaseOptions {
  try {
    const stored = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

export function saveFirebaseConfig(config: FirebaseOptions) {
  localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
}

export function hasFirebaseConfig(): boolean {
  const config = getStoredFirebaseConfig();
  return !!config.apiKey && !!config.projectId;
}

export function initializeFirebaseApp() {
  if (getApps().length > 0) return getApp();
  const config = getStoredFirebaseConfig();
  if (!config.apiKey || !config.projectId) return null;
  try {
    return initializeApp(config);
  } catch {
    return null;
  }
}

export function getFirebaseApp() {
  const app = initializeFirebaseApp();
  if (!app) return null;
  return {
    app,
    db: getFirestore(app),
    auth: getAuth(app),
  };
}

export { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged };
export type { User, FirebaseOptions, Unsubscribe };
export { doc, setDoc, getDoc, onSnapshot };
