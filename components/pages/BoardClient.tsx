"use client";

import Link from "next/link";
import { questionHref } from "@/lib/routes";
import { useEffect, useMemo, useState } from "react";
import type { DocumentSnapshot } from "firebase/firestore";
import { MessageCircle, Plus, Search } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Button, buttonClass } from "@/components/Button";
import { QuestionCard } from "@/components/QuestionCard";
import { chipClass } from "@/components/ui";
import { fb, firebaseConfigured } from "@/lib/firebase/client";
import { attrFromAuthor, formatDate } from "@/lib/profile";
import { categoryName, useCategories } from "@/lib/qa/categories";
import { getBody, listQuestions, type BoardSort } from "@/lib/qa/reads";
import type { QaQuestion } from "@/lib/qa/types";

const sorts = [
  { id: "new", label: "新着" },
  { id: "many", label: "回答が多い" },
  { id: "open", label: "未解決" },
] as const;

export type BoardParams = { category?: string; sort?: string; unanswered?: string; q?: string };

function href(p: BoardParams, patch: Partial<BoardParams>) {
  const sp = new URLSearchParams();
  Object.entries({ ...p, ...patch }).forEach(([k, v]) => v && sp.set(k, v));
  const s = sp.toString();
  return s ? `/board?${s}` : "/board";
}

