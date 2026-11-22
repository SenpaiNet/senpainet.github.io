"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { User } from "lucide-react";
import { Logo } from "./Logo";
import { buttonClass } from "./Button";
import { useAuth } from "./AuthProvider";
import { messages } from "@/lib/messages";
import { fb } from "@/lib/firebase/client";

export function SiteHeader() {
  const { ready, user, unread, isAdmin } = useAuth();
  const router = useRouter();
  const m = messages.nav;
  const navLink = "inline-flex min-h-[44px] items-center text-ink no-underline hover:text-brand hover:no-underline";

  async function logout() {
    // 先にトップへ移ってからログアウトする（ログインが必要なページでログイン画面へ飛ばされないように）
    router.replace("/");
    const f = fb();
    if (f) await signOut(f.auth);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3 md:px-12">
        <Logo />
        <nav aria-label={m.mainMenu} className="flex flex-wrap items-center gap-x-6 gap-y-1 text-label">
          <Link href="/#features" className={`${navLink} hidden md:inline-flex`}>{m.features}</Link>
          <Link href="/board" className={navLink}>{m.board}</Link>
          <Link href="/#flow" className={`${navLink} hidden md:inline-flex`}>{m.flow}</Link>
          <Link href="/#faq" className={`${navLink} hidden md:inline-flex`}>{m.faq}</Link>
          {!ready ? (
            <span className="inline-block min-h-[44px] w-[140px]" aria-hidden="true" />
          ) : user ? (
            <>
              <Link href="/mypage" className={buttonClass("soft")}>
                <User size={18} strokeWidth={1.75} aria-hidden="true" />
                {m.mypage}
                {unread > 0 && <span className="h-2 w-2 rounded-full bg-accent" role="img" aria-label="新しいお知らせがあります" />}
              </Link>
              {isAdmin && <Link href="/admin" className={navLink}>管理</Link>}
              <button type="button" onClick={logout} className={`${navLink} cursor-pointer`}>{m.logout}</button>
            </>
          ) : (
            <>
              <Link href="/login" className={navLink}>{m.login}</Link>
              <Link href="/signup" className={buttonClass("primary")}>{m.signup}</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
