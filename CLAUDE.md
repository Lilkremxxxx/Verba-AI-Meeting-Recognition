# Agent.md — Verba Project Instructions

> File này là context tối thiểu để agent bắt đầu làm việc mà không cần load lại toàn bộ codebase.
> Cập nhật khi có structural change lớn. Lần cuối: 2026-03-05.

---

## Repo summary

- **Verba** — web app upload audio cuộc họp → tự động transcribe tiếng Việt (PhoWhisper) → phân biệt speaker → tóm tắt → export DOCX.
- Monorepo: `backend/` (FastAPI + asyncpg), `frontend/` (React 18 + TypeScript + Vite + shadcn/ui), `Guided_dtb/Demo/STT/` (ML pipeline offline).
- Môn DAT301m — FPT University. Team 5 người, comment tiếng Việt trong code.

---

## How to work

### Prerequisites
- Python 3.10+ (conda env `DAT301m` tại root)
- Node.js 18+ / Bun
- PostgreSQL (remote: xem `backend/.env`)

### Backend
```bash
cd backend
# Activate conda env (đã có sẵn trong terminal)
uvicorn app.main:app --reload        # http://localhost:8000
# Swagger: http://localhost:8000/docs
```
- Entry: `backend/app/main.py`
- `.env` nằm ở `backend/.env` (PG_HOST, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES)
- Nếu thêm dependency: thêm vào `requirements.txt` ở root

### Frontend
```bash
cd frontend
npm install          # hoặc bun install
npm run dev          # http://localhost:8080 (Vite, KHÔNG phải 5173 — xem vite.config.ts)
```

### Commands reference
| Task | Command | Cwd |
|------|---------|-----|
| BE dev | `uvicorn app.main:app --reload` | `backend/` |
| FE dev | `npm run dev` | `frontend/` |
| FE build | `npm run build` | `frontend/` |
| FE lint | `npm run lint` | `frontend/` |
| FE test | `npm run test` | `frontend/` (vitest, jsdom) |
| Mock server | `npm run mock:server` | `frontend/` (port 3000) |
| ML pipeline | `python main.py --audio <file> --out_base outputs/result` | `Guided_dtb/Demo/STT/` |

### Lỗi hay gặp
- **CORS 403**: Backend chỉ allow `localhost:8000`, `localhost:5173`, `localhost:8080`. Nếu FE chạy port khác → thêm vào `origins` trong `main.py`.
- **DB connection refused**: PostgreSQL host là remote (`backend/.env`). Kiểm tra VPN/Tailscale nếu không connect được.
- **Login 422**: Login endpoint nhận `OAuth2PasswordRequestForm` (form-urlencoded, field `username` chứa email) — KHÔNG phải JSON.
- **Import error backend**: Backend chạy từ `backend/`, import dùng relative path từ `app/` (vd: `from db.session import get_db`).

---

## Project layout

### Backend (`backend/app/`)
```
main.py                         ← FastAPI app, CORS, middleware, router mounts, lifecycle
api/endpoints/
    auth.py                     ← register, login, get_current_user dependency
    meetings.py                 ← GET /, GET /{id}, POST /upload, POST /{id}/process
    transcripts.py              ← POST /{id}/transcribe, GET /{id}/transcript, PATCH /{id}/transcript
    summarize.py                ← POST /summarize (501 — chưa implement)
core/security.py                ← Argon2 hash, JWT create/verify (python-jose)
db/session.py                   ← asyncpg pool: create_pool, close_pool, get_db (Depends), get_pool
schemas/
    user.py                     ← UserCreate, UserOut
    meeting.py, transcript.py, summarize.py  ← Pydantic request/response models
services/storage/
    base.py                     ← Abstract StorageService
    local.py                    ← LocalStorageService (save, get_url, delete)
services/stt/                   ← STT service interfaces
```

### Frontend (`frontend/src/`)
```
App.tsx                         ← Routes: /login, /signup, /dashboard, /meetings, /meetings/:id
contexts/AuthContext.tsx         ← Auth state, token in localStorage (verba_token, verba_user)
services/
    authService.ts              ← register, login (OAuth2 form), getCurrentUser
    meetingService.ts           ← CRUD meetings, transcript, summarize — tất cả dùng native fetch
pages/
    Dashboard.tsx               ← Upload form + meetings list
    MeetingDetailPage.tsx       ← Audio player + transcript + summary + export (file lớn nhất)
    MeetingsPage.tsx, Login.tsx, Signup.tsx, NotFound.tsx
components/meeting/             ← UploadForm, AudioPlayer, TranscriptViewer, AISummaryView, ExportDialog, SpeakerManager
components/ui/                  ← shadcn/ui components (KHÔNG tự viết UI primitives)
components/layout/AppLayout.tsx ← Header nav + branding "Verba"
utils/
    exportDocx.ts               ← Client-side DOCX generation
    summarize.ts                ← Heuristic Vietnamese summarization
    fileValidation.ts, time.ts
types/meeting.ts                ← Meeting, TranscriptSegment, MeetingSummary, SummarizeResponse
```

### Config locations
| File | Purpose |
|------|---------|
| `backend/.env` | DB credentials, JWT secret, algorithm |
| `frontend/.env` | `VITE_API_BASE_URL` |
| `frontend/vite.config.ts` | Vite config, port 8080, `@/` alias |
| `frontend/vitest.config.ts` | Test: jsdom, setup file |
| `frontend/eslint.config.js` | ESLint flat config, TS + React hooks |
| `frontend/tailwind.config.ts` | Tailwind + shadcn theme |
| `frontend/tsconfig.app.json` | TS paths (`@/` → `src/`) |
| `contracts/api.md` | **API contract — Single Source of Truth** |

