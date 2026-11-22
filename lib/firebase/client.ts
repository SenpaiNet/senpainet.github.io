import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

// Web 用の設定値（公開されても問題ない値。データはセキュリティルールで守る）
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

let cache: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

/** ブラウザでだけ呼ぶ。設定がなければ null */
export function fb() {
  if (!firebaseConfigured || typeof window === "undefined") return null;
  if (!cache) {
    const app = getApps().length ? getApp() : initializeApp(config);
    cache = { app, auth: getAuth(app), db: getFirestore(app) };
    // 開発用：NEXT_PUBLIC_USE_EMULATORS=1 なら、本番ではなく手元のエミュレーターにつなぐ
    if (process.env.NEXT_PUBLIC_USE_EMULATORS === "1") {
      connectAuthEmulator(cache.auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectFirestoreEmulator(cache.db, "127.0.0.1", 8080);
    }
  }
  return cache;
}
