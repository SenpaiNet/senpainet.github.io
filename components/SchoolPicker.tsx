"use client";

// 学校を名前で検索して選ぶ。見つからなければ、その場で追加できる（運営があとで確認する）。
import { useEffect, useId, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { Plus, School as SchoolIcon, Search } from "lucide-react";
import { Button } from "./Button";
import { fieldClass } from "./ui";
import { fb } from "@/lib/firebase/client";
import { bigrams, normalizeName, prefectures, schoolKinds, type School, type SchoolKind } from "@/lib/schools";
import { createSchool } from "@/lib/qa/writes";

export type PickedSchool = { id: string; name: string; kind: SchoolKind };

const kindLabel = (k: SchoolKind) => schoolKinds.find((x) => x.id === k)?.label ?? "";

export function SchoolPicker({
  uid,
  value,
  onChange,
  invalid,
}: {
  uid: string;
  value: PickedSchool | null;
  onChange: (s: PickedSchool | null) => void;
  invalid?: boolean;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<School[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pref, setPref] = useState("東京都");
  const [kind, setKind] = useState<SchoolKind>("high");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 入力が止まってから検索する（2文字以上）
  useEffect(() => {
    const key = normalizeName(q);
    if (key.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      const f = fb();
      if (!f) return;
      try {
        const snap = await getDocs(query(collection(f.db, "schools"), where("ngrams", "array-contains", bigrams(key)[0]), limit(60)));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<School, "id">) }))
          .filter((s) => s.status !== "hidden" && normalizeName(s.name).includes(key))
          .sort((a, b) => Number(b.status === "verified") - Number(a.status === "verified") || a.name.localeCompare(b.name, "ja"))
          .slice(0, 20);
        setResults(list);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function add() {
    const f = fb();
    if (!f) return;
    setError(null);
    const n = name.trim();
    if (n.length < 2) return setError("学校名を正しく入力してください（正式な名前で）。");
    setBusy(true);
    try {
      const sid = await createSchool(f.db, uid, { name: n, prefecture: pref, kind });
      onChange({ id: sid, name: n, kind });
      setAdding(false);
      setQ("");
    } catch {
      setError("学校を追加できませんでした。時間をおいて、もう一度試してください。");
    } finally {
      setBusy(false);
    }
  }

  if (value) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-brand bg-brand-soft px-4 py-3">
        <span className="flex items-center gap-2">
          <SchoolIcon size={20} strokeWidth={1.75} className="flex-none text-brand-deep" aria-hidden="true" />
          <span className="flex flex-col">
            <span className="font-heading text-card-title font-bold">{value.name}</span>
            <span className="text-caption text-ink-muted">{kindLabel(value.kind)}</span>
          </span>
        </span>
        <button type="button" onClick={() => onChange(null)} className="min-h-[44px] px-2 text-label text-brand-deep underline">
          学校を選び直す
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={`flex min-h-[52px] items-center gap-2 rounded-md border bg-surface px-4 ${invalid ? "border-accent-strong" : "border-line"}`}>
        <Search size={18} strokeWidth={1.75} className="flex-none text-ink-muted" aria-hidden="true" />
        <label htmlFor={`${id}-q`} className="sr-only">学校名で検索</label>
        <input
          id={`${id}-q`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="学校名の一部を入力（例：南高校、〇〇中学）"
          autoComplete="off"
          aria-invalid={invalid}
          className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted focus-visible:outline-none"
        />
      </div>

      {results && (
        <ul aria-label="検索結果" className="flex max-h-72 flex-col overflow-y-auto rounded-md border border-line bg-surface">
          {results.length === 0 && <li className="px-4 py-3 text-body-sm text-ink-muted">見つかりませんでした。</li>}
          {results.map((s, i) => (
            <li key={s.id} className="sn-enter border-b border-line last:border-b-0" style={{ ["--i" as string]: i }}>
              <button type="button" onClick={() => onChange({ id: s.id, name: s.name, kind: s.kind })}
                className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-brand-soft">
                <span className="flex flex-col">
                  <span className="text-label">{s.name}</span>
                  <span className="text-caption text-ink-muted">{s.prefecture}・{kindLabel(s.kind)}</span>
                </span>
                {s.status === "pending" && <span className="flex-none text-caption text-ink-muted">確認待ち</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!adding ? (
        <button type="button" onClick={() => { setAdding(true); setName(q); }}
          className="inline-flex min-h-[44px] items-center gap-1.5 self-start text-label text-brand-deep underline">
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          見つからないときは、学校を追加する
        </button>
      ) : (
        <div className="sn-enter flex flex-col gap-3 rounded-md bg-surface-soft p-4">
          <p className="text-body-sm">学校の正式な名前を入れてください。運営が確認するまでは「確認待ち」と表示されます。</p>
          <label htmlFor={`${id}-name`} className="text-label">学校名</label>
          <input id={`${id}-name`} className={fieldClass} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="例：〇〇県立△△高等学校" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-pref`} className="text-label">都道府県</label>
              <select id={`${id}-pref`} className={`${fieldClass} px-3`} value={pref} onChange={(e) => setPref(e.target.value)}>
                {prefectures.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-kind`} className="text-label">学校の種類</label>
              <select id={`${id}-kind`} className={`${fieldClass} px-3`} value={kind} onChange={(e) => setKind(e.target.value as SchoolKind)}>
                {schoolKinds.map((k) => <option key={k.id} value={k.id}>{k.label}（{k.years}年）</option>)}
              </select>
            </div>
          </div>
          {error && <p role="alert" className="text-body-sm text-accent-strong">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={add} disabled={busy}>この学校を追加して選ぶ</Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>やめる</Button>
          </div>
        </div>
      )}
    </div>
  );
}
