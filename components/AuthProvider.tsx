"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getCountFromServer, getDoc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { fb } from "@/lib/firebase/client";
import { gradeOf } from "@/lib/profile";
import type { QaProfile } from "@/lib/qa/types";

type AuthState = {
  ready: boolean;
  user: User | null;
  profile: QaProfile | null;
  isAdmin: boolean;
  /** 投稿・回答ができる状態か（確認済み・プロフィール完成・凍結されていない） */
  isMember: boolean;
  /** メール＋パスワードで登録し、まだメール確認していない */
  needsVerify: boolean;
  unread: number;
  refreshUnread: () => void;
};

const Ctx = createContext<AuthState>({
  ready: false,
  user: null,
  profile: null,
  isAdmin: false,
  isMember: false,
  needsVerify: false,
  unread: 0,
  refreshUnread: () => {},
});

export const useAuth = () => useContext(Ctx);

function isVerified(u: User) {
  return u.emailVerified || u.providerData.some((p) => p.providerId === "google.com");
}

/** 自分の相談についた未読の回答数 ＋ 未読のお知らせ数 */
async function countUnread(uid: string) {
  const f = fb();
  if (!f) return 0;
  try {
    const owners = await getDocs(query(collection(f.db, "questionOwners"), where("uid", "==", uid)));
    const qs = await Promise.all(
      owners.docs.map(async (o) => {
        const q = await getDoc(doc(f.db, "questions", o.id)).catch(() => null);
        const count = (q?.data()?.answerCount as number) ?? 0;
        return Math.max(0, count - ((o.data().seenAnswerCount as number) ?? 0));
      }),
    );
    const n = await getCountFromServer(
      query(collection(f.db, "notifications"), where("userId", "==", uid), where("isRead", "==", false)),
    );
    return qs.reduce((a, b) => a + b, 0) + n.data().count;
  } catch {
    return 0;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<QaProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const f = fb();
    if (!f) {
      setReady(true);
      return;
    }
    let stopProfile: (() => void) | null = null;
    const stop = onAuthStateChanged(f.auth, async (u) => {
      stopProfile?.();
      stopProfile = null;
      setUser(u);
      setProfile(null);
      setIsAdmin(false);
      setUnread(0);
      if (!u) {
        setProfileLoaded(true);
        setReady(true);
        return;
      }
      setProfileLoaded(false);
      // メール確認のあと、ログインの証明書（IDトークン）が「未確認」のまま残っていたら取り直す
      // （ルールは証明書の email_verified を見るため）
      try {
        const t = await u.getIdTokenResult();
        if (u.emailVerified && t.claims.email_verified !== true) await u.getIdToken(true);
      } catch {}
      stopProfile = onSnapshot(
        doc(f.db, "profiles", u.uid),
        async (snap) => {
          const p = snap.exists() ? (snap.data() as QaProfile) : null;
          // 6年生の年度が終わった在校生は卒業生にし、進路の入力をやり直してもらう
          if (p && p.role === "student" && p.entryYear && gradeOf(p.entryYear) > 6) {
            await updateDoc(doc(f.db, "profiles", u.uid), {
              role: "alumni",
              graduationYear: p.entryYear + 5,
              isProfileComplete: false,
              pathType: null,
              universityYear: null,
            }).catch(() => {});
            return; // 更新後の内容で onSnapshot がもう一度呼ばれる
          }
          setProfile(p);
          setProfileLoaded(true);
          setReady(true);
        },
        () => {
          setProfileLoaded(true);
          setReady(true);
        },
      );
      // 運営判定：admins/{メール} があり、メールが確認済み（ルールと同じ条件）
      if (u.email && u.emailVerified) {
        getDoc(doc(f.db, "admins", u.email))
          .then((d) => setIsAdmin(d.exists()))
          .catch(() => setIsAdmin(false));
      }
      countUnread(u.uid).then(setUnread);
    });
    return () => {
      stop();
      stopProfile?.();
    };
  }, []);

  const refreshUnread = useCallback(() => {
    if (user) countUnread(user.uid).then(setUnread);
  }, [user]);

  const verified = user ? isVerified(user) : false;
  const value: AuthState = {
    ready: ready && (!user || profileLoaded),
    user,
    profile,
    isAdmin,
    isMember: Boolean(user && verified && profile?.isProfileComplete && !profile.isSuspended),
    needsVerify: Boolean(user && !verified),
    unread,
    refreshUnread,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function Loading() {
  return (
    <div className="bg-surface-soft">
      <p role="status" className="mx-auto max-w-page px-6 py-24 text-center text-ink-muted md:px-12">
        読み込んでいます…
      </p>
    </div>
  );
}

/**
 * ログインが必要なページを包む。
 * member: true なら、プロフィール完成まで求める（相談の投稿など）。
 */
export function Gate({ children, member = false, next }: { children: ReactNode; member?: boolean; next: string }) {
  const { ready, user, profile, needsVerify } = useAuth();
  const router = useRouter();
  const blocked = ready && (!user || (member && (needsVerify || !profile?.isProfileComplete)));
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(next)}`);
    else if (member && (needsVerify || !profile?.isProfileComplete)) router.replace(`/onboarding?next=${encodeURIComponent(next)}`);
  }, [ready, user, profile, needsVerify, member, next, router]);
  if (!ready || blocked) return <Loading />;
  return <>{children}</>;
}
