# Summary Feature - User Flow Visualization

## Complete User Journey

### Step 1: Page Load (No Auto-Fetch)
```
┌─────────────────────────────────────────────────────────┐
│  Meeting Detail Page                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🎵 Audio Player                                        │
│  [▶ Play] [Speed: 1x]                                   │
│  00:00 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 15:30      │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✨ Tóm tắt cuộc họp                              [▼]   │  ← COLLAPSED
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📄 Transcript                                          │
│  00:00 (Speaker A) Hello everyone...                    │
│  00:15 (Speaker B) Thanks for joining...                │
│                                                          │
└─────────────────────────────────────────────────────────┘

Note: Summary section is collapsed, no auto-fetch happens
```

### Step 2: User Expands Summary Section
```
┌─────────────────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                              [▲]   │  ← EXPANDED
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │              ✨                                   │ │
│  │                                                   │ │
│  │  Nhấn nút bên dưới để tạo tóm tắt                │ │
│  │  từ transcript hiện tại                          │ │
│  │                                                   │ │
│  │        [✨ Tóm tắt cuộc họp]                     │ │  ← BUTTON
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

User sees: Initial state with summarize button
```

### Step 3: User Clicks "Tóm tắt cuộc họp"
```
┌─────────────────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                              [▲]   │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │         ⟳ Đang tóm tắt cuộc hội thoại …          │ │  ← LOADING
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

Backend receives:
POST /meetings/:id/summarize
{
  "segments": [
    {"start": 0, "end": 5, "speaker": "A", "text": "..."},
    ...
  ]
}
```

### Step 4: Summary Generated Successfully
```
┌─────────────────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                              [▲]   │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │  Cuộc họp có 15 đoạn hội thoại với 3 người      │ │
│  │  tham gia. Nội dung chính: Thảo luận về dự án   │ │
│  │  mới với trọng tâm là cải thiện trải nghiệm     │ │
│  │  người dùng và hiệu suất hệ thống. Team đã      │ │
│  │  thống nhất ưu tiên các tính năng quan trọng... │ │
│  │                                                   │ │
│  │                    [✨ Tạo lại tóm tắt]          │ │  ← REGENERATE
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

User sees: Summary text + option to regenerate
```

## Workflow A: Edit Then Summarize

### Step 1: User Edits Transcript
```
┌─────────────────────────────────────────────────────────┐
│  📄 Transcript                    [Lưu chỉnh sửa (2)]   │  ← UNSAVED EDITS
│  ┌───────────────────────────────────────────────────┐ │
│  │  00:00 (Speaker A)                                │ │
│  │  Hello everyone, let's discuss the new project    │ │
│  │                                          ^^^^^^^^^ │ │  ← EDITED
│  │                                                   │ │
│  │  00:15 (Speaker B)                                │ │
│  │  Thanks. I think we should focus on UX first     │ │
│  │                                          ^^^^^^^^ │ │  ← EDITED
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

Note: Edits are in local state, NOT saved to backend yet
```

### Step 2: User Clicks "Tóm tắt cuộc họp" (Without Saving)
```
Frontend sends to backend:
POST /meetings/:id/summarize
{
  "segments": [
    {
      "start": 0,
      "end": 5,
      "speaker": "Speaker A",
      "text": "Hello everyone, let's discuss the new project"
                                              ^^^^^^^^^ EDITED VERSION
    },
    {
      "start": 5,
      "end": 10,
      "speaker": "Speaker B",
      "text": "Thanks. I think we should focus on UX first"
                                              ^^^^^^^^ EDITED VERSION
    },
    ...
  ]
}

Backend generates summary from EDITED transcript
```

### Step 3: Summary Reflects Edits
```
┌─────────────────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                              [▲]   │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │  Cuộc họp thảo luận về dự án mới (new project)  │ │  ← INCLUDES EDIT
│  │  với trọng tâm là UX (focus on UX first)...     │ │  ← INCLUDES EDIT
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

✅ Summary matches what user sees on screen
✅ User can save transcript edits later (optional)
```

## Workflow B: Summarize, Edit, Re-summarize

### Step 1: Initial Summary
```
User clicks "Tóm tắt cuộc họp"
→ Summary generated: "Cuộc họp thảo luận về dự án..."
```

