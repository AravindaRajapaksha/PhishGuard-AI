export type PredictionVerdict = "legitimate" | "suspicious" | "phishing";
export type RiskLevel = "low" | "medium" | "high";
export type SignalSeverity = "high" | "medium" | "low" | "info";

export interface RiskSignal {
  id: string;
  title: string;
  severity: SignalSeverity;
  feature: string;
  value: number;
  description: string;
}

export interface FeatureDetail {
  name: string;
  label: string;
  category: string;
  value: number;
  description: string;
}

export interface ScanResponse {
  id: string;
  submitted_url: string;
  redacted_url: string;
  hostname: string;
  prediction: PredictionVerdict;
  phishing_score: number;
  risk_level: RiskLevel;
  model_version: string;
  model_name: string;
  extracted_features: Record<string, number>;
  feature_details: FeatureDetail[];
  risk_signals: RiskSignal[];
  scan_duration_ms: number;
  created_at: string;
  disclaimer: string;
}

export interface HistoryItemSummary {
  id: string;
  redacted_url: string;
  hostname: string;
  prediction: PredictionVerdict;
  phishing_score: number;
  risk_level: RiskLevel;
  model_version: string;
  scan_duration_ms: number;
  created_at: string;
}

export interface HistoryListResponse {
  items: HistoryItemSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DeleteHistoryResponse {
  deleted_count: number;
  message: string;
}

export interface ClassificationDistributionItem {
  classification: PredictionVerdict;
  label: string;
  count: number;
  percentage: number;
}

export interface ScansOverTimeItem {
  date: string;
  total: number;
  phishing: number;
  suspicious: number;
  legitimate: number;
}

export interface ModelEvaluationSummary {
  version: string;
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  pr_auc: number;
  trained_at: string;
}

export interface AnalyticsOverviewResponse {
  total_scans: number;
  phishing_count: number;
  legitimate_count: number;
  suspicious_count: number;
  phishing_percentage: number;
  legitimate_percentage: number;
  suspicious_percentage: number;
  average_phishing_score: number;
  average_scan_duration_ms: number;
  classification_distribution: ClassificationDistributionItem[];
  scans_over_time: ScansOverTimeItem[];
  recent_scans: HistoryItemSummary[];
  model_summary: ModelEvaluationSummary;
}

export interface ConfusionMatrixData {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
  false_positive_rate: number;
  false_negative_rate: number;
}

export interface EvaluationMetricsBlock {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  pr_auc: number;
  confusion_matrix: ConfusionMatrixData;
}

export interface CandidateModelBenchmark {
  key: string;
  name: string;
  hyperparameters: Record<string, string | number | boolean | null>;
  validation_metrics: EvaluationMetricsBlock;
  test_metrics: EvaluationMetricsBlock;
  is_selected: boolean;
}

export interface FeatureImportanceItem {
  feature: string;
  label: string;
  category: string;
  importance: number;
  description: string;
}

export interface DatasetAuditInfo {
  raw_records_downloaded: number;
  missing_or_invalid_removed: number;
  duplicate_records_removed: number;
  conflicting_label_records_removed: number;
  final_cleaned_records: number;
  legitimate_count: number;
  phishing_count: number;
  unique_registrable_domains: number;
  train_records: number;
  validation_records: number;
  test_records: number;
}

export interface ModelInfoResponse {
  version: string;
  selected_model_key: string;
  selected_model_name: string;
  hyperparameters: Record<string, string | number | boolean | null>;
  trained_at: string;
  dataset: {
    name: string;
    license: string;
    sources: string[];
    audit: DatasetAuditInfo;
  };
  feature_count: number;
  feature_names: string[];
  decision_thresholds: {
    low: number;
    high: number;
    policy_description: string;
  };
  validation_metrics: EvaluationMetricsBlock;
  test_metrics: EvaluationMetricsBlock;
  domain_grouped_test_metrics: EvaluationMetricsBlock & {
    train_domains: number;
    test_domains: number;
    domain_overlap_count: number;
  };
  candidate_models: CandidateModelBenchmark[];
  feature_importances: FeatureImportanceItem[];
}

export interface HealthResponse {
  status: string;
  app_name: string;
  app_version: string;
  environment: string;
  model_loaded: boolean;
  model_version: string;
  database_connected: boolean;
}
