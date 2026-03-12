from fastapi import APIRouter, HTTPException, Depends
from app.schemas.summarize import SummarizeRequest, SummarizeResponse
from app.api.endpoints.auth import get_current_user


router = APIRouter()


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(
    request: SummarizeRequest,
    current_user=Depends(get_current_user)
):
    """
    POST /summarize
    Nhận segments, trả về summary text.

    TODO: Implement ở đây
    - Ghép segments thành transcript text
    - Gọi LLM / logic tóm tắt
    - Trả về SummarizeResponse(id=request.id, summary=...)
    """
    raise HTTPException(status_code=501, detail="Not implemented")
