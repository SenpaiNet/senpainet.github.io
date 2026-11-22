"use client";

import Link from "next/link";
import { questionHref } from "@/lib/routes";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button, ButtonLink, buttonClass } from "./Button";
import { SuccessPanel, chipClass, fieldClass, labelClass, optionalMark, requiredMark } from "./ui";
import { fb } from "@/lib/firebase/client";
import type { Category } from "@/lib/qa/categories";
import type { QaProfile } from "@/lib/qa/types";
import { createQuestion } from "@/lib/qa/writes";
import { clubLabels, pathLabels, streamLabels, type ClubType, type PathType, type Stream } from "@/lib/profile";

const DRAFT_KEY = "senpainet:question-draft";

export function NewQuestionForm({
  userId,
  profile,
  categories,
  initialCategoryIds,
  attrText,
}: {
  userId: string;
  profile: QaProfile;
  categories: Category[];
  initialCategoryIds: string[];
  attrText: string;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<string[]>(initialCategoryIds);
  const [tStream, setTStream] = useState<Stream | "">("");
  const [tPath, setTPath] = useState<PathType | "">("");
  const [tClub, setTClub] = useState<ClubType | "">("");
  const [anonymous, setAnonymous] = useState(false);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 下書きの復元（localStorage が使えない環境ではそのまま空で始める）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { title?: string; body?: string };
        setTitle(d.title ?? "");
        setBody(d.body ?? "");
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      if (title || body) localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body }));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, [title, body, loaded]);

  const full = picked.length >= 3;
  const errTitle = tried && !title.trim();
  const errBody = tried && !body.trim();
  const errCat = tried && picked.length === 0;
  const select = `${fieldClass} min-h-[48px] px-3`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !body.trim() || picked.length === 0) return setTried(true);
    // 連投制限（20秒）。ルールでも止めるが、先にわかりやすく案内する
    const lastMs = profile.lastPostAt?.toMillis?.() ?? 0;
    if (Date.now() - lastMs < 20_000) {
      return setError("続けて投稿しています。少し待ってから、もう一度投稿してください。");
    }
    const f = fb();
    if (!f) return setError("Firebase の接続設定がまだありません。");
    setSaving(true);
    let id: string;
    try {
      id = await createQuestion(f.db, userId, profile, {
        title: title.trim(),
        body: body.trim(),
        categories: picked,
        isAnonymous: anonymous,
        targetStream: tStream || null,
        targetPathType: tPath || null,
        targetClubType: tClub || null,
      });
    } catch {
      setSaving(false);
      return setError("投稿できませんでした。時間をおいて、もう一度試してください。");
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setSaving(false);
    setNewId(id);
  }

  if (newId) {
    return (
      <SuccessPanel title="相談を投稿しました" note="回答が届くと、マイページでお知らせします。">
        <ButtonLink href={questionHref(newId)}>投稿した相談を見る</ButtonLink>
        <Link href="/board" className={buttonClass("ghost", "border-2 border-brand text-brand-deep hover:text-brand-deep")}>
          相談一覧に戻る
        </Link>
      </SuccessPanel>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8 rounded-lg bg-surface p-6 shadow-card md:p-12">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-2">
          <label htmlFor="title" className={labelClass}>タイトル{requiredMark}</label>
          <span className="text-caption text-ink-muted">{title.length} / 60</span>
        </div>
        <input id="title" className={fieldClass} maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="例：理系か文系か、まだ決められません" aria-invalid={errTitle} />
        {errTitle && <p role="alert" className="text-body-sm text-accent-strong">タイトルを入力してください。</p>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-2">
          <label htmlFor="body" className={labelClass}>相談の内容{requiredMark}</label>
          <span className="text-caption text-ink-muted">{body.length} / 2000</span>
        </div>
        <textarea id="body" rows={8} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="今の状況、迷っていること、先輩に聞きたいことを書いてください。" aria-invalid={errBody}
          className="w-full rounded-md border border-line bg-surface p-4 text-body text-ink placeholder:text-ink-muted" />
        {errBody && <p role="alert" className="text-body-sm text-accent-strong">相談の内容を入力してください。</p>}
        <p className="flex gap-2 rounded-md bg-brand-soft px-4 py-3 text-body-sm">
          <ShieldCheck size={18} strokeWidth={1.75} className="mt-0.5 flex-none text-brand-deep" aria-hidden="true" />
          友達や先生の名前、電話番号やSNSのアカウントなど、人が特定できることは書かないでください。
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className={`${labelClass} mb-1`}>
          カテゴリ{requiredMark}
          {optionalMark(`1〜3つ選んでください（${picked.length}つ選択中）`)}
        </legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = picked.includes(c.slug);
            const off = full && !on;
            return (
              <button key={c.slug} type="button" aria-pressed={on} disabled={off} className={chipClass(on, { disabled: off })}
                onClick={() => setPicked(on ? picked.filter((x) => x !== c.slug) : [...picked, c.slug])}>
                #{c.name}
              </button>
            );
          })}
        </div>
        {errCat && <p role="alert" className="text-body-sm text-accent-strong">カテゴリを1つ以上選んでください。</p>}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={`${labelClass} mb-1`}>どんな先輩に答えてほしいですか{optionalMark()}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="t-stream" className="text-body-sm">文系・理系</label>
            <select id="t-stream" className={select} value={tStream} onChange={(e) => setTStream(e.target.value as Stream | "")}>
              <option value="">指定しない</option>
              <option value="science">{streamLabels.science}</option>
              <option value="humanities">{streamLabels.humanities}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="t-path" className="text-body-sm">進路</label>
            <select id="t-path" className={select} value={tPath} onChange={(e) => setTPath(e.target.value as PathType | "")}>
              <option value="">指定しない</option>
              {(["university", "grad_school", "vocational", "employed", "exam"] as PathType[]).map((p) => (
                <option key={p} value={p}>{pathLabels[p]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="t-club" className="text-body-sm">部活</label>
            <select id="t-club" className={select} value={tClub} onChange={(e) => setTClub(e.target.value as ClubType | "")}>
              <option value="">指定しない</option>
              {(["sports", "culture", "other"] as ClubType[]).map((c) => (
                <option key={c} value={c}>{clubLabels[c]}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-4">
        <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--brand)]" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
        <span className="flex flex-col gap-0.5">
          <span className="text-label">匿名で投稿する</span>
          <span className="text-body-sm text-ink-muted">
            {anonymous ? `表示名は出ず「${attrText}」だけが表示されます。` : `オフのときは表示名と「${attrText}」が表示されます。`}
          </span>
        </span>
      </label>

      {error && <p role="alert" className="rounded-md bg-brand-soft p-4 text-body-sm">{error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-2">
        <Link href="/board" className="inline-flex min-h-[52px] items-center px-4 text-label text-brand-deep">やめる</Link>
        <Button type="submit" variant="accent" disabled={saving} className="min-h-[52px] px-8 text-[15px]">
          先輩に相談する
        </Button>
      </div>
    </form>
  );
}
