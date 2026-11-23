"use client";

// トップページのうち、Firestore やログイン状態に応じて変わる部分
import { CountUp, Marquee } from "@/components/motion/Kinetic";
import Link from "next/link";
import { questionHref } from "@/lib/routes";
import { useEffect, useState } from "react";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Plus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { ButtonLink } from "@/components/Button";
import { QuestionCard } from "@/components/QuestionCard";
import { fb } from "@/lib/firebase/client";
import { attrFromAuthor, formatDate } from "@/lib/profile";
import { categoryName, useCategories } from "@/lib/qa/categories";
import { getBody, toQuestion } from "@/lib/qa/reads";
import type { QaQuestion } from "@/lib/qa/types";

export function CategoryLinks() {
  const cats = useCategories();
  return (
    <Marquee label="相談できるカテゴリ（カーソルを乗せると止まります）" seconds={45}>
      {cats.map((c) => (
        <Link key={c.slug} href={`/board?category=${c.slug}`}
          className="inline-flex min-h-[44px] flex-none items-center rounded-pill bg-surface px-[18px] text-label text-brand-deep no-underline transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand-deep hover:no-underline">
          #{c.name}
        </Link>
      ))}
    </Marquee>
  );
}

export function LatestQuestions() {
  const { ready, user } = useAuth();
  const cats = useCategories();
  const [items, setItems] = useState<QaQuestion[] | null>(null);
  const [bodies, setBodies] = useState<Record<string, string>>({});

  useEffect(() => {
    const f = fb();
    if (!ready || !f) return;
    getDocs(query(collection(f.db, "questions"), where("visible", "==", true), where("audience", "==", "national"), orderBy("createdAt", "desc"), limit(3)))
      .then(async (s) => {
        const list = s.docs.map(toQuestion);
        setItems(list);
        if (user) {
          const pairs = await Promise.all(list.map(async (q) => [q.id, (await getBody(f.db, q.id)) ?? ""] as const));
          setBodies(Object.fromEntries(pairs));
        }
      })
      .catch(() => setItems([]));
  }, [ready, user]);

  if (items === null) return <p role="status" className="text-body-sm text-ink-muted">読み込んでいます…</p>;
  return (
    <>
      {items.length > 0 ? (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {items.map((q, idx) => {
            const a = attrFromAuthor(q.author);
            return (
              <QuestionCard
                enterIndex={idx}
                key={q.id}
                href={questionHref(q.id)}
                tags={q.categories.slice(0, 2).map((s) => categoryName(cats, s))}
                title={q.title}
                excerpt={user ? bodies[q.id] ?? null : null}
                who={user ? (q.isAnonymous ? `匿名・${a.role}` : [a.role, a.meta].filter(Boolean).join("・")) : null}
                date={formatDate(q.createdAt)}
                answerCount={q.answerCount}
                resolved={q.status === "resolved"}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-md bg-surface p-6">
          <p>まだ相談はありません。最初の相談を投稿してみませんか。</p>
          <ButtonLink href="/board/new" variant="soft"><Plus size={18} strokeWidth={1.75} aria-hidden="true" />相談を書く</ButtonLink>
        </div>
      )}
      {ready && !user && <p className="text-body-sm text-ink-muted">相談の全文と回答を読むには、登録してログインしてください。</p>}
    </>
  );
}

/** 数字で見るSenpaiNet（0件のときは何も出さない） */
export function Numbers({ heading }: { heading: React.ReactNode }) {
  const { ready, user } = useAuth();
  const [items, setItems] = useState<{ n: number; unit: string; label: string }[] | null>(null);

  useEffect(() => {
    const f = fb();
    if (!ready || !f) return;
    (async () => {
      try {
        const visible = query(collection(f.db, "questions"), where("visible", "==", true), where("audience", "==", "national"));
        const [qs, answered] = await Promise.all([
          getCountFromServer(visible),
          getCountFromServer(query(collection(f.db, "questions"), where("visible", "==", true), where("audience", "==", "national"), where("answerCount", ">", 0))),
        ]);
        const total = qs.data().count;
        // 登録者数はプロフィールを読めるログイン中の人にだけ出す
        const members = user
          ? await getCountFromServer(query(collection(f.db, "profiles"), where("isPublic", "==", true), where("isProfileComplete", "==", true)))
              .then((r) => r.data().count)
              .catch(() => null)
          : null;
        const list = [
          members !== null ? { n: members, unit: "人", label: "登録している人（公開プロフィール）" } : null,
          { n: total, unit: "件", label: "相談" },
          total > 0 ? { n: Math.round((answered.data().count / total) * 100), unit: "%", label: "回答がついた相談" } : null,
        ].filter((x): x is { n: number; unit: string; label: string } => x !== null);
        setItems(total + (members ?? 0) > 0 ? list : []);
      } catch {
        setItems([]);
      }
    })();
  }, [ready, user]);

  if (!items || items.length === 0) return null;
  return (
    <section aria-label="数字で見るSenpaiNet" className="mx-auto max-w-page px-6 py-24 md:px-12">
      <div className="flex flex-col gap-8">
        {heading}
        <dl className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {items.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 rounded-md bg-surface p-6 shadow-card">
              <dd className="order-1 font-display text-[40px] font-semibold leading-none text-brand"><CountUp value={s.n} /><span className="ml-1 text-label">{s.unit}</span></dd>
              <dt className="order-2 text-body-sm text-ink-muted">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function CtaButton() {
  const { user } = useAuth();
  return (
    <Link href={user ? "/board" : "/signup"} className="inline-flex min-h-[52px] items-center rounded-pill bg-surface px-8 text-[15px] font-bold text-brand-deep no-underline hover:text-brand-deep hover:no-underline">
      {user ? "相談一覧を見る" : "無料で登録する"}
    </Link>
  );
}
