import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Database,
  EyeOff,
  FileSearch,
  Lock,
  Radar,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { phishGuardApi } from "@/services/api";
import type { ModelInfoResponse, ScanResponse } from "@/types/api";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UrlScannerForm } from "@/components/scanner/UrlScannerForm";
import { ScanResultView } from "@/components/scanner/ScanResultView";

export function LandingPage() {
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);
  const { showToast } = useToast();
  const scannerSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    phishGuardApi
      .getModelInfo()
      .then((info) => {
        if (mounted) setModelInfo(info);
      })
      .catch(() => {
        // Keep null if backend is offline
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleScan = async (url: string) => {
    setIsScanning(true);
    try {
      const res = await phishGuardApi.scanUrl(url);
      setScanResult(res);
      showToast(
        "Scan Completed",
        `Classification: ${res.prediction.toUpperCase()} (score ${res.phishing_score.toFixed(4)})`,
        res.prediction === "phishing"
          ? "error"
          : res.prediction === "suspicious"
          ? "info"
          : "success"
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to analyze the submitted URL.";
      showToast("Scan Error", msg, "error");
    } finally {
      setIsScanning(false);
    }
  };

  const scrollToScanner = () => {
    scannerSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="space-y-20 pb-12">
      {/* 1 & 2. Hero Section + Prominent URL Scanning Interface */}
      <section className="relative pt-12 sm:pt-16 pb-4 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-300"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Detect Threats. Protect Your Digital World.</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight"
            >
              Stay One Step Ahead of{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400">
                Phishing.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed"
            >
              Analyze suspicious URLs using machine learning and understand the
              signals behind potentially dangerous links.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-wrap items-center justify-center gap-3 pt-2"
            >
              <Button size="lg" onClick={scrollToScanner}>
                <Radar className="h-5 w-5" />
                Scan a URL
              </Button>
              <Link to="/model-insights">
                <Button variant="outline" size="lg">
                  <BrainCircuit className="h-5 w-5" />
                  Explore Technology
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Embedded Hero URL Scanner */}
          <motion.div
            ref={scannerSectionRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 max-w-4xl mx-auto"
          >
            <Card className="border-cyan-500/30 shadow-cyber-glow">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-900/70 rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <Radar className="h-5 w-5 text-cyan-500" />
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Passive Lexical &amp; Structural URL Scanner
                  </span>
                </div>
                <Badge variant="info">
                  {modelInfo
                    ? `${modelInfo.selected_model_name} ${modelInfo.version}`
                    : "XGBoost v1.0.0"}
                </Badge>
              </CardHeader>
              <CardContent className="p-6">
                <UrlScannerForm
                  onScanSubmit={handleScan}
                  isLoading={isScanning}
                />
              </CardContent>
            </Card>

            {scanResult && (
              <div className="mt-8">
                <ScanResultView result={scanResult} />
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* 3. How PhishGuard AI Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="info" className="mb-2">
            Architecture &amp; Workflow
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            How PhishGuard AI Works
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Every submitted URL passes through a four-stage passive analysis
            pipeline in under 50 milliseconds without ever contacting the remote
            host.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              step: "01",
              icon: Lock,
              title: "Validation & Redaction",
              description:
                "Validates URL syntax, scheme (HTTP/HTTPS), and length while redacting sensitive query parameter values (?token=[REDACTED]) before persistence.",
            },
            {
              step: "02",
              icon: FileSearch,
              title: "24-Feature Extraction",
              description:
                "Extracts lexical lengths, subdomain depth, character distributions, Shannon entropy, punycode, IP literals, and credential lure keywords in memory.",
            },
            {
              step: "03",
              icon: Cpu,
              title: "Supervised ML Inference",
              description:
                "Evaluates the 24-feature vector using our trained XGBoost classifier calibrated across Legitimate, Suspicious, and Phishing decision thresholds.",
            },
            {
              step: "04",
              icon: ShieldCheck,
              title: "Explainable Signals",
              description:
                "Generates human-readable risk indicators explaining which exact structural properties triggered the classification.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.step} className="relative overflow-hidden">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-500">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-600">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4 & 5. Key Features & Machine Learning Methodology */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 space-y-5">
            <Badge variant="info">Core Capabilities</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Engineered for Explainable Cybersecurity Analysis
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Unlike opaque reputation blocklists that fail on newly registered
              domains, PhishGuard AI inspects the intrinsic lexical anatomy of a
              URL and explains every structural signal it detects.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[
                {
                  title: "Zero Training–Serving Skew",
                  desc: "The exact same Python feature extraction module powers offline dataset preparation, training, and live FastAPI inference.",
                },
                {
                  title: "Neutral HTTPS Evaluation",
                  desc: "Modern phishing sites routinely use valid TLS certificates. PhishGuard AI never treats HTTPS as a standalone badge of safety.",
                },
                {
                  title: "Domain-Aware Generalization",
                  desc: "Validated using GroupShuffleSplit across 1,777 unseen registrable domains with zero domain overlap.",
                },
                {
                  title: "Privacy-Preserving History",
                  desc: "Automatically masks query parameter values and credentials before storing scan records in the database.",
                },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 p-4 space-y-1.5"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0" />
                    <span>{feat.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Real Model Performance Preview */}
          <div className="lg:col-span-5">
            <Card className="h-full flex flex-col justify-between border-blue-500/30">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Verified Model Performance
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Held-out test set evaluation (
                      {modelInfo
                        ? `${modelInfo.dataset.audit.test_records.toLocaleString()} unseen URLs`
                        : "Unseen test split"}
                      )
                    </p>
                  </div>
                </div>
                <Badge variant="legitimate">Live Artifact</Badge>
              </CardHeader>

              <CardContent className="space-y-5">
                {modelInfo ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        {
                          label: "Test Accuracy",
                          value: `${(
                            modelInfo.test_metrics.accuracy * 100
                          ).toFixed(2)}%`,
                        },
                        {
                          label: "Precision",
                          value: `${(
                            modelInfo.test_metrics.precision * 100
                          ).toFixed(2)}%`,
                        },
                        {
                          label: "Recall (Sensitivity)",
                          value: `${(
                            modelInfo.test_metrics.recall * 100
                          ).toFixed(2)}%`,
                        },
                        {
                          label: "F1-Score",
                          value: `${(
                            modelInfo.test_metrics.f1_score * 100
                          ).toFixed(2)}%`,
                        },
                        {
                          label: "ROC-AUC",
                          value: `${(
                            modelInfo.test_metrics.roc_auc * 100
                          ).toFixed(2)}%`,
                        },
                        {
                          label: "PR-AUC",
                          value: `${(
                            modelInfo.test_metrics.pr_auc * 100
                          ).toFixed(2)}%`,
                        },
                      ].map((m) => (
                        <div
                          key={m.label}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-3"
                        >
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {m.label}
                          </p>
                          <p className="text-lg font-extrabold font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                            {m.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3.5 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Active Classifier:</span>
                        <span className="font-mono font-semibold">
                          {modelInfo.selected_model_name} ({modelInfo.version})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cleaned Corpus:</span>
                        <span className="font-mono font-semibold">
                          {modelInfo.dataset.audit.final_cleaned_records.toLocaleString()}{" "}
                          raw URLs
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Unique Registrable Domains:
                        </span>
                        <span className="font-mono font-semibold">
                          {modelInfo.dataset.audit.unique_registrable_domains.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Loading real-time model evaluation metrics from backend...
                  </div>
                )}

                <Link to="/model-insights" className="block">
                  <Button variant="outline" className="w-full">
                    View Full Model Insights &amp; Confusion Matrix
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. Security and Privacy Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="bg-gradient-to-br from-slate-900 via-[#0B1221] to-slate-900 text-white border-slate-800">
          <CardContent className="p-8 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              <div className="space-y-3">
                <Badge variant="info">Security &amp; Privacy by Design</Badge>
                <h2 className="text-2xl font-bold text-white">
                  Safe, Passive Inspection Without Active Crawling
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Fetching a suspicious link can alert attackers, validate
                  phishing tracking beacons, or expose backend servers to SSRF.
                  PhishGuard AI eliminates these risks by design.
                </p>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <EyeOff className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">
                    Zero Outbound Requests
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Submitted URLs are never visited, resolved via DNS, or
                    executed in a browser.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <Database className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    Query Value Redaction
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Session tokens, emails, and query values are masked as
                    [REDACTED] before database storage.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">
                    Rate Limited &amp; Validated
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Strict Pydantic scheme checks, length limits, and sliding
                    window IP rate limiting protect the API.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 8. Call-To-Action Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Ready to Inspect a Suspicious Link?
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Launch the dedicated URL Scanner workspace, explore live scan
          telemetry on the Analytics Dashboard, or inspect the XGBoost model
          evaluation report.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/scanner">
            <Button size="lg">
              <Radar className="h-5 w-5" />
              Open URL Scanner
            </Button>
          </Link>
          <Link to="/analytics">
            <Button variant="outline" size="lg">
              View Analytics Dashboard
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
