# Summary UI - User Guide

## Visual Layout

The meeting detail page now includes a collapsible summary section positioned between the audio player and transcript:

```
┌─────────────────────────────────────────────────────┐
│  ← Quay lại                    [Xuất DOCX]          │
│                                                      │
│  Meeting Title                                       │
│  📄 filename.mp3 • 🕐 2 hours ago • [DONE]          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  🎵 Ghi âm cuộc họp                                 │
│  ┌──────────────────────────────────────────────┐  │
│  │  [◄] [▶ Phát] [►]    Tốc độ: [1x ▼]         │  │
│  │  00:00 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 15:30   │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ✨ Tóm tắt cuộc họp                          [▼]   │  ← COLLAPSIBLE
│  ┌──────────────────────────────────────────────┐  │
│  │  Cuộc họp thảo luận về dự án mới với trọng  │  │
│  │  tâm là cải thiện trải nghiệm người dùng... │  │
│  │                                              │  │
│  │  (Full summary text from backend)           │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📄 Bản ghi âm chi tiết        [Lưu chỉnh sửa (2)] │
│  ┌──────────────────────────────────────────────┐  │
│  │  00:00 (Speaker A)                           │  │
│  │  Hello everyone, let's start...              │  │
│  │                                              │  │
│  │  00:15 (Speaker B)                           │  │
│  │  Thanks for joining...                       │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## States

### 1. Loading State
When the summary is being fetched:
```
┌─────────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                      [▼]   │
│  ┌───────────────────────────────────────────┐ │
│  │  ⟳ Đang tải tóm tắt...                   │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 2. Success State (Expanded)
When summary is available and expanded:
```
┌─────────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                      [▲]   │
│  ┌───────────────────────────────────────────┐ │
│  │  Cuộc họp thảo luận về dự án mới với    │ │
│  │  trọng tâm là cải thiện trải nghiệm      │ │
│  │  người dùng và hiệu suất hệ thống.       │ │
│  │  Team đã thống nhất ưu tiên các tính     │ │
│  │  năng quan trọng nhất...                 │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 3. Success State (Collapsed - Default)
When summary is available but collapsed:
```
┌─────────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                      [▼]   │
└─────────────────────────────────────────────────┘
```

### 4. Fallback State
When summary is not available:
```
┌─────────────────────────────────────────────────┐
│  ✨ Tóm tắt cuộc họp                      [▼]   │
│  ┌───────────────────────────────────────────┐ │
│  │  Đang tóm tắt cuộc hội thoại …           │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## User Interactions

### Expand/Collapse
- **Click** on the header or arrow icon to toggle
- **Default**: Collapsed (saves screen space)
- **Animation**: Smooth slide down/up

### Non-Blocking
- Summary loads independently
- Audio player works immediately
- Transcript is accessible regardless of summary state
- Page never "hangs" waiting for summary

## Technical Details

### Component Structure
```tsx
<Card>
  <Accordion type="single" collapsible defaultValue="">
    <AccordionItem value="summary">
      <CardHeader>
        <AccordionTrigger>
          <CardTitle>✨ Tóm tắt cuộc họp</CardTitle>
        </AccordionTrigger>
      </CardHeader>
      <AccordionContent>
        <CardContent>
          {loadingSummary ? (
            <Loader /> // Loading state
          ) : hasBackendSummary ? (
            <p>{backendSummary.summary}</p> // Success state
          ) : (
            <p>Đang tóm tắt cuộc hội thoại …</p> // Fallback state
          )}
        </CardContent>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</Card>
```

### Data Flow
```
1. Page loads → Fetch meeting metadata
2. Fetch transcript (parallel)
3. Fetch backend summary (parallel, non-blocking)
4. Display summary when available
5. Show fallback if not available
```

### Error Handling
- Backend returns 404 → Show fallback message
- Network error → Show fallback message
- Invalid data → Show fallback message
- **Never crashes** - always shows something

## Accessibility

- ✅ Keyboard navigable (Tab to focus, Enter/Space to toggle)
- ✅ Screen reader friendly (proper ARIA labels)
- ✅ Clear visual feedback (hover states, focus rings)
- ✅ Semantic HTML structure

## Performance

- ✅ Non-blocking fetch (doesn't delay page load)
- ✅ Minimal re-renders (proper state management)
- ✅ Smooth animations (CSS transitions)
- ✅ Lazy loading (content only rendered when expanded)

## Browser Compatibility

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile responsive
- ✅ Touch-friendly (tap to expand/collapse)

## Future Enhancements

1. **Rich Formatting**: Support markdown in summary text
2. **Copy Button**: Quick copy summary to clipboard
3. **Share**: Share summary via email/link
4. **Regenerate**: Button to request new summary
5. **Feedback**: Thumbs up/down for summary quality
6. **Highlights**: Click to jump to relevant transcript sections
