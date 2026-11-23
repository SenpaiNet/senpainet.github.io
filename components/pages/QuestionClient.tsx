"use client";

import Link from "next/link";
import { profileHref, questionHref } from "@/lib/routes";
import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { Loading, useAuth } from "@/components/AuthProvider";
import { AnswerSection } from "@/components/AnswerSection";
import { buttonClass } from "@/components/Button";
import { ReportButton } from "@/components/ReportButton";
import { BackLink, PageBody, ResolvedBadge, Tag } from "@/components/ui";
import { fb } from "@/lib/firebase/client";
import { attrFromAuthor, clubLabels, formatDate, pathLabels, streamLabels } from "@/lib/profile";
import { categoryName, useCategories } from "@/lib/qa/categories";
import { getBody, getOwnership, listAnswers, myVotes, toQuestion } from "@/lib/qa/reads";
import type { QaAnswer, QaQuestion } from "@/lib/qa/types";
import { markNotificationsRead, markQuestionSeen } from "@/lib/qa/writes";

type Loaded = {
  question: QaQuestion;
  body: string | null;
  mine: boolean;
  answers: QaAnswer[];
  voted: Set<string>;
};

export function QuestionClient({ id }: { id: string }) {
  const { ready, user, profile, isMember, refreshUnread } = useAuth();
  const cats = useCategories();
  const [data, setData] = useState<Loaded | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  const load = useCallback(async () => {
    const f = fb();
    if (!f) return setState("missing");
    try {
      const snap = await getDoc(doc(f.db, "questions", id));
      if (!snap.exists()) return setState("missing");
      const question = toQuestion(snap);
      if (!user) {
        setData({ question, body: null, mine: false, answers: [], voted: new Set() });
        return setState("ok");
      }
      const [body, owner, answers] = await Promise.all([
        getBody(f.db, id),
        getOwnership(f.db, id, user.uid),
        listAnswers(f.db, id, question.audience).catch(() => [] as QaAnswer[]),
      ]);
      const voted = await myVotes(f.db, id, answers.map((a) => a.id), user.uid);
      setData({ question, body, mine: Boolean(owner), answers, voted });
      setState("ok");

      // 開いたら既読にする：自分の相談の回答と、この相談についてのお知らせ
      let changed = false;
      if (owner && owner.seenAnswerCount !== question.answerCount) {
        await markQuestionSeen(f.db, id, question.answerCount).catch(() => {});
        changed = true;
      }
      const ns = await getDocs(
        query(collection(f.db, "notifications"), where("userId", "==", user.uid), where("questionId", "==", id), where("isRead", "==", false)),
      ).catch(() => null);
      if (ns && ns.size) {
        await markNotificationsRead(f.db, ns.docs.map((d) => d.id)).catch(() => {});
        changed = true;
      }
      if (changed) refreshUnread();
    } catch {
      setState("missing");
    }
  }, [id, user, refreshUnread]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready || state === "loading") return <Loading />;
  if (state === "missing" || !data) {
    return (
      <PageBody width="860px">
        <BackLink href="/board">相談一覧に戻る</BackLink>
        <p className="rounded-md bg-surface p-6 text-center">この相談は見つかりませんでした。削除されたか、非表示になった可能性があります。</p>
      </PageBody>
    );
  }

  const { question, body, mine, answers, voted } = data;
  const a = attrFromAuthor(question.author);
  const tags = question.categories.map((s) => categoryName(cats, s));
  const wants = [
    question.targetStream ? streamLabels[question.targetStream] : null,
    question.targetPathType ? pathLabels[question.targetPathType] : null,
    question.targetClubType ? clubLabels[question.targetClubType] : null,
  ].filter(Boolean);

  if (!user) {
    return (
      <PageBody width="860px">
        <BackLink href="/board">相談一覧に戻る</BackLink>
        <article className="flex flex-col gap-4 rounded-lg bg-surface p-6 shadow-card md:p-10">
          <div className="flex flex-wrap items-center gap-1.5">
            {question.status === "resolved" && <ResolvedBadge />}
            {tags.map((t) => <Tag key={t}>{t}</Tag>)}
          </div>
          <h1 className="text-h2">{question.title}</h1>
          <p className="rounded-md bg-brand-soft p-4 text-body-sm">
            相談の内容と回答を読むには、ログインが必要です。
            <Link href={`/login?next=${encodeURIComponent(questionHref(id))}`} className="ml-1 font-bold">ログインする</Link>
            <span className="mx-1">／</span>
            <Link href="/signup" className="font-bold">無料で登録する</Link>
          </p>
        </article>
      </PageBody>
    );
  }

  const authorLabel = question.isAnonymous ? `匿名・${a.role}` : (question.author.name ?? a.role);
  return (
    <PageBody width="860px">
      <BackLink href="/board">相談一覧に戻る</BackLink>

      <article className="flex flex-col gap-4 rounded-lg bg-surface p-6 shadow-card md:p-10">
        <div className="flex flex-wrap items-center gap-1.5">
          {question.status === "resolved" && <ResolvedBadge />}
          {question.audience !== "national" && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-ink px-[10px] py-[3px] text-caption font-bold text-surface">学内の相談</span>
          )}
          {question.status === "hidden" && <span className="text-caption font-bold text-accent-strong">非表示中（運営の判断）</span>}
          {tags.map((t) => <Tag key={t}>{t}</Tag>)}
        </div>
        <h1 className="text-h2">{question.title}</h1>
        <p className="whitespace-pre-line break-words text-body">{body ?? "（本文を読み込めませんでした）"}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
            {question.author.id ? (
              <Link href={profileHref(question.author.id)} className="rounded-sm bg-brand-soft px-2 py-px font-bold text-ink no-underline">{authorLabel}</Link>
            ) : (
              <span className="rounded-sm bg-brand-soft px-2 py-px font-bold text-ink">{authorLabel}</span>
            )}
            {[question.isAnonymous ? null : a.role, a.meta, formatDate(question.createdAt)].filter(Boolean).join(" ・ ")}
            {wants.length > 0 && ` ・ 答えてほしい先輩：${wants.join("・")}`}
          </p>
          {mine ? (
            <span className="text-caption text-ink-muted">あなたの相談です</span>
          ) : (
            <ReportButton userId={user.uid} targetType="question" targetId={question.id} questionId={question.id} />
          )}
        </div>
      </article>

      <AnswerSection
        key={answers.length + (question.bestAnswerId ?? "")}
        userId={user.uid}
        profile={profile}
        questionId={question.id}
        isQuestionMine={mine}
        bestAnswerId={question.bestAnswerId}
        canAnswer={isMember && question.visible}
        answers={answers}
        votedIds={voted}
        onChanged={load}
      />
      {!isMember && (
        <p className="rounded-md bg-brand-soft p-4 text-body-sm">
          {profile?.isSuspended ? "運営の判断により、いまは回答できません。" : "回答するには、プロフィールの作成が必要です。"}
          {!profile?.isSuspended && (
            <Link href={`/onboarding?next=${encodeURIComponent(questionHref(id))}`} className={`${buttonClass("primary")} ml-3`}>プロフィールを作る</Link>
          )}
        </p>
      )}
    </PageBody>
  );
}
