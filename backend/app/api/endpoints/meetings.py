# Meetings endpoints
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
from pydantic import BaseModel, ValidationError
from typing import List, Optional
import os
import re
import asyncpg
from dotenv import load_dotenv
from pathlib import Path
import json
import time
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

def resolve_gemini_api_keys() -> List[str]:
    env_names = ["LLM_API_KEY"]
    env_names.extend(
        sorted(
            (name for name in os.environ if re.fullmatch(r"GEMINI_API_KEY\d+", name)),
            key=lambda name: int(re.search(r"\d+", name).group()),
        )
    )
    keys: List[str] = []
    for env_name in env_names:
        value = os.getenv(env_name, "").strip()
        if value and value not in keys:
            keys.append(value)
    return keys


GEMINI_API_KEYS = resolve_gemini_api_keys()
GEMINI_API_KEY = GEMINI_API_KEYS[0] if GEMINI_API_KEYS else ""
GEMINI_MODEL = os.getenv("LLM_MODEL", "gemini-2.5-flash").strip()
GEMINI_BASE_URL = os.getenv("LLM_BASE_URL", "https://generativelanguage.googleapis.com/v1beta").strip().rstrip("/")
GEMINI_SUMMARY_MAX_OUTPUT_TOKENS = int(os.getenv("GEMINI_SUMMARY_MAX_OUTPUT_TOKENS", "4096"))
SUMMARY_CHUNK_CHAR_LIMIT = int(os.getenv("SUMMARY_CHUNK_CHAR_LIMIT", "7000"))
SUMMARY_CHUNK_OVERLAP = int(os.getenv("SUMMARY_CHUNK_OVERLAP", "400"))
GEMINI_KEY_COOLDOWN_SECONDS = int(os.getenv("GEMINI_KEY_COOLDOWN_SECONDS", "30"))
GEMINI_KEY_COOLDOWNS: dict[str, float] = {}
GEMINI_KEY_CURSOR = 0


def iter_gemini_api_keys() -> List[tuple[int, str]]:
    if not GEMINI_API_KEYS:
        return []

    global GEMINI_KEY_CURSOR
    total = len(GEMINI_API_KEYS)
    now = time.time()
    available: List[tuple[int, str]] = []
    cooling_down: List[tuple[int, str]] = []

    for offset in range(total):
        index = (GEMINI_KEY_CURSOR + offset) % total
        api_key = GEMINI_API_KEYS[index]
        cooldown_until = GEMINI_KEY_COOLDOWNS.get(api_key, 0)
        if cooldown_until > now:
            cooling_down.append((index, api_key))
        else:
            available.append((index, api_key))

    return available if available else cooling_down


def mark_gemini_key_rate_limited(api_key: str, key_index: int) -> None:
    GEMINI_KEY_COOLDOWNS[api_key] = time.time() + GEMINI_KEY_COOLDOWN_SECONDS
    logger.warning(
        f"[Gemini] Key #{key_index} hit rate limit, cooldown {GEMINI_KEY_COOLDOWN_SECONDS}s"
    )


def mark_gemini_key_success(api_key: str) -> None:
    global GEMINI_KEY_CURSOR
    try:
        GEMINI_KEY_CURSOR = GEMINI_API_KEYS.index(api_key)
    except ValueError:
        return
    GEMINI_KEY_COOLDOWNS.pop(api_key, None)


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


def extract_json_object(raw_text: str) -> dict:
    if not raw_text or not raw_text.strip():
        raise json.JSONDecodeError("Empty JSON payload", raw_text, 0)

    cleaned = raw_text.strip()
    fenced_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, flags=re.DOTALL)
    if fenced_match:
        cleaned = fenced_match.group(1).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    for start_index, char in enumerate(cleaned):
        if char != "{":
            continue
        try:
            payload, _ = decoder.raw_decode(cleaned[start_index:])
            if isinstance(payload, dict):
                return payload
        except json.JSONDecodeError:
            continue

    raise json.JSONDecodeError("No valid JSON object found", cleaned, 0)


def parse_summary_payload(summary_value: Optional[object]) -> Optional[SummaryData]:
    if not summary_value:
        return None

    try:
        if isinstance(summary_value, dict):
            payload = summary_value
        elif isinstance(summary_value, str):
            payload = extract_json_object(summary_value)
        else:
            return None
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


