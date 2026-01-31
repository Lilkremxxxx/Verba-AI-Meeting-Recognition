from fastapi import FastAPI
from app.api.endpoints import auth  

app = FastAPI(title="Verba Project - Backend Skeleton")

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Chào Diện! Hệ thống Backend đã khởi động thành công.",
        "role": "BE-1 - Auth & Skeleton"
    }
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])