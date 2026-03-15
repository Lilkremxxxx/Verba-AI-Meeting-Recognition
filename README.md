# Verba

> Nền tảng hỗ trợ quản lý biên bản cuộc họp bằng AI: tải lên file ghi âm, chuyển giọng nói thành văn bản, tóm tắt nội dung chính và xuất tài liệu để chia sẻ.

## Mục lục

- [Dự án này làm gì?](#dự-án-này-làm-gì)
- [Tính năng chính](#tính-năng-chính)
- [Kiến trúc tổng quan](#kiến-trúc-tổng-quan)
- [Luồng xử lý chính](#luồng-xử-lý-chính)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cách chạy local](#cách-chạy-local)
- [Biến môi trường cần thiết](#biến-môi-trường-cần-thiết)
- [API chính](#api-chính)
- [Trạng thái hiện tại](#trạng-thái-hiện-tại)
- [Định hướng phát triển](#định-hướng-phát-triển)

## Dự án này làm gì?

`Verba` là một ứng dụng full-stack hỗ trợ xử lý ghi âm cuộc họp. Người dùng có thể:

- đăng ký và đăng nhập tài khoản,
- tải lên file audio cuộc họp (`.mp3`, `.wav`),
- theo dõi trạng thái xử lý của từng cuộc họp,
- chạy phiên âm giọng nói sang văn bản,
- sinh tóm tắt AI theo cấu trúc rõ ràng,
- xem lại transcript theo mốc thời gian,
- xuất nội dung thành file `.docx`.

Mục tiêu của dự án là rút ngắn thời gian viết biên bản họp thủ công, đồng thời giúp người dùng nhanh chóng nắm được:

- nội dung tổng quan,
- các quyết định quan trọng,
- đầu việc cần thực hiện,
- các mốc thời gian đáng chú ý.

## Tính năng chính

### 1. Xác thực người dùng

- Đăng ký tài khoản bằng email và mật khẩu
- Đăng nhập bằng JWT
- Bảo vệ route phía frontend bằng `ProtectedRoute`
- Gắn token vào request API để tách dữ liệu theo từng người dùng

### 2. Quản lý cuộc họp

- Tạo mới cuộc họp bằng cách upload file ghi âm
- Lưu audio theo cấu trúc thư mục riêng cho từng user
- Hiển thị danh sách cuộc họp theo thời gian tạo
- Xem chi tiết từng cuộc họp
- Xóa cuộc họp và file lưu trữ liên quan

### 3. Phiên âm audio

- Backend dùng `FastAPI BackgroundTasks` để xử lý nền
- Tích hợp `faster-whisper` với mô hình `PhoWhisper` dạng CTranslate2
- Hỗ trợ polling trạng thái từ frontend
- Lưu transcript text và transcript segments vào PostgreSQL

### 4. Tóm tắt AI

- Tóm tắt từ transcript đã tạo
- Gọi Gemini API để sinh dữ liệu summary
- Trả về summary có cấu trúc gồm:
  - `summary`
  - `decisions`
  - `tasks`
  - `deadlines`
- Có cơ chế chia transcript thành nhiều chunk nếu nội dung dài
- Có cơ chế xoay vòng nhiều Gemini API key khi bị rate limit

### 5. Trải nghiệm đọc biên bản

- Audio player đồng bộ với transcript
- Highlight đoạn transcript theo thời gian phát
- Cho phép chỉnh sửa transcript trên giao diện
- Chỉnh sửa summary trực tiếp trên UI
- Xuất `.docx` chứa transcript và summary

## Kiến trúc tổng quan

```text
Frontend (React + Vite)
    |
    | HTTP + JWT
    v
Backend (FastAPI)
    |
    |-- PostgreSQL: users, meetings, transcript, summary
    |-- Local Storage: lưu file audio trong backend/uploads
    |-- STT Engine: PhoWhisper / faster-whisper
    |-- LLM: Gemini API để tóm tắt
```

## Luồng xử lý chính

### 1. Upload cuộc họp

1. Người dùng đăng nhập.
2. Chọn file audio và nhập tiêu đề cuộc họp.
3. Frontend gửi `multipart/form-data` đến `POST /meetings/upload`.
4. Backend lưu file vào `backend/uploads/{user_id}/{meeting_id}/...`.
5. Backend tạo bản ghi `meetings` với trạng thái ban đầu là `QUEUED`.

### 2. Chạy transcript

1. Tại trang chi tiết cuộc họp, người dùng bấm `Bắt đầu Transcript`.
2. Frontend gọi `POST /meetings/{meeting_id}/transcribe`.
3. Backend chạy background task để phiên âm audio.
4. Trong quá trình xử lý, trạng thái chuyển sang `PROCESSING`.
5. Khi hoàn tất, transcript được lưu vào DB và trạng thái chuyển thành `DONE`.

### 3. Sinh summary

1. Sau khi transcript có dữ liệu, frontend gọi `GET /meetings/{meeting_id}/summary`.
2. Backend kiểm tra summary đã cache chưa.
3. Nếu chưa có, hệ thống trích xuất transcript text và gửi sang Gemini.
4. Kết quả được chuẩn hóa, lưu vào DB, rồi trả lại cho frontend.

## Cấu trúc thư mục

```text
verba/
|- backend/
|  |- app/
|  |  |- api/
|  |  |  |- endpoints/
|  |  |  |  |- auth.py
|  |  |  |  |- meetings.py
|  |  |  |  |- transcripts.py
|  |  |  |  `- summarize.py
|  |  |- core/
|  |  |- db/
|  |  |- schemas/
|  |  `- services/
|  |     |- stt/
|  |     `- storage/
|  |- uploads/
|  `- .env
|- frontend/
|  |- src/
|  |  |- components/
|  |  |- contexts/
|  |  |- pages/
|  |  |- services/
|  |  |- types/
|  |  `- utils/
|  `- mock-server/
|- contracts/
|  |- api.md
|  `- Structure.md
|- public/
`- requirements.txt
```

## Công nghệ sử dụng

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- Framer Motion
- `docx` để export file Word

### Backend

- FastAPI
- asyncpg
- PostgreSQL
- JWT + passlib/argon2
- `faster-whisper`
- PhoWhisper CTranslate2 model
- httpx
- Gemini API

## Cách chạy local

### Yêu cầu trước khi chạy

- Node.js 18+
- Python 3.10+
- PostgreSQL
- Mô hình PhoWhisper CTranslate2 trong thư mục `backend/.cache/`
- Gemini API key để dùng tính năng summary

### 1. Chạy backend

Từ thư mục gốc dự án:

```bash
cd backend
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Cài dependencies:

```bash
pip install -r ..\requirements.txt
```

Chạy server:

```bash
uvicorn app.main:app --reload
```

Backend mặc định chạy tại:

```text
http://localhost:8000
```

Swagger docs:

```text
http://localhost:8000/docs
```

### 2. Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:5173
```

### 3. Cấu hình frontend gọi đúng backend

Tạo file `.env` trong `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Biến môi trường cần thiết

Backend đọc cấu hình chủ yếu từ `backend/.env`.

Ví dụ tối thiểu:

```env
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

PG_HOST=localhost
PG_PORT=5432
PG_DBNAME=verba
PG_USER=postgres
PG_PASSWORD=your_password

LLM_API_KEY=your_gemini_api_key
LLM_MODEL=gemini-2.5-flash
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta

PHOWHISPER_CT2_DIR=backend/.cache/phowhisper-medium-ct2
PHOWHISPER_DEVICE=cuda
PHOWHISPER_COMPUTE_TYPE=float16
PHOWHISPER_BATCH_SIZE=16
PHOWHISPER_BEAM_SIZE=1
```

Ngoài `LLM_API_KEY`, backend còn hỗ trợ nhiều key theo dạng:

```env
GEMINI_API_KEY1=...
GEMINI_API_KEY2=...
GEMINI_API_KEY3=...
```

## API chính

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Meetings

- `GET /meetings/`
- `GET /meetings/{meeting_id}`
- `POST /meetings/upload`
- `DELETE /meetings/{meeting_id}`
- `POST /meetings/{meeting_id}/transcribe`
- `GET /meetings/{meeting_id}/transcript`
- `POST /meetings/{meeting_id}/summarize`
- `GET /meetings/{meeting_id}/summary`

Chi tiết hợp đồng API đang được mô tả thêm trong:

- `contracts/api.md`
- `contracts/Structure.md`

## Trạng thái hiện tại

Dự án hiện đã có nền tảng tốt để demo luồng chính:

- auth,
- upload audio,
- lưu trữ cuộc họp,
- chạy transcript nền,
- lấy summary bằng AI,
- giao diện dashboard và detail page,
- export `.docx`.

Tuy nhiên, khi public lên GitHub nên lưu ý một số điểm:

- Frontend đã có logic gọi `PATCH /meetings/{id}/transcript`, nhưng backend hiện chưa implement endpoint này.
- Endpoint `POST /summarize` hiện đang để `501 Not implemented`; frontend đang dùng luồng `GET /meetings/{id}/summary` thay thế.
- Repo hiện chưa thấy migration hoặc seed database hoàn chỉnh trong cấu trúc hiện tại, nên cần chuẩn bị schema PostgreSQL trước khi chạy end-to-end.
- `requirements.txt` là danh sách phụ thuộc ở mức cơ bản; khi dựng môi trường STT hoặc LLM thật có thể cần bổ sung theo máy và GPU đang dùng.

## Định hướng phát triển

- Hoàn thiện endpoint cập nhật transcript sau chỉnh sửa
- Lưu chỉnh sửa summary xuống database thay vì chỉ giữ ở UI
- Bổ sung speaker diarization
- Thêm queue worker riêng cho tác vụ nặng thay vì dùng background task trực tiếp
- Viết migration và tài liệu setup database rõ ràng hơn
- Bổ sung test integration cho luồng upload -> transcript -> summary
- Hỗ trợ cloud storage thay cho local storage

## Vì sao dự án này hữu ích?

Với các team thường xuyên họp nội bộ, demo với khách hàng hoặc ghi âm phỏng vấn, `Verba` giúp:

- giảm thời gian ghi biên bản thủ công,
- dễ truy xuất quyết định và đầu việc,
- tăng khả năng chia sẻ lại nội dung họp,
- tạo nền tảng để phát triển các tính năng AI cho knowledge management sau này.

## Giấy phép

Dự án đang đi kèm file [LICENSE](./LICENSE).

---

Nếu bạn đang đọc repo này trên GitHub, cách hiểu ngắn gọn nhất là:

**Verba là một ứng dụng AI Meeting Assistant cho phép upload audio cuộc họp, chuyển thành transcript, tóm tắt nội dung quan trọng và xuất biên bản để sử dụng lại.**
