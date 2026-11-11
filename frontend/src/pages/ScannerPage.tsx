import { useState } from "react";
import {
  CheckCircle2,
  Cpu,
  Lock,
  Radar,
  ShieldAlert,
  ShieldQuestion,
} from "lucide-react";
import { phishGuardApi } from "@/services/api";
import type { ScanResponse } from "@/types/api";
import { useToast } from "@/contexts/ToastContext";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UrlScannerForm } from "@/components/scanner/UrlScannerForm";
import { ScanResultView } from "@/components/scanner/ScanResultView";

export function ScannerPage() {
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleScan = async (url: string) => {
    setIsLoading(true);
    try {
      const scanRes = await phishGuardApi.scanUrl(url);
      setResult(scanRes);
      showToast(
        "URL Analysis Complete",
        `Verdict: ${scanRes.prediction.toUpperCase()} (${(
          scanRes.phishing_score * 100
        ).toFixed(1)}% risk score)`,
        scanRes.prediction === "phishing"
          ? "error"
          : scanRes.prediction === "suspicious"
          ? "info"
          : "success"
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to process URL scan.";
      showToast("Scan Failed", msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="info">
            <Radar className="h-3.5 w-3.5" />
            Real-Time Lexical Analysis
          </Badge>
          <Badge variant="neutral">
            <Cpu className="h-3.5 w-3.5" />
            24 Features
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          URL Threat Scanner
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Submit any HTTP or HTTPS URL for passive lexical and structural
          inspection. PhishGuard AI extracts 24 features in memory and evaluates
          them with our trained XGBoost model without visiting the target URL.
        </p>
      </div>

      {/* Main Scanner Input Card */}
      <Card className="border-cyan-500/30 shadow-cyber-glow">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Radar className="h-5 w-5 text-cyan-500" />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Submit URL for Passive ML Inspection
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Max Length: 2,048 chars
          </span>
        </CardHeader>
        <CardContent>
          <UrlScannerForm onScanSubmit={handleScan} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Scan Result or Reference Guide */}
      {result ? (
        <ScanResultView result={result} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          <Card>
            <CardContent className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Legitimate (&lt; 0.35 Score)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                URLs exhibiting concise hostnames, standard domain depth, normal
                character entropy, and absence of credential-lure patterns.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                <ShieldQuestion className="h-4 w-4" />
                <span>Suspicious / Uncertain (0.35 – 0.65)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Borderline URLs with mixed structural signals (such as deep
                query parameters, multiple subdomains, or unencrypted HTTP).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                <ShieldAlert className="h-4 w-4" />
                <span>Phishing (&ge; 0.65 Score)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                High-risk URLs matching phishing lexical signatures such as IP
                hostnames, @ redirection, combo-squatted hyphens, or credential
                harvesting keywords.
              </p>
            </CardContent>
          </Card>

          <div className="md:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/50 p-4 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <Lock className="h-4 w-4 text-cyan-500 shrink-0" />
            <span>
              <strong>Note:</strong> Results are displayed only after receiving
              a live response from the FastAPI inference engine. No simulated or
              hardcoded predictions are used.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
