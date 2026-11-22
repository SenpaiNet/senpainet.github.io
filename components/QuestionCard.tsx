import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ResolvedBadge, Tag } from "./ui";

export function QuestionCard({
  href,
  tags,
  title,
  excerpt,
  who,
  date,
  answerCount,
  resolved,
}: {
  href: string;
  tags: string[];
  title: string;
  excerpt: string | null;
  who: string | null;
  date: string;
  answerCount: number;
  resolved: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2.5 rounded-md bg-surface p-6 text-ink no-underline shadow-card transition-shadow duration-200 hover:text-ink hover:no-underline hover:shadow-[0_4px_14px_rgba(0,40,90,0.14)]"
    >
      <span className="flex flex-wrap items-center gap-1.5">
        {resolved && <ResolvedBadge />}
        {tags.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </span>
      <span className="font-heading text-[17px] font-bold leading-[26px]">{title}</span>
      {excerpt && <span className="line-clamp-2 text-body-sm text-ink-muted">{excerpt}</span>}
      <span className="flex flex-wrap justify-between gap-2 border-t border-line pt-2.5 text-caption text-ink-muted">
        <span>{who ? `${who} ・ ${date}` : date}</span>
        <span className={`inline-flex items-center gap-1 font-bold ${answerCount === 0 ? "text-accent-strong" : "text-brand-deep"}`}>
          <MessageCircle size={14} strokeWidth={1.75} aria-hidden="true" />
          {answerCount === 0 ? "回答待ち" : `回答 ${answerCount}件`}
        </span>
      </span>
    </Link>
  );
}
