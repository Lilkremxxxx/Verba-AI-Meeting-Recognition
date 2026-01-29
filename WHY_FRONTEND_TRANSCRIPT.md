# Why Summarize Uses Frontend Transcript State

## The Problem

When transcript editing was introduced, we faced a synchronization challenge:

```
Backend State:     [Original transcript saved in database]
                              ↕
Frontend State:    [Edited transcript in user's browser]
                              ↕
Summary:           [Which version should be used?]
```

## The Solution: Frontend-Driven Summarization

We chose to use **frontend transcript state** for summarization. Here's why:

### 1. Reflects Current Reality

**User's Mental Model:**
- User sees edited transcript on screen
- User clicks "Summarize"
- User expects summary of what they see

**If we used backend state:**
- User edits transcript
- User clicks "Summarize"
- Summary doesn't match what they see (uses old version)
- Confusing and frustrating experience ❌

**Using frontend state:**
- User edits transcript
- User clicks "Summarize"
- Summary matches what they see ✅

### 2. Flexible Workflow

**Scenario A: Edit → Summarize → Save**
```
1. User edits transcript
2. User generates summary (sees results immediately)
3. User decides if edits are good
4. User saves transcript (optional)
```

**Scenario B: Summarize → Edit → Re-summarize**
```
1. User generates initial summary
2. User notices issues in transcript
3. User edits transcript
4. User regenerates summary (no save needed)
5. Iterates until satisfied
```

**Scenario C: Quick Exploration**
```
1. User makes experimental edits
2. User generates summary to see impact
3. User decides not to save edits
4. No backend pollution with temporary changes
```

### 3. No Forced Dependencies

**If we required saving before summarizing:**
```
User workflow:
1. Edit transcript
2. Click "Save" (forced step)
3. Wait for save to complete
4. Click "Summarize"
5. Wait for summary

Problems:
- Extra step (friction)
- Slower workflow
- Can't experiment without saving
- Backend gets polluted with temporary edits
```

**With frontend state:**
```
User workflow:
1. Edit transcript
2. Click "Summarize" (immediate)
3. See results

Benefits:
- One less step
- Faster workflow
- Can experiment freely
- Save only when satisfied
```

### 4. Consistency with Export

Export already uses frontend state:

```typescript
// Export uses CURRENT frontend state
await exportMeetingToDocx({
  segments: segments, // Current state (edited or not)
  summary: summary,   // Generated from current state
});
```

If summary used backend state but export used frontend state:
- Summary in UI: based on backend (old version)
- Summary in export: based on frontend (new version)
- **Inconsistent!** ❌

With both using frontend state:
- Summary in UI: based on frontend
- Summary in export: based on frontend
- **Consistent!** ✅

### 5. Real-World Example

**Scenario: Meeting with transcription errors**

```
Original transcript (backend):
"We need to ship the product next weak."
                                  ^^^^^ typo

User edits:
"We need to ship the product next week."
                                  ^^^^^ fixed

User clicks "Summarize":

❌ Using backend state:
   Summary: "...ship the product next weak..."
   User: "Wait, I just fixed that typo!"

✅ Using frontend state:
   Summary: "...ship the product next week..."
   User: "Perfect, that's what I wanted!"
```

### 6. Technical Benefits

**Performance:**
- No need to PATCH transcript before summarizing
- One HTTP request instead of two
- Faster user experience

**Simplicity:**
- No complex state synchronization
- No race conditions (save vs summarize)
- Clearer code flow

**Flexibility:**
- User controls when to save
- User controls when to summarize
- No forced ordering

## Alternative Approaches (Rejected)

### ❌ Approach 1: Always Save Before Summarize

```typescript
async function handleSummarize() {
  // Force save first
  await updateTranscript(id, editedSegments);
  
  // Then summarize
  await summarizeMeeting(id);
}
```

**Problems:**
- Forces user to save (even if just experimenting)
- Slower (two sequential requests)
- Can't try different edits without polluting backend
- Bad UX

### ❌ Approach 2: Fetch Backend Transcript for Summary

```typescript
async function handleSummarize() {
  // Fetch latest from backend
  const transcript = await getTranscriptByMeetingId(id);
  
  // Summarize backend version
  await summarizeMeeting(id, transcript.segments);
}
```

**Problems:**
- Ignores user's edits in UI
- Summary doesn't match what user sees
- Confusing and frustrating
- Extra HTTP request

### ❌ Approach 3: Auto-Save on Edit

```typescript
function handleTextEdit(index, newText) {
  setSegments(...);
  
  // Auto-save every edit
  await updateTranscript(id, [{index, text: newText}]);
}
```

**Problems:**
- Too many HTTP requests (one per keystroke)
- Network latency affects typing
- Can't experiment without saving
- Backend gets every intermediate state

## The Right Approach: Frontend State ✅

```typescript
async function handleSummarize() {
  // Use CURRENT frontend state
  const result = await summarizeMeeting(id, segments);
  
  // segments includes all edits (saved or unsaved)
  setSummary(result.data.summary);
}
```

**Benefits:**
- ✅ Summary matches what user sees
- ✅ No forced save before summarize
- ✅ Fast (one request)
- ✅ Flexible workflow
- ✅ Consistent with export
- ✅ Simple implementation
- ✅ Great UX

## Conclusion

Using frontend transcript state for summarization is the right choice because:

1. **User Experience**: Summary matches what user sees on screen
2. **Flexibility**: User can edit → summarize → iterate without saving
3. **Performance**: No forced save, one HTTP request
4. **Consistency**: Same state used for summary and export
5. **Simplicity**: No complex state synchronization

The backend receives the transcript segments in the POST request, so it has all the information it needs to generate an accurate summary, regardless of whether those edits have been persisted to the database.

This approach puts the user in control and provides a smooth, intuitive workflow.
