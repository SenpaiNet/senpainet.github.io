import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// 学内向けのため、検索に出すのはトップ（LP）と法務ページだけ
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/legal/"], disallow: ["/board", "/mypage", "/admin", "/profile", "/onboarding", "/auth", "/login", "/signup"] },
  };
}
