import type {
  AnalyticsOverviewResponse,
  DeleteHistoryResponse,
  HealthResponse,
  HistoryListResponse,
  ModelInfoResponse,
  PredictionVerdict,
  ScanResponse,
} from "@/types/api";

const RAW_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function requestJson<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = `Request failed with HTTP ${response.status}`;
    try {
      const errBody = (await response.json()) as { detail?: string };
      if (errBody && typeof errBody.detail === "string") {
        detail = errBody.detail;
      }
    } catch {
      // Fallback to status message
    }
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export interface HistoryQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  prediction?: PredictionVerdict | "";
  startDate?: string;
  endDate?: string;
}

export const phishGuardApi = {
  scanUrl(url: string): Promise<ScanResponse> {
    return requestJson<ScanResponse>("/api/v1/scan", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  },

  getHistory(params: HistoryQueryParams = {}): Promise<HistoryListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("page_size", String(params.pageSize));
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.prediction) query.set("prediction", params.prediction);
    if (params.startDate) query.set("start_date", params.startDate);
    if (params.endDate) query.set("end_date", params.endDate);

    const qs = query.toString();
    return requestJson<HistoryListResponse>(
      `/api/v1/history${qs ? `?${qs}` : ""}`
    );
  },

  getScanDetail(scanId: string): Promise<ScanResponse> {
    return requestJson<ScanResponse>(
      `/api/v1/history/${encodeURIComponent(scanId)}`
    );
  },

  deleteScanRecord(scanId: string): Promise<DeleteHistoryResponse> {
    return requestJson<DeleteHistoryResponse>(
      `/api/v1/history/${encodeURIComponent(scanId)}`,
      { method: "DELETE" }
    );
  },

  clearAllHistory(): Promise<DeleteHistoryResponse> {
    return requestJson<DeleteHistoryResponse>("/api/v1/history", {
      method: "DELETE",
    });
  },

  getAnalyticsOverview(): Promise<AnalyticsOverviewResponse> {
    return requestJson<AnalyticsOverviewResponse>("/api/v1/analytics/overview");
  },

  getModelInfo(): Promise<ModelInfoResponse> {
    return requestJson<ModelInfoResponse>("/api/v1/model/info");
  },

  getHealth(): Promise<HealthResponse> {
    return requestJson<HealthResponse>("/api/v1/health");
  },
};
