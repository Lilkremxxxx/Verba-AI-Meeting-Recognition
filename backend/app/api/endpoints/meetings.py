# Meetings endpoints
import asyncio
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel
from typing import List
import os
import asyncpg
from dotenv import load_dotenv
from pathlib import Path
import shutil

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
ENV_PATH = BASE_DIR / ".env"

print(f"Loading .env from: {ENV_PATH}")

load_dotenv(dotenv_path=ENV_PATH)
PG_HOST = os.getenv("PG_HOST")
PG_PORT = os.getenv("PG_PORT")
PG_DBNAME = os.getenv("PG_DBNAME")
PG_USER = os.getenv("PG_USER")
PG_PASSWORD = os.getenv("PG_PASSWORD")

# In ra để kiểm tra
print(f"Database config: {PG_HOST}:{PG_PORT}/{PG_DBNAME} user={PG_USER}")


router = APIRouter()

@router.get("/")
async def get_all_meetings():
    try:
        print("Attempting to connect to database...")
        
        conn = await asyncpg.connect(
                host=PG_HOST, 
                port=int(PG_PORT), 
                database=PG_DBNAME,
                user=PG_USER, 
                password=PG_PASSWORD,
                timeout=10
            )
        
        print("Connected to database successfully!")
        
        rows = await conn.fetch('SELECT * FROM meetings;')
        await conn.close()
        
        print(f"Fetched {len(rows)} rows from database")
        
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
        
        print(f"Successfully processed {len(meetings)} meetings")
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
    audio: UploadFile = File(...)
):
    """Upload single audio file with title"""
    try:
        print(f"[Single Upload] Title: {title}, File: {audio.filename}")
        
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

        conn = await asyncpg.connect(
            host=PG_HOST, 
            port=int(PG_PORT),
            database=PG_DBNAME,
            user=PG_USER, 
            password=PG_PASSWORD
        )
        await conn.execute(
            'INSERT INTO "meetings" ("user_id", "title", "original_filename", "storage_provider", "storage_path") VALUES ($1, $2, $3, $4, $5 )',
            "7b15afa6-f4e1-4005-a536-91ccd0f37e4b",title, audio.filename,"LOCAL", str(file_path)
        )
        print("Finish insert into dtb")
        
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



@router.post("/uploads")
async def meetings_upload(files: List[UploadFile] = File(...)):
    """Upload audio files"""
    saved_files = []
    file_info = []
    
    for file in files:
        try:
            filename, filetail = os.path.splitext(file.filename)
            filetail = filetail.lower().lstrip(".")
            print(f"Processing: {filename}.{filetail}")
            
            if filetail not in ["mp3", "wav"]:
                raise HTTPException(
                    status_code=422, 
                    detail=f"File {file.filename} Unsupported file format. Use: mp3, wav"
                )
            
            # Lưu file vào thư mục uploads
            UPLOAD_DIR = BASE_DIR / "uploads"
            UPLOAD_DIR.mkdir(exist_ok=True)
        
            file_path = UPLOAD_DIR / file.filename
            with open(file_path, "wb") as buffer:
                import shutil
                shutil.copyfileobj(file.file, buffer)
            
            saved_files.append(str(file_path))
            file_info.append({
                "id": filename,
                "filename": file.filename,
                "path": str(file_path),
                "size": file_path.stat().st_size,
                "status": "uploaded"
            })
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to save {file.filename}: {str(e)}"
            )
    
    return {
        "message": "Files uploaded successfully",
        "files": file_info
    }