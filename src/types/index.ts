export type CheckStatus = "pass" | "fail" | "warn";

export interface QualityCheck {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  detail: string;
}

export interface DimensionScore {
  name: string;
  score: number;
  comment: string;
}

export interface AnalysisResult {
  passed: boolean;
  checks: QualityCheck[];
  score: number | null;
  percentile: string | null;
  dimensions: DimensionScore[];
  summary: string;
  tips: string[];
  imageHash: string;
}

export type AnalysisPhase =
  | "idle"
  | "loading"
  | "checking"
  | "scoring"
  | "done"
  | "rejected";
