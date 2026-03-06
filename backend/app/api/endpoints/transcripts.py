# api/endpoints/transcripts.py
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from schemas.transcript import TranscriptOut, TranscribeRequest, TranscriptUpdateRequest
from db.session import get_db, get_pool
from api.endpoints.auth import get_current_user


router = APIRouter()

@router.post("/{meeting_id}/transcribe")
async def transcribe_meeting(
    meeting_id: str,
    request: TranscribeRequest,
    background_tasks: BackgroundTasks,
    db = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Trigger transcription cho meeting
    Chạy background không block request
    """
    # Lấy meeting từ DB
    meeting = await db.fetchrow(
        "SELECT * FROM meetings WHERE id = $1 AND user_id = $2",
        meeting_id, current_user.id
    )
    
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    
    # Thêm vào background task
    background_tasks.add_task(
        process_transcription,
        meeting_id=meeting_id,
        audio_path=meeting["storage_path"],
        language=request.language
    )
    
    return {"message": "Transcription started", "meeting_id": meeting_id}


@router.get("/{meeting_id}/transcript")
async def get_transcript(
    meeting_id: str,
    db = Depends(get_db),
    current_user = Depends(get_current_user)
) -> TranscriptOut:
    """Lấy transcript đã xử lý — lưu trực tiếp trong bảng meetings"""
    meeting = await db.fetchrow(
        "SELECT id, status, transcript_json FROM meetings WHERE id = $1 AND user_id = $2",
        meeting_id, current_user.id
    )

    if not meeting:
        raise HTTPException(404, "Meeting not found")

    import json
    raw = meeting["transcript_json"]
    if isinstance(raw, str):
        segments = json.loads(raw)
    else:
        segments = raw or []

    return TranscriptOut(
        meeting_id=meeting_id,
        status=meeting["status"],
        segments=segments
    )


# Background task
async def process_transcription(meeting_id: str, audio_path: str, language: str):
    """
    Chuẩn hóa audio → 16kHz (librosa) → PhoWhisper-medium → lưu DB
    audio_path: storage_path từ DB (tương đối từ uploads/)
    """
    import asyncio
    import librosa
    from pathlib import Path
    from transformers import pipeline as hf_pipeline, WhisperForConditionalGeneration, WhisperProcessor

    # Resolve full path: backend/uploads/<storage_path>
    BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
    full_audio_path = str(BASE_DIR / "uploads" / audio_path)

    def run_stt():
        # Bước 1: Chuẩn hóa âm thanh về 16kHz
        audio_16khz, _ = librosa.load(full_audio_path, sr=16000)

        # Bước 2: Load model và processor theo cách explicit (giống STT+dia.py)
        processor = WhisperProcessor.from_pretrained("vinai/PhoWhisper-medium")
        model = WhisperForConditionalGeneration.from_pretrained("vinai/PhoWhisper-medium")

        # Bước 3: Tạo pipeline với model/tokenizer/feature_extractor rõ ràng
        transcriber = hf_pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=processor.tokenizer,
            feature_extractor=processor.feature_extractor,
            chunk_length_s=30,        # Chia audio thành chunk 30s để tránh mất timestamp cuối
            stride_length_s=5,        # Overlap 5s giữa các chunk
        )

        # Bước 4: Chạy transcription, lấy timestamps theo chunks
        return transcriber(
            {"array": audio_16khz, "sampling_rate": 16000},
            return_timestamps=True,
            generate_kwargs={"language": "vietnamese", "task": "transcribe"},
        )

    try:
        # Update meeting status → PROCESSING
        async with get_pool().acquire() as db:
            await db.execute(
                "UPDATE meetings SET status = $1 WHERE id = $2",
                "PROCESSING", meeting_id
            )

        # Chạy STT trong thread pool, không block event loop
        result = await asyncio.to_thread(run_stt)

        # result["text"]   → full transcript text
        # result["chunks"] → [{"text": "...", "timestamp": (start, end)}, ...]
        import json

        full_text = result["text"]
        chunks = result.get("chunks", [])

        # Build segments list để lưu vào transcript_json (jsonb)
        segments = []
        # Tính tổng độ dài audio để fallback cho chunk cuối thiếu end
        import librosa as _librosa
        audio_duration = _librosa.get_duration(path=full_audio_path)
        for i, chunk in enumerate(chunks):
            start, end = chunk["timestamp"]
            # Whisper đôi khi không predict end timestamp cho chunk cuối
            if end is None:
                end = chunks[i - 1]["timestamp"][1] if i > 0 else audio_duration
                end = end or audio_duration
            segments.append({
                "start": float(start) if start is not None else 0.0,
                "end": float(end) if end is not None else 0.0,
                "speaker": None,  # PhoWhisper không có speaker diarization
                "text": chunk["text"].strip(),
            })

        async with get_pool().acquire() as db:
            # Lưu transcript text + json segments vào bảng meetings, update status → DONE
            await db.execute(
                """
                UPDATE meetings
                SET status = $1, transcript = $2, transcript_json = $3::jsonb
                WHERE id = $4
                """,
                "DONE", full_text, json.dumps(segments), meeting_id
            )

    except Exception:
        # Update meeting status → FAILED nếu có lỗi bất kỳ
        async with get_pool().acquire() as db:
            await db.execute(
                "UPDATE meetings SET status = $1 WHERE id = $2",
                "FAILED", meeting_id
            )
        raise