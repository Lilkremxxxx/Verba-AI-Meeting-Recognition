# API Contract Documentation

**Version:** 1.0.0  
**Last Updated:** January 28, 2026  
**Owner:** Diện (Diện)  
**Status:** ✅ Source of Truth

> ⚠️ **IMPORTANT**: Đây là file contract duy nhất. Mọi thay đổi API phải update file này và thông báo cả FE + BE team.

---

## 📚 Table of Contents
- [Tech Stack](#-tech-stack)
- [Database Schema](#-database-schema)
- [Authentication Flow](#-authentication-flow)
- [API Endpoints](#-api-endpoints)
- [Error Handling](#-error-handling)
- [Testing Guide](#-testing-guide)

---

## 🛠 Tech Stack

### Backend
- **Framework:** FastAPI
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy + Alembic (migrations)
- **Auth:** JWT (access token only for MVP)
- **File Upload:** python-multipart (multipart/form-data)
- **Storage:** Local (dev) + S3 interface (future)
- **API Docs:** Swagger UI at `/docs`

### Frontend
- **Language:** JavaScript
- **Framework:** React
- **Build Tool:** Vite
- **Routing:** react-router-dom
- **HTTP Client:** axios
- **State Management:** Context API (Auth)
- **Styling:** Tailwind CSS

---

## 🗄 Database Schema

### Table: `users`
**Owner:** Diện

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | User unique identifier |
| `email` | VARCHAR | UNIQUE, NOT NULL | User email (login identifier) |
| `password_hash` | VARCHAR | NOT NULL | Bcrypt hashed password |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation time |

**Indexes:**
- `UNIQUE INDEX` on `email`

**Notes:**
- Password phải hash bằng bcrypt (min 8 chars)
- Email phải validate format trước khi lưu

---

### Table: `meetings`
**Owner:** Bằng (create) + Duy Anh (query)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Meeting unique identifier |
| `user_id` | UUID | FK → users.id, NOT NULL, INDEXED | Owner of meeting |
| `title` | VARCHAR | NOT NULL | Meeting title/name |
| `original_filename` | VARCHAR | NOT NULL | Original uploaded filename |
| `storage_provider` | VARCHAR | NOT NULL | `LOCAL` or `S3` |
| `storage_path` | TEXT | NOT NULL | Local path or S3 key |
| `status` | VARCHAR | NOT NULL | `QUEUED`, `PROCESSING`, `DONE`, `FAILED` |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Upload time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |
| `transcript` | TEXT | NULL | Transcription result (future) |
| `summary` | TEXT | NULL | Meeting summary (future) |
| `error_message` | TEXT | NULL | Error details if failed |
| `processed_at` | TIMESTAMP | NULL | Processing completion time |

**Indexes:**
- `INDEX` on `(user_id, created_at DESC)` for fast dashboard queries

**Status Values:**
- `QUEUED`: Just uploaded, waiting for processing (MVP default)
- `PROCESSING`: Being transcribed (future)
- `DONE`: Successfully processed (future)
- `FAILED`: Processing failed (future)

**Storage Path Format:**
- **LOCAL**: `uploads/{user_id}/{meeting_id}/{original_filename}`
- **S3**: `s3://bucket-name/{user_id}/{meeting_id}/{original_filename}` (future)

---

## 🔐 Authentication Flow

### 1️⃣ Register/Login
```
Client → POST /auth/register or /auth/login
       ← Response: { user, access_token, token_type }
Client stores access_token in localStorage
```

### 2️⃣ Authenticated Requests
```
Client → GET/POST /meetings
         Header: Authorization: Bearer {access_token}
       ← Response: data or 401 Unauthorized
```

### 3️⃣ Token Storage (Frontend)
```javascript
// After login/register
localStorage.setItem('access_token', response.access_token);
localStorage.setItem('user', JSON.stringify(response.user));

// On app load
const token = localStorage.getItem('access_token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
```

---

## 📡 API Endpoints

### Base URL
- **Development:** `http://localhost:8000`
- **Production:** TBD

---

## 1. Authentication Endpoints

### `POST /auth/register`
**Owner:** Diện  
**Description:** Create new user account

**Request:**
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Validation:**
- `email`: Valid email format, unique
- `password`: Min 8 characters

**Success Response (201 Created):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses:**
```json
// 422 Unprocessable Entity - Validation failed
{
  "detail": "Email already registered"
}

// 422 - Invalid email format
{
  "detail": "Invalid email format"
}

// 422 - Password too short
{
  "detail": "Password must be at least 8 characters"
}
```

---

### `POST /auth/login`
**Owner:** Diện  
**Description:** Login with existing account

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses:**
```json
// 401 Unauthorized - Wrong credentials
{
  "detail": "Incorrect email or password"
}

// 422 - Missing fields
{
  "detail": "Email and password are required"
}
```

---

## 2. Meetings Endpoints

### `POST /meetings/upload`
**Owner:** Bằng  
**Description:** Upload audio/video file for meeting transcription  
**Auth Required:** ✅ Yes

**Request:**
```http
POST /meetings/upload
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

title=Weekly Team Meeting
file=@/path/to/meeting_recording.mp3
```

**Form Fields:**
- `title` (text, required): Meeting title/name
- `file` (binary, required): Audio/video file

**File Constraints:**
- Supported formats: `.mp3`, `.mp4`, `.wav`, `.m4a` (MVP)
- Max size: 500MB (configurable)

**Success Response (201 Created):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "title": "Weekly Team Meeting",
  "status": "QUEUED",
  "original_filename": "meeting_recording.mp3",
  "created_at": "2026-01-28T10:30:00Z"
}
```

**Error Responses:**
```json
// 401 Unauthorized - No/invalid token
{
  "detail": "Not authenticated"
}

// 422 - Missing title
{
  "detail": "Title is required"
}

// 422 - Missing file
{
  "detail": "File is required"
}

// 413 Payload Too Large - File too big
{
  "detail": "File size exceeds 500MB limit"
}

// 422 - Unsupported file type
{
  "detail": "Unsupported file format. Use: mp3, wav"
}

// 500 Internal Server Error
{
  "detail": "Failed to save file"
}
```

**Storage Behavior (Bằng):**
1. Generate meeting UUID
2. Create directory: `uploads/{user_id}/{meeting_id}/`
3. Save file: `uploads/{user_id}/{meeting_id}/{original_filename}`
4. Create DB record with `status=QUEUED`, `storage_provider=LOCAL`
5. Return response

---

### `GET /meetings`
**Owner:** Duy Anh  
**Description:** List all meetings for authenticated user  
**Auth Required:** ✅ Yes

**Request:**
```http
GET /meetings
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "title": "Weekly Team Meeting",
    "status": "QUEUED",
    "original_filename": "meeting_recording.mp3",
    "created_at": "2026-01-28T10:30:00Z"
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "title": "Client Presentation",
    "status": "DONE",
    "original_filename": "presentation.mp4",
    "created_at": "2026-01-27T14:15:00Z"
  }
]
```

**Response Notes:**
- Array sorted by `created_at DESC` (newest first)
- Empty array `[]` if no meetings
- Only returns meetings owned by authenticated user

**Error Responses:**
```json
// 401 Unauthorized
{
  "detail": "Not authenticated"
}

// 500 Internal Server Error
{
  "detail": "Failed to fetch meetings"
}
```

---

## ⚠️ Error Handling

### HTTP Status Codes
| Code | Meaning | When to Use |
|------|---------|-------------|
| `200` | OK | Successful GET/POST (login, list) |
| `201` | Created | Successful resource creation (register, upload) |
| `401` | Unauthorized | Missing/invalid token, wrong credentials |
| `422` | Unprocessable Entity | Validation errors (missing fields, format) |
| `413` | Payload Too Large | File exceeds size limit |
| `500` | Internal Server Error | Server/DB errors |

### Error Response Format
All errors return JSON:
```json
{
  "detail": "Human-readable error message"
}
```

### Frontend Error Handling
```javascript
try {
  const response = await axios.post('/auth/login', data);
} catch (error) {
  if (error.response) {
    // Server responded with error status
    switch (error.response.status) {
      case 401:
        alert('Invalid credentials');
        break;
      case 422:
        alert(error.response.data.detail);
        break;
      default:
        alert('Server error');
    }
  } else {
    // Network error
    alert('Cannot connect to server');
  }
}
```

---

## 🧪 Testing Guide

### 1. Test Auth (Diện → Tuấn)

**Register:**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Expected:** Get `access_token` in response

---

### 2. Test Upload (Bằng → Nam)

```bash
# Save token from login
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Upload file
curl -X POST http://localhost:8000/meetings/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Test Meeting" \
  -F "file=@test_audio.mp3"
```

**Expected:** 
- Response with `status: "QUEUED"`
- File saved in `uploads/{user_id}/{meeting_id}/test_audio.mp3`
- DB record created

---

### 3. Test List (Duy Anh → Nam)

```bash
curl -X GET http://localhost:8000/meetings \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Array with uploaded meeting

---

### 4. Frontend E2E Test Flow

1. Open `http://localhost:5173/register`
2. Register new account
3. Verify redirect to `/dashboard`
4. Upload a test file
5. See file appear in list with status "QUEUED"
6. Refresh page → still logged in, list still shows

---

## 🔄 Change Log

### v1.0.0 - 2026-01-28 (Initial)
- ✅ Auth endpoints: `/auth/register`, `/auth/login`
- ✅ Meetings endpoints: `/meetings/upload`, `/meetings`
- ✅ Database schema: `users`, `meetings`
- ✅ Error conventions
- ✅ Testing guide

---

## 📋 Contract Rules

### ⚠️ Before Changing This File:
1. ❌ **KHÔNG** tự ý đổi contract mà không thảo luận team
2. ✅ **PHẢI** thông báo cả FE + BE nếu đổi request/response structure
3. ✅ **PHẢI** update version và change log
4. ✅ **PHẢI** test lại integration sau khi đổi

### ✅ Definition of Done (mỗi PR):
- [ ] Code implement đúng contract này
- [ ] Có test steps (curl hoặc manual)
- [ ] Chạy được local
- [ ] Frontend và Backend integration test pass
- [ ] Update contracts/api.md nếu có thay đổi API

---

## 👥 Ownership

| Component | Owner | Responsibility |
|-----------|-------|----------------|
| Contract File | Diện (Diện) | Maintain this file, approve changes |
| Auth Endpoints | Diện (Diện) | `/auth/*` implementation |
| Upload Endpoint | Bằng (Bằng) | `/meetings/upload` implementation |
| List Endpoint | Duy Anh (Duy Anh) | `/meetings` + storage abstraction |
| Auth UI | Tuấn (Tuấn) | Login/Register pages + token handling |
| Dashboard UI | Nam (Nam) | Upload form + meetings list |

---

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Configure DATABASE_URL, SECRET_KEY
alembic upgrade head
uvicorn app.main:app --reload
# API at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# App at http://localhost:5173
```

---

**Questions?** Ask Diện (Diện) - Contract owner

