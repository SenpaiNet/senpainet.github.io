// 学校ドメイン制限など、運用で切り替える設定。
export const allowedEmailDomain = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "").trim().toLowerCase().replace(/^@/, "");

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");


/** ログイン後の遷移先として安全なパスだけ通す（オープンリダイレクト対策）。 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
