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

// Summary derived from transcript (frontend-generated)
export interface AISummary {
  executiveSummary: string;
  keyHighlights: string[];
  actionItems: string[]; // Simple string array
}