def normalize_summary_result(result: dict) -> dict:
    if "decisions" not in result or not isinstance(result["decisions"], list):
        result["decisions"] = []
    if "tasks" not in result or not isinstance(result["tasks"], list):
        result["tasks"] = []
    if "deadlines" not in result or not isinstance(result["deadlines"], list):
        result["deadlines"] = []
    return result


def split_transcript_for_summary(transcript: str, chunk_size: int = SUMMARY_CHUNK_CHAR_LIMIT, overlap: int = SUMMARY_CHUNK_OVERLAP) -> List[str]:
    cleaned = transcript.strip()
    if len(cleaned) <= chunk_size:
        return [cleaned]

    chunks: List[str] = []
    start = 0
    length = len(cleaned)

    while start < length:
        end = min(start + chunk_size, length)
        if end < length:
            split_at = cleaned.rfind("\n", start, end)
            if split_at <= start + chunk_size // 2:
                split_at = cleaned.rfind(". ", start, end)
            if split_at > start:
                end = split_at + 1
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= length:
            break
        start = max(end - overlap, start + 1)

    return chunks


def collapse_summary_sentences(summary_texts: List[str], max_sentences: int = 3) -> str:
    combined = " ".join(text.strip() for text in summary_texts if text and text.strip())
    if not combined:
        return ""
    sentences = [segment.strip() for segment in re.split(r"(?<=[.!?])\s+", combined) if segment.strip()]
    if sentences:
        return " ".join(sentences[:max_sentences]).strip()
    return combined[:500].strip()


def merge_summary_chunks(chunk_results: List[dict]) -> dict:
    decisions: List[str] = []
    decision_seen: set[str] = set()
    task_seen: set[str] = set()
    deadline_seen: set[str] = set()
    tasks: List[dict] = []
    deadlines: List[dict] = []

    for result in chunk_results:
        for decision in result.get("decisions", []):
            normalized = str(decision).strip()
            if normalized and normalized not in decision_seen:
                decision_seen.add(normalized)
                decisions.append(normalized)

        for task in result.get("tasks", []):
            if not isinstance(task, dict):
                continue
            normalized_task = {
                "task": str(task.get("task", "")).strip(),
                "owner": (str(task.get("owner")).strip() if task.get("owner") is not None else None),
                "deadline": (str(task.get("deadline")).strip() if task.get("deadline") is not None else None),
            }
            task_key = json.dumps(normalized_task, ensure_ascii=False, sort_keys=True)
            if normalized_task["task"] and task_key not in task_seen:
                task_seen.add(task_key)
                tasks.append(normalized_task)

        for deadline in result.get("deadlines", []):
            if not isinstance(deadline, dict):
                continue
            normalized_deadline = {
                "date": str(deadline.get("date", "")).strip(),
                "item": str(deadline.get("item", "")).strip(),
            }
            deadline_key = json.dumps(normalized_deadline, ensure_ascii=False, sort_keys=True)
            if normalized_deadline["date"] and normalized_deadline["item"] and deadline_key not in deadline_seen:
                deadline_seen.add(deadline_key)
                deadlines.append(normalized_deadline)

    return {
        "summary": collapse_summary_sentences([result.get("summary", "") for result in chunk_results]),
        "decisions": decisions,
        "tasks": tasks,
        "deadlines": deadlines,
    }


