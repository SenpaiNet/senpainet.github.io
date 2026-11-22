import Link from "next/link";
import { messages } from "@/lib/messages";

export function Logo({ size = "lg", white = false }: { size?: "lg" | "sm"; white?: boolean }) {
  const text = size === "lg" ? "text-[22px]" : "text-[18px]";
  return (
    <Link href="/" aria-label={messages.nav.home} className="flex items-center gap-2 no-underline hover:no-underline">
      <svg
        width={size === "lg" ? 30 : 24}
        height={size === "lg" ? 30 : 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke={white ? "#fff" : "var(--brand)"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z" />
        <path d="M22 10v6" />
        <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
      </svg>
      <span className={`font-display font-semibold tracking-[0.01em] ${text}`}>
        <span className={white ? "text-white" : "text-ink"}>Senpai</span>
        <span className={white ? "text-white" : "text-brand"}>Net</span>
      </span>
    </Link>
  );
}
