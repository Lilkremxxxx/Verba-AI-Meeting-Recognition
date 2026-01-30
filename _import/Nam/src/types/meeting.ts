export type MeetingStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';

// Backend API response format (snake_case)
export interface Meeting {
  id: string;
  title: string;
  status: MeetingStatus;
  original_filename: string;
  created_at: string; // ISO timestamp
  audioUrl?: string; // Only present in detail endpoint (GET /meetings/:id)
}

// Transcript API response format (Approach 2: separate endpoint)
export interface TranscriptResponse {
  meeting_id: string;
  status: MeetingStatus;
  segments: TranscriptSegment[];
}

// Transcript segment from API (snake_case)
export interface TranscriptSegment {
  start: number;  // seconds
  end: number;    // seconds
  speaker: string;
  text: string;
}

// Summary derived from transcript (frontend-generated - DEPRECATED)
export interface AISummary {
  executiveSummary: string;
  keyHighlights: string[];
  actionItems: string[]; // Simple string array
}

// Summary API response format (from backend - DEPRECATED, kept for backward compatibility)
export interface MeetingSummary {
  meeting_id: string;
  status: MeetingStatus;
  summary: string;
}

// Summary request payload (POST /meetings/:id/summarize)
export interface SummarizeRequest {
  segments: TranscriptSegment[];
}

// Summary response from POST /meetings/:id/summarize (INPUT-DRIVEN with caching)
export interface SummarizeResponse {
  meeting_id: string;
  summary: string;
  transcript_hash?: string;
  updated_at?: string;
}

// Cached summary from GET /meetings/:id/summary
export interface CachedSummary {
  meeting_id: string;
  summary: string;
  transcript_hash?: string;
  updated_at?: string;
}
