/**
 * Core TypeScript types for AI Grader Pro
 * Based on Supabase database schema
 */

// =============================================================================
// DATABASE TYPES (matching Supabase schema)
// =============================================================================

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AnalysisStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  is_whitelisted: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: RunStatus;
  started_at: string | null;
  completed_at: string | null;
  total_analyses: number;
  completed_analyses: number;
  failed_analyses: number;
  report_path: string | null;
  export_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  run_id: string;
  url: string;
  keyword: string;
  status: AnalysisStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  entities: EntityData | null;
  schema_analysis: SchemaAnalysisData | null;
  visibility_results: VisibilityResultsData | null;
  keyword_expansions: KeywordExpansion[] | null;
  overall_score: number | null;
  visibility_score: number | null;
  schema_score: number | null;
  entity_score: number | null;
  report_markdown: string | null;
  report_json: ReportCardData | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisProgress {
  id: string;
  analysis_id: string;
  step: string;
  progress: number;
  message: string | null;
  created_at: string;
}

// =============================================================================
// ANALYZER DATA TYPES (from lib/analyzer)
// =============================================================================

export interface KeywordExpansion {
  prompt: string;
  intent: 'informational' | 'navigational' | 'comparison' | 'transactional';
  type: 'what' | 'how' | 'best' | 'cost' | 'worth' | 'comparison';
}

export interface Location {
  city: string | null;
  state: string | null;
  region: string | null;
  confidence: number;
}

export interface EntityData {
  namedEntities: Array<{
    entity: string;
    type: string;
    relevance: number;
  }>;
  topics: string[];
  expertise: {
    hasExpertAuthorship: boolean;
    hasCredentials: boolean;
    hasExperience: boolean;
    signals: string[];
  };
  trustSignals: {
    hasReviews: boolean;
    hasTestimonials: boolean;
    hasAccreditation: boolean;
    hasTransparency: boolean;
    signals: string[];
  };
  location: Location | null;
  semanticScore: number;
}

export interface SchemaType {
  type: string;
  priority: 'high' | 'medium' | 'low' | 'unknown';
  completeness: number | string;
  valid: boolean;
}

export interface SchemaRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  reason: string;
}

export interface SchemaAnalysisData {
  hasSchema: boolean;
  schemaCount?: number;
  schemaScore: number;
  schemasPresent?: SchemaType[];
  priorityCounts?: {
    high: number;
    medium: number;
    low: number;
  };
  avgCompleteness?: number;
  missingHighPriority?: string[];
  recommendations: SchemaRecommendation[];
  details?: any[];
}

export interface VisibilityResult {
  url: string;
  title: string;
  snippet: string;
  position: number;
}

export interface AIEngineResult {
  prompt: string;
  found: boolean;
  position: number | null;
  results: VisibilityResult[];
}

export interface VisibilityResultsData {
  summary: {
    overallScore: number;
    totalPrompts: number;
    totalAppearances: number;
    avgPosition: number | null;
    engineScores: {
      google?: number;
      perplexity?: number;
      chatgpt?: number;
    };
  };
  byEngine: {
    google?: AIEngineResult[];
    perplexity?: AIEngineResult[];
    chatgpt?: AIEngineResult[];
  };
}

export interface ReportCardData {
  url: string;
  keyword: string;
  overallScore: number;
  visibility: {
    score: number;
    appearances: number;
    avgPosition: number | null;
    missingEngines: string[];
  };
  schema: {
    score: number;
    hasSchema: boolean;
    highPriorityCount: number;
    missingHighPriority: string[];
  };
  entities: {
    score: number;
    topicsCount: number;
    hasLocation: boolean;
    hasExpertise: boolean;
    hasTrust: boolean;
  };
  opportunities: Array<{
    category: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    reason: string;
    impact: string;
  }>;
  grade: string;
}

// =============================================================================
// FORM/INPUT TYPES
// =============================================================================

export interface AnalysisInput {
  url: string;
  keyword: string;
}

export interface CreateRunInput {
  name: string;
  description?: string;
  analyses: AnalysisInput[];
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiError {
  error: string;
  details?: any;
}

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

// =============================================================================
// SSE PROGRESS TYPES
// =============================================================================

export interface ProgressEvent {
  type: 'progress' | 'complete' | 'error';
  analysisId: string;
  step?: string;
  progress?: number;
  message?: string;
  error?: string;
}

// =============================================================================
// CONFIG TYPES
// =============================================================================

export interface AnalyzerConfig {
  promptVariations: number;
  aiEngines: ('perplexity' | 'chatgpt' | 'google')[];
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isApiError(response: any): response is ApiError {
  return response && 'error' in response;
}

export function isApiSuccess<T>(response: any): response is ApiSuccess<T> {
  return response && response.success === true && 'data' in response;
}
