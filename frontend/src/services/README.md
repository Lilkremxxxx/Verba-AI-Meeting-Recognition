# Services

This directory contains service modules for API interactions.

## meetingService.ts

Handles all meeting-related API calls.

### Functions

- `createMeeting(payload: CreateMeetingPayload): Promise<CreateMeetingResponse>`
  - Uploads a new meeting with audio file
  - Uses multipart/form-data with FormData
  - Returns success status and meeting data or error message

### Configuration

The API base URL is configured via environment variable:
- `VITE_API_BASE_URL` - defaults to `http://localhost:3000` if not set

To override, create a `.env` file:
```
VITE_API_BASE_URL=http://your-api-url.com
```
