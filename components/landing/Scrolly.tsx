"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Bell, Check, ChevronDown, ChevronLeft, Home, MessageCircle, Plus, Search, User } from "lucide-react";
import { buttonClass } from "@/components/Button";
import { messages } from "@/lib/messages";
import { useAuth } from "@/components/AuthProvider";

const features = [
  { id: "sn-step1", first: true, num: "Feature 01", title: "書いて、選んで、\nすぐに相談", body: "タイトルと内容を書いたら、ハッシュタグのようにカテゴリを選ぶだけ。答えてほしい先輩の文系・理系や部活も指定できます。", points: ["カテゴリは12種類から3つまで", "匿名でも投稿できる"] },
  { id: "sn-step2", first: false, num: "Feature 02", title: "いろいろな先輩から、\nいろいろな答え", body: "1つの相談に、文系の先輩も理系の先輩も答えられます。いちばん役に立った回答はベストアンサーに選べます。", points: ["「参考になった」で良い回答が上に", "回答が届いたらマイページで通知"] },
  { id: "sn-step3", first: false, num: "Feature 03", title: "プロフィールで、\nどんな先輩かわかる", body: "学年、文系・理系、部活、卒業生なら大学の何回生か。回答と一緒に表示されるので、自分に近い先輩の話を見つけやすくなります。", points: ["大学名は見せない設定もできる", "気になる先輩に直接相談できる"] },
] as const;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (t: number) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** スクロール量(0〜3)に合わせて、スマホの移動・回転・画面切替と視差を更新する。 */
function updateScene() {
  const root = document.getElementById("sn-scrolly");
  const phone = document.getElementById("sn-phone");
  if (!root || !phone) return;
  const vw = window.innerWidth || 1280;
  const vh = clamp(window.innerHeight || 800, 640, 960);
  const scrolled = -root.getBoundingClientRect().top;
  const pos = clamp(scrolled / vh, 0, 3);
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  let k = Math.min(2, Math.floor(pos));
  let f = pos - k;
  if (pos >= 3) {
    k = 2;
    f = 1;
  }
  const t = ease((f - 0.45) / 0.55);
  const screen = k + (t >= 0.5 ? 1 : 0);
  const mobile = vw < 860;
  const cw = Math.min(1120, vw) - 96;
  const move = ease(Math.min(pos, 1));
  const x = mobile ? 0 : lerp(cw * 0.27, -cw * 0.24, move);
  // スマホ：最初は画面の下からのぞく位置（文字とボタンに重ねない）→ スクロールで中央へ
  const y = mobile ? lerp(vh * 0.5, -vh * 0.2, move) : 24;
  const tilt = lerp(-6, 0, move);
  const base = mobile ? 0.5 : Math.min(1, (vh - 150) / 600);
  const dip = reduce ? 0 : 0.1 * Math.sin(Math.PI * t);
  const spin = reduce ? 0 : (k + t) * 360;
  phone.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotateZ(${tilt.toFixed(2)}deg) rotateY(${spin.toFixed(1)}deg) scale(${(base * (1 - dip)).toFixed(3)})`;
  // 向いている面だけを描く（背面側に正面の画面が透けるのを防ぐ）
  const facing = Math.cos((spin * Math.PI) / 180) >= 0;
  const front = document.getElementById("sn-front");
  const back = document.getElementById("sn-backface");
  if (front) front.style.visibility = facing ? "visible" : "hidden";
  if (back) back.style.visibility = facing ? "hidden" : "visible";
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`sn-scr${i}`);
    if (el) el.style.opacity = i === screen ? "1" : "0";
  }
  const set = (id: string, v: string) => {
    const el = document.getElementById(id);
    if (el) el.style.transform = v;
  };
  if (!reduce) {
    set("sn-sky", `translateY(${(-scrolled * 0.55).toFixed(1)}px)`);
    set("sn-d1", `translateY(${(-scrolled * 0.35).toFixed(1)}px)`);
    set("sn-d2", `translate(${(-scrolled * 0.08).toFixed(1)}px, ${(-scrolled * 0.8).toFixed(1)}px)`);
    set("sn-d3", `translateY(${(-scrolled * 0.5).toFixed(1)}px) rotate(${(scrolled * 0.1).toFixed(1)}deg)`);
    set("sn-d4", `translateY(${(-scrolled * 0.3).toFixed(1)}px)`);
  }
  const heroText = document.getElementById("sn-hero-text");
  if (heroText) {
    const h = clamp(pos / 0.6, 0, 1);
    heroText.style.opacity = String(1 - h);
    heroText.style.transform = reduce ? "" : `translateY(${(-h * 40).toFixed(1)}px)`;
  }
  for (let j = 1; j <= 3; j++) {
    const txt = document.getElementById(`sn-step${j}`)?.querySelector<HTMLElement>(".sn-step-text");
    if (!txt) continue;
    const o = 1 - clamp((Math.abs(pos - j) - 0.15) / 0.45, 0, 1);
    txt.style.opacity = String(o);
    txt.style.transform = reduce ? "" : `translateY(${((pos < j ? 1 : -1) * (1 - o) * 48).toFixed(1)}px)`;
  }
}

const THICKNESS = 26; // 本体の厚み(px)
const THICK_LAYERS = 9;
const mini = "flex flex-col gap-1.5 rounded-md bg-white p-3 shadow-card";
const miniTitle = "font-heading text-[12px] font-bold leading-[18px] text-[#142b54]";

export function Scrolly() {
  const { user, unread } = useAuth();
  const loggedIn = Boolean(user);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        updateScene();
      });
    };
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    updateScene();
    const late = window.setTimeout(tick, 150); // 初回のレイアウト確定後にもう一度合わせる
    return () => {
      window.clearTimeout(late);
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const stageH = "clamp(640px, 100vh, 960px)";
  return (
    // 固定ではなく sticky のヘッダーの高さ分だけ上に食い込ませ、ヒーローをヘッダーの下まで広げる
    <div id="sn-scrolly" className="relative -mt-[69px]">
      <div aria-hidden="true" className="pointer-events-none sticky top-0 z-[1] overflow-hidden [perspective:1600px]" style={{ height: stageH }}>
        <div id="sn-sky" className="absolute inset-0 rounded-b-[48px] bg-surface-sky will-change-transform" />
        <div id="sn-d1" className="absolute right-[6%] top-[12%] h-14 w-14 rounded-full bg-highlight will-change-transform md:right-[8%] md:top-[18%] md:h-24 md:w-24" />
        <div id="sn-d2" className="absolute bottom-[10%] left-[46%] h-[120px] w-[120px] rounded-full bg-brand-bright will-change-transform md:h-[180px] md:w-[180px]" />
        <div id="sn-d3" className="absolute right-[22%] top-[62%] h-14 w-14 rounded-full border-[10px] border-white will-change-transform" />
        <div id="sn-d4" className="absolute left-[6%] top-[120%] h-[140px] w-[140px] rounded-full bg-brand-soft will-change-transform" />

        <div id="sn-phone" className="absolute left-1/2 top-[54%] h-[600px] w-[290px] will-change-transform [transform-style:preserve-3d]"
          style={{ transform: "translate(-50%, -50%) translate(290px, 0px) rotateZ(-6deg)" }}>
          {/* 表 */}
          {/* 厚み：表と裏のあいだに、本体と同じ濃紺の層を重ねる */}
          {Array.from({ length: THICK_LAYERS }, (_, i) => (
            <span key={i} aria-hidden="true" className="absolute inset-0 rounded-[44px]"
              style={{ transform: `translateZ(${((i / (THICK_LAYERS - 1)) - 0.5) * (THICKNESS - 2)}px)`, background: i % 2 ? "#1b2f55" : "#142b54" }} />
          ))}
          <div id="sn-front" className="sn-face box-border rounded-[44px] bg-[#142b54] p-3 shadow-[0_24px_48px_rgba(0,40,90,0.25)]" style={{ transform: `translateZ(${THICKNESS / 2}px)` }}>
            <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-[#f6f6f6] text-[#142b54]">
              <span className="absolute left-1/2 top-2.5 z-[5] -ml-[42px] h-6 w-[84px] rounded-pill bg-[#142b54]" />

              <div id="sn-scr0" className="sn-scr absolute inset-0 flex flex-col" style={{ opacity: 1 }}>
                <div className="flex flex-col gap-2.5 border-b border-[#e3e8ef] bg-white px-4 pb-3 pt-[46px]">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[16px] font-semibold"><span>Senpai</span><span className="text-[#2370f1]">Net</span></span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-pill bg-[#e8f1fe] text-[#2370f1]"><Bell size={16} strokeWidth={1.75} /></span>
                  </div>
                  <span className="flex h-8 items-center gap-1.5 rounded-pill bg-[#f6f6f6] px-3 text-[11px] text-[#5b6573]"><Search size={13} strokeWidth={1.75} />キーワードで相談を探す</span>
                  <span className="flex gap-1.5 overflow-hidden whitespace-nowrap text-[10px] font-bold">
                    <span className="rounded-pill bg-[#2370f1] px-2.5 py-1 text-white">すべて</span>
                    {["受験・進路", "文理選択", "部活動"].map((t) => <span key={t} className="rounded-pill bg-[#e8f1fe] px-2.5 py-1 text-[#1a56c9]">#{t}</span>)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
                  {[["文理選択", "理系か文系か、まだ決められません", "在校生・4年・運動部", "回答 5件"], ["留学・国際", "高校で1年留学すると受験は不利になりますか", "在校生・3年・文化部", "回答 3件"], ["大学生活", "大学1年の授業はどれくらい忙しいですか", "在校生・6年・文系", "回答 7件"]].map(([c, t, w, n]) => (
                    <div key={t} className={mini}>
                      <span className="flex gap-1">{c === "大学生活" && <span className="rounded-pill bg-[#2370f1] px-2 py-0.5 text-[9px] font-bold text-white">解決済み</span>}<span className="self-start rounded-pill bg-[#e8f1fe] px-2 py-0.5 text-[9px] font-bold text-[#1a56c9]">#{c}</span></span>
                      <span className={miniTitle}>{t}</span>
                      <span className="flex justify-between text-[9px] text-[#5b6573]"><span>{w}</span><span className="font-bold text-[#1a56c9]">{n}</span></span>
                    </div>
                  ))}
                </div>
                <span className="absolute bottom-[70px] right-3.5 flex h-11 w-11 items-center justify-center rounded-pill bg-[#2370f1] text-white shadow-cta"><Plus size={20} strokeWidth={2} /></span>
                <div className="flex justify-around border-t border-[#e3e8ef] bg-white px-4 pb-3.5 pt-2 text-[9px] font-bold text-[#5b6573]">
                  <span className="flex flex-col items-center gap-0.5 text-[#2370f1]"><Home size={18} strokeWidth={1.75} />相談</span>
                  <span className="flex flex-col items-center gap-0.5"><MessageCircle size={18} strokeWidth={1.75} />回答</span>
                  <span className="flex flex-col items-center gap-0.5"><User size={18} strokeWidth={1.75} />マイページ</span>
                </div>
              </div>

              <div id="sn-scr1" className="sn-scr absolute inset-0 flex flex-col bg-white" style={{ opacity: 0 }}>
                <div className="flex items-center gap-1.5 border-b border-[#e3e8ef] px-4 pb-3 pt-[46px] font-heading text-[13px] font-bold"><ChevronLeft size={14} strokeWidth={2} />相談を投稿する</div>
                <div className="flex flex-1 flex-col gap-2.5 px-4 py-3.5 text-[10px] font-bold">
                  <span>タイトル</span>
                  <span className="-mt-1.5 rounded-md border border-[#2370f1] px-2.5 py-[9px] text-[11px] font-normal">理系か文系か、まだ決められません</span>
                  <span>相談の内容</span>
                  <span className="-mt-1.5 h-28 overflow-hidden rounded-md border border-[#e3e8ef] px-2.5 py-[9px] text-[10px] font-normal leading-4">数学は好きだけど得意ではなく、社会科目にも興味があります。先輩たちはどうやって決めましたか。</span>
                  <span>カテゴリ（2つ選択中）</span>
                  <span className="-mt-1 flex flex-wrap gap-[5px]">
                    {[["文理選択", 1], ["受験・進路", 1], ["部活動", 0], ["大学生活", 0], ["留学・国際", 0]].map(([t, on]) => (
                      <span key={t as string} className={`rounded-pill px-[9px] py-[3px] ${on ? "bg-[#2370f1] text-white" : "bg-[#e8f1fe] text-[#1a56c9]"}`}>#{t}</span>
                    ))}
                  </span>
                  <span className="flex items-center justify-between rounded-md bg-[#f6f6f6] px-2.5 py-[9px]">匿名で投稿する<span className="relative h-[18px] w-[30px] rounded-pill bg-[#2370f1]"><span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white" /></span></span>
                </div>
                <div className="px-4 pb-[22px]"><span className="flex h-10 items-center justify-center rounded-pill bg-[#2370f1] text-[12px] font-bold text-white">先輩に相談する</span></div>
              </div>

              <div id="sn-scr2" className="sn-scr absolute inset-0 flex flex-col" style={{ opacity: 0 }}>
                <div className="flex flex-col gap-1.5 bg-white px-3.5 pb-3 pt-[46px]">
                  <span className="flex gap-1"><span className="rounded-pill bg-[#2370f1] px-2 py-0.5 text-[9px] font-bold text-white">解決済み</span><span className="rounded-pill bg-[#e8f1fe] px-2 py-0.5 text-[9px] font-bold text-[#1a56c9]">#文理選択</span></span>
                  <span className="font-heading text-[13px] font-bold leading-[19px]">理系か文系か、まだ決められません</span>
                  <span className="text-[10px] text-[#5b6573]">回答 5件</span>
                </div>
                <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
                  <div className="flex flex-col gap-1.5 rounded-md border-2 border-[#f5c518] bg-white p-3">
                    <span className="self-start rounded-pill bg-[#f5c518] px-2 py-0.5 text-[9px] font-bold">ベストアンサー</span>
                    <span className="text-[10px] font-bold">はると<span className="font-normal text-[#5b6573]"> ・ 卒業生・大学2回生・理系</span></span>
                    <span className="text-[10px] leading-4">「大学で何を学びたいか」から逆算すると決めやすかったです。</span>
                    <span className="self-start rounded-pill bg-[#2370f1] px-[9px] py-[3px] text-[9px] font-bold text-white">参考になった 13</span>
                  </div>
                  <div className={mini}>
                    <span className="text-[10px] font-bold">みお<span className="font-normal text-[#5b6573]"> ・ 卒業生・大学3回生・文系</span></span>
                    <span className="text-[10px] leading-4">「得意」より「続けられそうか」で考えてみてください。</span>
                    <span className="self-start rounded-pill border border-[#e3e8ef] px-[9px] py-0.5 text-[9px] font-bold">参考になった 8</span>
                  </div>
                </div>
              </div>

              <div id="sn-scr3" className="sn-scr absolute inset-0 flex flex-col" style={{ opacity: 0 }}>
                <div className="h-[110px] flex-none bg-[#2370f1]" />
                <div className="mx-4 -mt-10 flex flex-col items-center gap-1.5 rounded-[10px] bg-white p-4 text-center shadow-card">
                  <span className="-mt-11 flex h-14 w-14 items-center justify-center rounded-pill border-[3px] border-white bg-[#e8f1fe] font-heading text-[22px] font-bold text-[#1a56c9]">み</span>
                  <span className="font-heading text-[15px] font-bold">先輩の名前</span>
                  <span className="flex items-center gap-1 text-[10px] text-[#5b6573]"><span className="rounded-sm bg-[#e8f1fe] px-1.5 py-px font-bold text-[#142b54]">卒業生</span>大学3回生・文系・文化部</span>
                  <span className="mt-0.5 flex w-full border-t border-[#e3e8ef] pt-2 text-left">
                    <span className="flex flex-1 flex-col"><span className="font-display text-[16px] font-semibold text-[#2370f1]">24</span><span className="text-[9px] text-[#5b6573]">回答</span></span>
                    <span className="flex flex-1 flex-col"><span className="font-display text-[16px] font-semibold text-[#2370f1]">9</span><span className="text-[9px] text-[#5b6573]">ベストアンサー</span></span>
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 px-4 py-3.5">
                  <span className="text-[10px] font-bold">答えられること</span>
                  <span className="flex flex-wrap gap-[5px]">{["留学・国際", "受験・進路", "大学生活"].map((t) => <span key={t} className="rounded-pill bg-[#e8f1fe] px-[9px] py-[3px] text-[10px] font-bold text-[#1a56c9]">#{t}</span>)}</span>
                </div>
                <div className="mt-auto px-4 pb-[22px]"><span className="flex h-10 items-center justify-center rounded-pill bg-[#2370f1] text-[12px] font-bold text-white">この先輩に相談する</span></div>
              </div>
            </div>
          </div>
          {/* 裏（回転中に見える）：public/phone/back.webp */}
          <div id="sn-backface" className="sn-face" style={{ transform: `rotateY(180deg) translateZ(${THICKNESS / 2}px)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/phone/back.webp" alt="" draggable={false} className="h-full w-full select-none object-fill drop-shadow-[0_24px_24px_rgba(0,40,90,0.25)]" />
          </div>
        </div>
      </div>

      <div className="relative z-[2]" style={{ marginTop: `calc(-1 * ${stageH})` }}>
        <section id="sn-hero" className="sn-hero box-border flex items-center pt-[72px]" style={{ height: stageH }}>
          <div className="mx-auto w-full max-w-page px-6 md:px-12">
            <div id="sn-hero-text" className="sn-hero-text flex flex-col gap-6">
              {loggedIn && unread > 0 ? (
                <Link href="/mypage" className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-pill bg-white px-4 text-label text-ink no-underline hover:text-ink hover:no-underline">
                  <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
                  新しい通知が{unread}件あります
                </Link>
              ) : (
                <p className="text-label text-ink">TGUISS 在校生と先輩をつなぐ相談の場</p>
              )}
              <h1 className="text-[40px] leading-[56px] tracking-[0.08em] text-ink">{messages.site.heroLine1}<br />{messages.site.heroLine2}</h1>
              <p className="max-w-[30em] text-body text-ink">同じ学校を歩いた先輩が、進路や毎日の悩みに答えます。相談はタイトルと内容を書いて、カテゴリを選ぶだけ。いろいろな先輩から回答が届きます。</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/board/new" className={buttonClass("accent", "min-h-[52px] px-7 text-[15px] shadow-cta")}>
                  {messages.cta.consult}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
                </Link>
                {loggedIn ? (
                  <Link href="/board" className="inline-flex min-h-[52px] items-center rounded-pill bg-white px-7 text-[15px] font-bold text-brand-deep no-underline hover:text-brand-deep hover:no-underline">相談一覧を見る</Link>
                ) : (
                  <Link href="/signup" className="inline-flex min-h-[52px] items-center rounded-pill bg-white px-7 text-[15px] font-bold text-brand-deep no-underline hover:text-brand-deep hover:no-underline">先輩として登録する</Link>
                )}
              </div>
              <a href="#features" className="mt-6 inline-flex min-h-[44px] items-center gap-2 self-start font-display text-eyebrow text-ink no-underline hover:text-ink hover:no-underline">
                Scroll<ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <div id="features" />
        {features.map((f) => (
          <section key={f.id} id={f.id} className="sn-step box-border flex items-center pt-[72px]" style={{ height: stageH }}>
            <div className="mx-auto w-full max-w-page px-6 md:px-12">
              <div className="sn-step-text flex flex-col gap-4">
                {f.first && (
                  <div className="mb-4 flex flex-col gap-2">
                    <p className="text-label text-brand">SenpaiNetでできること</p>
                    <p className="font-display text-display-xl text-brand">Features</p>
                  </div>
                )}
                <p className="flex items-center gap-3 font-display text-eyebrow text-brand">
                  <span>{f.num}</span><span className="h-0.5 w-10 flex-none bg-brand" /><span className="text-ink-muted">/ 03</span>
                </p>
                <h2 className="whitespace-pre-line text-h2">{f.title}</h2>
                <p className="text-body">{f.body}</p>
                <ul className="flex flex-col gap-2.5 text-label">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-pill bg-brand-soft text-brand"><Check size={14} strokeWidth={2.25} aria-hidden="true" /></span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
