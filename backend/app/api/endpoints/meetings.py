# Meetings endpoints
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
from pydantic import BaseModel, ValidationError
from typing import List, Optional
import os
import asyncpg
from dotenv import load_dotenv
from pathlib import Path
import json
import httpx
import logging
from app.db.session import get_db
from app.api.endpoints.auth import get_current_user
from app.schemas.user import UserOut
from app.services.storage.local import LocalStorageService


logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH, override=True)

PG_HOST = os.getenv("PG_HOST")
PG_PORT = os.getenv("PG_PORT")
PG_DBNAME = os.getenv("PG_DBNAME")
PG_USER = os.getenv("PG_USER")
PG_PASSWORD = os.getenv("PG_PASSWORD")

GEMINI_API_KEY = os.getenv("LLM_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("LLM_MODEL", "gemini-2.5-flash").strip()
GEMINI_BASE_URL = os.getenv("LLM_BASE_URL", "https://generativelanguage.googleapis.com/v1beta").strip().rstrip("/")

router = APIRouter()


class SummarizeByIdRequest(BaseModel):
    language: str = "vi"


class TaskItem(BaseModel):
    task: str
    owner: Optional[str] = None
    deadline: Optional[str] = None


class DeadlineItem(BaseModel):
    date: str
    item: str


class SummaryData(BaseModel):
    summary: str
    decisions: List[str]
    tasks: List[TaskItem]
    deadlines: List[DeadlineItem]


class SummarizeResponse(BaseModel):
    summary: str
    decisions: List[str]
    tasks: List[TaskItem]
    deadlines: List[DeadlineItem]


async def get_user_meeting(db: asyncpg.Connection, meeting_id: str, user_id: str) -> Optional[dict]:
    row = await db.fetchrow(
        """
        SELECT id, user_id, title, original_filename, storage_path, status,
               transcript, transcript_json, summary, created_at, updated_at
        FROM meetings
        WHERE id = $1 AND user_id = $2
        """,
        meeting_id,
        user_id,
    )
    if not row:
        return None
    return dict(row)


def render_transcript_with_timestamps(transcript_json_str: str) -> str:
    try:
        data = json.loads(transcript_json_str)
        if "segments" not in data:
            return ""

        lines = []
        for seg in data["segments"]:
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            text = seg.get("text", "").strip()
            speaker = seg.get("speaker", "Speaker")

            start_min = int(start // 60)
            start_sec = start % 60
            end_min = int(end // 60)
            end_sec = end % 60

            timestamp = f"[{start_min:02d}:{start_sec:05.2f}-{end_min:02d}:{end_sec:05.2f}]"
            lines.append(f"{timestamp} {speaker}: {text}")

        return "\n".join(lines)
    except Exception as exc:
        logger.warning(f"Error rendering transcript: {exc}")
        return ""


def parse_summary_payload(summary_value: Optional[str]) -> Optional[SummaryData]:
    if not summary_value:
        return None

    try:
        payload = json.loads(summary_value)
        return SummaryData(**payload)
    except (json.JSONDecodeError, ValidationError, TypeError) as exc:
        logger.warning(f"[Summary] Invalid cached summary format: {exc}")
        return None


def build_summary_response(summary_data: SummaryData) -> SummarizeResponse:
    return SummarizeResponse(
        summary=summary_data.summary,
        decisions=summary_data.decisions,
        tasks=summary_data.tasks,
        deadlines=summary_data.deadlines,
    )


def extract_transcript_text(meeting: dict) -> str:
    transcript = meeting.get("transcript")
    if transcript and str(transcript).strip():
        return transcript

    transcript_json = meeting.get("transcript_json")
    if transcript_json:
        return render_transcript_with_timestamps(transcript_json)

    return ""


async def call_gemini_summarize(transcript: str) -> dict:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="LLM_API_KEY not configured")

    prompt = f"""Ban la he thong phan tich bien ban cuoc hop.

Nhiem vu cua ban la trich xuat thong tin co cau truc tu transcript cuoc hop.

Quan trong:
- Khong viet tom tat chung chung.
- Phai uu tien trich xuat cac quyet dinh, cong viec can lam, nguoi phu trach va deadline neu chung xuat hien trong transcript.
- Neu thong tin co trong transcript thi bat buoc phai dua vao JSON.
- Khong duoc tu suy dien thong tin khong co trong transcript.
- Neu khong co thong tin cho mot muc, tra ve mang rong hoac null phu hop.

Chi tra ve JSON hop le.
Khong dung markdown.
Khong them giai thich.
Khong boc trong ```json.

Schema JSON:
{{
  "summary": "Tom tat noi dung cuoc hop trong 2-3 cau",
  "decisions": ["Cac quyet dinh da duoc thong nhat"],
  "tasks": [
    {{
      "task": "cong viec can lam",
      "owner": "nguoi chiu trach nhiem neu co, neu khong co thi null",
      "deadline": "thoi han neu co, neu khong co thi null"
    }}
  ],
  "deadlines": [
    {{
      "date": "moc thoi gian",
      "item": "su kien hoac cong viec lien quan"
    }}
  ]
}}

Quy tac extraction:
- Neu transcript co cau mo ta hanh dong can thuc hien, dau viec tiep theo, viec duoc giao, viec can follow-up thi dua vao tasks.
- Neu transcript co cau the hien su thong nhat, chot phuong an, quyet dinh cuoi cung thi dua vao decisions.
- Neu co moc thoi gian, ngay thang, han chot, thoi diem hop lai, thoi gian ban giao thi dua vao deadlines.
- Neu mot task co deadline thi nen xuat hien ca trong tasks.deadline va deadlines.
- Khong bo sot thong tin quan trong.
- Giu nguyen ngon ngu theo transcript, uu tien tieng Viet neu transcript la tieng Viet.

Transcript:
{transcript}"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2000,
            "responseMimeType": "application/json",
        },
    }

    try:
        native_base_url = GEMINI_BASE_URL.removesuffix("/openai")
        url = f"{native_base_url}/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)

        if response.status_code != 200:
            logger.error(f"[Gemini] HTTP {response.status_code}: {response.text[:500]}")
            raise HTTPException(
                status_code=502,
                detail=f"Gemini API error: HTTP {response.status_code}",
            )

        data = response.json()
        if "error" in data:
            error_msg = data["error"].get("message", str(data["error"]))
            raise HTTPException(status_code=502, detail=f"Gemini API error: {error_msg}")

        candidates = data.get("candidates") or []
        if not candidates:
            raise HTTPException(status_code=502, detail="No response from Gemini")

        content = (
            candidates[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )
        if not content:
            raise HTTPException(status_code=502, detail="Empty response from Gemini")

        try:
            result = json.loads(content)
        except json.JSONDecodeError as exc:
            logger.error(f"[Gemini] JSON parse error: {exc}")
            logger.error(f"[Gemini] Content: {content[:500]}")
            raise HTTPException(status_code=502, detail="Failed to parse LLM response as JSON")

        if "summary" not in result:
            raise HTTPException(status_code=502, detail="Invalid response schema from Gemini")

        if "decisions" not in result or not isinstance(result["decisions"], list):
            result["decisions"] = []
        if "tasks" not in result or not isinstance(result["tasks"], list):
            result["tasks"] = []
        if "deadlines" not in result or not isinstance(result["deadlines"], list):
            result["deadlines"] = []

        return result
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Gemini request timeout")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[Gemini] Unexpected error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to call Gemini: {str(exc)}")


async def generate_and_store_summary(
    db: asyncpg.Connection,
    meeting_id: str,
    transcript_text: str,
) -> SummaryData:
    if not transcript_text or not transcript_text.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty")

    if len(transcript_text) > 100_000:
        raise HTTPException(
            status_code=413,
            detail=f"Transcript too large: {len(transcript_text)} chars (max 100k)",
        )

    logger.info(f"[Summarize] Meeting {meeting_id}: {len(transcript_text)} chars")
    llm_result = await call_gemini_summarize(transcript_text)

    try:
        summary_data = SummaryData(**llm_result)
    except ValidationError as exc:
        logger.error(f"[Summarize] Validation error: {exc}")
        raise HTTPException(status_code=502, detail="Invalid response format from LLM")

    summary_json_str = json.dumps(summary_data.model_dump(), ensure_ascii=False)
    try:
        await db.execute(
            """
            UPDATE meetings
            SET summary = $1, updated_at = NOW()
            WHERE id = $2
            """,
            summary_json_str,
            meeting_id,
        )
    except Exception as exc:
        logger.error(f"[Summarize] Failed to save summary to DB: {exc}")
        raise HTTPException(status_code=500, detail="Failed to save summary to database")

    return summary_data


@router.get("/")
async def get_all_meetings(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        rows = await db.fetch(
            "SELECT * FROM meetings WHERE user_id = $1 ORDER BY created_at DESC",
            current_user.id,
        )
        meetings = []
        for row in rows:
            try:
                meetings.append(
                    {
                        "id": str(row["id"]),
                        "title": row["title"],
                        "original_filename": row["original_filename"],
                        "status": row["status"],
                        "created_at": row["created_at"].isoformat(),
                    }
                )
            except Exception as row_error:
                print(f"Error processing row: {row_error}")
                print(f"Row data: {dict(row)}")
                continue

        print(f"Successfully processed {len(meetings)} meetings for user {current_user.email}")
        return meetings
    except asyncpg.PostgresError as db_error:
        print(f"Database error: {db_error}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
    except Exception as exc:
        print(f"Unexpected error: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch meetings: {str(exc)}")


@router.get("/{meeting_id}")
async def get_meeting_detail(
    meeting_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        row = await db.fetchrow("select * from meetings where id = $1", meeting_id)
        if not row:
            raise HTTPException(status_code=404, detail="Meeting not found")
        if str(row["user_id"]) != str(current_user.id):
            raise HTTPException(status_code=404, detail="Not owner of meeting not found")

        storage = LocalStorageService()
        audio_url = storage.get_url(row["storage_path"])
        return {
            "id": str(row["id"]),
            "title": row["title"],
            "status": row["status"],
            "original_filename": row["original_filename"],
            "created_at": row["created_at"].isoformat(),
            "audioUrl": audio_url,
        }
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Error: {exc}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/upload")
async def upload_single_meeting(
    title: str = Form(...),
    audio: UploadFile = File(...),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        print(f"[Single Upload] User: {current_user.email}, Title: {title}, File: {audio.filename}")

        filename, filetail = os.path.splitext(audio.filename)
        filetail = filetail.lower().lstrip(".")
        if filetail not in ["mp3", "wav"]:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported format: {filetail}. Use mp3 or wav",
            )

        import uuid

        meeting_id = str(uuid.uuid4())
        user_id = str(current_user.id)
        storage = LocalStorageService()
        storage_path = f"{user_id}/{meeting_id}/{audio.filename}"
        saved_path = storage.save_file(audio.file, storage_path)

        print(f"File saved: {saved_path}")

        await db.execute(
            'INSERT INTO "meetings" ("id", "user_id", "title", "original_filename", "storage_provider", "storage_path", "status") VALUES ($1, $2, $3, $4, $5, $6, $7)',
            meeting_id,
            current_user.id,
            title,
            audio.filename,
            "LOCAL",
            storage_path,
            "QUEUED",
        )
        print(f"Finish insert into dtb for user: {current_user.id}")

        file_stat = os.stat(saved_path)
        return {
            "success": True,
            "data": {
                "id": meeting_id,
                "title": title,
                "filename": audio.filename,
                "path": saved_path,
                "size": file_stat.st_size,
                "status": "QUEUED",
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Upload error: {exc}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(exc)}")


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        row = await db.fetchrow("SELECT * FROM meetings WHERE id = $1", meeting_id)
        if not row:
            raise HTTPException(status_code=404, detail="Meeting not found")
        if str(row["user_id"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to delete this meeting")

        storage = LocalStorageService()
        storage_path = row["storage_path"]
        try:
            storage.delete(storage_path)
            print(f"Deleted file: {storage_path}")
        except Exception as exc:
            print(f"Warning: Could not delete file {storage_path}: {exc}")

        await db.execute("DELETE FROM meetings WHERE id = $1", meeting_id)

        print(f"Deleted meeting {meeting_id} for user {current_user.email}")
        return {"success": True, "message": "Meeting deleted successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Delete error: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to delete meeting: {str(exc)}")


@router.post("/{meeting_id}/summarize", response_model=SummarizeResponse)
async def summarize_meeting(
    meeting_id: str,
    request: SummarizeByIdRequest = SummarizeByIdRequest(),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        meeting = await get_user_meeting(db, meeting_id, str(current_user.id))
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        cached_summary = parse_summary_payload(meeting.get("summary"))
        if cached_summary:
            return build_summary_response(cached_summary)

        transcript_text = extract_transcript_text(meeting)
        summary_data = await generate_and_store_summary(db, meeting_id, transcript_text)
        logger.info(f"[Summarize] Success for meeting {meeting_id}, language={request.language}")
        return build_summary_response(summary_data)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[Summarize] Unexpected error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Summarize failed: {str(exc)}")


@router.get("/{meeting_id}/summary", response_model=SummarizeResponse)
async def get_meeting_summary(
    meeting_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        meeting = await get_user_meeting(db, meeting_id, str(current_user.id))
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        cached_summary = parse_summary_payload(meeting.get("summary"))
        if cached_summary:
            return build_summary_response(cached_summary)

        transcript_text = extract_transcript_text(meeting)
        summary_data = await generate_and_store_summary(db, meeting_id, transcript_text)
        logger.info(f"[GetSummary] Generated summary for meeting {meeting_id}")
        return build_summary_response(summary_data)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[GetSummary] Unexpected error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(exc)}")




