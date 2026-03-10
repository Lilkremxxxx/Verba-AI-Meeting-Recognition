# Main application
import time
import asyncio
from pathlib import Path
from fastapi import FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Annotated
from app.db.session import create_pool, close_pool 
from app.api.endpoints.meetings import router as meetings_endpoint_router
from app.api.endpoints.auth import router as login_router
from dotenv import load_dotenv
load_dotenv()
# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent
# .venv\Scripts\activate

app = FastAPI(title="AI Meeting")
#CROs middleware
origins =[
    "http://localhost:8000",
    "http://localhost:5173",
    "http://localhost:8080",
]

#Middleware
@app.middleware("http")
async def start_time(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins = origins,
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)



app.include_router(meetings_endpoint_router, prefix="/meetings", tags=["meetings"])
app.include_router(login_router, prefix="/auth", tags=["auth"])

# Mount static files để serve audio
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/media", StaticFiles(directory=str(UPLOAD_DIR)), name="media")


#Start + Stop server
@app.on_event("startup")
async def startup_event():
    """Chạy khi server khởi động"""
    print("🚀 Starting server...")
    await create_pool()
    print("✅ Server ready!")

@app.on_event("shutdown")
async def shutdown_event():
    """Chạy khi server shutdown"""
    print("🛑 Shutting down server...")
    await close_pool()
    print("✅ Server stopped!")



class Item(BaseModel):
    name: str
    des: str | None = None
    price: float
    tax: float | None = None


@app.post("/items/upload1")
async def create_item(items: Item):
    return items

@app.get("/items/")
async def read_items(q: Annotated[str | None, Header()] = None):
    return {"q":q}
    
