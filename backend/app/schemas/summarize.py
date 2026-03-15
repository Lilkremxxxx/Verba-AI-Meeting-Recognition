from pydantic import BaseModel
from typing import List
from app.schemas.transcript import SegmentOut


class SummarizeRequest(BaseModel):
    id: str
    segments: List[SegmentOut]


class SummarizeResponse(BaseModel):
    id: str
    summary: str
