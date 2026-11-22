import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "accent" | "soft" | "ghost";

const base =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill px-5 text-label no-underline transition-[background-color,color,transform,box-shadow,filter] duration-150 hover:no-underline active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-deep hover:text-on-brand",
  // コーラルは1画面に1つだけ
  accent: "bg-accent-strong text-on-brand hover:bg-accent-strong hover:text-on-brand hover:brightness-95",
  soft: "bg-brand-soft text-brand-deep hover:text-brand-deep hover:brightness-95",
  ghost: "text-ink hover:text-brand",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...rest} />;
}
