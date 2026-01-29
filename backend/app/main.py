# Main application
from enum import Enum
import time
import asyncio
from fastapi import FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Annotated
from api.endpoints.meetings import router as meetings_endpoint_router


app = FastAPI()
#CROs middleware
origins =[
    "http://localhost:8000",
    "http://localhost:5173",
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
    
