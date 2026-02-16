export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ReviewerOptions {
  geminiApiKey: string;
  model?: string;
}

export interface FilterOptions {
  includePatterns: string;
  excludePatterns: string;
  maxDiffSize: number;
}

export interface Finding {
  severity: Severity;
  file: string;
  line: number;
  description: string;
  suggestion?: string;
  rationale?: string;
}

export interface StructuredReviewResponse {
  summary: string;
  findings: Finding[];
}

export interface ReviewResult {
  summary: string;
  findings: Finding[];
  hasCritical: boolean;
}
