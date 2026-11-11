import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  History,
  Lock,
  Radar,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { phishGuardApi } from "@/services/api";
import type {
  HistoryListResponse,
  PredictionVerdict,
  ScanResponse,
} from "@/types/api";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge, VerdictBadge } from "@/components/ui/Badge";
import { ScanResultView } from "@/components/scanner/ScanResultView";

export function HistoryPage() {
  const [historyData, setHistoryData] = useState<HistoryListResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [prediction, setPrediction] = useState<PredictionVerdict | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedScan, setSelectedScan] = useState<ScanResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const { showToast } = useToast();

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await phishGuardApi.getHistory({
        page,
        pageSize: 12,
        search,
        prediction,
        startDate,
        endDate,
      });
      setHistoryData(res);
    } catch (err) {
      showToast(
        "Failed to load history",
        err instanceof Error ? err.message : "Could not fetch scan records.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, search, prediction, startDate, endDate, showToast]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handleInspectScan = async (scanId: string) => {
    setIsDetailLoading(true);
    try {
      const detail = await phishGuardApi.getScanDetail(scanId);
      setSelectedScan(detail);
    } catch (err) {
      showToast(
        "Error Loading Details",
        err instanceof Error ? err.message : "Unable to load scan details.",
        "error"
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleDeleteRecord = async (scanId: string) => {
    try {
      await phishGuardApi.deleteScanRecord(scanId);
      showToast("Record Deleted", "Scan record removed from history.", "info");
      if (selectedScan?.id === scanId) {
        setSelectedScan(null);
      }
      await fetchHistory();
    } catch (err) {
      showToast(
        "Deletion Failed",
        err instanceof Error ? err.message : "Could not delete scan record.",
        "error"
      );
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await phishGuardApi.clearAllHistory();
      setConfirmClearOpen(false);
      setSelectedScan(null);
      setPage(1);
      showToast("History Cleared", res.message, "info");
      await fetchHistory();
    } catch (err) {
      showToast(
        "Clear Failed",
        err instanceof Error ? err.message : "Could not clear scan history.",
        "error"
      );
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setPrediction("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="info">
              <History className="h-3.5 w-3.5" />
              Privacy-Preserving Audit Log
            </Badge>
            <Badge variant="neutral">
              <Lock className="h-3.5 w-3.5" />
              Query Values Redacted
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Scan History
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Browse, search, inspect, and manage historical URL analyses.
            Sensitive query parameter values are automatically redacted before
            storage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {historyData && historyData.total > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmClearOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Clear History
            </Button>
          )}
          <Link to="/scanner">
            <Button size="sm">
              <Radar className="h-4 w-4" />
              Scan URL
            </Button>
          </Link>
        </div>
      </div>

      {/* Clear Confirmation Banner */}
      {confirmClearOpen && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-red-700 dark:text-red-300">
              <strong>Confirm History Purge:</strong> Are you sure you want to
              permanently delete all {historyData?.total} stored scan records?
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClearOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleClearAll}>
                Yes, Delete All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter Controls */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
            <div className="lg:col-span-4">
              <label
                htmlFor="history-search"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
              >
                Search URL or Hostname
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="history-search"
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by domain or path..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label
                htmlFor="history-verdict"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
              >
                <Filter className="h-3.5 w-3.5 inline mr-1" />
                Classification Verdict
              </label>
              <select
                id="history-verdict"
                value={prediction}
                onChange={(e) => {
                  setPrediction(e.target.value as PredictionVerdict | "");
                  setPage(1);
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">All Classifications</option>
                <option value="phishing">Phishing Only</option>
                <option value="suspicious">Suspicious / Uncertain Only</option>
                <option value="legitimate">Legitimate Only</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="history-start-date"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
              >
                <Calendar className="h-3.5 w-3.5 inline mr-1" />
                From Date
              </label>
              <input
                id="history-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="history-end-date"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
              >
                <Calendar className="h-3.5 w-3.5 inline mr-1" />
                To Date
              </label>
              <input
                id="history-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="lg:col-span-1">
              <Button
                variant="outline"
                size="md"
                onClick={handleResetFilters}
                className="w-full"
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Scan Drawer / Panel when a row is inspected */}
      {selectedScan && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-4 py-2.5">
            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">
              Inspecting Historical Scan Record ({selectedScan.id.slice(0, 8)})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedScan(null)}
            >
              <X className="h-4 w-4" />
              Close Inspector
            </Button>
          </div>
          <ScanResultView result={selectedScan} />
        </div>
      )}

      {/* History Table */}
      <Card>
        <CardHeader>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Stored Scan Records ({historyData?.total ?? 0})
          </span>
          {isDetailLoading && (
            <span className="text-xs text-cyan-500 animate-pulse">
              Loading full feature vector...
            </span>
          )}
        </CardHeader>

        {isLoading ? (
          <CardContent className="py-12 text-center text-xs text-slate-500">
            Loading scan history...
          </CardContent>
        ) : !historyData || historyData.items.length === 0 ? (
          <CardContent className="py-14 text-center space-y-3">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No Matching Scan Records Found
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No historical URL scans match your current filters, or the scan
              history database is currently empty.
            </p>
          </CardContent>
        ) : (
          <>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Redacted URL</th>
                    <th className="py-3.5 px-4">Hostname</th>
                    <th className="py-3.5 px-4">Verdict</th>
                    <th className="py-3.5 px-4">Phishing Score</th>
                    <th className="py-3.5 px-4">Scanned At</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {historyData.items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-mono text-slate-900 dark:text-slate-100 max-w-sm truncate">
                        {item.redacted_url}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {item.hostname}
                      </td>
                      <td className="py-3.5 px-4">
                        <VerdictBadge prediction={item.prediction} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {(item.phishing_score * 100).toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInspectScan(item.id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Inspect
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete scan ${item.id}`}
                            onClick={() => handleDeleteRecord(item.id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>

            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page <strong>{historyData.page}</strong> of{" "}
                <strong>{historyData.total_pages}</strong> ({historyData.total}{" "}
                total records)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= historyData.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