---

## Coding rules (non-obvious)

### Backend
| Rule | Detail |
|------|--------|
| DB queries | **Raw SQL qua asyncpg** — KHÔNG dùng SQLAlchemy ORM query. Connection qua `Depends(get_db)`. |
| Auth dependency | `from api.endpoints.auth import get_current_user` → `Depends(get_current_user)` → trả `UserOut`. |
| Password hash | **Argon2** (`passlib`). KHÔNG bcrypt. |
| JWT | `python-jose`. SECRET_KEY + ALGORITHM từ `.env`. |
| Login form | `OAuth2PasswordRequestForm` — field `username` = email. KHÔNG nhận JSON. |
| Upload field | `audio: UploadFile = File(...)`, `title: str = Form(...)`. Field name audio là `audio` (KHÔNG phải `file`). |
| Storage path | `uploads/{user_id}/{meeting_id}/{filename}`. Static serve tại `/media/`. |
| Error format | `{"detail": "message"}` — dùng `HTTPException`. |

```python
# ✅ Preferred
row = await db.fetchrow("SELECT * FROM meetings WHERE id = $1 AND user_id = $2", meeting_id, current_user.id)

# ❌ Avoided
session.query(Meeting).filter(Meeting.id == meeting_id).first()
```

### Frontend
| Rule | Detail |
|------|--------|
| HTTP client | **Native `fetch`** — KHÔNG axios. |
| Auth token | `localStorage` key `verba_token`. Helper: `getAuthHeaders()` trong meetingService. |
| Login request | `application/x-www-form-urlencoded`, field `username` = email. |
| API base | `import.meta.env.VITE_API_BASE_URL \|\| "http://localhost:8000"` |
| UI components | **shadcn/ui** (`@/components/ui/*`). KHÔNG tự viết button/dialog/input. |
| Toast | `sonner` (via `toast()`). |
| File validation | `.mp3`, `.wav` only, max 500MB. |
| Path alias | `@/` = `src/`. |
| State | React Context (AuthContext) + `@tanstack/react-query`. |

```typescript
// ✅ Preferred
const res = await fetch(`${API_BASE_URL}/meetings`, { headers: getAuthHeaders() });

// ❌ Avoided
axios.get('/meetings');
```

### Cả hai
- **Đọc `contracts/api.md` trước** khi sửa bất kỳ endpoint nào.
- KHÔNG thay đổi API contract mà không cập nhật `contracts/api.md`.
- Comment tiếng Việt.

---

## Database schema (quick ref)

### `users`
`id` UUID PK | `email` VARCHAR UNIQUE | `password_hash` VARCHAR | `created_at` TIMESTAMP

### `meetings`
`id` UUID PK | `user_id` UUID FK→users | `title` VARCHAR | `original_filename` VARCHAR | `storage_provider` VARCHAR | `storage_path` TEXT | `status` VARCHAR (QUEUED/PROCESSING/DONE/FAILED) | `created_at` TIMESTAMP | `updated_at` TIMESTAMP | `transcript` TEXT | `summary` TEXT | `error_message` TEXT | `processed_at` TIMESTAMP | `transcript_json` JSONB

---

## API endpoints (quick ref)

| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/auth/register` | ❌ | ✅ Done |
| POST | `/auth/login` | ❌ | ✅ Done |
| GET | `/auth/me` | ✅ | ✅ Done |
| GET | `/meetings/` | ✅ | ✅ Done |
| POST | `/meetings/upload` | ✅ | ✅ Done |
| GET | `/meetings/{id}` | ✅ | ✅ Done |
| POST | `/meetings/{id}/transcribe` | ✅ | ✅ Done (background) |
| GET | `/meetings/{id}/transcript` | ✅ | ✅ Done |
| PATCH | `/meetings/{id}/transcript` | ✅ | ⚠️ Check |
| POST | `/summarize` | ✅ | ❌ 501 stub |
| GET | `/meetings/{id}/summary` | ✅ | ⚠️ Check |

> Chi tiết đầy đủ: `contracts/api.md`

---

## Safety / constraints

1. **KHÔNG commit secrets** — `.env` files đã trong `.gitignore`.
2. **KHÔNG thay đổi auth flow** (Argon2 + JWT + OAuth2 form login) nếu không được yêu cầu rõ ràng.
3. **KHÔNG đổi DB schema** mà không thảo luận — DB dùng chung, remote PostgreSQL.
4. **KHÔNG thay native `fetch` bằng axios** ở frontend.
5. **KHÔNG thay raw SQL bằng ORM query** ở backend.
6. **Khi không chắc chắn**: follow pattern gần nhất đã có trong codebase.
7. **File `contracts/api.md`** phải được cập nhật nếu thay đổi bất kỳ API request/response nào.
8. Test xong thì cung cấp curl command hoặc steps để verify.

---

## Change Log

> Mỗi khi hoàn thành task, agent PHẢI append entry mới vào đây.
> Format: `### YYYY-MM-DD — <mô tả>` + Scope + Thay đổi + Lưu ý.
> KHÔNG xóa entries cũ. Chỉ append.

### 2026-03-05 — Khởi tạo CLAUDE.md & Agent.md
- **Scope:** Project setup
- **Thay đổi:** Tạo `CLAUDE.md` (project context + coding rules + change log), tạo `Agent.md` (bản gốc, sau đó merge vào CLAUDE.md)
- **Lưu ý:** CLAUDE.md là file context chính. Agent đọc file này đầu tiên mỗi chat mới. Sau khi xong task → append Change Log entry vào đây.
