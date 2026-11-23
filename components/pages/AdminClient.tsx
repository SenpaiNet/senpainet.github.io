"use client";

import Link from "next/link";
import { questionHref } from "@/lib/routes";
import { useEffect, useState } from "react";
import {
  collection,
  collectionGroup,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Query,
} from "firebase/firestore";
import { Gate, Loading, useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/Button";
import { PageBody, PageHeading, fieldClass } from "@/components/ui";
import { fb } from "@/lib/firebase/client";
import { formatDate } from "@/lib/profile";
import { handleReport, resolveTarget, seedCategories, setSuspended, type ReportAction } from "@/lib/qa/admin";
import { clearCategoryCache, loadCategories, type Category } from "@/lib/qa/categories";
import { bigrams, normalizeName, schoolKinds, type School } from "@/lib/schools";
import type { QaProfile, QaReport } from "@/lib/qa/types";

const tabs = [
  { id: "reports", label: "通報" },
  { id: "users", label: "ユーザー" },
  { id: "schools", label: "学校" },
  { id: "categories", label: "カテゴリ" },
  { id: "stats", label: "統計" },
] as const;
type Tab = (typeof tabs)[number]["id"];

const typeLabel = { question: "相談", answer: "回答" } as const;
const statusLabel = { pending: "未対応", resolved: "対応済み", dismissed: "対応なし" } as const;
const actions: { id: ReportAction; label: string; confirm: string }[] = [
  { id: "hide", label: "非表示にする", confirm: "この投稿を非表示にします。投稿者にお知らせが届きます。" },
  { id: "delete", label: "削除する", confirm: "この投稿を削除します。相談の場合は回答もすべて消えます。もとに戻せません。" },
  { id: "warn", label: "警告する", confirm: "投稿者に警告のお知らせを送ります。" },
  { id: "suspend", label: "凍結する", confirm: "投稿者を凍結します。投稿・回答ができなくなります。" },
  { id: "dismiss", label: "対応なし", confirm: "この通報は対応しないことにします。" },
];

type Target = Awaited<ReturnType<typeof resolveTarget>>;

function ReportRow({ r, onDone }: { r: QaReport; onDone: () => void }) {
  const [t, setT] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const f = fb();
    if (f) resolveTarget(f.db, r).then(setT).catch(() => setT(null));
  }, [r]);

  async function run(a: (typeof actions)[number]) {
    const f = fb();
    if (!f || !window.confirm(a.confirm)) return;
    setBusy(true);
    setError(null);
    try {
      await handleReport(f.db, r, a.id, t?.authorUid ?? null);
      onDone();
    } catch {
      setError("対応できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-md bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2 text-caption">
        <span className="rounded-pill bg-brand-soft px-2.5 py-0.5 font-bold text-brand-deep">{typeLabel[r.targetType]}</span>
        <span className={`font-bold ${r.status === "pending" ? "text-accent-strong" : "text-ink-muted"}`}>{statusLabel[r.status]}</span>
        {t?.hidden && <span className="text-ink-muted">（非表示中）</span>}
        <span className="text-ink-muted">{formatDate(r.createdAt)}</span>
      </div>
      <p className="font-bold">{r.reason}</p>
      {r.detail && <p className="whitespace-pre-line text-body-sm">{r.detail}</p>}
      <p className="whitespace-pre-line rounded-md bg-surface-soft p-3 text-body-sm">
        {t ? t.excerpt ?? "（対象が見つかりません。削除済みの可能性があります）" : "読み込んでいます…"}
        {t && (
          <span className="mt-1 block text-caption text-ink-muted">
            投稿者：{t.authorName ?? (t.authorUid ? "匿名で投稿" : "不明（移行データなど）")}
          </span>
        )}
      </p>
      {t?.exists && <Link href={questionHref(r.questionId)} className="self-start text-label">投稿を開く</Link>}
      {error && <p role="alert" className="text-body-sm text-accent-strong">{error}</p>}
      {r.status === "pending" && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button key={a.id} variant={a.id === "dismiss" ? "ghost" : "soft"} className={a.id === "dismiss" ? "border border-line" : ""}
              disabled={busy || (!t?.authorUid && (a.id === "warn" || a.id === "suspend"))} onClick={() => run(a)}>
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </article>
  );
}

function Reports() {
  const [all, setAll] = useState(false);
  const [list, setList] = useState<QaReport[] | null>(null);
  async function load() {
    const f = fb();
    if (!f) return;
    const q = all
      ? query(collection(f.db, "qaReports"), orderBy("createdAt", "desc"), limit(100))
      : query(collection(f.db, "qaReports"), where("status", "==", "pending"), orderBy("createdAt", "desc"), limit(100));
    const s = await getDocs(q);
    setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<QaReport, "id">) })));
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);
  return (
    <section aria-label="通報一覧" className="flex flex-col gap-3">
      <button type="button" onClick={() => setAll(!all)} className="min-h-[44px] self-start text-label text-brand-deep underline">
        {all ? "未対応だけを表示" : "対応済みも表示"}
      </button>
      {!list ? <p role="status">読み込んでいます…</p> : list.length === 0 && <p className="rounded-md bg-surface p-6 text-center">対応する通報はありません。</p>}
      {list?.map((r) => <ReportRow key={r.id} r={r} onDone={load} />)}
    </section>
  );
}

