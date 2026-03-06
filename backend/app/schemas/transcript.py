from pydantic import BaseModel
from typing import List


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


# Giữ lại cho background task transcription (dùng nội bộ)
class TranscribeRequest(BaseModel):
    language: str = "vi"
    enable_diarization: bool = False
