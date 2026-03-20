/**
 * Meeting service for API interactions
 */

import { apiRequest, getAuthHeaders } from "@/services/apiClient";
import type {
  Meeting,
  MeetingSummary,
  SummarizeResponse,
  TranscriptResponse,
  TranscriptSegment,
} from "@/types/meeting";

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateMeetingPayload {
  title: string;
  audio: File;
}

interface StartTranscriptionResponse {
  message: string;
  meeting_id: string;
}

function buildMeetingPath(id: string, suffix = ""): string {
  return `/meetings/${encodeURIComponent(id)}${suffix}`;
}

async function safeRequest<T>(
  action: string,
  request: () => Promise<T>,
): Promise<ServiceResult<T>> {
  try {
    const data = await request();
    return { success: true, data };
  } catch (error) {
    console.error(`Error ${action}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to ${action}`,
    };
  }
}

/**
 * Creates a new meeting by uploading audio file
 */
export async function createMeeting(
  payload: CreateMeetingPayload,
): Promise<ServiceResult<Meeting>> {
  return safeRequest("creating meeting", async () => {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("audio", payload.audio);

    return apiRequest<Meeting>("/meetings/upload", {
      method: "POST",
      body: formData,
      headers: getAuthHeaders(),
    });
  });
}

/**
 * Fetches all meetings
 */
export async function getMeetings(): Promise<ServiceResult<Meeting[]>> {
  return safeRequest("fetching meetings", () =>
    apiRequest<Meeting[]>("/meetings/", {
      method: "GET",
      requireAuth: true,
    }),
  );
}

/**
 * Fetches meeting metadata by ID
 */
export async function getMeetingById(id: string): Promise<ServiceResult<Meeting>> {
  return safeRequest("fetching meeting by id", () =>
    apiRequest<Meeting>(buildMeetingPath(id), {
      method: "GET",
      requireAuth: true,
    }),
  );
}

/**
 * Fetches transcript for a meeting
 */
export async function getTranscriptByMeetingId(
  id: string,
): Promise<ServiceResult<TranscriptResponse>> {
  return safeRequest("fetching transcript", () =>
    apiRequest<TranscriptResponse>(buildMeetingPath(id, "/transcript"), {
      method: "GET",
      requireAuth: true,
    }),
  );
}

/**
 * Updates edited segments in transcript
 */
export async function updateTranscript(
  id: string,
  editedSegments: Array<{ index: number; text: string }>,
): Promise<ServiceResult<TranscriptResponse>> {
  return safeRequest("updating transcript", () =>
    apiRequest<TranscriptResponse>(buildMeetingPath(id, "/transcript"), {
      method: "PATCH",
      requireAuth: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ edits: editedSegments }),
    }),
  );
}

/**
 * Fetches summary for a meeting
 */
export async function getMeetingSummaryById(
  id: string,
): Promise<ServiceResult<MeetingSummary>> {
  return safeRequest("fetching summary", () =>
    apiRequest<MeetingSummary>(buildMeetingPath(id, "/summary"), {
      method: "GET",
      requireAuth: true,
    }),
  );
}

/**
 * Saves edited summary for a meeting
 */
export async function updateMeetingSummary(
  id: string,
  summary: MeetingSummary,
): Promise<ServiceResult<MeetingSummary>> {
  return safeRequest("updating summary", () =>
    apiRequest<MeetingSummary>(buildMeetingPath(id, "/summary"), {
      method: "PATCH",
      requireAuth: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(summary),
    }),
  );
}

/**
 * Generate summary from transcript segments
 */
export async function summarizeMeeting(
  id: string,
  segments: TranscriptSegment[],
): Promise<ServiceResult<SummarizeResponse>> {
  return safeRequest("generating summary", () =>
    apiRequest<SummarizeResponse>("/summarize", {
      method: "POST",
      requireAuth: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, segments }),
    }),
  );
}

/**
 * Starts transcription for a meeting
 */
export async function startTranscription(
  id: string,
  language = "vi",
): Promise<ServiceResult<StartTranscriptionResponse>> {
  return safeRequest("starting transcription", () =>
    apiRequest<StartTranscriptionResponse>(buildMeetingPath(id, "/transcribe"), {
      method: "POST",
      requireAuth: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language }),
    }),
  );
}

/**
 * Deletes a meeting
 */
export async function deleteMeeting(id: string): Promise<ServiceResult<undefined>> {
  return safeRequest("deleting meeting", () =>
    apiRequest<undefined>(buildMeetingPath(id), {
      method: "DELETE",
      requireAuth: true,
    }),
  );
}
