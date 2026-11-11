import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Award,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Database,
  GitCompare,
  Layers,
  Sliders,
} from "lucide-react";
import { phishGuardApi } from "@/services/api";
import type { ModelInfoResponse } from "@/types/api";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function ModelInsightsPage() {
  const [info, setInfo] = useState<ModelInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    phishGuardApi
      .getModelInfo()
      .then((res) => {
        if (mounted) {
          setInfo(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load model evaluation insights."
          );
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-sm text-slate-500">
        Loading active machine learning model evaluation artifacts...
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="border-red-500/30">
          <CardContent className="p-6 text-sm text-red-500">
            {error || "Model metadata is unavailable."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const cm = info.test_metrics.confusion_matrix;
  const topFeaturesChartData = info.feature_importances
    .slice(0, 12)
    .map((f) => ({
      name: f.label,
      importancePct: Number((f.importance * 100).toFixed(2)),
    }));

  const candidateChartData = info.candidate_models.map((m) => ({
    name: m.name,
    Accuracy: Number((m.test_metrics.accuracy * 100).toFixed(2)),
    Precision: Number((m.test_metrics.precision * 100).toFixed(2)),
    Recall: Number((m.test_metrics.recall * 100).toFixed(2)),
    F1: Number((m.test_metrics.f1_score * 100).toFixed(2)),
    "ROC-AUC": Number((m.test_metrics.roc_auc * 100).toFixed(2)),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">
            <BrainCircuit className="h-3.5 w-3.5" />
            Model Architecture &amp; Evaluation
          </Badge>
          <Badge variant="legitimate">
            <Award className="h-3.5 w-3.5" />
            Active Production Artifact: {info.selected_model_name} (
            {info.version})
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Machine Learning Model Insights
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
          Transparent documentation of the trained {info.selected_model_name}{" "}
          classifier, dataset provenance, unseen held-out test metrics,
          cross-domain generalization, confusion matrix, and global feature
          importance.
        </p>
      </div>

      {/* Primary Held-Out Test Set Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Test Accuracy",
            val: `${(info.test_metrics.accuracy * 100).toFixed(2)}%`,
            sub: `Val: ${(info.validation_metrics.accuracy * 100).toFixed(2)}%`,
          },
          {
            label: "Precision",
            val: `${(info.test_metrics.precision * 100).toFixed(2)}%`,
            sub: `Val: ${(info.validation_metrics.precision * 100).toFixed(2)}%`,
          },
          {
            label: "Recall (Sensitivity)",
            val: `${(info.test_metrics.recall * 100).toFixed(2)}%`,
            sub: `Val: ${(info.validation_metrics.recall * 100).toFixed(2)}%`,
          },
          {
            label: "F1-Score",
            val: `${(info.test_metrics.f1_score * 100).toFixed(2)}%`,
            sub: `Val: ${(info.validation_metrics.f1_score * 100).toFixed(2)}%`,
          },
          {
            label: "ROC-AUC",
            val: `${(info.test_metrics.roc_auc * 100).toFixed(2)}%`,
            sub: `Val: ${(info.validation_metrics.roc_auc * 100).toFixed(2)}%`,
          },
          {
            label: "PR-AUC",
            val: `${(info.test_metrics.pr_auc * 100).toFixed(2)}%`,
            sub: `Val: ${(info.validation_metrics.pr_auc * 100).toFixed(2)}%`,
          },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {metric.label}
              </p>
              <p className="text-2xl font-extrabold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                {metric.val}
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-1">
                {metric.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Model Metadata & Dataset Provenance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-cyan-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Model Configuration &amp; Decision Policy
              </h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Algorithm Family:</span>
                <span className="font-mono font-bold">
                  {info.selected_model_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Artifact Version:</span>
                <span className="font-mono font-bold">{info.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trained At (UTC):</span>
                <span className="font-mono">
                  {new Date(info.trained_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Input Feature Vector:</span>
                <span className="font-mono font-bold">
                  {info.feature_count} Lexical &amp; Structural Features
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                Tuned Hyperparameters
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(info.hyperparameters).map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 flex justify-between font-mono"
                  >
                    <span className="text-slate-500">{k}:</span>
                    <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                      {String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3.5 space-y-1">
              <p className="font-bold text-cyan-700 dark:text-cyan-300">
                Three-Tier Probability Decision Policy
              </p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {info.decision_thresholds.policy_description}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Verified Dataset Provenance &amp; Anti-Leakage Audit
              </h2>
            </div>
            <Badge variant="legitimate">{info.dataset.license}</Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {info.dataset.name}
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                {info.dataset.sources.map((src) => (
                  <li key={src}>{src}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Raw Downloaded",
                  val: info.dataset.audit.raw_records_downloaded.toLocaleString(),
                },
                {
                  label: "Duplicates Removed",
                  val: info.dataset.audit.duplicate_records_removed.toLocaleString(),
                },
                {
                  label: "Cleaned Total",
                  val: info.dataset.audit.final_cleaned_records.toLocaleString(),
                },
                {
                  label: "Unique Domains",
                  val: info.dataset.audit.unique_registrable_domains.toLocaleString(),
                },
                {
                  label: "Legitimate (0)",
                  val: info.dataset.audit.legitimate_count.toLocaleString(),
                },
                {
                  label: "Phishing (1)",
                  val: info.dataset.audit.phishing_count.toLocaleString(),
                },
                {
                  label: "Training Split (70%)",
                  val: info.dataset.audit.train_records.toLocaleString(),
                },
                {
                  label: "Unseen Test Split (15%)",
                  val: info.dataset.audit.test_records.toLocaleString(),
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3"
                >
                  <p className="text-[11px] text-slate-500">{stat.label}</p>
                  <p className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                    {stat.val}
                  </p>
                </div>
              ))}
            </div>

            {/* Domain-Grouped Generalization Summary */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Zero-Overlap Domain-Grouped Generalization Check
                </p>
                <p className="text-slate-500">
                  Evaluated via GroupShuffleSplit across{" "}
                  <strong>
                    {info.domain_grouped_test_metrics.test_domains.toLocaleString()}
                  </strong>{" "}
                  completely unseen registrable domains (domain overlap ={" "}
                  {info.domain_grouped_test_metrics.domain_overlap_count}).
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0 font-mono">
                <div>
                  <span className="block text-[10px] text-slate-400">
                    Domain Split Acc
                  </span>
                  <span className="text-sm font-bold text-emerald-500">
                    {(info.domain_grouped_test_metrics.accuracy * 100).toFixed(
                      2
                    )}
                    %
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">
                    Domain Split ROC-AUC
                  </span>
                  <span className="text-sm font-bold text-cyan-500">
                    {(info.domain_grouped_test_metrics.roc_auc * 100).toFixed(
                      2
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confusion Matrix & Error Impact Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-cyan-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Held-Out Test Confusion Matrix
                </h2>
                <p className="text-xs text-slate-500">
                  Unseen test split (N ={" "}
                  {(cm.tn + cm.fp + cm.fn + cm.tp).toLocaleString()} URLs)
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  True Negatives (TN)
                </p>
                <p className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {cm.tn.toLocaleString()}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Legitimate URLs correctly identified as Legitimate
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  False Positives (FP)
                </p>
                <p className="text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-1">
                  {cm.fp.toLocaleString()}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Legitimate URLs flagged as Phishing (FPR:{" "}
                  {(cm.false_positive_rate * 100).toFixed(2)}%)
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/35 bg-red-500/10 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                  False Negatives (FN)
                </p>
                <p className="text-3xl font-extrabold font-mono text-red-600 dark:text-red-400 mt-1">
                  {cm.fn.toLocaleString()}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Phishing URLs missed by binary 0.5 threshold (FNR:{" "}
                  {(cm.false_negative_rate * 100).toFixed(2)}%)
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-500/35 bg-cyan-500/10 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                  True Positives (TP)
                </p>
                <p className="text-3xl font-extrabold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                  {cm.tp.toLocaleString()}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Phishing URLs successfully caught by the classifier
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>False Negative Mitigation:</strong> Because missing a
                phishing link carries higher risk than a false alarm, PhishGuard
                AI flags scores between 0.35 and 0.65 as{" "}
                <em>Suspicious / Uncertain</em> to warn users on borderline
                cases.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Candidate Model Comparison Chart */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-blue-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Candidate Model Benchmark Comparison
                </h2>
                <p className="text-xs text-slate-500">
                  Held-out test performance across all 4 trained classifiers
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={candidateChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.15)"
                />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Accuracy" fill="#3B82F6" />
                <Bar dataKey="F1" fill="#06B6D4" />
                <Bar dataKey="Recall" fill="#10B981" />
                <Bar dataKey="ROC-AUC" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Candidate Models Detailed Table */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Detailed Candidate Classifier Evaluation Table (Held-Out Test Set)
          </h2>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Model Architecture</th>
                <th className="py-3.5 px-4">Accuracy</th>
                <th className="py-3.5 px-4">Precision</th>
                <th className="py-3.5 px-4">Recall</th>
                <th className="py-3.5 px-4">F1-Score</th>
                <th className="py-3.5 px-4">ROC-AUC</th>
                <th className="py-3.5 px-4">PR-AUC</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {info.candidate_models.map((m) => (
                <tr
                  key={m.key}
                  className={
                    m.is_selected
                      ? "bg-cyan-500/5 font-semibold"
                      : "hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                  }
                >
                  <td className="py-3.5 px-6 text-slate-900 dark:text-white">
                    {m.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {(m.test_metrics.accuracy * 100).toFixed(2)}%
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {(m.test_metrics.precision * 100).toFixed(2)}%
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {(m.test_metrics.recall * 100).toFixed(2)}%
                  </td>
                  <td className="py-3.5 px-4 font-mono text-cyan-600 dark:text-cyan-400">
                    {(m.test_metrics.f1_score * 100).toFixed(2)}%
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {(m.test_metrics.roc_auc * 100).toFixed(2)}%
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {(m.test_metrics.pr_auc * 100).toFixed(2)}%
                  </td>
                  <td className="py-3.5 px-6">
                    {m.is_selected ? (
                      <Badge variant="legitimate">Selected Production</Badge>
                    ) : (
                      <Badge variant="neutral">Benchmarked</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Global Feature Importance Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-cyan-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Top 12 Global Feature Importances ({info.selected_model_name})
              </h2>
              <p className="text-xs text-slate-500">
                Normalized contribution across decision trees. Global importance
                reflects dataset-wide behavior rather than causal proof for a
                single URL.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topFeaturesChartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.15)"
              />
              <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={175}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar
                dataKey="importancePct"
                name="Relative Importance (%)"
                fill="#06B6D4"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
