import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Cpu,
  Globe,
  Loader2,
  Lock,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SAFE_EXAMPLE_URLS, validateClientUrl } from "@/utils/urlValidation";

export interface UrlScannerFormProps {
  onScanSubmit: (url: string) => Promise<void>;
  isLoading: boolean;
  initialUrl?: string;
  compact?: boolean;
}

export function UrlScannerForm({
  onScanSubmit,
  isLoading,
  initialUrl = "",
  compact = false,
}: UrlScannerFormProps) {
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleClear = () => {
    setUrlInput("");
    setValidationError(null);
  };

  const handleSelectExample = (exampleUrl: string) => {
    setUrlInput(exampleUrl);
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateClientUrl(urlInput);
    if (!check.valid) {
      setValidationError(check.error || "Invalid URL format.");
      return;
    }
    setValidationError(null);
    await onScanSubmit(urlInput.trim());
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div className="relative flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <Globe className="h-5 w-5 text-cyan-500" />
            </div>
            <input
              type="url"
              value={urlInput}
              onChange={handleInputChange}
              disabled={isLoading}
              aria-label="URL to scan"
              placeholder="Enter full URL to inspect (e.g., https://example.com/login)..."
              className="w-full h-13 pl-11 pr-10 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700/90 bg-white dark:bg-[#060B16]/90 text-slate-900 dark:text-slate-100 font-mono text-sm placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
            {urlInput && !isLoading && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear URL input"
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="sm:w-auto w-full shrink-0 font-semibold px-7"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing URL...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Scan URL
              </>
            )}
          </Button>
        </div>

        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg px-3.5 py-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </motion.div>
        )}
      </form>

      {/* Passive analysis indicator during active scan */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          aria-live="polite"
          className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4"
        >
          <div className="flex items-center justify-between text-xs font-medium text-cyan-600 dark:text-cyan-300 mb-2">
            <span className="flex items-center gap-2">
              <Cpu className="h-4 w-4 animate-pulse" />
              Extracting 24 lexical &amp; structural features in-memory and running XGBoost v1.0.0 inference...
            </span>
            <span className="font-mono">Passive Mode</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}

      {/* Safe Example URLs */}
      {!compact && (
        <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
              <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
              Try safe test strings:
            </span>
            {SAFE_EXAMPLE_URLS.map((ex) => (
              <button
                key={ex.label}
                type="button"
                disabled={isLoading}
                onClick={() => handleSelectExample(ex.url)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 hover:border-cyan-500/50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Badge
                  variant={ex.category}
                  className="px-1.5 py-0 text-[10px]"
                >
                  {ex.category === "phishing" ? "Phish Sample" : "Legit Sample"}
                </Badge>
                <span>{ex.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-emerald-500" />
          Zero-touch passive analysis: PhishGuard AI never visits, fetches, or executes submitted URLs.
        </span>
        <span>Query parameter values are automatically redacted before storage.</span>
      </div>
    </div>
  );
}
