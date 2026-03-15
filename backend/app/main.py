import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.api_router import api_router
from app.core.settings import settings
from app.db.session import close_pool, create_pool


app = FastAPI(title='AI Meeting')

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.middleware('http')
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers['X-Process-Time'] = str(time.perf_counter() - start)
    return response


app.include_router(api_router)

settings.upload_dir.mkdir(exist_ok=True)
app.mount(settings.media_mount_path, StaticFiles(directory=str(settings.upload_dir)), name='media')


@app.on_event('startup')
async def startup_event():
    await create_pool()


@app.on_event('shutdown')
async def shutdown_event():
    await close_pool()
