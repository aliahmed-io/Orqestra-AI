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
        "rounded-lg border border-hairline bg-porcelain-elevated shadow-[0_1px_2px_rgba(36,43,58,0.03)] transition-shadow duration-150",
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
      className={cn(
        "flex items-center justify-between gap-3 border-b border-hairline/70 px-6 py-4",
        className
      )}
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
        "font-display text-sm font-semibold tracking-tight text-ink",
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
    <div className={cn("p-6", className)} {...props}>
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
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.99]";
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-indigo text-white shadow-xs hover:bg-indigo-hover",
    secondary:
      "border border-hairline bg-porcelain-elevated text-ink hover:bg-porcelain-recessed",
    ghost: "text-ink-muted hover:bg-porcelain-recessed hover:text-ink",
    apricot: "bg-apricot text-ink hover:brightness-95 font-semibold",
  };
  const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
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
    neutral: "bg-porcelain text-ink-muted border-hairline",
    indigo: "bg-indigo-subtle text-indigo border-soft-slate/60",
    apricot: "bg-apricot-subtle text-ink border-apricot/70",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    danger: "bg-rose-50 text-rose-800 border-rose-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-none",
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
      ? "border-t-2 border-t-apricot"
      : accent === "indigo"
      ? "border-t-2 border-t-indigo"
      : "";

  return (
    <Card className={cn("p-5", borderClass)}>
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className="mt-2 font-mono-num text-2xl font-semibold tracking-tight text-ink">
        {value}
      </div>
      {sublabel && (
        <div className="mt-1.5 text-xs text-ink-muted">{sublabel}</div>
      )}
    </Card>
  );
}

export function OutcomeArcGauge({
  completed,
  open,
  other,
  total,
}: {
  completed: number;
  open: number;
  other: number;
  total: number;
}) {
  const safeTotal = Math.max(1, total);
  const compPct = (completed / safeTotal) * 100;
  const openPct = (open / safeTotal) * 100;
  const radius = 58;
  const circumference = Math.PI * radius; // semicircle

  const compLen = (compPct / 100) * circumference;
  const openLen = (openPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-32 w-48 items-end justify-center">
        <svg viewBox="0 0 140 80" className="h-full w-full overflow-visible">
          {/* Background track */}
          <path
            d="M 12 72 A 58 58 0 0 1 128 72"
            fill="none"
            stroke="#ECE8DF"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Completed arc (Indigo) */}
          <path
            d="M 12 72 A 58 58 0 0 1 128 72"
            fill="none"
            stroke="#354D8A"
            strokeWidth="12"
            strokeDasharray={`${compLen} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Open arc (Soft Slate) */}
          {openLen > 0 && (
            <path
              d="M 12 72 A 58 58 0 0 1 128 72"
              fill="none"
              stroke="#A9B6CE"
              strokeWidth="12"
              strokeDasharray={`${openLen} ${circumference}`}
              strokeDashoffset={-compLen}
              strokeLinecap="butt"
            />
          )}
        </svg>
        <div className="absolute bottom-2 text-center">
          <div className="font-mono-num text-2xl font-bold text-ink">
            {total}
          </div>
          <div className="text-[11px] font-medium text-ink-muted">
            Total Cases
          </div>
        </div>
      </div>

      <div className="mt-3 grid w-full grid-cols-3 gap-2 border-t border-hairline pt-3 text-center text-xs">
        <div>
          <div className="flex items-center justify-center gap-1 text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-indigo" />
            <span>Done</span>
          </div>
          <div className="mt-0.5 font-mono-num font-semibold text-ink">
            {completed}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-soft-slate" />
            <span>Open</span>
          </div>
          <div className="mt-0.5 font-mono-num font-semibold text-ink">
            {open}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-apricot" />
            <span>Closed*</span>
          </div>
          <div className="mt-0.5 font-mono-num font-semibold text-ink">
            {other}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoadingPanel({
  label = "Loading process data...",
}: {
  label?: string;
}) {
  return (
    <Card className="flex h-56 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-sm text-ink-muted">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-soft-slate border-t-indigo" />
        <span>{label}</span>
      </div>
    </Card>
  );
}
