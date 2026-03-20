from pydantic import BaseModel
from typing import List
import os

os.environ["TRANSFORMERS_VERIFY_TORCH_LOAD_IS_SAFE"] = "false"


class SegmentOut(BaseModel):
    start: float
    end: float
    speaker: str | None
    text: str


class TranscriptOut(BaseModel):
    meeting_id: str
    status: str
    segments: List[SegmentOut]


class TranscriptUpdateRequest(BaseModel):
    segments: List[SegmentOut]


class TranscriptEditItem(BaseModel):
    index: int
    text: str


class TranscriptPatchRequest(BaseModel):
    edits: List[TranscriptEditItem]


# Giữ lại cho background task transcription (dùng nội bộ)
class TranscribeRequest(BaseModel):
    language: str = "vi"
    enable_diarization: bool = False
