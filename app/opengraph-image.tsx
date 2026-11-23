import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const alt = "SenpaiNet | その悩み、先輩に相談しよう";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TEXT = "その悩み、先輩に相談しよう同じ道を歩いた先輩が答えます";

// 画像に使う文字だけの Noto Sans JP を Google Fonts から取得する（失敗したら英字だけで描く）
async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(TEXT)}`)).text();
    const url = css.match(/src: url\((.+?)\) format/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const font = await loadFont();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 96, background: "#a8dcf4", color: "#142b54", fontFamily: font ? "Noto Sans JP" : "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>
          <span>Senpai</span>
          <span style={{ color: "#2370f1" }}>Net</span>
        </div>
        {font && (
          <>
            <div style={{ marginTop: 40, fontSize: 84, fontWeight: 700, letterSpacing: 4 }}>その悩み、先輩に相談しよう</div>
            <div style={{ marginTop: 32, fontSize: 36 }}>同じ道を歩いた先輩が答えます</div>
          </>
        )}
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Noto Sans JP", data: font, weight: 700, style: "normal" }] : undefined },
  );
}
