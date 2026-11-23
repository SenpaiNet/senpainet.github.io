"use client";

import Link from "next/link";
import { questionHref, profileHref } from "@/lib/routes";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, reauthenticateWithPopup } from "firebase/auth";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { MessageCircle, UserPen } from "lucide-react";
import { Gate, Loading, useAuth } from "@/components/AuthProvider";
import { Button, buttonClass } from "@/components/Button";
import { QuestionCard } from "@/components/QuestionCard";
import { PageBody, PageHeading } from "@/components/ui";
import { fb } from "@/lib/firebase/client";
import { attrFromAuthor, attrLabel, formatDate } from "@/lib/profile";
import { deleteAccount } from "@/lib/qa/account";
import { categoryName, useCategories } from "@/lib/qa/categories";
import { answersBy, myQuestions, titlesOf } from "@/lib/qa/reads";
import type { QaAnswer, QaNotification, QaQuestion } from "@/lib/qa/types";
import { markNotificationsRead } from "@/lib/qa/writes";

const tabs = [
  { id: "notices", label: "お知らせ" },
  { id: "questions", label: "自分の相談" },
  { id: "answers", label: "自分の回答" },
] as const;
type Tab = (typeof tabs)[number]["id"];

type Data = {
  notices: QaNotification[];
  questions: { question: QaQuestion; seenAnswerCount: number }[];
  answers: QaAnswer[];
  titles: Map<string, QaQuestion>;
};

