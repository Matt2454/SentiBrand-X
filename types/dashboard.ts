// Centralized TypeScript interfaces for SentiBrand-X Dashboard
// This file eliminates all 'any' types and provides strict typing across the entire application

// ============================================================================
// Core Entity Types
// ============================================================================

export interface BrandMention {
  id: string;
  brand: string;
  author_handle: string;
  author_followers?: number;
  raw_text: string;
  posted_at: string;
  likes?: number;
  retweets?: number;
  replies?: number;
}

export interface SentimentAnalysis {
  id: string;
  mention_id: string;
  sentiment_label: "positive" | "neutral" | "negative";
  confidence: number | null;
  created_at: string;
}

// ============================================================================
// Dashboard State Types
// ============================================================================

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface RealtimeSnapshot {
  totalMentions: number;
  totalAnalyzed: number;
  averageSentiment: "Positive" | "Neutral" | "Negative" | "N/A";
  sentimentBreakdown: SentimentBreakdown;
  recentTweets: BrandMention[];
  lastUpdate: string | null;
}

export interface DashboardStats {
  totalMentions: number;
  averageSentiment: string;
  topBrand: string;
  sentimentBreakdown: SentimentBreakdown;
  recentTweets: BrandMention[];
  brandOptions: string[];
  comparison: {
    left: BrandComparisonStats | null;
    right: BrandComparisonStats | null;
  };
  kpis: {
    totalAnalyzed: number;
    averageConfidence: string;
    positiveRatio: string;
    lastUpdate: string;
  };
  hasDataSource: boolean;
}

export interface BrandComparisonStats {
  brand: string;
  totalMentions: number;
  averageSentiment: string;
  sentimentBreakdown: SentimentBreakdown;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface MentionsEventsQuery {
  brand?: string;
}

export interface SSEEventPayload {
  type: "snapshot" | "heartbeat" | "error";
  data: RealtimeSnapshot | HeartbeatData | ErrorData;
  timestamp: string;
}

export interface HeartbeatData {
  status: "alive";
  timestamp: string;
}

export interface ErrorData {
  code: string;
  message: string;
  timestamp: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface LiveMentionsStatusProps {
  brand?: string;
}

export interface AnimatedNumberProps {
  value: number | string;
  className?: string;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

export interface AnimatedTweetProps {
  tweet: BrandMention;
  index: number;
}

export interface AnimatedTweetListProps {
  tweets: BrandMention[];
}

export interface SentimentChartProps {
  positive: number;
  neutral: number;
  negative: number;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export type ConnectionStatus = "connecting" | "connected" | "error" | "reconnecting";

export interface UseMentionsEventsReturn {
  snapshot: RealtimeSnapshot;
  status: ConnectionStatus;
  reconnectAttempts: number;
  lastError: string | null;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface HeartbeatConfig {
  interval: number;
  timeout: number;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface DashboardError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  recoverable: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ============================================================================
// Utility Types
// ============================================================================

export type SearchParams = Promise<{
  brand?: string;
  brandA?: string;
  brandB?: string;
}>;

export type ThemeMode = "light" | "dark" | "system";

export interface EmptyStateConfig {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  illustration?: string;
}

// ============================================================================
// Mock Data Types (for development)
// ============================================================================

export interface MockTweet {
  id: string;
  brand: string;
  author_handle: string;
  raw_text: string;
  posted_at: string;
  sentiment?: "positive" | "neutral" | "negative";
}

export interface MockDataset {
  tweets: MockTweet[];
  generated_at: string;
  total_count: number;
}

// ============================================================================
// Watch Script Types
// ============================================================================

export interface WatchConfig {
  watchPaths: string[];
  filePattern: string;
  debounceMs: number;
  autoAnalyze: boolean;
}

export interface WatchEvent {
  type: "add" | "change" | "unlink";
  path: string;
  timestamp: string;
}
