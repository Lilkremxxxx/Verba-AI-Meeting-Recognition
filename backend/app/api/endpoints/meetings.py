# Meetings endpoints
import asyncio
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
from pydantic import BaseModel, Field, ValidationError
from typing import List, Optional
import os
import asyncpg
from dotenv import load_dotenv
from pathlib import Path
import shutil
import json
import logging
from datetime import datetime, timedelta
from app.db.session import get_db
from app.api.endpoints.auth import get_current_user
from app.schemas.user import UserOut
from app.services.storage.local import LocalStorageService

# Setup logger
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH, override=True)

# Database config
PG_HOST = os.getenv("PG_HOST")
PG_PORT = os.getenv("PG_PORT")
PG_DBNAME = os.getenv("PG_DBNAME")
PG_USER = os.getenv("PG_USER")
PG_PASSWORD = os.getenv("PG_PASSWORD")

router = APIRouter()

# ============ Pydantic Models ============

class SummarizeByIdRequest(BaseModel):
    language: str = "vi"


class SummarizeResponse(BaseModel):
    summary: str


# ============ Helper Functions ============

async def get_meeting(db: asyncpg.Connection, meeting_id: str) -> Optional[dict]:
    """Query meeting từ DB - meeting_id là UUID string"""
    row = await db.fetchrow(
        """
        SELECT id, title, transcript, transcript_json, created_at, updated_at
        FROM meetings 
        WHERE id = $1
        """,
        meeting_id
    )
    if not row:
        return None
    return dict(row)


def render_transcript_with_timestamps(transcript_json_str: str) -> str:
    """
    Render transcript từ JSON segments thành text có timestamp
    Format: [mm:ss.xx - mm:ss.xx] Speaker: text
    """
    try:
        data = json.loads(transcript_json_str)
        if "segments" not in data:
            return ""
        
        segments = data["segments"]
        lines = []
        
        for seg in segments:
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            text = seg.get("text", "").strip()
            speaker = seg.get("speaker", "Speaker")
            
            # Convert seconds to mm:ss.xx format
            start_min = int(start // 60)
            start_sec = start % 60
            end_min = int(end // 60)
            end_sec = end % 60
            
            # Format: mm:ss.xx (no space, 2 decimal places)
            timestamp = f"[{start_min:02d}:{start_sec:05.2f}-{end_min:02d}:{end_sec:05.2f}]"
            lines.append(f"{timestamp} {speaker}: {text}")
        
        return "\n".join(lines)
    except Exception as e:
        logger.warning(f"Error rendering transcript: {e}")
        return ""


def summarize_text(text: str, language: str = "vi") -> str:
    """
    Summarize text using local NLP model
    
    TODO: Implement với model NLP local (sẽ build sau)
    Hiện tại trả về mock summary để code compile và chạy được
    
    Args:
        text: Transcript text cần summarize
        language: Ngôn ngữ (vi, en, etc.)
    
    Returns:
        str: Summary text
    """
    # Mock implementation - thay thế bằng model NLP thực tế
    logger.info(f"[NLP] Summarizing {len(text)} chars in language: {language}")
    
    # Extract basic info từ transcript
    lines = text.split('\n')
    num_lines = len(lines)
    
    return f"Cuộc họp bàn về các vấn đề quan trọng. Transcript có {num_lines} dòng nội dung. [TODO: Implement NLP model]"

@router.get("/")
async def get_all_meetings(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user)
):
    """Get all meetings for current user"""
    try:
        # Chỉ lấy meetings của user hiện tại
        rows = await db.fetch(
            'SELECT * FROM meetings WHERE user_id = $1 ORDER BY created_at DESC',
            current_user.id
        )
        meetings = []
        for row in rows:
            try:
                meetings.append({
                    "id": str(row['id']),
                    "title": row['title'],
                    "original_filename": row['original_filename'],
                    "status": row['status'],
                    "created_at": row['created_at'].isoformat(),
                })
            except Exception as row_error:
                print(f"Error processing row: {row_error}")
                print(f"Row data: {dict(row)}")
                continue
        
        print(f"Successfully processed {len(meetings)} meetings for user {current_user.email}")
        return meetings
        
    except asyncpg.PostgresError as db_error:
        print(f"Database error: {db_error}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch meetings: {str(e)}")


@router.get("/{meeting_id}")
async def get_all_meetings(meeting_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user)
):
    """Get all meetings for current user"""
    try: 
        row = await db.fetchrow(
            'select * from meetings where id =$1', meeting_id
        )
        if not row:
            raise HTTPException(status_code = 404, detail ="Meeting not found")
        if str(row["user_id"]) != str(current_user.id):
            raise HTTPException(status_code = 404, detail ="Not owner of meeting not found")
        storage = LocalStorageService()
        audio_url = storage.get_url(row["storage_path"])
        return {
            "id": str(row["id"]),
            "title": row["title"],
            "status": row["status"],
            "original_filename": row["original_filename"],
            "created_at": row["created_at"].isoformat(),
            "audioUrl": audio_url
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code = 500, detail = "Internal server error")
 