function Users() {
  const [list, setList] = useState<(QaProfile & { id: string })[] | null>(null);
  async function load() {
    const f = fb();
    if (!f) return;
    const s = await getDocs(query(collection(f.db, "profiles"), limit(300)));
    setList(
      s.docs
        .map((d) => ({ id: d.id, ...(d.data() as QaProfile) }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
    );
  }
  useEffect(() => {
    load();
  }, []);
  if (!list) return <p role="status">読み込んでいます…</p>;
  return (
    <section aria-label="ユーザー一覧" className="flex flex-col gap-2">
      {list.map((u) => (
        <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface p-4 shadow-card">
          <div className="flex flex-col">
            <span className="font-heading text-card-title font-bold">{u.displayName}</span>
            <span className="text-caption text-ink-muted">
              {u.role === "alumni" ? "卒業生" : "在校生"}
              {!u.isProfileComplete && " ・ プロフィール未完成"}
              {u.isSuspended && " ・ 凍結中"}
              {u.createdAt && ` ・ ${formatDate(u.createdAt)}`}
            </span>
          </div>
          <Button variant="soft" onClick={async () => {
            const f = fb();
            if (!f || !window.confirm(u.isSuspended ? "凍結を解除します。" : "このユーザーを凍結します。")) return;
            await setSuspended(f.db, u.id, !u.isSuspended);
            load();
          }}>
            {u.isSuspended ? "凍結を解除" : "凍結する"}
          </Button>
        </div>
      ))}
    </section>
  );
}

function Categories() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [stored, setStored] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const f = fb();
    if (!f) return;
    const s = await getDocs(collection(f.db, "qaCategories"));
    setStored(!s.empty);
    clearCategoryCache();
    const list = await loadCategories(true);
    setItems(list);
    setNames(Object.fromEntries(list.map((c) => [c.slug, c.name])));
  }
  useEffect(() => {
    load();
  }, []);

  async function patch(c: Category, values: Partial<Category>) {
    const f = fb();
    if (!f) return;
    setError(null);
    try {
      await updateDoc(doc(f.db, "qaCategories", c.slug), values);
      load();
    } catch {
      setError("保存できませんでした。");
    }
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const f = fb();
    if (!f || !items) return;
    setError(null);
    if (!/^[a-z0-9-]+$/.test(slug) || !name.trim()) return setError("識別子は半角英数字とハイフン、表示名は必須です。");
    if (items.some((c) => c.slug === slug)) return setError("この識別子はすでにあります。");
    const max = items.reduce((m, c) => Math.max(m, c.sortOrder), 0);
    await setDoc(doc(f.db, "qaCategories", slug), { name: name.trim(), sortOrder: max + 1, isActive: true });
    setSlug("");
    setName("");
    load();
  }

  if (!items) return <p role="status">読み込んでいます…</p>;
  if (!stored) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-md bg-surface p-6 shadow-card">
        <p>カテゴリはまだ登録されていません（いまは初期の12種類を表示しています）。編集するには、まず初期カテゴリを登録してください。</p>
        <Button onClick={async () => { const f = fb(); if (f) { await seedCategories(f.db); load(); } }}>初期カテゴリを登録する</Button>
      </section>
    );
  }
  return (
    <section aria-label="カテゴリ管理" className="flex flex-col gap-3">
      {error && <p role="alert" className="rounded-md bg-brand-soft p-4 text-body-sm">{error}</p>}
      {items.map((c) => (
        <div key={c.slug} className="flex flex-wrap items-center gap-3 rounded-md bg-surface p-4 shadow-card">
          <label className="sr-only" htmlFor={`cat-${c.slug}`}>表示名</label>
          <input id={`cat-${c.slug}`} className={`${fieldClass} min-h-[44px] flex-[1_1_200px]`} value={names[c.slug] ?? ""}
            onChange={(e) => setNames({ ...names, [c.slug]: e.target.value })} />
          <code className="text-caption text-ink-muted">{c.slug}</code>
          <Button variant="soft" disabled={!names[c.slug]?.trim() || names[c.slug] === c.name} onClick={() => patch(c, { name: names[c.slug].trim() })}>名前を保存</Button>
          <Button variant="ghost" className="border border-line" onClick={() => patch(c, { isActive: !c.isActive })}>{c.isActive ? "非表示にする" : "表示する"}</Button>
          {!c.isActive && <span className="text-caption text-ink-muted">（非表示中）</span>}
        </div>
      ))}
      <form onSubmit={add} className="flex flex-wrap items-end gap-3 rounded-md bg-surface-periwinkle p-4">
        <div className="flex flex-[1_1_160px] flex-col gap-1.5"><label htmlFor="new-slug" className="text-label">識別子</label><input id="new-slug" className={`${fieldClass} min-h-[44px]`} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="例：volunteer" /></div>
        <div className="flex flex-[1_1_200px] flex-col gap-1.5"><label htmlFor="new-name" className="text-label">表示名</label><input id="new-name" className={`${fieldClass} min-h-[44px]`} value={name} onChange={(e) => setName(e.target.value)} placeholder="例：ボランティア" /></div>
        <Button type="submit">カテゴリを追加</Button>
      </form>
    </section>
  );
}

