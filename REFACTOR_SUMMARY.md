# Summary Feature Refactor - Quick Reference

## What Changed

### Before: Auto-Fetch (GET-based)
- Summary auto-fetched on page load
- Used pre-generated backend summary
- Didn't reflect transcript edits

### After: User-Triggered (POST-based)
- Summary generated on user click
- Uses current frontend transcript state
- Reflects all edits (saved or unsaved)

## New Flow

```
1. User opens meeting detail page
2. User sees transcript (can edit inline)
3. User clicks "Tóm tắt cuộc họp" button
4. Frontend sends CURRENT transcript to backend
5. Backend generates and returns summary
6. User can regenerate anytime
```

## Key Files

### Backend (3 files)
1. `mock-server/utils/summarizeMock.js` - NEW
   - Mock AI summarization logic
   
2. `mock-server/routes/meetings.js` - MODIFIED
   - Added POST `/meetings/:id/summarize` endpoint
   
3. `mock-server/test-summarize-post.js` - NEW
   - Test script for new endpoint

### Frontend (3 files)
1. `src/types/meeting.ts` - MODIFIED
   - Added `SummarizeRequest` and `SummarizeResponse` types
   
2. `src/services/meetingService.ts` - MODIFIED
   - Added `summarizeMeeting(id, segments)` function
   
3. `src/pages/MeetingDetailPage.tsx` - MODIFIED
   - Removed auto-fetch logic
   - Added summarize button and handler
   - Updated UI states

## API

### New Endpoint

```
POST /meetings/:id/summarize
Content-Type: application/json

Request:
{
  "segments": [
    {"start": 0, "end": 5, "speaker": "A", "text": "..."},
    ...
  ]
}

Response:
{
  "meeting_id": "uuid",
  "status": "DONE",
  "summary": "Cuộc họp thảo luận về..."
}
```

## UI States

1. **Initial**: Show "Tóm tắt cuộc họp" button
2. **Loading**: Show "Đang tóm tắt cuộc hội thoại …"
3. **Success**: Show summary + "Tạo lại tóm tắt" button
4. **Error**: Show error + "Thử lại" button

## Testing

```bash
# Test backend endpoint
cd mock-server
node test-summarize-post.js

# All tests should pass:
✓ POST with valid segments → 200 OK
✓ POST with edited transcript → 200 OK (includes edits)
✓ POST with empty segments → 200 OK (fallback)
✓ POST with invalid request → 400 Bad Request
✓ POST to non-existent meeting → 404 Not Found
```

## Why Frontend Transcript?

**Short Answer:** So summary matches what user sees on screen.

**Long Answer:** See `WHY_FRONTEND_TRANSCRIPT.md`

Key benefits:
- ✅ Summary reflects current edits
- ✅ No forced save before summarize
- ✅ Flexible workflow (edit → summarize → iterate)
- ✅ Consistent with export behavior
- ✅ Better UX

## Migration Notes

### Removed
- Auto-fetch summary on page load
- `getMeetingSummaryById()` usage (function still exists for compatibility)
- Auto-generated summary from `summarizeTranscript()` utility

### Added
- User-triggered summarize button
- `summarizeMeeting(id, segments)` service function
- POST-based summarization endpoint
- Regenerate summary functionality

### Deprecated (but still available)
- GET `/meetings/:id/summary` endpoint
- `getMeetingSummaryById()` function
- `AISummary` type (structured format)
- `MeetingSummary` type (old response format)

## Documentation

- `SUMMARY_REFACTOR_COMPLETE.md` - Full implementation details
- `WHY_FRONTEND_TRANSCRIPT.md` - Explanation of design decision
- `REFACTOR_SUMMARY.md` - This quick reference

## Status: ✅ COMPLETE

All requirements met:
- [x] Backend POST endpoint implemented
- [x] Frontend user-triggered flow
- [x] Uses current transcript state
- [x] Collapsible UI with 4 states
- [x] Regenerate functionality
- [x] Export integration
- [x] All tests passing
- [x] Documentation complete
