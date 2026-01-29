export type MeetingStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';

// Backend API response format (snake_case)
export interface Meeting {
  id: string;
  title: string;
  status: MeetingStatus;
  original_filename: string;
  created_at: string; // ISO timestamp
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

// Legacy interfaces for future features
export interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  completed: boolean;
}

export interface AISummary {
  executiveSummary: string;
  keyHighlights: string[];
  actionItems: ActionItem[];
}
