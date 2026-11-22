import Link from "next/link";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

/** 相談系ページの下地（design の #f6f6f6 背景）。 */
export function PageBody({ width = "760px", children }: { width?: string; children: ReactNode }) {
  return (
    <div className="bg-surface-soft">
      <div className="mx-auto flex flex-col gap-8 px-6 pb-24 pt-12 md:px-12" style={{ maxWidth: width }}>
        {children}
      </div>
    </div>
  );
}

/** 日本語ラベル + 大きな英字見出し（SectionHeading）。 */
export function PageHeading({ label, en, title, lead }: { label: string; en: string; title?: string; lead?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label text-brand">{label}</p>
      <p className="font-display text-display-xl text-brand">{en}</p>
      {title && <h1 className="mt-2 text-h3">{title}</h1>}
      {lead && <p>{lead}</p>}
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-pill bg-brand-soft px-[10px] py-[3px] text-caption font-bold text-brand-deep">#{children}</span>;
}

export function ResolvedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-brand px-[10px] py-[3px] text-caption font-bold text-on-brand">
      <Check size={12} strokeWidth={2.5} aria-hidden="true" />
      解決済み
    </span>
  );
}

export function SuccessPanel({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-surface p-6 py-12 text-center shadow-card md:px-12">
      <span className="flex h-16 w-16 items-center justify-center rounded-pill bg-brand-soft text-brand">
        <Check size={30} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h2 className="text-h3">{title}</h2>
      <p>{note}</p>
      <div className="flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-[44px] items-center gap-1.5 self-start text-label text-brand-deep no-underline hover:no-underline">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
      {children}
    </Link>
  );
}

/** トグルできるチップ（カテゴリ・文理・部活など）。 */
export function chipClass(on: boolean, opts: { disabled?: boolean; onPanel?: boolean } = {}) {
  const base = "min-h-[44px] rounded-pill border px-4 text-label transition-colors";
  if (on) return `${base} border-brand bg-brand text-on-brand`;
  if (opts.disabled) return `${base} cursor-not-allowed border-line bg-surface-soft text-ink-muted`;
  return `${base} ${opts.onPanel ? "border-surface bg-surface" : "border-line bg-surface"} text-brand-deep`;
}

export const fieldClass =
  "min-h-[52px] w-full rounded-md border border-line bg-surface px-4 text-body text-ink placeholder:text-ink-muted";
export const labelClass = "text-label";
export const requiredMark = <span className="ml-1 text-accent-strong">必須</span>;
export const optionalMark = (text = "任意") => <span className="ml-2 text-caption font-normal text-ink-muted">{text}</span>;
