"use client";

import { useState } from "react";
import { z } from "zod";
import { Button, ButtonLink } from "./Button";
import { SuccessPanel, chipClass, fieldClass, labelClass, optionalMark, requiredMark } from "./ui";
import { fb } from "@/lib/firebase/client";
import type { Category } from "@/lib/qa/categories";
import type { QaProfile, QaRole } from "@/lib/qa/types";
import { saveProfile } from "@/lib/qa/writes";
import { clubLabels, pathLabels, streamLabels, type ClubType, type PathType, type Stream } from "@/lib/profile";

const schema = z.object({
  display_name: z.string().trim().min(1, "表示名を入力してください。").max(20, "表示名は20字までです。"),
  bio: z.string().max(200, "自己紹介は200字までです。"),
});

const univYearOptions = [1, 2, 3, 4, 5, 6, 7];

export function OnboardingForm({
  uid,
  email,
  profile,
  privateUniversityName,
  categories,
  schoolYear,
  next,
}: {
  uid: string;
  email: string;
  profile: QaProfile | null;
  privateUniversityName: string | null;
  categories: Category[];
  schoolYear: number;
  next: string;
}) {
  // 保存するとプロフィールが「完成」に変わるので、開いたときの状態で表示を決める
  const [editing] = useState(Boolean(profile?.isProfileComplete));
  const [role, setRole] = useState<QaRole>(profile?.role === "alumni" ? "alumni" : "student");
  const [name, setName] = useState(profile?.displayName ?? "");
  const [entry, setEntry] = useState(profile?.entryYear ?? schoolYear);
  const [grad, setGrad] = useState(profile?.graduationYear ?? schoolYear - 1);
  const [path, setPath] = useState<PathType>(profile?.pathType ?? "university");
  const [uyear, setUyear] = useState(profile?.universityYear ?? 1);
  const [univ, setUniv] = useState(privateUniversityName ?? profile?.universityName ?? "");
  const [hideUniv, setHideUniv] = useState(profile ? !profile.universityNamePublic : true);
  const [faculty, setFaculty] = useState(profile?.faculty ?? "");
  const [stream, setStream] = useState<Stream>(profile?.stream ?? "undecided");
  const [club, setClub] = useState<ClubType>(profile?.clubType ?? "none");
  const [clubName, setClubName] = useState(profile?.clubName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [skills, setSkills] = useState<string[]>(profile?.categories ?? []);
  const [accepting, setAccepting] = useState(profile?.isAccepting ?? true);
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const isStudent = role === "student";
  const grade = schoolYear - entry + 1;
  const entryYears = Array.from({ length: 6 }, (_, i) => schoolYear - i);
  const gradYears = Array.from({ length: 5 }, (_, i) => schoolYear - 1 - i);
  const oldestGrad = schoolYear - 6;

  const steps = [
    { num: "01", label: "メール確認" },
    { num: "02", label: "プロフィール" },
    { num: "03", label: "完了" },
  ];
  const stepIdx = done ? 2 : 1;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse({ display_name: name, bio });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      setErrors(errs);
      return;
    }
    setErrors({});
    const f = fb();
    if (!f) return setFormError("Firebase の接続設定がまだありません。");
    setSaving(true);
    const universityName = isStudent ? null : univ.trim() || null;
    try {
      await saveProfile(
        f.db,
        uid,
        {
          displayName: parsed.data.display_name,
          bio: bio.trim() || null,
          role,
          stream,
          clubType: club,
          clubName: clubName.trim() || null,
          isPublic,
          isProfileComplete: true,
          categories: isStudent ? [] : skills,
          // 6年制のため、卒業生の入学年度は卒業年度の5年前
          entryYear: isStudent ? entry : grad - 5,
          graduationYear: isStudent ? null : grad,
          pathType: isStudent ? null : path,
          universityYear: !isStudent && (path === "university" || path === "grad_school") ? uyear : null,
          universityName,
          universityNamePublic: isStudent ? true : !hideUniv,
          faculty: isStudent ? null : faculty.trim() || null,
          isAccepting: isStudent ? false : accepting,
          privateUniversityName: universityName,
        },
        Boolean(profile),
      );
      setSaving(false);
      setDone(true);
    } catch {
      setSaving(false);
      setFormError("保存できませんでした。時間をおいて、もう一度試してください。");
    }
  }

  const stepper = (
    <ol aria-label="登録の手順" className="flex gap-2">
      {steps.map((s, i) => (
        <li key={s.num} className="flex flex-1 flex-col gap-1.5">
          <span className={`block h-1.5 rounded-pill ${i <= stepIdx ? "bg-brand" : "bg-line"}`} />
          <span className={`text-caption font-bold ${i <= stepIdx ? "text-brand-deep" : "text-ink-muted"}`}>
            <span className="font-display">{s.num}</span> {s.label}
          </span>
        </li>
      ))}
    </ol>
  );

  if (done) {
    return (
      <>
        {!editing && stepper}
        <SuccessPanel
          title={editing ? "プロフィールを保存しました" : "登録が完了しました"}
          note={isStudent ? "さっそく先輩に相談してみましょう。" : "後輩の相談に答えてみましょう。"}
        >
          <ButtonLink href={next}>{next.startsWith("/board/new") ? "相談を書く" : next === "/board" ? "相談一覧を見る" : "続ける"}</ButtonLink>
        </SuccessPanel>
      </>
    );
  }

  const card = "flex flex-col gap-6 rounded-lg bg-surface p-6 shadow-card md:p-10";
  const select = `${fieldClass} px-3`;

  return (
    <>
      {!editing && stepper}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {!editing && (
          <fieldset className="flex flex-col gap-4 rounded-lg bg-surface p-6 shadow-card md:p-10">
            <legend className="float-left font-heading text-[17px] font-bold">あなたは</legend>
            <div className="clear-both grid gap-3 sm:grid-cols-2">
              {([
                ["student", "在校生", "1〜6年生。先輩に相談したい人"],
                ["alumni", "卒業生", "大学生や社会人。後輩の相談に答えたい人"],
              ] as const).map(([id, label, desc]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={role === id}
                  onClick={() => setRole(id)}
                  className={`flex min-h-[96px] flex-col items-start gap-1 rounded-md border-2 px-6 py-5 text-left text-ink ${
                    role === id ? "border-brand bg-brand-soft" : "border-line bg-surface"
                  }`}
                >
                  <span className="font-heading text-[17px] font-bold">{label}</span>
                  <span className="text-body-sm">{desc}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className={card}>
          <h2 className="text-[17px] leading-[26px]">基本の情報</h2>

          <div className="flex flex-col gap-2">
            <label htmlFor="name" className={labelClass}>表示名{requiredMark}</label>
            <input id="name" className={fieldClass} maxLength={20} value={name} onChange={(e) => setName(e.target.value)}
              placeholder="ニックネームでもかまいません" aria-invalid={!!errors.display_name} />
            {errors.display_name && <p role="alert" className="text-body-sm text-accent-strong">{errors.display_name}</p>}
            <p className="text-caption text-ink-muted">{email} でログイン中</p>
          </div>

          {isStudent ? (
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-[1_1_220px] flex-col gap-2">
                <label htmlFor="entry" className={labelClass}>入学した年度{requiredMark}</label>
                <select id="entry" className={select} value={entry} onChange={(e) => setEntry(Number(e.target.value))}>
                  {entryYears.map((y) => <option key={y} value={y}>{y}年度</option>)}
                </select>
              </div>
              <p className="flex min-h-[52px] flex-[1_1_220px] items-center gap-2 rounded-md bg-brand-soft px-4 text-label font-normal">
                今は <strong className="font-heading text-[17px]">{grade}年生</strong>（4月1日に自動で進級）
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <label htmlFor="grad" className={labelClass}>卒業した年度{requiredMark}</label>
                  <select id="grad" className={select} value={grad} onChange={(e) => setGrad(Number(e.target.value))}>
                    {gradYears.map((y) => <option key={y} value={y}>{y}年度</option>)}
                    <option value={oldestGrad}>それより前</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="path" className={labelClass}>今の進路{requiredMark}</label>
                  <select id="path" className={select} value={path} onChange={(e) => setPath(e.target.value as PathType)}>
                    {(Object.keys(pathLabels) as PathType[]).map((p) => <option key={p} value={p}>{pathLabels[p]}</option>)}
                  </select>
                </div>
                {(path === "university" || path === "grad_school") && (
                  <div className="flex flex-col gap-2">
                    <label htmlFor="uyear" className={labelClass}>何回生</label>
                    <select id="uyear" className={select} value={uyear} onChange={(e) => setUyear(Number(e.target.value))}>
                      {univYearOptions.map((n) => <option key={n} value={n}>{n === 7 ? "卒業済み・社会人" : `${n}回生`}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="univ" className={labelClass}>大学名{optionalMark()}</label>
                  <input id="univ" className={fieldClass} value={univ} onChange={(e) => setUniv(e.target.value)} />
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-body-sm">
                    <input type="checkbox" className="h-[18px] w-[18px] accent-[var(--brand)]" checked={hideUniv}
                      onChange={(e) => setHideUniv(e.target.checked)} />
                    大学名はほかの人に見せない
                  </label>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="faculty" className={labelClass}>学部・学科{optionalMark()}</label>
                  <input id="faculty" className={fieldClass} value={faculty} onChange={(e) => setFaculty(e.target.value)}
                    placeholder="例：理工学部 情報工学科" />
                </div>
              </div>
            </>
          )}

          <fieldset className="flex flex-col gap-2.5">
            <legend className={`${labelClass} mb-1.5`}>文系・理系</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(streamLabels) as Stream[]).map((s) => (
                <button key={s} type="button" aria-pressed={stream === s} onClick={() => setStream(s)} className={chipClass(stream === s)}>
                  {streamLabels[s]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2.5">
            <legend className={`${labelClass} mb-1.5`}>部活</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(clubLabels) as ClubType[]).map((c) => (
                <button key={c} type="button" aria-pressed={club === c} onClick={() => setClub(c)} className={chipClass(club === c)}>
                  {clubLabels[c]}
                </button>
              ))}
            </div>
            <label htmlFor="clubname" className="sr-only">部活の名前</label>
            <input id="clubname" className={`${fieldClass} min-h-[48px]`} value={clubName} maxLength={30}
              onChange={(e) => setClubName(e.target.value)} placeholder="部活の名前（任意）例：ハンドボール部" />
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor="bio" className={labelClass}>ひとこと自己紹介{optionalMark("任意・200字まで")}</label>
            <textarea id="bio" rows={3} maxLength={200} value={bio} onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-md border border-line bg-surface p-4 text-body text-ink" />
            {errors.bio && <p role="alert" className="text-body-sm text-accent-strong">{errors.bio}</p>}
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-label">
            <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            プロフィールをほかの人に見せる
          </label>
        </div>

        {!isStudent && (
          <div className="flex flex-col gap-4 rounded-lg bg-surface-periwinkle p-6 md:p-10">
            <h2 className="text-[17px] leading-[26px]">先輩として答えられること</h2>
            <p className="text-body-sm">得意なカテゴリを選ぶと、そのカテゴリの相談を後輩が探しやすくなります。</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = skills.includes(c.slug);
                return (
                  <button key={c.slug} type="button" aria-pressed={on} className={chipClass(on, { onPanel: true })}
                    onClick={() => setSkills(on ? skills.filter((x) => x !== c.slug) : [...skills, c.slug])}>
                    #{c.name}
                  </button>
                );
              })}
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-md bg-surface px-4 py-3.5 text-label">
              <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={accepting} onChange={(e) => setAccepting(e.target.checked)} />
              今、後輩からの相談を受け付ける
            </label>
          </div>
        )}

        {formError && <p role="alert" className="rounded-md bg-brand-soft p-4 text-body-sm">{formError}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-caption text-ink-muted">登録すると利用規約とコミュニティガイドラインに同意したことになります。</p>
          <Button type="submit" variant="accent" disabled={saving} className="min-h-[52px] px-8 text-[15px]">
            {editing ? "保存する" : "登録を完了する"}
          </Button>
        </div>
      </form>
    </>
  );
}
