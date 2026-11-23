import type { Metadata } from "next";
import { Lexend, Noto_Sans_JP, Zen_Kaku_Gothic_New } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], weight: ["600"], variable: "--font-lexend", display: "swap" });
const noto = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-noto", display: "swap" });
const zen = Zen_Kaku_Gothic_New({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-zen", display: "swap" });

export const metadata: Metadata = {
  title: "SenpaiNet | その悩み、先輩に相談しよう",
  description: "全国の中学生・高校生が、全国の先輩や自分の学校の先輩に相談できるサイトです。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${lexend.variable} ${noto.variable} ${zen.variable}`}>
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
