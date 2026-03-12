# api/endpoints/transcripts.py
import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.api.endpoints.auth import get_current_user
from app.db.session import get_db, get_pool
from app.schemas.transcript import TranscribeRequest, TranscriptOut

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env", override=False)

CUDA12_DLL_DIR = BASE_DIR / "third_party" / "cuda12"
if CUDA12_DLL_DIR.exists():
    os.environ["PATH"] = f"{CUDA12_DLL_DIR}{os.pathsep}" + os.environ.get("PATH", "")
    if hasattr(os, "add_dll_directory"):
        os.add_dll_directory(str(CUDA12_DLL_DIR))

PHOWHISPER_CT2_DIR = os.getenv(
    "PHOWHISPER_CT2_DIR",
    str(BASE_DIR / ".cache" / "phowhisper-medium-ct2"),
).strip()
PHOWHISPER_BATCH_SIZE = int(os.getenv("PHOWHISPER_BATCH_SIZE", "16"))
PHOWHISPER_BEAM_SIZE = int(os.getenv("PHOWHISPER_BEAM_SIZE", "1"))
PHOWHISPER_DEVICE = os.getenv("PHOWHISPER_DEVICE", "cuda").strip()
PHOWHISPER_COMPUTE_TYPE = os.getenv("PHOWHISPER_COMPUTE_TYPE", "float16").strip()

router = APIRouter()


def _normalize_language(language: str | None) -> str:
    candidate = (language or "vi").strip().lower()
    return "vi" if candidate.startswith("vi") else candidate


def _resolve_audio_path(audio_path: str) -> str:
    return str(BASE_DIR / "uploads" / audio_path)


def _build_ct2_transcriber():
    from faster_whisper import BatchedInferencePipeline, WhisperModel

    model_dir = Path(PHOWHISPER_CT2_DIR)
    if not model_dir.exists():
        raise RuntimeError(
            f"PhoWhisper CTranslate2 model directory not found: {model_dir}"
        )

    try:
        model = WhisperModel(
            str(model_dir),
            device=PHOWHISPER_DEVICE,
            compute_type=PHOWHISPER_COMPUTE_TYPE,
        )
        return BatchedInferencePipeline(model=model)
    except Exception as exc:
        raise RuntimeError(
            "Failed to initialize PhoWhisper CTranslate2 backend. "
            f"Original error: {exc}"
        ) from exc


@router.post("/{meeting_id}/transcribe")
async def transcribe_meeting(
    meeting_id: str,
    request: TranscribeRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    meeting = await db.fetchrow(
        "SELECT * FROM meetings WHERE id = $1 AND user_id = $2",
        meeting_id,
        current_user.id,
    )

    if not meeting:
        raise HTTPException(404, "Meeting not found")

    background_tasks.add_task(
        process_transcription,
        meeting_id=meeting_id,
        audio_path=meeting["storage_path"],
        language=request.language,
    )

    return {"message": "Transcription started", "meeting_id": meeting_id}


@router.get("/{meeting_id}/transcript")
async def get_transcript(
    meeting_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
) -> TranscriptOut:
    meeting = await db.fetchrow(
        "SELECT id, status, transcript_json FROM meetings WHERE id = $1 AND user_id = $2",
        meeting_id,
        current_user.id,
    )

    if not meeting:
        raise HTTPException(404, "Meeting not found")

    raw = meeting["transcript_json"]
    segments = json.loads(raw) if isinstance(raw, str) else (raw or [])

    return TranscriptOut(
        meeting_id=meeting_id,
        status=meeting["status"],
        segments=segments,
    )


async def process_transcription(meeting_id: str, audio_path: str, language: str):
    full_audio_path = _resolve_audio_path(audio_path)
    task_language = _normalize_language(language)
    pool = get_pool()

    def run_stt():
        transcriber = _build_ct2_transcriber()
        segments_iter, info = transcriber.transcribe(
            full_audio_path,
            language=task_language,
            task="transcribe",
            batch_size=PHOWHISPER_BATCH_SIZE,
            beam_size=PHOWHISPER_BEAM_SIZE,
            vad_filter=True,
            condition_on_previous_text=False,
        )

        raw_segments = list(segments_iter)
        full_text = " ".join(
            segment.text.strip() for segment in raw_segments if segment.text
        ).strip()
        segments = [
            {
                "start": float(segment.start),
                "end": float(segment.end),
                "speaker": None,
                "text": segment.text.strip(),
            }
            for segment in raw_segments
            if segment.text and segment.text.strip()
        ]

        return {
            "text": full_text,
            "segments": segments,
            "info": {
                "language": getattr(info, "language", None),
                "duration": getattr(info, "duration", None),
            },
        }

    try:
        async with pool.acquire() as db:
            await db.execute(
                "UPDATE meetings SET status = $1 WHERE id = $2",
                "PROCESSING",
                meeting_id,
            )

        result = await asyncio.to_thread(run_stt)

        async with pool.acquire() as db:
            await db.execute(
                """
                UPDATE meetings
                SET status = $1, transcript = $2, transcript_json = $3::jsonb
                WHERE id = $4
                """,
                "DONE",
                result["text"],
                json.dumps(result["segments"]),
                meeting_id,
            )
    except Exception:
        if pool is not None:
            async with pool.acquire() as db:
                await db.execute(
                    "UPDATE meetings SET status = $1 WHERE id = $2",
                    "FAILED",
                    meeting_id,
                )
        raise
