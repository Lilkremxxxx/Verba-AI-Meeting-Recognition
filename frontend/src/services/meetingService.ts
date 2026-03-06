/**
 * Meeting service for API interactions
 */

import type { Meeting, TranscriptResponse, MeetingSummary, TranscriptSegment, SummarizeResponse } from "@/types/meeting";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Get authorization headers with Bearer token
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('verba_token');
  if (!token) {
    throw new Error('No authentication token found. Please login.');
  }
  return {
    'Authorization': `Bearer ${token}`,
  };
}

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

    const response = await fetch(`${API_BASE_URL}/meetings/upload`, {
      method: "POST",
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE_URL}/meetings/`, {
      method: "GET",
      headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || errorData.message || `HTTP error! status: ${response.status}`,
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
        headers: getAuthHeaders(),
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
 * @param editedSegments - Full segments array (replace-all)
 * @returns Promise with updated transcript or error
 */
export async function updateTranscript(
  id: string,
  editedSegments: TranscriptSegment[]
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
          ...getAuthHeaders(),
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
 * Fetches summary for a meeting (DEPRECATED - use summarizeMeeting instead)
 * @param id - Meeting ID
 * @returns Promise with summary data or error
 */
export async function getMeetingSummaryById(id: string): Promise<{
  success: boolean;
  data?: MeetingSummary;
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data: MeetingSummary = await response.json();

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
 * Generate summary from transcript segments
 * @param id - Meeting ID
 * @param segments - Current transcript segments
 * @returns Promise with summary data or error
 */
export async function summarizeMeeting(
  id: string,
  segments: TranscriptSegment[]
): Promise<{
  success: boolean;
  data?: SummarizeResponse;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/summarize`,
      {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, segments }),
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

/**
 * Starts transcription for a meeting
 * @param id - Meeting ID
 * @param language - Language code (default: "vi")
 * @returns Promise with success status or error
 */
export async function startTranscription(
  id: string,
  language: string = "vi"
): Promise<{
  success: boolean;
  data?: { message: string; meeting_id: string };
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/meetings/${encodeURIComponent(id)}/transcribe`,
      {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error starting transcription:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start transcription",
    };
  }
}

/**
 * Deletes a meeting
 * @param id - Meeting ID
 * @returns Promise with success status or error
 */
export async function deleteMeeting(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/meetings/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting meeting:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete meeting",
    };
  }
}
