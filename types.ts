
export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  UNKNOWN = 'Unknown'
}

export enum ConfidenceLevel {
  LOW = 'Low',
  MODERATE = 'Moderate',
  HIGH = 'High'
}

export interface AnalysisReport {
  observedIndicators: string[];
  likelyPollutionCategory: string;
  environmentalImpactExplanation: string;
  humanHealthImplications: string;
  environmentalRiskLevel: RiskLevel;
  riskJustification: string;
  recommendedImmediateActions: string[];
  confidenceLevel: ConfidenceLevel;
  assessmentLimitations: string[];
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  data: AnalysisReport | null;
  resources: string | null;
  sources: GroundingSource[];
  error: string | null;
}