### Step 2: User Notices Issue in Transcript
```
User reads summary, sees: "...thảo luận về dự án..."
User checks transcript, finds typo: "dự án" should be "dự án mới"
```

### Step 3: User Edits Transcript
```
User edits: "dự án" → "dự án mới"
Edit is in local state (not saved yet)
```

### Step 4: User Clicks "Tạo lại tóm tắt"
```
Frontend sends UPDATED transcript to backend
Backend generates NEW summary with corrected text
User sees updated summary: "...thảo luận về dự án mới..."
```

### Step 5: User Satisfied, Saves Transcript
```
User clicks "Lưu chỉnh sửa"
Transcript saved to backend
Summary already correct (no need to regenerate)
```

## Workflow C: Export with Summary

### Step 1: User Has Summary
```
┌─────────────────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                              [▲]   │
│  Summary text displayed...                              │
└─────────────────────────────────────────────────────────┘
```

### Step 2: User Clicks "Xuất DOCX"
```
┌─────────────────────────────────────────────────────────┐
│  Xuất file DOCX                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ☑ Bao gồm tóm tắt                                │ │  ← ENABLED
│  │  ☑ Bao gồm bản ghi âm chi tiết                    │ │
│  │                                                   │ │
│  │  Tên file: meeting-uuid.docx                     │ │
│  │                                                   │ │
│  │              [Hủy]  [Xuất file]                  │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Step 3: DOCX Generated
```
DOCX Contents:
┌─────────────────────────────────────────────────────────┐
│  Meeting Title                                          │
│  ID: uuid                                               │
│  Status: DONE                                           │
│  Created: 2024-01-29                                    │
│                                                          │
│  TÓM TẮT                                                │
│  Cuộc họp thảo luận về dự án mới...                    │  ← FROM FRONTEND
│                                                          │
│  BẢN GHI ÂM CHI TIẾT                                    │
│  [00:00 - 00:05] (Speaker A)                           │
│  Hello everyone, let's discuss the new project          │  ← FROM FRONTEND
│                                                          │
│  [00:05 - 00:10] (Speaker B)                           │
│  Thanks. I think we should focus on UX first            │  ← FROM FRONTEND
│  ...                                                     │
└─────────────────────────────────────────────────────────┘

✅ Export uses CURRENT frontend state
✅ Summary and transcript are consistent
```

## Error Handling

### Scenario: No Transcript Available
```
┌─────────────────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                              [▲]   │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │              ✨                                   │ │
│  │                                                   │ │
│  │  Nhấn nút bên dưới để tạo tóm tắt                │ │
│  │  từ transcript hiện tại                          │ │
│  │                                                   │ │
│  │        [✨ Tóm tắt cuộc họp]                     │ │  ← DISABLED
│  │                                                   │ │
│  │        Cần có transcript để tóm tắt              │ │  ← HINT
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

Button is disabled when no transcript available
```

### Scenario: Summarization Error
```
┌─────────────────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                              [▲]   │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │  ⚠ Không thể tạo tóm tắt                         │ │  ← ERROR
│  │  Network error: Failed to fetch                  │ │
│  │                                                   │ │
│  │              [Thử lại]                           │ │  ← RETRY
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

User can retry after error
```

## Key Differences: Before vs After

### Before (Auto-Fetch)
```
Page Load:
1. Fetch meeting metadata
2. Fetch transcript
3. Auto-fetch summary ← AUTOMATIC
4. Display summary (may not match edits)

User edits transcript:
- Summary becomes stale
- No way to regenerate
- Export may be inconsistent
```

### After (User-Triggered)
```
Page Load:
1. Fetch meeting metadata
2. Fetch transcript
3. Show summarize button ← MANUAL

User clicks "Tóm tắt cuộc họp":
1. Send CURRENT transcript to backend
2. Receive fresh summary
3. Display summary (always matches current state)

User edits transcript:
- Can regenerate summary anytime
- Summary always reflects current edits
- Export is always consistent
```

## Summary

The new flow gives users **complete control**:
- ✅ Decide when to generate summary
- ✅ Edit transcript freely
- ✅ Regenerate summary anytime
- ✅ Summary always matches what they see
- ✅ No forced save before summarize
- ✅ Flexible, intuitive workflow
