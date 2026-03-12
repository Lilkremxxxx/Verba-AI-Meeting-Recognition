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
  start: number; // seconds
  end: number; // seconds
  speaker: string;
  text: string;
}

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  assignee?: string;
}

// Legacy frontend-generated summary types kept for compatibility with older components
export interface AISummary {
  executiveSummary: string;
  keyHighlights: string[];
  actionItems: ActionItem[];
}

export interface SummaryTask {
  task: string;
  owner: string;
  deadline: string;
}

export interface SummaryDeadline {
  date: string;
  item: string;
}

// Structured summary payload returned by GET /meetings/{meeting_id}/summary
export interface MeetingSummary {
  summary: string;
  decisions: string[];
  tasks: SummaryTask[];
  deadlines: SummaryDeadline[];
}

// Summary request payload (POST /summarize)
export interface SummarizeRequest {
  id: string;
  segments: TranscriptSegment[];
}

// Kept for compatibility with older summarize flow
export type SummarizeResponse = MeetingSummary;
