# Summary Feature Refactor - Frontend-Driven AI Summarization

## Overview
Refactored the summary feature from auto-fetch on page load to **user-triggered, frontend-driven** summarization. The summary is now generated on-demand using the current transcript state from the frontend, including any unsaved edits.

## Key Changes

### 🔄 Flow Change: Auto-Fetch → User-Triggered

**Before (Old Flow):**
```
1. Page loads
2. Auto-fetch GET /meetings/:id/summary
3. Display pre-generated summary
```

**After (New Flow):**
```
1. Page loads (no auto-fetch)
2. User clicks "Tóm tắt cuộc họp" button
3. Frontend sends CURRENT transcript to POST /meetings/:id/summarize
4. Backend generates and returns summary
5. Display summary with option to regenerate
```

## Why Frontend-Driven?

### ✅ Benefits

1. **Uses Current State**: Summary always reflects the latest transcript, including unsaved edits
2. **No Stale Data**: No risk of showing outdated summary when transcript is edited
3. **User Control**: User decides when to generate summary
4. **Flexible**: Can regenerate summary after editing transcript
5. **No Dependencies**: Doesn't require saving transcript edits before summarizing

### 📝 Example Scenario

```
User workflow:
1. Opens meeting detail page
2. Listens to audio, sees transcript
3. Edits some transcript segments (inline editing)
4. Clicks "Tóm tắt cuộc họp" (without saving edits)
5. Summary is generated from CURRENT state (includes edits)
6. User can save transcript edits later (optional)
7. User can regenerate summary anytime
```

## Backend Implementation

### 1. New Endpoint: POST /meetings/:id/summarize

**Request:**
```json
POST /meetings/:id/summarize
Content-Type: application/json

{
  "segments": [
    {
      "start": 0,
      "end": 5,
      "speaker": "Speaker A",
      "text": "Hello everyone..."
    },
    ...
  ]
}
```

**Response:**
```json
{
  "meeting_id": "uuid",
  "status": "DONE",
  "summary": "Cuộc họp thảo luận về..."
}
```

**Error Responses:**
- 400: Invalid request (missing or invalid segments)
- 404: Meeting not found
- 500: Server error

### 2. Mock Summarization Logic

Created `mock-server/utils/summarizeMock.js`:
- Generates fake summary from provided segments
- Extracts: first 200 chars + middle section + last 100 chars
- Counts speakers and segments
- Returns formatted Vietnamese summary

**Algorithm:**
```javascript
function generateMockSummary(segments) {
  // Extract text from all segments
  const allText = segments.map(seg => seg.text).join(" ");
  
  // Take strategic sections
  const firstPart = allText.substring(0, 200);
  const middlePart = allText.substring(middle - 50, middle + 50);
  const lastPart = allText.substring(length - 100);
  
  // Count participants
  const speakerCount = new Set(segments.map(s => s.speaker)).size;
  
  // Format summary
  return `Cuộc họp có ${segments.length} đoạn với ${speakerCount} người...`;
}
```

### 3. Route Position

**Critical:** POST `/meetings/:id/summarize` positioned **BEFORE** GET `/:id` to avoid route conflicts.

```javascript
// Correct order:
router.post("/:id/summarize", ...);  // Specific route first
router.get("/:id/summary", ...);     // Deprecated, kept for compatibility
router.get("/:id", ...);             // Generic route last
```

### 4. Files Modified/Created

**Backend:**
- ✅ `mock-server/utils/summarizeMock.js` (NEW) - Mock summarization logic
- ✅ `mock-server/routes/meetings.js` (MODIFIED) - Added POST summarize endpoint
- ✅ `mock-server/test-summarize-post.js` (NEW) - Test script for new endpoint

## Frontend Implementation

### 1. Type Definitions

Updated `src/types/meeting.ts`:

```typescript
// New types for POST-based summarization
export interface SummarizeRequest {
  segments: TranscriptSegment[];
}

export interface SummarizeResponse {
  meeting_id: string;
  status: MeetingStatus;
  summary: string;
}

// Old types marked as DEPRECATED
export interface AISummary { ... } // DEPRECATED
export interface MeetingSummary { ... } // DEPRECATED (kept for compatibility)
```

### 2. Service Layer

Updated `src/services/meetingService.ts`:

