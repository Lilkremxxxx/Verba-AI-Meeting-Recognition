/**
 * Meeting service for API interactions
 */

import type { Meeting, TranscriptResponse, MeetingSummary, TranscriptSegment, SummarizeResponse, CachedSummary } from "@/types/meeting";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export interface CreateMeetingPayload {
  title: string;
  audio: File;
}

export interface CreateMeetingResponse {
  success: boolean;
  data?: Meeting;
  error?: string;
}

/**
 * Creates a new meeting by uploading audio file
 * @param payload - Object containing title and audio file
 * @returns Promise with meeting data or error
 */
export async function createMeeting(
  payload: CreateMeetingPayload,
): Promise<CreateMeetingResponse> {
  try {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("audio", payload.audio);

    const response = await fetch(`${API_BASE_URL}/meetings`, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data = await response.json();

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("Error creating meeting:", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to upload meeting",
    };
  }
}

/**
 * Fetches all meetings
 * @returns Promise with meetings array or error
 */
export async function getMeetings(): Promise<{
  success: boolean;
  data?: Meeting[];
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data: Meeting[] = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching meetings:", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch meetings",
    };
  }
}

/**
 * Fetches meeting metadata by ID (Approach 2: no transcript)
 * @param id - Meeting ID
 * @returns Promise with meeting metadata or error
 */
export async function getMeetingById(id: string): Promise<{
  success: boolean;
  data?: Meeting;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/meetings/${encodeURIComponent(id)}`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data: Meeting = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching meeting by id:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch meeting",
    };
  }
}

/**
 * Fetches transcript for a meeting (Approach 2: separate endpoint)
 * @param id - Meeting ID
 * @returns Promise with transcript data or error
 */
export async function getTranscriptByMeetingId(id: string): Promise<{
  success: boolean;
  data?: TranscriptResponse;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/meetings/${encodeURIComponent(id)}/transcript`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data: TranscriptResponse = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching transcript:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch transcript",
    };
  }
}

/**
 * Updates edited segments in transcript
 * @param id - Meeting ID
 * @param editedSegments - Array of {index, text} objects
 * @returns Promise with updated transcript or error
 */
export async function updateTranscript(
  id: string,
  editedSegments: Array<{ index: number; text: string }>
): Promise<{
  success: boolean;
  data?: TranscriptResponse;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/meetings/${encodeURIComponent(id)}/transcript`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ segments: editedSegments }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data: TranscriptResponse = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error updating transcript:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update transcript",
    };
  }
}


/**
 * Fetches cached summary for a meeting
 * @param id - Meeting ID
 * @returns Promise with cached summary data or error
 */
export async function getMeetingSummaryById(id: string): Promise<{
  success: boolean;
  data?: CachedSummary;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/meetings/${encodeURIComponent(id)}/summary`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Summary not found is not an error, just return success: false
        return { success: false, error: "Summary not found" };
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data: CachedSummary = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching summary:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch summary",
    };
  }
}

/**
 * Generate summary from transcript segments (frontend-driven with caching)
 * @param id - Meeting ID
 * @param segments - Current transcript segments from frontend state
 * @param transcriptHash - Optional hash of transcript for freshness tracking
 * @returns Promise with summary data or error
 */
export async function summarizeMeeting(
  id: string,
  segments: TranscriptSegment[],
  transcriptHash?: string
): Promise<{
  success: boolean;
  data?: SummarizeResponse;
  error?: string;
}> {
  try {
    const body: { segments: TranscriptSegment[]; transcript_hash?: string } = {
      segments,
    };
    
    if (transcriptHash) {
      body.transcript_hash = transcriptHash;
    }

    const response = await fetch(
      `${API_BASE_URL}/meetings/${encodeURIComponent(id)}/summarize`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data: SummarizeResponse = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error generating summary:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate summary",
    };
  }
}
