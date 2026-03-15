from fastapi import APIRouter

from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.meetings import router as meetings_router
from app.api.endpoints.summarize import router as summarize_router
from app.api.endpoints.transcripts import router as transcripts_router


api_router = APIRouter()
api_router.include_router(meetings_router, prefix='/meetings', tags=['meetings'])
api_router.include_router(auth_router, prefix='/auth', tags=['auth'])
api_router.include_router(transcripts_router, prefix='/meetings', tags=['transcripts'])
api_router.include_router(summarize_router, prefix='', tags=['summarize'])
