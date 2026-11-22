import Link from "next/link";
import { messages } from "@/lib/messages";

const links = [
  { href: "/legal/terms", label: "利用規約" },
  { href: "/legal/privacy", label: "プライバシーポリシー" },
  { href: "/legal/guidelines", label: "コミュニティガイドライン" },
  { href: "/legal/contact", label: "お問い合わせ" },
];

export function SiteFooter() {
  return (
    <footer>
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-4 px-6 py-10 text-caption text-ink-muted md:px-12">
        <span className="font-display text-[18px] font-semibold">
          <span className="text-ink">Senpai</span>
          <span className="text-brand">Net</span>
        </span>
        <nav aria-label="フッター" className="flex flex-wrap gap-x-5">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-[44px] items-center text-ink-muted underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <span>
          {messages.footer.copy}　運営：[運営者名]
        </span>
      </div>
    </footer>
  );
}
