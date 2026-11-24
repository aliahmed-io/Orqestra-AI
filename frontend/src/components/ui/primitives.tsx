import React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-hairline bg-porcelain-elevated shadow-[0_1px_2px_rgba(36,43,58,0.04)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between px-6 pt-5 pb-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-display text-base font-semibold tracking-tight text-ink",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 pb-6", className)} {...props}>
      {children}
    </div>
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "apricot";
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo disabled:pointer-events-none disabled:opacity-50 cursor-pointer";
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-indigo text-white hover:bg-indigo-hover",
    secondary:
      "border border-hairline bg-porcelain-elevated text-ink hover:bg-porcelain-recessed",
    ghost: "text-ink-muted hover:bg-porcelain-recessed hover:text-ink",
    apricot: "bg-apricot text-ink hover:brightness-95 font-semibold",
  };
  const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "indigo" | "apricot" | "success" | "danger";
}

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: BadgeProps) {
  const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
    neutral: "bg-porcelain-recessed text-ink border-hairline",
    indigo: "bg-indigo-subtle text-indigo border-soft-slate/50",
    apricot: "bg-apricot-subtle text-ink border-apricot/60",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    danger: "bg-rose-50 text-rose-800 border-rose-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function KpiTile({
  label,
  value,
  sublabel,
  accent = "default",
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: "default" | "indigo" | "apricot";
}) {
  const borderClass =
    accent === "apricot"
      ? "border-l-4 border-l-apricot"
      : accent === "indigo"
      ? "border-l-4 border-l-indigo"
      : "";

  return (
    <Card className={cn("p-5", borderClass)}>
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className="mt-2 font-mono-num text-2xl font-semibold tracking-tight text-ink">
        {value}
      </div>
      {sublabel && (
        <div className="mt-1 text-xs text-ink-muted">{sublabel}</div>
      )}
    </Card>
  );
}

export function LoadingPanel({ label = "Loading process data..." }: { label?: string }) {
  return (
    <Card className="flex h-56 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-sm text-ink-muted">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-soft-slate border-t-indigo" />
        <span>{label}</span>
      </div>
    </Card>
  );
}