@router.post("/upload")
async def upload_single_meeting(
    title: str = Form(...),
    audio: UploadFile = File(...),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user)
):
    """Upload single audio file with title"""
    try:
        print(f"[Single Upload] User: {current_user.email}, Title: {title}, File: {audio.filename}")

        # Validate file
        filename, filetail = os.path.splitext(audio.filename)
        filetail = filetail.lower().lstrip(".")
        if filetail not in ["mp3", "wav"]:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported format: {filetail}. Use mp3 or wav"
            )

        # Tạo meeting_id (UUID4)
        import uuid
        meeting_id = str(uuid.uuid4())
        user_id = str(current_user.id)
        storage = LocalStorageService()
        storage_path = f"{user_id}/{meeting_id}/{audio.filename}"
        # Lưu file vào đúng thư mục
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
            "QUEUED"
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
                "status": "QUEUED"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user)
):
    """Delete a meeting and its associated files"""
    try:
        # Kiểm tra meeting có tồn tại và thuộc về user hiện tại
        row = await db.fetchrow(
            'SELECT * FROM meetings WHERE id = $1',
            meeting_id
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="Meeting not found")
            
        if str(row["user_id"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to delete this meeting")
        
        # Xóa file vật lý
        storage = LocalStorageService()
        storage_path = row["storage_path"]
        
        try:
            storage.delete(storage_path)
            print(f"Deleted file: {storage_path}")
        except Exception as e:
            print(f"Warning: Could not delete file {storage_path}: {e}")
            # Tiếp tục xóa record trong database dù file không xóa được
        
        # Xóa record trong database
        await db.execute(
            'DELETE FROM meetings WHERE id = $1',
            meeting_id
        )
        
        print(f"Deleted meeting {meeting_id} for user {current_user.email}")
        
        return {
            "success": True,
            "message": "Meeting deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete meeting: {str(e)}")


# @router.post("/uploads")
# async def meetings_upload(
#     files: List[UploadFile] = File(...),
#     db: asyncpg.Connection = Depends(get_db),
#     current_user: UserOut = Depends(get_current_user)
# ):
#     """Upload multiple audio files"""
#     saved_files = []
#     file_info = []
    
#     for file in files:
#         try:
#             filename, filetail = os.path.splitext(file.filename)
#             filetail = filetail.lower().lstrip(".")
#             print(f"Processing: {filename}.{filetail} for user {current_user.email}")
            
#             if filetail not in ["mp3", "wav"]:
#                 raise HTTPException(
#                     status_code=422, 
#                     detail=f"File {file.filename} Unsupported file format. Use: mp3, wav"
#                 )
            
#             # Lưu file vào thư mục uploads
#             UPLOAD_DIR = BASE_DIR / "uploads"
#             UPLOAD_DIR.mkdir(exist_ok=True)
        
#             file_path = UPLOAD_DIR / file.filename
#             with open(file_path, "wb") as buffer:
#                 shutil.copyfileobj(file.file, buffer)
            
#             # Insert vào database với user_id
#             await db.execute(
#                 'INSERT INTO "meetings" ("user_id", "title", "original_filename", "storage_provider", "storage_path") VALUES ($1, $2, $3, $4, $5)',
#                 current_user.id,
#                 filename,  # Dùng filename làm title
#                 file.filename,
#                 "LOCAL",
#                 str(file_path)
#             )
            
#             saved_files.append(str(file_path))
#             file_info.append({
#                 "id": filename,
#                 "filename": file.filename,
#                 "path": str(file_path),
#                 "size": file_path.stat().st_size,
#                 "status": "uploaded"
#             })
            
#         except HTTPException:
#             raise
#         except Exception as e:
#             raise HTTPException(
#                 status_code=500, 
#                 detail=f"Failed to save {file.filename}: {str(e)}"
#             )
    
#     return {
#         "message": "Files uploaded successfully",
#         "files": file_info
#     }



# ============ Summarize Endpoint ============

@router.post("/{meeting_id}/summarize", response_model=SummarizeResponse)
async def summarize_meeting(
    meeting_id: str,
    request: SummarizeByIdRequest = SummarizeByIdRequest(),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user)
):
    """
    Summarize meeting by ID using local NLP model
    
    - Query meeting từ DB
    - Lấy transcript text (ưu tiên transcript, fallback transcript_json)
    - Gọi NLP model để summarize
    - Lưu summary vào DB
    - Trả về summary text
    """
    try:
        # 1. Get meeting from DB
        meeting = await get_meeting(db, meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # 2. Extract transcript text - ƯU TIÊN transcript text
        transcript_text = ""
        
        # Ưu tiên transcript text thuần
        if meeting.get("transcript"):
            transcript_text = meeting["transcript"]
        # Fallback sang transcript_json nếu có segments
        elif meeting.get("transcript_json"):
            transcript_text = render_transcript_with_timestamps(meeting["transcript_json"])
        
        # Validate transcript
        if not transcript_text or not transcript_text.strip():
            raise HTTPException(status_code=400, detail="Transcript is empty")
        
        # Check transcript length limit (100k chars)
        if len(transcript_text) > 100_000:
            raise HTTPException(
                status_code=413, 
                detail=f"Transcript too large: {len(transcript_text)} chars (max 100k)"
            )
        
        # Log length only, not full transcript
        logger.info(f"[Summarize] Meeting {meeting_id}: {len(transcript_text)} chars")
        
        # 3. Call local NLP model to summarize
        summary_text = summarize_text(transcript_text, request.language)
        
        # 4. Create response
        response = SummarizeResponse(summary=summary_text)
        
        # 5. Lưu summary vào cột summary của bảng meetings
        try:
            await db.execute(
                """
                UPDATE meetings 
                SET summary = $1, updated_at = NOW()
                WHERE id = $2
                """,
                summary_text,
                meeting_id
            )
            logger.info(f"[Summarize] Saved summary to DB for meeting {meeting_id}")
        except Exception as db_err:
            logger.warning(f"[Summarize] Failed to save summary to DB: {db_err}")
            # Không raise error, vẫn trả response về cho user
        
        logger.info(f"[Summarize] Success for meeting {meeting_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Summarize] Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Summarize failed: {str(e)}")
