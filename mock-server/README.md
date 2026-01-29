# Mock Meeting API Server

Express-based mock server for testing meeting upload functionality.

## Features

- Upload audio files (.mp3, .wav) up to 500MB
- Multipart/form-data support with multer
- File validation (MIME type + extension)
- Static file serving for uploaded audio
- CORS enabled for frontend dev server
- Modular architecture

## Installation

```bash
cd mock-server
npm install
```

## Running the Server

```bash
npm start
```

Or with auto-reload during development:

```bash
npm run dev
```

Server will start on `http://localhost:3000`

## API Endpoints

### POST /meetings
Upload a new meeting with audio file.

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `title` (string, required): Meeting title
  - `audio` (file, required): Audio file (.mp3 or .wav, max 500MB)

**Success Response (201):**
```json
{
  "id": "uuid-v4",
  "title": "Meeting Title",
  "fileName": "original-file.mp3",
  "fileSize": 15728640,
  "status": "QUEUED",
  "createdAt": "2026-01-28T10:30:00.000Z",
  "updatedAt": "2026-01-28T10:30:00.000Z",
  "audioUrl": "http://localhost:3000/media/uuid.mp3",
  "speakerMap": {}
}
```

**Error Response (400):**
```json
{
  "message": "Error description"
}
```

### GET /media/:filename
Serve uploaded audio files.

**Response:**
- Content-Type: `audio/mpeg` or `audio/wav`
- Supports range requests for audio seeking

### GET /health
Health check endpoint.

## Project Structure

```
mock-server/
├── server.js              # Express app bootstrap
├── routes/
│   └── meetings.js        # Meeting upload route handler
├── middleware/
│   └── upload.js          # Multer config + validation
├── utils/
│   └── filename.js        # Filename generation utilities
├── uploads/               # Uploaded files (auto-created)
├── package.json
└── README.md
```

## Validation Rules

- **Extensions**: Only `.mp3` and `.wav`
- **MIME Types**: `audio/mpeg`, `audio/wav`, `audio/x-wav`
- **File Size**: Maximum 500MB
- **Title**: Required, non-empty string

## CORS Configuration

Allowed origins:
- `http://localhost:5173` (Vite default)
- `http://localhost:8080` (Custom port)

Allowed methods: GET, POST
