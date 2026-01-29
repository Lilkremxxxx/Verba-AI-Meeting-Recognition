# Audio Files Directory

## Setup Instructions

**IMPORTANT**: Place a demo audio file here for local testing.

### Required File

```
public/audio/demo.mp3
```

Or:

```
public/audio/demo.wav
```

### How to Add

1. **Option 1**: Copy an existing audio file
   ```bash
   cp ~/Downloads/your-audio.mp3 public/audio/demo.mp3
   ```

2. **Option 2**: Download a sample
   - Visit: https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3
   - Save as `demo.mp3` in this directory

3. **Option 3**: Record your own
   - Use any voice recorder app
   - Export as .mp3 or .wav
   - Place in this directory as `demo.mp3`

### File Requirements

- **Format**: .mp3 or .wav
- **Size**: Any size (smaller is better for testing)
- **Duration**: Any duration (2-5 minutes recommended)
- **Name**: Must be exactly `demo.mp3` or `demo.wav`

### Why This is Needed

The MeetingDetailPage audio player uses this local file as a fallback until the backend provides `audioUrl` in the meeting metadata.

This allows you to test audio playback and transcript highlighting immediately without waiting for backend implementation.

### Testing

Once you've added the file:

1. Start dev server: `npm run dev`
2. Navigate to any meeting detail page
3. Click the Play button
4. Audio should play from your demo file

### Future

When the backend is ready:
- Backend will provide `audioUrl` in meeting metadata
- Audio player will use backend URL instead of this fallback
- This demo file will only be used if backend URL is not available

---

**Status**: ⚠️ Demo file required for testing  
**Location**: `public/audio/demo.mp3`  
**Action**: Add your audio file here before testing  
