import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  Cpu,
  Filter,
  Info,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  SlidersHorizontal,
} from "lucide-react";
import type { ScanResponse } from "@/types/api";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge, VerdictBadge } from "@/components/ui/Badge";

export interface ScanResultViewProps {
  result: ScanResponse;
}

const FEATURE_CATEGORIES = [
  "All",
  "Deception & Obfuscation",
  "Domain & Protocol",
  "Length & Structure",
  "Character Counts",
] as const;

export function ScanResultView({ result }: ScanResultViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const scorePercent = Math.round(result.phishing_score * 1000) / 10;

  const filteredFeatures =
    selectedCategory === "All"
      ? result.feature_details
      : result.feature_details.filter((f) => f.category === selectedCategory);

  const borderGlowClass =
    result.prediction === "phishing"
      ? "border-red-500/40 shadow-[0_0_30px_-8px_rgba(239,68,68,0.28)]"
      : result.prediction === "suspicious"
      ? "border-amber-500/40 shadow-[0_0_30px_-8px_rgba(245,158,11,0.25)]"
      : "border-emerald-500/40 shadow-[0_0_30px_-8px_rgba(16,185,129,0.25)]";

  const barColorClass =
    result.prediction === "phishing"
      ? "bg-gradient-to-r from-amber-500 to-red-500"
      : result.prediction === "suspicious"
      ? "bg-gradient-to-r from-emerald-500 to-amber-500"
      : "bg-gradient-to-r from-emerald-500 to-cyan-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Mandatory Safety Disclaimer Banner */}
      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-800 dark:text-amber-200"
      >
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Calibration &amp; Safety Notice: </span>
          <span>{result.disclaimer}</span>
        </div>
      </div>

      {/* Top Verdict Summary Card */}
      <Card className={borderGlowClass}>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <VerdictBadge prediction={result.prediction} size="lg" />
                <Badge variant="info">
                  <Cpu className="h-3.5 w-3.5" />
                  {result.model_name} ({result.model_version})
                </Badge>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  {result.scan_duration_ms.toFixed(1)} ms
                </span>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                  Inspected URL (Sensitive Query Values Redacted)
                </p>
                <p className="mt-1 font-mono text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 break-all bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5">
                  {result.redacted_url}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  <strong className="text-slate-700 dark:text-slate-300">
                    Hostname:
                  </strong>{" "}
                  <code className="font-mono">{result.hostname}</code>
                </span>
                <span>
                  <strong className="text-slate-700 dark:text-slate-300">
                    Timestamp:
                  </strong>{" "}
                  {new Date(result.created_at).toLocaleString()}
                </span>
                <span>
                  <strong className="text-slate-700 dark:text-slate-300">
                    Scan ID:
                  </strong>{" "}
                  <code className="font-mono">{result.id.slice(0, 8)}</code>
                </span>
              </div>
            </div>

            {/* Phishing Score Meter */}
            <div className="lg:w-72 shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Model Phishing Score
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {result.phishing_score.toFixed(4)}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-3">
                <span
                  className={`text-3xl font-extrabold font-mono ${
                    result.prediction === "phishing"
                      ? "text-red-500"
                      : result.prediction === "suspicious"
                      ? "text-amber-500"
                      : "text-emerald-500"
                  }`}
                >
                  {scorePercent.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  risk score ({result.risk_level} risk)
                </span>
              </div>

              <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                  style={{ width: `${Math.max(3, Math.min(100, scorePercent))}%` }}
                />
              </div>

              <div className="mt-2.5 flex justify-between text-[10px] font-mono text-slate-400">
                <span>0.0 Legit</span>
                <span>0.35 Suspicious</span>
                <span>0.65+ Phish</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Indicators & Signal Explanations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            {result.prediction === "phishing" ? (
              <ShieldAlert className="h-5 w-5 text-red-500" />
            ) : result.prediction === "suspicious" ? (
              <ShieldQuestion className="h-5 w-5 text-amber-500" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Detected Lexical &amp; Structural Signals ({result.risk_signals.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Key URL characteristics observed during passive inspection.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.risk_signals.map((sig) => {
            const badgeVariant =
              sig.severity === "high"
                ? "phishing"
                : sig.severity === "medium"
                ? "suspicious"
                : sig.severity === "low"
                ? "legitimate"
                : "info";

            return (
              <div
                key={sig.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-900/50 p-4 flex flex-col justify-between gap-2"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {sig.title}
                    </span>
                    <Badge variant={badgeVariant} className="uppercase text-[10px]">
                      {sig.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {sig.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Feature: {sig.feature}</span>
                  <span>Observed Value: {sig.value}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Extracted 24 URL Features Breakdown */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-5 w-5 text-cyan-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Extracted URL Feature Vector (24 Lexical Features)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exact numerical inputs passed to the trained {result.model_name} classifier.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400 mr-1" />
            {FEATURE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFeatures.map((feat) => (
              <div
                key={feat.name}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 p-3.5 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {feat.label}
                    </span>
                    <span className="font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                      {feat.value}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {feat.name}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-900/70 rounded-xl px-3.5 py-2.5">
            <Info className="h-4 w-4 text-cyan-500 shrink-0" />
            <span>
              Feature values and global feature importances describe structural properties evaluated by the model and do not constitute standalone proof of malicious intent.
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
