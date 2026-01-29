# Meetings endpoints
import asyncio
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel
from typing import List
import os

router = APIRouter()



@router.post("/meetings/upload")
async def meetings_upload(files: List[UploadFile] = File(...)):
    saved_files =[]
    file_info =[]
    for file in files:
        try:
            filename, filetail = os.path.splitext(file.filename)
            filetail = filetail.lower().lstrip(".")
            print(filename, filetail)
            if filetail not in ["mp3", "wav"]:
                raise HTTPException(status_code=422, detail=f"File {file.filename} Unsupported file format. Use: mp3, wav")
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save {file.filename}: {str(e)}")