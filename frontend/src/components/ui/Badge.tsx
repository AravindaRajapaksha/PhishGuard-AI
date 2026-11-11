import React from "react";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { PredictionVerdict } from "@/types/api";
import { cn } from "@/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "legitimate" | "suspicious" | "phishing" | "info" | "neutral";
}

export function Badge({
  className,
  variant = "neutral",
  children,
  ...props
}: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps["variant"]>, string> = {
    legitimate:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    suspicious:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    phishing:
      "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    info: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    neutral:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function VerdictBadge({
  prediction,
  size = "md",
}: {
  prediction: PredictionVerdict;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg"
      ? "px-3.5 py-1.5 text-sm"
      : size === "sm"
      ? "px-2 py-0.5 text-xs"
      : "px-3 py-1 text-xs";

  if (prediction === "phishing") {
    return (
      <Badge variant="phishing" className={sizeClass}>
        <ShieldAlert className="h-3.5 w-3.5" />
        Phishing Detected
      </Badge>
    );
  }

  if (prediction === "suspicious") {
    return (
      <Badge variant="suspicious" className={sizeClass}>
        <ShieldQuestion className="h-3.5 w-3.5" />
        Suspicious / Uncertain
      </Badge>
    );
  }

  return (
    <Badge variant="legitimate" className={sizeClass}>
      <ShieldCheck className="h-3.5 w-3.5" />
      Legitimate Structure
    </Badge>
  );
}