function Inner({ tab }: { tab: Tab }) {
  const { user, profile, refreshUnread } = useAuth();
  const cats = useCategories();
  const [data, setData] = useState<Data | null>(null);

  async function load() {
    const f = fb();
    if (!f || !user) return;
    const [ns, qs, as] = await Promise.all([
      getDocs(query(collection(f.db, "notifications"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(50)))
        .then((s) => s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<QaNotification, "id">) })))
        .catch(() => [] as QaNotification[]),
      myQuestions(f.db, user.uid).catch(() => []),
      answersBy(f.db, user.uid, false).catch(() => [] as QaAnswer[]),
    ]);
    const titles = await titlesOf(f.db, [...ns.map((n) => n.questionId), ...as.map((a) => a.questionId)].filter(Boolean) as string[]);
    setData({ notices: ns, questions: qs, answers: as, titles });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user || !profile || !data) return <Loading />;

  const newAnswers = data.questions.filter((q) => q.question.answerCount > q.seenAnswerCount);
  const unreadNotices = data.notices.filter((n) => !n.isRead);
  const count: Record<Tab, number> = {
    notices: unreadNotices.length + newAnswers.length,
    questions: data.questions.length,
    answers: data.answers.length,
  };
  const a = attrLabel({
    role: profile.role,
    entry_year: profile.entryYear,
    graduation_year: profile.graduationYear,
    stream: profile.stream,
    club_type: profile.clubType,
    university_year: profile.universityYear,
    school_kind: profile.schoolKind ?? null,
    school: profile.schoolName ?? null,
  });
  const noticeText: Record<string, string> = { best_answer: "あなたの回答がベストアンサーに選ばれました" };

  return (
    <PageBody width="860px">
      <PageHeading label="マイページ" en="My page" />
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-pill bg-brand-soft font-heading text-[22px] font-bold text-brand-deep">
            {profile.displayName.slice(0, 1)}
          </span>
          <div className="flex flex-col">
            <span className="font-heading text-card-title font-bold">{profile.displayName}</span>
            <span className="flex flex-wrap items-center gap-1.5 text-caption text-ink-muted">
              <span className="rounded-sm bg-brand-soft px-1.5 font-bold text-ink">{a.role}</span>
              {a.meta}
              {profile.isSuspended && <span className="font-bold text-accent-strong">・運営の判断で投稿を止めています</span>}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={profileHref(user.uid)} className={buttonClass("soft")}>公開ページを見る</Link>
          <Link href="/onboarding?next=/mypage" className={buttonClass("soft")}><UserPen size={18} strokeWidth={1.75} aria-hidden="true" />プロフィールを編集</Link>
        </div>
      </section>

      <div role="tablist" aria-label="マイページの内容" className="flex flex-wrap gap-1 self-start rounded-pill border border-line bg-surface p-1">
        {tabs.map((x) => (
          <Link key={x.id} role="tab" aria-selected={tab === x.id} href={`/mypage?tab=${x.id}`}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-pill px-4 text-label no-underline hover:no-underline ${tab === x.id ? "bg-brand text-on-brand hover:text-on-brand" : "text-ink hover:text-ink"}`}>
            {x.label}
            {count[x.id] > 0 && <span className={`text-caption ${tab === x.id ? "" : "text-ink-muted"}`}>{count[x.id]}</span>}
          </Link>
        ))}
      </div>

      {tab === "notices" && (
        <section aria-label="お知らせ" className="flex flex-col gap-3">
          {unreadNotices.length > 0 && (
            <Button variant="soft" className="self-start" onClick={async () => {
              const f = fb();
              if (!f) return;
              await markNotificationsRead(f.db, unreadNotices.map((n) => n.id)).catch(() => {});
              await load();
              refreshUnread();
            }}>
              お知らせをすべて既読にする
            </Button>
          )}
          {newAnswers.map(({ question, seenAnswerCount }) => (
            <Link key={`new-${question.id}`} href={questionHref(question.id)} className="flex gap-3 rounded-md bg-surface p-5 text-ink no-underline shadow-card hover:text-ink hover:no-underline">
              <span className="mt-2 h-2 w-2 flex-none rounded-full bg-accent" role="img" aria-label="未読" />
              <span className="flex flex-col gap-0.5">
                <span className="font-bold">あなたの相談に回答が{question.answerCount - seenAnswerCount}件届きました</span>
                <span className="text-body-sm text-ink-muted">{question.title}</span>
              </span>
            </Link>
          ))}
          {data.notices.length === 0 && newAnswers.length === 0 && <p className="rounded-md bg-surface p-6 text-center">お知らせはまだありません。</p>}
          {data.notices.map((n) => {
            const title = n.questionId ? data.titles.get(n.questionId)?.title : undefined;
            const inner = (
              <>
                <span className={`mt-2 h-2 w-2 flex-none rounded-full ${n.isRead ? "bg-transparent" : "bg-accent"}`} role={n.isRead ? undefined : "img"} aria-label={n.isRead ? undefined : "未読"} />
                <span className="flex flex-col gap-0.5">
                  <span className={n.isRead ? "" : "font-bold"}>{n.message ?? noticeText[n.type] ?? "お知らせ"}</span>
                  {title && <span className="text-body-sm text-ink-muted">{title}</span>}
                  <span className="text-caption text-ink-muted">{formatDate(n.createdAt)}</span>
                </span>
              </>
            );
            return n.questionId && title ? (
              <Link key={n.id} href={questionHref(n.questionId)} className="flex gap-3 rounded-md bg-surface p-5 text-ink no-underline shadow-card hover:text-ink hover:no-underline">{inner}</Link>
            ) : (
              <div key={n.id} className="flex gap-3 rounded-md bg-surface p-5 shadow-card">{inner}</div>
            );
          })}
        </section>
      )}

      {tab === "questions" && (
        <section aria-label="自分の相談" className="flex flex-col gap-3">
          {data.questions.length === 0 && (
            <p className="rounded-md bg-surface p-6 text-center">まだ相談していません。<Link href="/board/new" className="ml-1 font-bold">相談を書く</Link></p>
          )}
          {data.questions.map(({ question: q, seenAnswerCount }) => {
            const at = attrFromAuthor(q.author);
            return (
              <div key={q.id} className="relative">
                <QuestionCard href={questionHref(q.id)} tags={q.categories.map((s) => categoryName(cats, s))} title={q.title} excerpt={null}
                  who={q.status === "hidden" ? "非表示中（運営の判断）" : q.isAnonymous ? `匿名・${at.role}` : null}
                  date={formatDate(q.createdAt)} answerCount={q.answerCount} resolved={q.status === "resolved"} />
                {q.answerCount > seenAnswerCount && <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-accent" role="img" aria-label="未読の回答があります" />}
              </div>
            );
          })}
        </section>
      )}

      {tab === "answers" && (
        <section aria-label="自分の回答" className="flex flex-col gap-3">
          {data.answers.length === 0 && <p className="rounded-md bg-surface p-6 text-center">まだ回答していません。<Link href="/board" className="ml-1 font-bold">相談を探す</Link></p>}
          {data.answers.map((x) => (
            <Link key={x.id} href={questionHref(x.questionId)} className="flex flex-col gap-2 rounded-md bg-surface p-5 text-ink no-underline shadow-card hover:text-ink hover:no-underline">
              <span className="text-caption text-ink-muted">
                {data.titles.get(x.questionId)?.bestAnswerId === x.id && <span className="mr-2 rounded-pill bg-highlight px-2.5 py-0.5 font-bold text-[#142b54]">ベストアンサー</span>}
                {data.titles.get(x.questionId)?.title ?? "相談"}
                {x.status === "hidden" && "（非表示中）"}
              </span>
              <span className="line-clamp-3 whitespace-pre-line text-body">{x.body}</span>
              <span className="inline-flex items-center gap-1 text-caption text-ink-muted">
                <MessageCircle size={14} strokeWidth={1.75} aria-hidden="true" />参考になった {x.helpfulCount} ・ {formatDate(x.createdAt)}
              </span>
            </Link>
          ))}
        </section>
      )}

      <LeaveSection />
    </PageBody>
  );
}

function LeaveSection() {
  const { user } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    const f = fb();
    if (!f || !user) return;
    setBusy(true);
    setError(null);
    try {
      // 本人確認：Google の人はもう一度ログインしてもらう（パスワードの人は最近のログインが必要）
      if (user.providerData.some((p) => p.providerId === "google.com")) {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      }
      await deleteAccount(f.db, user);
      router.replace("/");
    } catch (e) {
      setBusy(false);
      const code = (e as { code?: string }).code;
      setError(
        code === "auth/requires-recent-login"
          ? "安全のため、いったんログアウトして、もう一度ログインしてから退会してください。"
          : "退会できませんでした。時間をおいて、もう一度試してください。",
      );
    }
  }

  return (
    <section aria-label="退会" className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
      <h2 className="text-card-title">退会する</h2>
      {!confirming ? (
        <>
          <p className="text-body-sm">
            退会すると、プロフィールとお知らせが消えます。回答のない相談は削除し、回答のある相談と自分の回答は、名前を消して匿名で残します。もとに戻せません。
          </p>
          <Button variant="ghost" className="self-start border border-line" onClick={() => setConfirming(true)}>退会の手続きへ進む</Button>
        </>
      ) : (
        <div role="alertdialog" aria-label="退会の確認" className="flex flex-col gap-3 rounded-md bg-brand-soft p-5">
          <p className="font-bold">本当に退会しますか。もとに戻せません。</p>
          {error && <p role="alert" className="text-body-sm text-accent-strong">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setConfirming(false)}>やめる</Button>
            <Button variant="ghost" className="border border-line bg-surface" disabled={busy} onClick={leave}>退会する</Button>
          </div>
        </div>
      )}
    </section>
  );
}

export function MypageClient({ tab }: { tab: string | undefined }) {
  const t = (tabs.some((x) => x.id === tab) ? tab : "notices") as Tab;
  return (
    <Gate member next="/mypage">
      <Inner tab={t} />
    </Gate>
  );
}