async def call_gemini_summarize(transcript: str) -> dict:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="LLM_API_KEY not configured")

    prompt = f"""Ban la he thong trich xuat bien ban cuoc hop tu MOT DOAN transcript.

Yeu cau:
- Chi dua thong tin xuat hien trong doan transcript nay.
- Tra ve JSON hop le, khong markdown, khong giai thich.
- Tom tat ngan gon trong 1-2 cau.
- Chi giu cac muc quan trong nhat cua doan nay de tranh output qua dai.
- Neu khong co thong tin cho mot muc thi tra mang rong.
- Giu nguyen ngon ngu cua transcript, uu tien tieng Viet.

Schema JSON:
{{
  "summary": "Tom tat ngan gon cua doan transcript nay",
  "decisions": ["Toi da 5 quyet dinh quan trong nhat"],
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

Rang buoc output cho moi lan tra loi:
- decisions: toi da 5 item
- tasks: toi da 8 item
- deadlines: toi da 8 item
- Moi item phai ngan gon, khong lap lai.

Transcript doan nay:
{transcript}"""

    max_output_attempts = []
    for candidate in (GEMINI_SUMMARY_MAX_OUTPUT_TOKENS, max(GEMINI_SUMMARY_MAX_OUTPUT_TOKENS * 2, 8192)):
        if candidate not in max_output_attempts:
            max_output_attempts.append(candidate)

    try:
        native_base_url = GEMINI_BASE_URL.removesuffix("/openai")
        headers = {"Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=90.0) as client:
            last_parse_error = None
            last_api_error_detail = None

            for max_output_tokens in max_output_attempts:
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.1,
                        "maxOutputTokens": max_output_tokens,
                        "responseMimeType": "application/json",
                    },
                }

                for key_position, api_key in iter_gemini_api_keys():
                    key_index = key_position + 1
                    url = f"{native_base_url}/models/{GEMINI_MODEL}:generateContent?key={api_key}"
                    response = await client.post(url, headers=headers, json=payload)

                    if response.status_code == 429:
                        last_api_error_detail = f"Gemini API key #{key_index} hit rate limit"
                        mark_gemini_key_rate_limited(api_key, key_index)
                        continue

                    if response.status_code != 200:
                        logger.error(f"[Gemini] HTTP {response.status_code} on key #{key_index}: {response.text[:500]}")
                        raise HTTPException(
                            status_code=502,
                            detail=f"Gemini API error: HTTP {response.status_code}",
                        )

                    data = response.json()
                    if "error" in data:
                        error_status = str(data["error"].get("status", ""))
                        error_msg = data["error"].get("message", str(data["error"]))
                        if error_status == "RESOURCE_EXHAUSTED":
                            last_api_error_detail = error_msg
                            mark_gemini_key_rate_limited(api_key, key_index)
                            continue
                        raise HTTPException(status_code=502, detail=f"Gemini API error: {error_msg}")

                    candidates = data.get("candidates") or []
                    if not candidates:
                        raise HTTPException(status_code=502, detail="No response from Gemini")

                    candidate = candidates[0]
                    finish_reason = candidate.get("finishReason")
                    content = (
                        candidate
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "")
                        .strip()
                    )
                    if not content:
                        raise HTTPException(status_code=502, detail="Empty response from Gemini")

                    try:
                        result = extract_json_object(content)
                    except json.JSONDecodeError as exc:
                        last_parse_error = exc
                        logger.warning(
                            f"[Gemini] JSON parse failed with maxOutputTokens={max_output_tokens}, finishReason={finish_reason}, key=#{key_index}: {exc}"
                        )
                        logger.warning(f"[Gemini] Content preview: {content[:500]}")
                        looks_truncated = finish_reason == "MAX_TOKENS" or (
                            content.startswith("{") and not content.rstrip().endswith("}")
                        )
                        if looks_truncated and max_output_tokens != max_output_attempts[-1]:
                            break
                        raise HTTPException(status_code=502, detail="Failed to parse LLM response as JSON")

                    if "summary" not in result:
                        raise HTTPException(status_code=502, detail="Invalid response schema from Gemini")

                    mark_gemini_key_success(api_key)
                    return normalize_summary_result(result)
                else:
                    if last_api_error_detail and all(True for _ in GEMINI_API_KEYS):
                        continue
                    continue

                continue

            if last_parse_error is not None:
                raise HTTPException(status_code=502, detail="Failed to parse LLM response as JSON")
            if last_api_error_detail is not None:
                raise HTTPException(status_code=502, detail=f"Gemini API error: {last_api_error_detail}")
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

    logger.info(f"[Summarize] Meeting {meeting_id}: {len(transcript_text)} chars")

    transcript_chunks = split_transcript_for_summary(transcript_text)
    if len(transcript_chunks) == 1:
        llm_result = await call_gemini_summarize(transcript_chunks[0])
    else:
        logger.info(f"[Summarize] Using chunked summarize for meeting {meeting_id}: {len(transcript_chunks)} chunks")
        chunk_results: List[dict] = []
        for index, chunk in enumerate(transcript_chunks, start=1):
            logger.info(f"[Summarize] Chunk {index}/{len(transcript_chunks)}: {len(chunk)} chars")
            chunk_results.append(await call_gemini_summarize(chunk))
        llm_result = merge_summary_chunks(chunk_results)

    try:
        summary_data = SummaryData(**llm_result)
    except ValidationError as exc:
        logger.error(f"[Summarize] Validation error: {exc}")
        raise HTTPException(status_code=502, detail="Invalid response format from LLM")

    summary_payload = json.dumps(summary_data.model_dump(), ensure_ascii=False)
    try:
        await db.execute(
            """
            UPDATE meetings
            SET summary = $1::jsonb, updated_at = NOW()
            WHERE id = $2
            """,
            summary_payload,
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




