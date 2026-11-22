"use client";

// 文字を一文字ずつ動かす部品（キネティック・タイポグラフィ）と、画面に入ったら動き出す仕組み。
// 動きを減らす設定（prefers-reduced-motion）の人には、最初から最終状態を見せる。
import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

export function prefersReducedMotion() {
  return typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
}

/** 要素が画面に入ったら true（一度だけ） */
export function useInView<T extends Element>(rootMargin = "0px 0px -10% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, inView] as const;
}

/** 文字列を一文字ずつの span に分ける（読み上げ用に全文は親の aria-label で持つ） */
function chars(text: string, style?: (i: number, ch: string) => CSSProperties) {
  return Array.from(text).map((ch, i) => (
    <span key={i} aria-hidden="true" style={{ ["--i" as string]: i, ...style?.(i, ch) }}>
      {ch === " " ? " " : ch}
    </span>
  ));
}

// 「悩み」の文字が散らばって見えるように、文字ごとにずれと傾きを決める（毎回同じになるよう固定の式）
const scatter = (i: number): CSSProperties => {
  const r = (n: number) => Math.sin(i * 12.9898 + n * 78.233) * 43758.5453 % 1;
  return {
    ["--dx" as string]: `${(r(1) * 0.9).toFixed(2)}em`,
    ["--dy" as string]: `${(r(2) * 0.9 - 0.2).toFixed(2)}em`,
    ["--rot" as string]: `${(r(3) * 28).toFixed(1)}deg`,
  };
};

/**
 * ヒーローのキャッチコピー。
 * 1行目（悩み）は散らばった文字が集まって落ち着き、2行目（相談）は一文字ずつ書き出される。
 */
export function HeroCopy({ line1, line2, className = "" }: { line1: string; line2: string; className?: string }) {
  return (
    <h1 aria-label={`${line1}${line2}`} className={className}>
      <span className="kt-worry">{chars(line1, scatter)}</span>
      <br />
      <span className="kt-type" style={{ ["--d0" as string]: `${Array.from(line1).length * 70 + 450}ms` }}>
        {chars(line2)}
      </span>
    </h1>
  );
}

/** 英字の見出し：画面に入ると、文字が下から一文字ずつせり上がる */
export function KineticWord({ text, as: Tag = "p", className = "" }: { text: string; as?: ElementType; className?: string }) {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <Tag ref={ref} aria-label={text} data-in={inView || undefined} className={`kt-rise ${className}`}>
      {chars(text)}
    </Tag>
  );
}

/** 数字：画面に入ると 0 から数え上がる */
export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) return setShown(value);
    let raf = 0;
    const start = performance.now();
    const dur = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return (
    <span ref={ref} className={className} aria-label={String(value)}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}

/** 流れる帯（マーキー）。カーソルを乗せる・キーボードで選ぶと止まる。動きを減らす設定では折り返して並べる */
export function Marquee({ children, label, seconds = 40 }: { children: ReactNode; label: string; seconds?: number }) {
  return (
    <div className="sn-marquee group relative overflow-hidden" aria-label={label} role="region" style={{ ["--dur" as string]: `${seconds}s` }}>
      <div className="sn-marquee-track flex w-max gap-2">
        <div className="flex flex-none gap-2">{children}</div>
        <div className="sn-marquee-copy flex flex-none gap-2" aria-hidden="true" inert>
          {children}
        </div>
      </div>
    </div>
  );
}

/** 一覧などで、子要素を少しずつ遅らせて出す（--i を付ける） */
export function stagger(i: number): CSSProperties {
  return { ["--i" as string]: Math.min(i, 12) };
}
