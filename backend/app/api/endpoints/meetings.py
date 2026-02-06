# Meetings endpoints
import asyncio
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
from pydantic import BaseModel
from typing import List
import os
import asyncpg
from dotenv import load_dotenv
from pathlib import Path
import shutil
from db.session import get_db
from api.endpoints.auth import get_current_user
from schemas.user import UserOut

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
ENV_PATH = BASE_DIR / ".env"


load_dotenv(dotenv_path=ENV_PATH)
PG_HOST = os.getenv("PG_HOST")
PG_PORT = os.getenv("PG_PORT")
PG_DBNAME = os.getenv("PG_DBNAME")
PG_USER = os.getenv("PG_USER")
PG_PASSWORD = os.getenv("PG_PASSWORD")

router = APIRouter()

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
        
        # Save file
        UPLOAD_DIR = BASE_DIR / "uploads"
        UPLOAD_DIR.mkdir(exist_ok=True)
        
        file_path = UPLOAD_DIR / audio.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
        
        print(f"File saved: {file_path}")

        await db.execute(
            'INSERT INTO "meetings" ("user_id", "title", "original_filename", "storage_provider", "storage_path") VALUES ($1, $2, $3, $4, $5)',
            current_user.id, 
            title, 
            audio.filename,
            "LOCAL", 
            str(file_path)
        )
        print(f"Finish insert into dtb for user: {current_user.id}")
        
        return {
            "success": True,
            "data": {
                "id": filename,
                "title": title,
                "filename": audio.filename,
                "path": str(file_path),
                "size": file_path.stat().st_size,
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

##hell##






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