```typescript
// New function: POST-based summarization
export async function summarizeMeeting(
  id: string,
  segments: TranscriptSegment[]
): Promise<{
  success: boolean;
  data?: SummarizeResponse;
  error?: string;
}> {
  // POST to /meetings/:id/summarize with segments
  // Returns summary response
}

// Old function marked as DEPRECATED
export async function getMeetingSummaryById(...) { ... } // DEPRECATED
```

### 3. UI Implementation

Updated `src/pages/MeetingDetailPage.tsx`:

#### State Changes

**Before:**
```typescript
const [summary, setSummary] = useState<AISummary | null>(null);
const [backendSummary, setBackendSummary] = useState<MeetingSummary | null>(null);
```

**After:**
```typescript
const [summary, setSummary] = useState<string | null>(null); // Plain text
const [summaryError, setSummaryError] = useState<string | null>(null);
```

#### Removed Auto-Fetch

**Before:**
```typescript
useEffect(() => {
  // Auto-fetch summary on mount
  const summaryResult = await getMeetingSummaryById(id);
  setBackendSummary(summaryResult.data);
}, [id]);
```

**After:**
```typescript
useEffect(() => {
  // Only fetch meeting and transcript
  // NO auto-fetch of summary
}, [id]);
```

#### New Summarize Handler

```typescript
const handleSummarize = useCallback(async () => {
  if (!id || segments.length === 0) {
    toast({ title: "Không thể tóm tắt", ... });
    return;
  }

  setLoadingSummary(true);
  setSummaryError(null);
  
  try {
    // Use CURRENT transcript state (includes unsaved edits)
    const result = await summarizeMeeting(id, segments);
    
    if (result.success && result.data) {
      setSummary(result.data.summary);
      toast({ title: "Tóm tắt thành công", ... });
    }
  } catch (err) {
    setSummaryError(err.message);
    toast({ title: "Lỗi khi tóm tắt", variant: "destructive" });
  } finally {
    setLoadingSummary(false);
  }
}, [id, segments, toast]);
```

#### UI States

**1. Initial State (Never Summarized):**
```
┌─────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                  [▼]  │
│  ┌───────────────────────────────────────┐ │
│  │  ✨                                   │ │
│  │  Nhấn nút bên dưới để tạo tóm tắt    │ │
│  │  từ transcript hiện tại              │ │
│  │                                       │ │
│  │  [✨ Tóm tắt cuộc họp]               │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**2. Loading State:**
```
┌─────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                  [▼]  │
│  ┌───────────────────────────────────────┐ │
│  │  ⟳ Đang tóm tắt cuộc hội thoại …     │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**3. Success State:**
```
┌─────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                  [▼]  │
│  ┌───────────────────────────────────────┐ │
│  │  Cuộc họp có 15 đoạn hội thoại với   │ │
│  │  3 người tham gia. Nội dung chính... │ │
│  │                                       │ │
│  │              [✨ Tạo lại tóm tắt]     │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**4. Error State:**
```
┌─────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                  [▼]  │
│  ┌───────────────────────────────────────┐ │
│  │  ⚠ Không thể tạo tóm tắt             │ │
│  │                                       │ │
│  │              [Thử lại]                │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 4. Export Integration

Updated export handler to use new summary format:

```typescript
const handleExport = useCallback(async () => {
  await exportMeetingToDocx({
    meeting,
    segments: exportIncludeTranscript ? segments : undefined,
    // Convert plain text summary to AISummary format for export
    summary: exportIncludeSummary && summary 
      ? { executiveSummary: summary, keyHighlights: [], actionItems: [] }
      : undefined,
    includeSummary: exportIncludeSummary,
    includeTranscript: exportIncludeTranscript,
  });
}, [meeting, segments, summary, exportIncludeSummary, exportIncludeTranscript]);
```

## Testing Results

### Backend Tests (via `test-summarize-post.js`)

```
✓ POST with valid segments → 200 OK with summary
✓ POST with edited transcript → 200 OK, summary includes edits
✓ POST with empty segments → 200 OK with fallback message
✓ POST with invalid request → 400 Bad Request
✓ POST to non-existent meeting → 404 Not Found
```

### TypeScript Compilation

```
✓ src/pages/MeetingDetailPage.tsx: No diagnostics
✓ src/services/meetingService.ts: No diagnostics
✓ src/types/meeting.ts: No diagnostics
```

## User Workflows

### Workflow 1: Basic Summarization

```
1. User opens meeting detail page
2. Sees transcript loaded
3. Clicks "Tóm tắt cuộc họp" button
4. Waits for "Đang tóm tắt cuộc hội thoại …"
5. Sees summary displayed
6. Can click "Tạo lại tóm tắt" to regenerate
```