const statusText = { pending: "確認待ち", verified: "確認済み", hidden: "非表示" } as const;

/** 学校：利用者が追加した学校を確認する。名前の修正・非表示もここで */
function Schools() {
  const [show, setShow] = useState<"pending" | "verified" | "hidden">("pending");
  const [list, setList] = useState<School[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const f = fb();
    if (!f) return;
    const snap = await getDocs(query(collection(f.db, "schools"), where("status", "==", show), limit(300)));
    const l = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<School, "id">) })).sort((a, b) => a.name.localeCompare(b.name, "ja"));
    setList(l);
    setNames(Object.fromEntries(l.map((x) => [x.id, x.name])));
  }
  useEffect(() => {
    setList(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  async function patch(id: string, values: Record<string, unknown>) {
    const f = fb();
    if (!f) return;
    setError(null);
    try {
      await updateDoc(doc(f.db, "schools", id), values);
      load();
    } catch {
      setError("保存できませんでした。");
    }
  }

  return (
    <section aria-label="学校" className="flex flex-col gap-3">
      <p className="text-body-sm">
        利用者が見つけられなかった学校は「確認待ち」で追加されます。正式な名前か確かめて「確認済み」にしてください。
        名前の修正は、すでに投稿された相談の表示には反映されません。
      </p>
      <div role="group" aria-label="表示する学校" className="flex flex-wrap gap-1 self-start rounded-pill border border-line bg-surface p-1">
        {(["pending", "verified", "hidden"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)}
            className={`min-h-[40px] rounded-pill px-4 text-label ${show === k ? "bg-brand text-on-brand" : "text-ink"}`}>
            {statusText[k]}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-md bg-brand-soft p-4 text-body-sm">{error}</p>}
      {!list ? <p role="status">読み込んでいます…</p> : list.length === 0 && <p className="rounded-md bg-surface p-6 text-center">{statusText[show]}の学校はありません。</p>}
      {list?.map((sc) => (
        <div key={sc.id} className="flex flex-wrap items-center gap-3 rounded-md bg-surface p-4 shadow-card">
          <label className="sr-only" htmlFor={`sc-${sc.id}`}>学校名</label>
          <input id={`sc-${sc.id}`} className={`${fieldClass} min-h-[44px] flex-[1_1_240px]`} value={names[sc.id] ?? ""}
            onChange={(e) => setNames({ ...names, [sc.id]: e.target.value })} />
          <span className="text-caption text-ink-muted">{sc.prefecture}・{schoolKinds.find((k) => k.id === sc.kind)?.label}</span>
          <Button variant="soft" disabled={!names[sc.id]?.trim() || names[sc.id] === sc.name}
            onClick={() => patch(sc.id, { name: names[sc.id].trim(), nameKey: normalizeName(names[sc.id]), ngrams: bigrams(names[sc.id]) })}>
            名前を保存
          </Button>
          {sc.status !== "verified" && <Button onClick={() => patch(sc.id, { status: "verified" })}>確認済みにする</Button>}
          {sc.status !== "hidden" && (
            <Button variant="ghost" className="border border-line" onClick={() => window.confirm("この学校を検索に出さないようにします。") && patch(sc.id, { status: "hidden" })}>
              非表示にする
            </Button>
          )}
        </div>
      ))}
    </section>
  );
}

function Stats() {
  const [s, setS] = useState<[string, number][] | null>(null);
  useEffect(() => {
    const f = fb();
    if (!f) return;
    const c = (q: Query) => getCountFromServer(q).then((r) => r.data().count).catch(() => -1);
    Promise.all([
      c(query(collection(f.db, "profiles"), where("isProfileComplete", "==", true))),
      c(collection(f.db, "questions")),
      c(collectionGroup(f.db, "qaAnswers")),
      c(query(collection(f.db, "qaReports"), where("status", "==", "pending"))),
      c(query(collection(f.db, "profiles"), where("isSuspended", "==", true))),
    ]).then(([m, q, a, r, sus]) =>
      setS([["登録者", m], ["相談", q], ["回答", a], ["未対応の通報", r], ["凍結中", sus]]),
    );
  }, []);
  if (!s) return <p role="status">読み込んでいます…</p>;
  return (
    <dl className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
      {s.map(([label, n]) => (
        <div key={label} className="flex flex-col gap-1 rounded-md bg-surface p-6 shadow-card">
          <dd className="order-1 font-display text-[40px] font-semibold leading-none text-brand">{n < 0 ? "-" : n}</dd>
          <dt className="order-2 text-body-sm text-ink-muted">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

function Inner({ tab }: { tab: Tab }) {
  const { ready, isAdmin } = useAuth();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    // 運営判定は非同期で決まるので、少し待ってから「権限なし」を出す
    const t = setTimeout(() => setChecked(true), 1500);
    return () => clearTimeout(t);
  }, []);
  if (!ready || (!isAdmin && !checked)) return <Loading />;
  if (!isAdmin) {
    return (
      <PageBody>
        <p className="rounded-md bg-surface p-6 text-center">このページは見つかりませんでした。</p>
      </PageBody>
    );
  }
  return (
    <PageBody width="1120px">
      <PageHeading label="運営" en="Admin" />
      <div role="tablist" aria-label="管理メニュー" className="flex flex-wrap gap-1 self-start rounded-pill border border-line bg-surface p-1">
        {tabs.map((x) => (
          <Link key={x.id} role="tab" aria-selected={tab === x.id} href={`/admin?tab=${x.id}`}
            className={`inline-flex min-h-[40px] items-center rounded-pill px-4 text-label no-underline hover:no-underline ${tab === x.id ? "bg-brand text-on-brand hover:text-on-brand" : "text-ink hover:text-ink"}`}>
            {x.label}
          </Link>
        ))}
      </div>
      {tab === "reports" && <Reports />}
      {tab === "users" && <Users />}
      {tab === "schools" && <Schools />}
      {tab === "categories" && <Categories />}
      {tab === "stats" && <Stats />}
    </PageBody>
  );
}

export function AdminClient({ tab }: { tab?: string }) {
  const t = (tabs.some((x) => x.id === tab) ? tab : "reports") as Tab;
  return (
    <Gate next="/admin">
      <Inner tab={t} />
    </Gate>
  );
}