export function BoardClient({ params: p }: { params: BoardParams }) {
  const { ready, user } = useAuth();
  const cats = useCategories();
  const sort = (sorts.some((s) => s.id === p.sort) ? p.sort : "new") as BoardSort;
  const unanswered = p.unanswered === "1";
  const q = (p.q ?? "").trim().slice(0, 50);

  const [items, setItems] = useState<QaQuestion[]>([]);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [last, setLast] = useState<DocumentSnapshot | undefined>();
  const [more, setMore] = useState(false);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  async function load(after?: DocumentSnapshot) {
    const f = fb();
    if (!f) return;
    try {
      const r = await listQuestions(f.db, { category: p.category, sort, unanswered }, after);
      setItems((prev) => (after ? [...prev, ...r.items] : r.items));
      setLast(r.last);
      setMore(r.full);
      setState("ok");
      // 本文の冒頭はログインした人だけ
      if (user) {
        const pairs = await Promise.all(r.items.map(async (it) => [it.id, (await getBody(f.db, it.id)) ?? ""] as const));
        setBodies((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
      }
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    if (!ready) return;
    setState("loading");
    setItems([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, p.category, sort, unanswered]);

  // キーワード検索は、読み込んだ相談のタイトルと本文から探す（Firestore は部分一致検索ができないため）
  const shown = useMemo(() => {
    if (!q) return items;
    const k = q.toLowerCase();
    return items.filter((it) => it.title.toLowerCase().includes(k) || (bodies[it.id] ?? "").toLowerCase().includes(k));
  }, [items, bodies, q]);

  const pill = (on: boolean) =>
    `inline-flex min-h-[40px] items-center rounded-pill px-4 text-label no-underline hover:no-underline ${
      on ? "bg-brand text-on-brand hover:text-on-brand" : "text-ink hover:text-ink"
    }`;

  return (
    <div className="bg-surface-soft">
      <div className="mx-auto flex max-w-page flex-col gap-8 px-6 pb-24 pt-12 md:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-label text-brand">相談一覧</p>
            <h1 className="font-display text-display-xl text-brand">Board</h1>
          </div>
          <Link href="/board/new" className={buttonClass("accent", "min-h-[52px] px-7 text-[15px]")}>
            <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
            先輩に相談する
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form action="/board" className="flex min-h-[48px] flex-[1_1_320px] items-center gap-2.5 rounded-pill border border-line bg-surface px-4">
            <label htmlFor="search" className="sr-only">相談を検索</label>
            <Search size={20} strokeWidth={1.75} className="text-ink-muted" aria-hidden="true" />
            <input id="search" name="q" type="search" defaultValue={q} placeholder="キーワードで相談を探す"
              className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted focus-visible:outline-none" />
            {p.category && <input type="hidden" name="category" value={p.category} />}
            {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
            {unanswered && <input type="hidden" name="unanswered" value="1" />}
          </form>
          <div role="group" aria-label="並び替え" className="flex gap-1 rounded-pill border border-line bg-surface p-1">
            {sorts.map((s) => (
              <Link key={s.id} href={href(p, { sort: s.id })} aria-current={sort === s.id ? "true" : undefined} className={pill(sort === s.id)}>
                {s.label}
              </Link>
            ))}
          </div>
          <Link
            href={href(p, { unanswered: unanswered ? undefined : "1" })}
            aria-pressed={unanswered}
            className={`inline-flex min-h-[48px] items-center gap-1.5 rounded-pill border px-[18px] text-label no-underline hover:no-underline ${
              unanswered ? "border-brand bg-brand-soft text-brand-deep" : "border-line bg-surface text-ink"
            }`}
          >
            <MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />
            未回答だけ
          </Link>
        </div>

        <div className="flex flex-wrap items-start gap-6 md:gap-8">
          <aside className="flex min-w-0 max-w-full flex-[1_1_220px] flex-col gap-3">
            <h2 className="text-card-title">カテゴリ</h2>
            <ul className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
              <li className="flex-none">
                <Link href={href(p, { category: undefined })}
                  className={`${chipClass(!p.category)} inline-flex items-center no-underline hover:no-underline ${!p.category ? "hover:text-on-brand" : ""}`}>
                  すべて
                </Link>
              </li>
              {cats.map((c) => (
                <li key={c.slug} className="flex-none">
                  <Link href={href(p, { category: c.slug })} aria-current={p.category === c.slug ? "true" : undefined}
                    className={`${chipClass(p.category === c.slug)} inline-flex items-center no-underline hover:no-underline ${p.category === c.slug ? "hover:text-on-brand" : ""}`}>
                    #{c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <section aria-label="相談の一覧" className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
            {!firebaseConfigured ? (
              <p className="text-body-sm text-ink-muted">Firebase の接続設定がありません。</p>
            ) : state === "loading" ? (
              <p role="status" className="text-body-sm text-ink-muted">読み込んでいます…</p>
            ) : state === "error" ? (
              <p role="alert" className="rounded-md bg-brand-soft p-4 text-body-sm">相談を読み込めませんでした。時間をおいて、もう一度開いてください。</p>
            ) : (
              <p className="text-body-sm text-ink-muted">
                {q ? `「${q}」を含む相談 ${shown.length}件（読み込んだ${items.length}件の中から）` : `${shown.length}件の相談${more ? "（続きがあります）" : ""}`}
              </p>
            )}
            {ready && !user && firebaseConfigured && (
              <p className="rounded-md bg-brand-soft p-4 text-body-sm">
                相談の内容を読むには<Link href="/login?next=/board" className="mx-1 font-bold">ログイン</Link>してください。
              </p>
            )}
            {shown.map((it) => {
              const a = attrFromAuthor(it.author);
              return (
                <QuestionCard
                  key={it.id}
                  href={questionHref(it.id)}
                  tags={it.categories.map((s) => categoryName(cats, s))}
                  title={it.title}
                  excerpt={user ? bodies[it.id] ?? null : null}
                  who={user ? (it.isAnonymous ? `匿名・${a.role}` : [a.role, a.meta].filter(Boolean).join("・")) : null}
                  date={formatDate(it.createdAt)}
                  answerCount={it.answerCount}
                  resolved={it.status === "resolved"}
                />
              );
            })}
            {state === "ok" && shown.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-md bg-surface px-6 py-12 text-center">
                <p>この条件に合う相談はまだありません。</p>
                <Link href="/board/new" className="text-label text-brand-deep">最初に相談してみる</Link>
              </div>
            )}
            {state === "ok" && more && (
              <Button variant="soft" className="self-center" onClick={() => load(last)}>もっと見る</Button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
