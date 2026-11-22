"use client";

import { useState } from "react";
import { Button } from "./Button";
import { fb } from "@/lib/firebase/client";
import { reportTarget } from "@/lib/qa/writes";

export const reportReasons = ["個人情報が書かれている", "いやがらせ・悪口", "内容が不適切", "宣伝・関係のない投稿", "その他"] as const;

export function ReportButton({
  userId,
  targetType,
  targetId,
  questionId,
}: {
  userId: string;
  targetType: "question" | "answer";
  targetId: string;
  questionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(reportReasons[0]);
  const [detail, setDetail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const f = fb();
    if (!f) return setState("error");
    setState("sending");
    try {
      await reportTarget(f.db, userId, { targetType, targetId, questionId, reason, detail: detail.trim() || null });
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") return <span className="px-2 text-caption text-ink-muted">通報を受け付けました</span>;

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-[44px] px-2 text-caption text-ink-muted underline">
        通報する
      </button>
      {open && (
        <form onSubmit={send} className="flex w-full max-w-sm flex-col gap-3 rounded-md border border-line bg-surface p-4 text-left shadow-card">
          <label className="text-label" htmlFor={`reason-${targetId}`}>通報の理由</label>
          <select id={`reason-${targetId}`} value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[44px] rounded-md border border-line bg-surface px-3 text-body-sm text-ink">
            {reportReasons.map((r) => <option key={r}>{r}</option>)}
          </select>
          <label className="text-label" htmlFor={`detail-${targetId}`}>くわしく（任意）</label>
          <textarea id={`detail-${targetId}`} rows={3} maxLength={500} value={detail} onChange={(e) => setDetail(e.target.value)} className="rounded-md border border-line bg-surface p-3 text-body-sm text-ink" />
          {state === "error" && <p role="alert" className="text-body-sm text-accent-strong">送れませんでした。もう一度試してください。</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={state === "sending"}>通報する</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>やめる</Button>
          </div>
        </form>
      )}
    </div>
  );
}
