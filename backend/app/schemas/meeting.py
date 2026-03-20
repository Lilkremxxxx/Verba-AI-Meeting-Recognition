from pydantic import BaseModel
from typing import List, Optional


class SummarizeByIdRequest(BaseModel):
    language: str = 'vi'


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


class SummaryUpdateRequest(BaseModel):
    summary: str
    decisions: List[str]
    tasks: List[TaskItem]
    deadlines: List[DeadlineItem]


class SummarizeByIdResponse(BaseModel):
    summary: str
    decisions: List[str]
    tasks: List[TaskItem]
    deadlines: List[DeadlineItem]
