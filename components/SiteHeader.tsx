"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Shield, User } from "lucide-react";
import { Logo } from "./Logo";
import { buttonClass } from "./Button";
import { useAuth } from "./AuthProvider";
import { messages } from "@/lib/messages";
import { fb } from "@/lib/firebase/client";

export function SiteHeader() {
  const { ready, user, unread, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const m = messages.nav;
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navLink = "inline-flex min-h-[44px] items-center text-ink no-underline hover:text-brand hover:no-underline";

  // ページを移ったら閉じる
  useEffect(() => setOpen(false), [pathname]);

  // 開いているあいだは背景をスクロールさせない。Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    // 先にトップへ移ってからログアウトする（ログインが必要なページでログイン画面へ飛ばされないように）
    setOpen(false);
    router.replace("/");
    const f = fb();
    if (f) await signOut(f.auth);
  }

  const sections = [
    { href: "/#features", label: m.features },
    { href: "/board", label: m.board },
    { href: "/#flow", label: m.flow },
    { href: "/#faq", label: m.faq },
  ];
  const dot = unread > 0 && <span className="h-2 w-2 rounded-full bg-accent" role="img" aria-label="新しいお知らせがあります" />;

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-4 py-3 sm:px-6 md:px-12">
        <Logo />

        {/* パソコン：横並びのメニュー */}
        <nav aria-label={m.mainMenu} className="hidden items-center gap-x-6 text-label lg:flex">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className={navLink}>{s.label}</Link>
          ))}
          {!ready ? (
            <span className="inline-block min-h-[44px] w-[140px]" aria-hidden="true" />
          ) : user ? (
            <>
              <Link href="/mypage" className={buttonClass("soft")}>
                <User size={18} strokeWidth={1.75} aria-hidden="true" />
                {m.mypage}
                {dot}
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

        {/* スマホ・タブレット：ハンバーガーメニュー */}
        <button
          ref={toggleRef}
          type="button"
          className="sn-burger relative inline-flex h-11 w-11 items-center justify-center rounded-pill text-ink transition-colors hover:bg-brand-soft active:scale-95 lg:hidden"
          aria-expanded={open}
          aria-controls="sn-mobile-menu"
          aria-label={open ? "メニューを閉じる" : "メニューを開く"}
          onClick={() => setOpen(!open)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          {!open && unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />}
        </button>
      </div>

    </header>
    {/* ヘッダーの backdrop-blur の中に置くと fixed が効かないので、ヘッダーの外に置く */}
      {open && (
      <>
        <button
          type="button"
          aria-label="メニューを閉じる"
          tabIndex={-1}
          className="sn-fade fixed inset-0 top-[69px] z-40 bg-[rgba(10,22,44,0.35)] lg:hidden"
          onClick={() => setOpen(false)}
        />
        <nav
          id="sn-mobile-menu"
          aria-label={m.mainMenu}
          className="sn-menu-panel fixed inset-x-0 top-[69px] z-50 max-h-[calc(100dvh-69px)] overflow-y-auto border-b border-line bg-surface shadow-card lg:hidden"
        >
          <ul className="mx-auto flex max-w-page flex-col px-4 py-2 sm:px-6">
            {sections.map((s, i) => (
              <li key={s.href} className="sn-menu-item border-b border-line last:border-b-0" style={{ ["--i" as string]: i }}>
                <Link href={s.href} onClick={() => setOpen(false)}
                  className="flex min-h-[52px] items-center text-label text-ink no-underline hover:text-brand hover:no-underline">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="sn-menu-item mx-auto flex max-w-page flex-col gap-3 border-t border-line px-4 py-4 sm:px-6" style={{ ["--i" as string]: sections.length }}>
            {!ready ? null : user ? (
              <>
                <Link href="/mypage" onClick={() => setOpen(false)} className={buttonClass("soft", "w-full")}>
                  <User size={18} strokeWidth={1.75} aria-hidden="true" />
                  {m.mypage}
                  {dot}
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setOpen(false)} className={buttonClass("ghost", "w-full border border-line")}>
                    <Shield size={18} strokeWidth={1.75} aria-hidden="true" />
                    管理
                  </Link>
                )}
                <button type="button" onClick={logout} className={buttonClass("ghost", "w-full border border-line")}>{m.logout}</button>
              </>
            ) : (
              <>
                <Link href="/signup" onClick={() => setOpen(false)} className={buttonClass("primary", "w-full")}>{m.signup}</Link>
                <Link href="/login" onClick={() => setOpen(false)} className={buttonClass("ghost", "w-full border border-line")}>{m.login}</Link>
              </>
            )}
          </div>
        </nav>
      </>
    )}
    </>
  );
}
