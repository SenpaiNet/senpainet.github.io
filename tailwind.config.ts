import type { Config } from "tailwindcss";

const v = (name: string) => `var(--${name})`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: v("surface"), soft: v("surface-soft"), sky: v("surface-sky"), periwinkle: v("surface-periwinkle") },
        ink: { DEFAULT: v("ink"), muted: v("ink-muted") },
        line: v("line"),
        brand: { DEFAULT: v("brand"), deep: v("brand-deep"), bright: v("brand-bright"), soft: v("brand-soft") },
        "on-brand": v("on-brand"),
        accent: { DEFAULT: v("accent"), strong: v("accent-strong") },
        highlight: v("highlight"),
      },
      fontFamily: {
        display: ["var(--font-lexend)", "var(--font-zen)", "var(--font-noto)", "sans-serif"],
        heading: ["var(--font-zen)", "var(--font-noto)", "Hiragino Sans", "Yu Gothic UI", "Meiryo", "sans-serif"],
        sans: ["var(--font-noto)", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Meiryo", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["clamp(48px, 6vw, 72px)", { lineHeight: "1", fontWeight: "600", letterSpacing: "0.01em" }],
        eyebrow: ["13px", { lineHeight: "16px", fontWeight: "600", letterSpacing: "0.04em" }],
        hero: ["40px", { lineHeight: "56px", fontWeight: "700", letterSpacing: "0.08em" }],
        h2: ["28px", { lineHeight: "40px", fontWeight: "700", letterSpacing: "0.04em" }],
        h3: ["20px", { lineHeight: "32px", fontWeight: "700", letterSpacing: "0.04em" }],
        "card-title": ["15px", { lineHeight: "24px", fontWeight: "700" }],
        body: ["15px", { lineHeight: "28px", fontWeight: "400", letterSpacing: "0.04em" }],
        "body-sm": ["13px", { lineHeight: "22px", fontWeight: "400" }],
        label: ["14px", { lineHeight: "20px", fontWeight: "700", letterSpacing: "0.04em" }],
        caption: ["12px", { lineHeight: "18px", fontWeight: "400" }],
      },
      borderRadius: { sm: "4px", md: "8px", lg: "16px", pill: "9999px" },
      boxShadow: { card: "var(--shadow-card)", cta: "var(--shadow-cta)" },
      maxWidth: { page: "1120px" },
    },
  },
  plugins: [],
};
export default config;
