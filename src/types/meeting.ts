export type MeetingStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface TranscriptSegment {
  id: string;
  speaker: string;
  speakerLabel: string;
  startTime: number;
  endTime: number;
  text: string;
}

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

export interface Meeting {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  status: MeetingStatus;
  createdAt: Date;
  updatedAt: Date;
  audioUrl?: string;
  transcript?: TranscriptSegment[];
  summary?: AISummary;
  speakerMap: Record<string, string>;
}
