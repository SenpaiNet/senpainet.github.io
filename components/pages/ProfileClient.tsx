"use client";

import Link from "next/link";
import { questionHref, profileHref } from "@/lib/routes";
import { useEffect, useState } from "react";
import { collection, collectionGroup, doc, getCountFromServer, getDoc, query, where } from "firebase/firestore";
import { Gate, Loading, useAuth } from "@/components/AuthProvider";
import { buttonClass } from "@/components/Button";
import { BackLink, PageBody, Tag } from "@/components/ui";
import { fb } from "@/lib/firebase/client";
import { attrLabel, formatDate, pathLabels } from "@/lib/profile";
import { categoryName, useCategories } from "@/lib/qa/categories";
import { answersBy, titlesOf } from "@/lib/qa/reads";
import type { QaAnswer, QaProfile, QaQuestion } from "@/lib/qa/types";

type Data = { p: QaProfile; answers: QaAnswer[]; titles: Map<string, QaQuestion>; answerCount: number; bestCount: number };

function Inner({ id }: { id: string }) {
  const { user } = useAuth();
  const cats = useCategories();
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const f = fb();
    if (!f || !user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(f.db, "profiles", id));
        if (!snap.exists() || !snap.data().isProfileComplete) return setMissing(true);
        const [answers, ac, bc] = await Promise.all([
          answersBy(f.db, id, true, 20, "national").catch(() => [] as QaAnswer[]),
          getCountFromServer(query(collectionGroup(f.db, "qaAnswers"), where("author.id", "==", id), where("status", "==", "visible"), where("audience", "==", "national"))).catch(() => null),
          getCountFromServer(query(collection(f.db, "questions"), where("visible", "==", true), where("audience", "==", "national"), where("bestAnswerAuthorId", "==", id))).catch(() => null),
        ]);
        const titles = await titlesOf(f.db, answers.map((a) => a.questionId));
        setData({ p: snap.data() as QaProfile, answers, titles, answerCount: ac?.data().count ?? answers.length, bestCount: bc?.data().count ?? 0 });
      } catch {
        setMissing(true); // 非公開のプロフィールは読めない
      }
    })();
  }, [id, user]);

  if (missing) {
    return (
      <PageBody>
        <BackLink href="/board">相談一覧に戻る</BackLink>
        <p className="rounded-md bg-surface p-6 text-center">このプロフィールは見つからないか、公開されていません。</p>
      </PageBody>
    );
  }
  if (!data || !user) return <Loading />;
  const { p } = data;
  const a = attrLabel({
    role: p.role,
    entry_year: p.entryYear,
    graduation_year: p.graduationYear,
    stream: p.stream,
    club_type: p.clubType,
    university_year: p.universityYear,
    school_kind: p.schoolKind ?? null,
    school: p.schoolPublic ? p.schoolName ?? null : null,
  });
  const mine = id === user.uid;
  const askHref = p.categories[0] ? `/board/new?category=${p.categories[0]}` : "/board/new";

  return (
    <PageBody>
      <BackLink href="/board">相談一覧に戻る</BackLink>
      <section className="overflow-hidden rounded-lg bg-surface shadow-card">
        <div className="h-28 bg-brand" aria-hidden="true" />
        <div className="flex flex-col items-center gap-2 px-6 pb-8 text-center">
          <span aria-hidden="true" className="-mt-10 flex h-20 w-20 items-center justify-center rounded-pill border-4 border-surface bg-brand-soft font-heading text-[30px] font-bold text-brand-deep">
            {p.displayName.slice(0, 1)}
          </span>
          <h1 className="text-h3">{p.displayName}</h1>
          <p className="flex flex-wrap items-center justify-center gap-1.5 text-caption text-ink-muted">
            <span className="rounded-sm bg-brand-soft px-1.5 font-bold text-ink">{a.role}</span>
            {[a.meta, p.clubName].filter(Boolean).join("・")}
          </p>
          {p.role === "alumni" && (p.pathType || p.universityName) && (
            <p className="text-body-sm">
              {[p.universityName, p.universityNamePublic ? p.faculty : null, p.pathType ? pathLabels[p.pathType] : null].filter(Boolean).join(" ・ ")}
            </p>
          )}
          {p.bio && <p className="whitespace-pre-line text-body">{p.bio}</p>}
          <dl className="mt-3 flex w-full max-w-xs border-t border-line pt-4 text-left">
            <div className="flex flex-1 flex-col"><dd className="order-1 font-display text-[24px] font-semibold text-brand">{data.answerCount}</dd><dt className="order-2 text-caption text-ink-muted">回答</dt></div>
            <div className="flex flex-1 flex-col"><dd className="order-1 font-display text-[24px] font-semibold text-brand">{data.bestCount}</dd><dt className="order-2 text-caption text-ink-muted">ベストアンサー</dt></div>
          </dl>
        </div>
      </section>

      {p.categories.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-card-title">答えられること</h2>
          <div className="flex flex-wrap gap-1.5">{p.categories.map((s) => <Tag key={s}>{categoryName(cats, s)}</Tag>)}</div>
        </section>
      )}

      {!mine && p.role === "alumni" &&
        (p.isAccepting ? (
          <Link href={askHref} className={buttonClass("primary", "self-start")}>この先輩に相談する</Link>
        ) : (
          <p className="rounded-md bg-brand-soft p-4 text-body-sm">この先輩は今、相談を受け付けていません。</p>
        ))}

      <section className="flex flex-col gap-3">
        <h2 className="text-h3">これまでの回答</h2>
        {data.answers.length === 0 && <p className="rounded-md bg-surface p-6 text-center">まだ回答はありません。</p>}
        {data.answers.map((x) => {
          const q = data.titles.get(x.questionId);
          return (
            <Link key={x.id} href={questionHref(x.questionId)} className="flex flex-col gap-2 rounded-md bg-surface p-5 text-ink no-underline shadow-card hover:text-ink hover:no-underline">
              <span className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
                {q?.bestAnswerId === x.id && <span className="rounded-pill bg-highlight px-2.5 py-0.5 font-bold text-[#142b54]">ベストアンサー</span>}
                {q?.title ?? "相談"}
              </span>
              <span className="line-clamp-3 whitespace-pre-line text-body">{x.body}</span>
              <span className="text-caption text-ink-muted">参考になった {x.helpfulCount} ・ {formatDate(x.createdAt)}</span>
            </Link>
          );
        })}
      </section>
    </PageBody>
  );
}

export function ProfileClient({ id }: { id: string }) {
  return (
    <Gate next={profileHref(id)}>
      <Inner id={id} />
    </Gate>
  );
}
