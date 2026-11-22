"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "./Button";
import { messages } from "@/lib/messages";
import { allowedEmailDomain, safeNext, siteUrl } from "@/lib/config";
import { fb } from "@/lib/firebase/client";

const m = messages.auth;

const schema = z.object({
  email: z.string().trim().email(m.errors.invalidEmail),
  password: z.string().min(8, m.errors.weakPassword),
});
type Values = z.infer<typeof schema>;

function mapError(code: string): string {
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials"].includes(code))
    return m.errors.invalidCredentials;
  if (code === "auth/email-already-in-use") return m.errors.alreadyRegistered;
  if (code === "auth/weak-password") return m.errors.weakPassword;
  if (code === "auth/invalid-email") return m.errors.invalidEmail;
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "";
  if (code === "auth/operation-not-allowed") return "このログイン方法は、まだ有効になっていません。運営に問い合わせてください。";
  if (code === "auth/too-many-requests") return "試行回数が多すぎます。しばらく待ってから、もう一度試してください。";
  return m.errors.generic;
}

const domainOk = (email: string | null | undefined) =>
  !allowedEmailDomain || (email ?? "").toLowerCase().endsWith(`@${allowedEmailDomain}`);

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const isLogin = mode === "login";

  /** ログイン後の行き先：プロフィールがなければ作成へ */
  async function goAfterLogin(uid: string) {
    const f = fb()!;
    const p = await getDoc(doc(f.db, "profiles", uid)).catch(() => null);
    const complete = Boolean(p?.exists() && p.data().isProfileComplete);
    const dest = safeNext(next, "/");
    // 運営画面はプロフィールなしでも開ける
    if (complete || dest.startsWith("/admin")) router.replace(dest);
    else router.replace(`/onboarding?next=${encodeURIComponent(dest === "/" ? "/board" : dest)}`);
  }

  async function google() {
    setFormError(null);
    const f = fb();
    if (!f) return setFormError(m.setupMissing);
    setBusy(true);
    try {
      const cred = await signInWithPopup(f.auth, new GoogleAuthProvider());
      if (!domainOk(cred.user.email)) {
        await f.auth.signOut();
        setBusy(false);
        return setFormError(m.errors.domain(allowedEmailDomain));
      }
      await goAfterLogin(cred.user.uid);
    } catch (e) {
      setBusy(false);
      const msg = mapError((e as { code?: string }).code ?? "");
      if (msg) setFormError(msg);
    }
  }

  async function onSubmit({ email, password }: Values) {
    setFormError(null);
    setInfo(null);
    const f = fb();
    if (!f) return setFormError(m.setupMissing);
    if (!isLogin && !domainOk(email)) return setFormError(m.errors.domain(allowedEmailDomain));
    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(f.auth, email, password);
        await goAfterLogin(cred.user.uid);
      } else {
        const cred = await createUserWithEmailAndPassword(f.auth, email, password);
        await sendEmailVerification(cred.user, { url: `${siteUrl}/onboarding` });
        setSent(true);
      }
    } catch (e) {
      setFormError(mapError((e as { code?: string }).code ?? "") || m.errors.generic);
    }
  }

  async function resetPassword() {
    setFormError(null);
    const email = getValues("email")?.trim();
    const f = fb();
    if (!f) return setFormError(m.setupMissing);
    if (!email) return setFormError("メールアドレスを入力してから押してください。");
    try {
      await sendPasswordResetEmail(f.auth, email, { url: `${siteUrl}/login` });
    } catch {
      // 登録の有無を知らせないため、結果に関係なく同じ案内を出す
    }
    setInfo("パスワードを再設定するメールを送りました。届かないときは、迷惑メールフォルダも見てください。");
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-brand-soft text-brand-deep">
          <MailCheck size={22} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h2 className="text-h3">{m.checkMailTitle}</h2>
        <p>{m.checkMail}</p>
        <Link href="/onboarding" className="self-start text-label">確認できたらプロフィールを作る</Link>
      </div>
    );
  }

  const input =
    "mt-2 min-h-[44px] w-full rounded-md border border-line bg-surface px-4 text-body text-ink placeholder:text-ink-muted";
  return (
    <div className="flex flex-col gap-6">
      <Button type="button" variant="ghost" onClick={google} disabled={busy} className="border border-line bg-surface">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Google で{isLogin ? "ログイン" : "登録"}する
      </Button>
      <div className="flex items-center gap-3 text-caption text-ink-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />または<span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <div>
          <label htmlFor="email" className="text-label">{m.email}</label>
          <input id="email" type="email" autoComplete="email" className={input} aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-err" : undefined} {...register("email")} />
          {errors.email && <p id="email-err" className="mt-1 text-body-sm text-accent-strong">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="text-label">{m.password}</label>
          <input id="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} className={input}
            aria-invalid={!!errors.password}
            aria-describedby={!isLogin && !errors.password ? "password-hint" : undefined} {...register("password")} />
          {!isLogin && !errors.password && <p id="password-hint" className="mt-1 text-caption text-ink-muted">{m.passwordHint}</p>}
          {errors.password && <p className="mt-1 text-body-sm text-accent-strong">{errors.password.message}</p>}
          {isLogin && (
            <button type="button" onClick={resetPassword} className="mt-2 min-h-[44px] text-body-sm text-brand-deep underline">
              パスワードを忘れたとき
            </button>
          )}
        </div>
        {formError && <p role="alert" className="rounded-md bg-brand-soft p-4 text-body-sm text-ink">{formError}</p>}
        {info && <p role="status" className="rounded-md bg-brand-soft p-4 text-body-sm text-ink">{info}</p>}
        <Button type="submit" disabled={isSubmitting}>{isLogin ? m.loginSubmit : m.signupSubmit}</Button>
        <p className="text-body-sm">
          {isLogin ? m.noAccount : m.hasAccount}
          <Link href={isLogin ? "/signup" : "/login"} className="ml-1 font-bold">
            {isLogin ? messages.nav.signup : messages.nav.login}
          </Link>
        </p>
      </form>
    </div>
  );
}
