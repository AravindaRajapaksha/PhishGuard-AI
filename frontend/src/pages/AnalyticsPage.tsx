import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  Cpu,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import { phishGuardApi } from "@/services/api";
import type { AnalyticsOverviewResponse } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge, VerdictBadge } from "@/components/ui/Badge";

const CHART_COLORS: Record<string, string> = {
  legitimate: "#10B981",
  suspicious: "#F59E0B",
  phishing: "#EF4444",
};

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await phishGuardApi.getAnalyticsOverview();
      setData(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load analytics telemetry from backend."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="info">
              <BarChart3 className="h-3.5 w-3.5" />
              Live Database Telemetry
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Cybersecurity Analytics Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Real-time statistics aggregated directly from historical URL scan
            records and active model evaluation metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link to="/scanner">
            <Button size="sm">
              <Radar className="h-4 w-4" />
              New Scan
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card className="border-red-500/30">
          <CardContent className="p-6 text-sm text-red-500">{error}</CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Scans
                  </p>
                  <p className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                    {data.total_scans.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Avg latency: {data.average_scan_duration_ms.toFixed(1)} ms
                  </p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <Activity className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Phishing Detected
                  </p>
                  <p className="text-3xl font-extrabold font-mono text-red-500 mt-1">
                    {data.phishing_count.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {data.phishing_percentage.toFixed(1)}% of total scans
                  </p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <ShieldAlert className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Legitimate URLs
                  </p>
                  <p className="text-3xl font-extrabold font-mono text-emerald-500 mt-1">
                    {data.legitimate_count.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {data.legitimate_percentage.toFixed(1)}% of total scans
                  </p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Suspicious / Uncertain
                  </p>
                  <p className="text-3xl font-extrabold font-mono text-amber-500 mt-1">
                    {data.suspicious_count.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {data.suspicious_percentage.toFixed(1)}% of total scans
                  </p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <ShieldQuestion className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Empty Database State vs Charts */}
          {data.total_scans === 0 ? (
            <Card className="border-dashed border-2 border-slate-300 dark:border-slate-800">
              <CardContent className="py-14 px-6 text-center max-w-lg mx-auto space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-500 mx-auto">
                  <Radar className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  No URL Scans Recorded Yet
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  PhishGuard AI never displays fake or hardcoded dashboard
                  telemetry. Submit your first URL in the Scanner to populate
                  live classification distributions, timeline trends, and recent
                  scan logs.
                </p>
                <div className="pt-2">
                  <Link to="/scanner">
                    <Button>
                      <Radar className="h-4 w-4" />
                      Scan Your First URL
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Classification Distribution Donut Chart */}
              <Card className="lg:col-span-5">
                <CardHeader>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Classification Distribution
                    </h3>
                    <p className="text-xs text-slate-500">
                      Proportion of verdicts across {data.total_scans} scan(s)
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.classification_distribution}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {data.classification_distribution.map((entry) => (
                          <Cell
                            key={entry.classification}
                            fill={CHART_COLORS[entry.classification]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Scans Over Time Chart */}
              <Card className="lg:col-span-7">
                <CardHeader>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Scan Activity Over Time
                    </h3>
                    <p className="text-xs text-slate-500">
                      Daily breakdown by prediction verdict
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.scans_over_time}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.15)"
                      />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="legitimate"
                        name="Legitimate"
                        stackId="a"
                        fill="#10B981"
                      />
                      <Bar
                        dataKey="suspicious"
                        name="Suspicious"
                        stackId="a"
                        fill="#F59E0B"
                      />
                      <Bar
                        dataKey="phishing"
                        name="Phishing"
                        stackId="a"
                        fill="#EF4444"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Recent Scan Activity Table */}
              <Card className="lg:col-span-12">
                <CardHeader>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Recent Scan Activity
                    </h3>
                    <p className="text-xs text-slate-500">
                      Latest 10 privacy-redacted URL evaluations
                    </p>
                  </div>
                  <Link to="/history">
                    <Button variant="outline" size="sm">
                      View All History
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-6">Redacted URL</th>
                        <th className="py-3 px-4">Verdict</th>
                        <th className="py-3 px-4">Score</th>
                        <th className="py-3 px-4">Latency</th>
                        <th className="py-3 px-6">Scanned At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                      {data.recent_scans.map((scan) => (
                        <tr
                          key={scan.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
                        >
                          <td className="py-3.5 px-6 font-mono text-slate-800 dark:text-slate-200 max-w-md truncate">
                            {scan.redacted_url}
                          </td>
                          <td className="py-3.5 px-4">
                            <VerdictBadge
                              prediction={scan.prediction}
                              size="sm"
                            />
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold">
                            {(scan.phishing_score * 100).toFixed(1)}%
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            {scan.scan_duration_ms.toFixed(1)} ms
                          </td>
                          <td className="py-3.5 px-6 text-slate-500">
                            {new Date(scan.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Active Model Evaluation Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Cpu className="h-5 w-5 text-cyan-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Active Production Model Evaluation Summary (
                    {data.model_summary.model_name} {data.model_summary.version})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verified benchmark metrics on the held-out test dataset
                  </p>
                </div>
              </div>
              <Link to="/model-insights">
                <Button variant="outline" size="sm">
                  Model Insights
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  {
                    label: "Accuracy",
                    val: `${(data.model_summary.accuracy * 100).toFixed(2)}%`,
                  },
                  {
                    label: "Precision",
                    val: `${(data.model_summary.precision * 100).toFixed(2)}%`,
                  },
                  {
                    label: "Recall",
                    val: `${(data.model_summary.recall * 100).toFixed(2)}%`,
                  },
                  {
                    label: "F1-Score",
                    val: `${(data.model_summary.f1_score * 100).toFixed(2)}%`,
                  },
                  {
                    label: "ROC-AUC",
                    val: `${(data.model_summary.roc_auc * 100).toFixed(2)}%`,
                  },
                  {
                    label: "PR-AUC",
                    val: `${(data.model_summary.pr_auc * 100).toFixed(2)}%`,
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3.5"
                  >
                    <p className="text-xs text-slate-500">{m.label}</p>
                    <p className="text-lg font-extrabold font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                      {m.val}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