### Workflow 2: Edit Then Summarize

```
1. User opens meeting detail page
2. Edits transcript segments (inline editing)
3. Clicks "Tóm tắt cuộc họp" (WITHOUT saving edits)
4. Summary generated from CURRENT state (includes edits)
5. User can save transcript edits later (optional)
6. Summary already reflects the edits
```

### Workflow 3: Summarize, Edit, Re-summarize

```
1. User generates initial summary
2. Reads summary, notices issues in transcript
3. Edits transcript segments
4. Clicks "Tạo lại tóm tắt"
5. New summary generated from updated transcript
6. Can repeat as needed
```

### Workflow 4: Export with Summary

```
1. User generates summary
2. Clicks "Xuất DOCX"
3. Checks "Bao gồm tóm tắt"
4. Exports DOCX with current transcript + summary
5. Summary in export matches what's displayed
```

## Backward Compatibility

### Deprecated Endpoints/Functions

**Still Available (for compatibility):**
- GET `/meetings/:id/summary` - Returns 404 for most meetings
- `getMeetingSummaryById()` - Frontend function (not used)
- `AISummary` type - Old structured summary format
- `MeetingSummary` type - Old backend response format

**Recommended:**
- Use POST `/meetings/:id/summarize` for new implementations
- Use `summarizeMeeting()` frontend function
- Use `SummarizeResponse` type

## Performance Considerations

### ✅ Optimizations

1. **No Auto-Fetch**: Saves 1 HTTP request on page load
2. **On-Demand**: Only generates when user requests
3. **Local State**: Uses frontend transcript state (no refetch)
4. **Non-Blocking**: Summary generation doesn't block other features

### 📊 Metrics

**Before:**
- Page load: 3 HTTP requests (meeting + transcript + summary)
- Summary always fetched (even if not viewed)

**After:**
- Page load: 2 HTTP requests (meeting + transcript)
- Summary only when user clicks button
- ~33% reduction in initial requests

## Future Enhancements

### Potential Improvements

1. **Real AI Integration**: Replace mock with actual AI (OpenAI, Claude, etc.)
2. **Caching**: Cache generated summaries to avoid regeneration
3. **Streaming**: Stream summary as it's generated (SSE/WebSocket)
4. **Customization**: Allow user to specify summary length/style
5. **Multi-Language**: Support summary in different languages
6. **Highlights**: Link summary points to transcript segments
7. **Feedback**: Allow user to rate summary quality

### API Evolution

**Possible future endpoint:**
```
POST /meetings/:id/summarize
{
  "segments": [...],
  "options": {
    "length": "short" | "medium" | "long",
    "language": "vi" | "en",
    "style": "formal" | "casual",
    "focus": ["action_items", "decisions", "key_points"]
  }
}
```

## Migration Guide

### For Developers

**If you have existing code using old summary:**

1. **Remove auto-fetch:**
   ```typescript
   // DELETE THIS:
   useEffect(() => {
     const summaryResult = await getMeetingSummaryById(id);
     setBackendSummary(summaryResult.data);
   }, [id]);
   ```

2. **Add summarize button:**
   ```typescript
   <Button onClick={handleSummarize}>
     Tóm tắt cuộc họp
   </Button>
   ```

3. **Update state:**
   ```typescript
   // OLD:
   const [summary, setSummary] = useState<AISummary | null>(null);
   
   // NEW:
   const [summary, setSummary] = useState<string | null>(null);
   ```

4. **Use new service function:**
   ```typescript
   // OLD:
   const result = await getMeetingSummaryById(id);
   
   // NEW:
   const result = await summarizeMeeting(id, segments);
   ```

## Conclusion

The summary feature has been successfully refactored to be **frontend-driven and user-triggered**. This provides better user control, ensures summaries always reflect the current transcript state (including unsaved edits), and reduces unnecessary API calls on page load.

### ✅ Completed

- [x] Backend POST `/meetings/:id/summarize` endpoint
- [x] Mock summarization logic
- [x] Frontend service function `summarizeMeeting()`
- [x] Updated UI with button-triggered summarization
- [x] Four UI states: initial, loading, success, error
- [x] Regenerate summary functionality
- [x] Export integration
- [x] Comprehensive testing
- [x] Documentation

### 🎯 Key Achievement

**Summary now uses CURRENT frontend transcript state**, meaning users can edit transcript and immediately generate a summary without saving edits first. This provides a seamless, flexible workflow.
