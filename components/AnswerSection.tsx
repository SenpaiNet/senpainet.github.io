"use client";

import Link from "next/link";
import { profileHref } from "@/lib/routes";
import { useMemo, useState } from "react";
import { Info, ThumbsUp, Trophy } from "lucide-react";
import { Button } from "./Button";
import { ReportButton } from "./ReportButton";
import { fb } from "@/lib/firebase/client";
import { attrFromAuthor, formatDate } from "@/lib/profile";
import type { QaAnswer, QaProfile } from "@/lib/qa/types";
import { addAnswer, pickBestAnswer, setVote } from "@/lib/qa/writes";

type Sort = "new" | "helpful";

export function AnswerSection({
  userId,
  profile,
  questionId,
  isQuestionMine,
  bestAnswerId,
  canAnswer,
  answers,
  votedIds,
  onChanged,
}: {
  userId: string;
  profile: QaProfile | null;
  questionId: string;
  isQuestionMine: boolean;
  bestAnswerId: string | null;
  canAnswer: boolean;
  answers: QaAnswer[];
  votedIds: Set<string>;
  onChanged: () => void;
}) {
  const [sort, setSort] = useState<Sort>("new");
  const [voted, setVoted] = useState<Record<string, boolean>>(() => Object.fromEntries(answers.map((a) => [a.id, votedIds.has(a.id)])));
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countOf = (a: QaAnswer) => a.helpfulCount + (voted[a.id] ? 1 : 0) - (votedIds.has(a.id) ? 1 : 0);

  // 返信（parentId つき。旧サイトから移したもの）は回答の下に並べ、回答数には数えない
  const top = useMemo(() => answers.filter((a) => !a.parentId), [answers]);
  const repliesOf = useMemo(() => {
    const m = new Map<string, QaAnswer[]>();
    answers.filter((a) => a.parentId).forEach((a) => m.set(a.parentId!, [...(m.get(a.parentId!) ?? []), a]));
    return m;
  }, [answers]);

  const list = useMemo(() => {
    const l = [...top];
    if (sort === "helpful") l.sort((x, y) => countOf(y) - countOf(x));
    if (bestAnswerId) l.sort((x, y) => Number(y.id === bestAnswerId) - Number(x.id === bestAnswerId));
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top, sort, bestAnswerId, voted]);

  async function toggleVote(a: QaAnswer) {
    const f = fb();
    if (!f) return;
    const on = !voted[a.id];
    setVoted((v) => ({ ...v, [a.id]: on }));
    try {
      await setVote(f.db, userId, questionId, a.id, on);
    } catch {
      setVoted((v) => ({ ...v, [a.id]: !on })); // 失敗したら戻す
    }
  }

  async function pickBest(a: QaAnswer) {
    const f = fb();
    if (!f) return;
    try {
      await pickBestAnswer(f.db, questionId, a);
      onChanged();
    } catch {
      setError("ベストアンサーを選べませんでした。もう一度試してください。");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    const f = fb();
    if (!body || !f || !profile) return;
    setError(null);
    const lastMs = profile.lastPostAt?.toMillis?.() ?? 0;
    if (Date.now() - lastMs < 20_000) return setError("続けて投稿しています。少し待ってから、もう一度投稿してください。");
    setPosting(true);
    try {
      await addAnswer(f.db, userId, profile, questionId, body);
      setDraft("");
      onChanged();
    } catch {
      setError("投稿できませんでした。時間をおいて、もう一度試してください。");
    } finally {
      setPosting(false);
    }
  }

  const pill = (on: boolean) => `min-h-[40px] rounded-pill px-4 text-label ${on ? "bg-brand text-on-brand" : "bg-transparent text-ink"}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h2 className="text-h3">回答 {top.length}件</h2>
        <div role="group" aria-label="回答の並び替え" className="flex gap-1 rounded-pill border border-line bg-surface p-1">
          <button type="button" aria-pressed={sort === "new"} onClick={() => setSort("new")} className={pill(sort === "new")}>投稿順</button>
          <button type="button" aria-pressed={sort === "helpful"} onClick={() => setSort("helpful")} className={pill(sort === "helpful")}>参考になった順</button>
        </div>
      </div>

      {isQuestionMine && !bestAnswerId && top.length > 0 && (
        <p className="flex items-center gap-2 rounded-md bg-brand-soft px-[18px] py-3.5 text-label font-normal">
          <Info size={18} strokeWidth={1.75} className="flex-none text-brand-deep" aria-hidden="true" />
          いちばん役に立った回答を「ベストアンサーに選ぶ」で選ぶと、この相談は解決済みになります。
        </p>
      )}

      {error && <p role="alert" className="rounded-md bg-brand-soft p-4 text-body-sm">{error}</p>}

      <ul className="flex flex-col gap-3">
        {list.length === 0 && <li className="rounded-md bg-surface p-6 text-center">まだ回答はありません。先輩からの回答を待ちましょう。</li>}
        {list.map((a) => {
          const isBest = a.id === bestAnswerId;
          const at = attrFromAuthor(a.author);
          const name = a.author.name ?? "匿名";
          const mine = a.author.id === userId;
          return (
            <li key={a.id} className={`flex flex-col gap-3.5 rounded-md border-2 bg-surface p-6 ${isBest ? "border-highlight shadow-[0_4px_14px_rgba(0,40,90,0.12)]" : "border-transparent shadow-card"}`}>
              {isBest && (
                <p className="inline-flex items-center gap-1.5 self-start rounded-pill bg-highlight px-3 py-1 text-caption font-bold text-[#142b54]">
                  <Trophy size={14} strokeWidth={1.75} aria-hidden="true" />
                  ベストアンサー
                </p>
              )}
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-pill bg-brand-soft font-heading text-card-title font-bold text-brand-deep">
                  {name.slice(0, 1)}
                </span>
                <div className="flex flex-col">
                  {a.author.id ? (
                    <Link href={profileHref(a.author.id)} className="font-heading text-card-title font-bold text-ink no-underline hover:underline">{name}</Link>
                  ) : (
                    <span className="font-heading text-card-title font-bold">{name}</span>
                  )}
                  <span className="flex flex-wrap items-center gap-1.5 text-caption text-ink-muted">
                    <span className="rounded-sm bg-brand-soft px-1.5 font-bold text-ink">{at.role}</span>
                    {[at.meta, formatDate(a.createdAt)].filter(Boolean).join(" ・ ")}
                  </span>
                </div>
              </div>
              <p className="whitespace-pre-line break-words text-body">{a.body}</p>
              {(repliesOf.get(a.id) ?? []).length > 0 && (
                <ul aria-label="この回答への返信" className="flex flex-col gap-2 border-l-2 border-line pl-4">
                  {repliesOf.get(a.id)!.map((r) => {
                    const ra = attrFromAuthor(r.author);
                    return (
                      <li key={r.id} className="flex flex-col gap-1">
                        <span className="text-caption text-ink-muted">返信 ・ {[r.author.name ?? `匿名・${ra.role}`, formatDate(r.createdAt)].join(" ・ ")}</span>
                        <p className="whitespace-pre-line break-words text-body-sm">{r.body}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <div className="flex flex-wrap gap-2">
                  {mine || !canAnswer ? (
                    <span className="inline-flex min-h-[44px] items-center gap-1.5 text-body-sm text-ink-muted">
                      <ThumbsUp size={16} strokeWidth={1.75} aria-hidden="true" />参考になった {countOf(a)}
                    </span>
                  ) : (
                    <button type="button" aria-pressed={!!voted[a.id]} onClick={() => toggleVote(a)}
                      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-pill border px-4 text-body-sm font-bold ${voted[a.id] ? "border-brand bg-brand text-on-brand" : "border-line bg-surface text-ink"}`}>
                      <ThumbsUp size={16} strokeWidth={1.75} aria-hidden="true" />参考になった {countOf(a)}
                    </button>
                  )}
                  {isQuestionMine && !bestAnswerId && !mine && (
                    <button type="button" onClick={() => pickBest(a)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-pill border border-brand bg-surface px-4 text-body-sm font-bold text-brand-deep">
                      ベストアンサーに選ぶ
                    </button>
                  )}
                </div>
                {!mine && <ReportButton userId={userId} targetType="answer" targetId={a.id} questionId={questionId} />}
              </div>
            </li>
          );
        })}
      </ul>

      {canAnswer && (
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg bg-surface-sky p-6 md:p-10">
          <h2 className="text-h3">先輩として回答する</h2>
          <label htmlFor="answer" className="text-label">回答の内容</label>
          <textarea id="answer" rows={6} maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="自分の経験をもとに、具体的に書いてみましょう。"
            className="w-full rounded-md border border-line bg-surface p-4 text-body text-ink placeholder:text-ink-muted" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-caption">{draft.length} / 2000字 ・ 個人名や連絡先は書かないでください</p>
            <Button type="submit" variant="accent" disabled={posting || !draft.trim()} className="min-h-[52px] px-7 text-[15px]">
              回答を投稿する
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
