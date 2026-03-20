import asyncio
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.api.endpoints.auth import get_current_user
from app.db.session import get_db, get_pool
from app.schemas.transcript import (
    TranscribeRequest,
    TranscriptOut,
    TranscriptPatchRequest,
)
from app.services.stt.phowhisper import resolve_audio_path, transcribe_file


logger = logging.getLogger(__name__)
router = APIRouter()


def build_transcript_text(segments: list[dict]) -> str:
    return ' '.join(
        str(segment.get('text', '')).strip()
        for segment in segments
        if str(segment.get('text', '')).strip()
    ).strip()


@router.post('/{meeting_id}/transcribe')
async def transcribe_meeting(
    meeting_id: str,
    request: TranscribeRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    meeting = await db.fetchrow(
        'SELECT * FROM meetings WHERE id = $1 AND user_id = $2',
        meeting_id,
        current_user.id,
    )
    if not meeting:
        raise HTTPException(404, 'Meeting not found')

    background_tasks.add_task(
        process_transcription,
        meeting_id=meeting_id,
        audio_path=meeting['storage_path'],
        language=request.language,
    )
    return {'message': 'Transcription started', 'meeting_id': meeting_id}


@router.get('/{meeting_id}/transcript')
async def get_transcript(
    meeting_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
) -> TranscriptOut:
    meeting = await db.fetchrow(
        'SELECT id, status, transcript_json FROM meetings WHERE id = $1 AND user_id = $2',
        meeting_id,
        current_user.id,
    )
    if not meeting:
        raise HTTPException(404, 'Meeting not found')

    raw = meeting['transcript_json']
    segments = json.loads(raw) if isinstance(raw, str) else (raw or [])
    return TranscriptOut(meeting_id=meeting_id, status=meeting['status'], segments=segments)


@router.patch('/{meeting_id}/transcript')
async def patch_transcript(
    meeting_id: str,
    request: TranscriptPatchRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
) -> TranscriptOut:
    meeting = await db.fetchrow(
        'SELECT id, status, transcript_json FROM meetings WHERE id = $1 AND user_id = $2',
        meeting_id,
        current_user.id,
    )
    if not meeting:
        raise HTTPException(404, 'Meeting not found')

    raw_segments = meeting['transcript_json']
    segments = json.loads(raw_segments) if isinstance(raw_segments, str) else (raw_segments or [])
    if not isinstance(segments, list) or not segments:
        raise HTTPException(400, 'Transcript is empty or unavailable')

    for edit in request.edits:
        if edit.index < 0 or edit.index >= len(segments):
            raise HTTPException(400, f'Invalid transcript segment index: {edit.index}')
        segments[edit.index]['text'] = edit.text.strip()

    transcript_text = build_transcript_text(segments)
    payload = json.dumps(segments, ensure_ascii=False)

    await db.execute(
        '''
        UPDATE meetings
        SET transcript = $1, transcript_json = $2::jsonb, updated_at = NOW()
        WHERE id = $3 AND user_id = $4
        ''',
        transcript_text,
        payload,
        meeting_id,
        current_user.id,
    )

    return TranscriptOut(meeting_id=meeting_id, status=meeting['status'], segments=segments)


async def process_transcription(meeting_id: str, audio_path: str, language: str):
    full_audio_path = resolve_audio_path(audio_path)
    pool = get_pool()
    if pool is None:
        raise RuntimeError('Database pool not initialized')

    try:
        async with pool.acquire() as db:
            await db.execute(
                'UPDATE meetings SET status = $1 WHERE id = $2',
                'PROCESSING',
                meeting_id,
            )

        result = await asyncio.to_thread(transcribe_file, full_audio_path, language)

        async with pool.acquire() as db:
            await db.execute(
                '''
                UPDATE meetings
                SET status = $1, transcript = $2, transcript_json = $3::jsonb
                WHERE id = $4
                ''',
                'DONE',
                result['text'],
                json.dumps(result['segments'], ensure_ascii=False),
                meeting_id,
            )
    except Exception as exc:
        logger.error('[Transcripts] Transcription failed for %s: %s', meeting_id, exc, exc_info=True)
        if pool is not None:
            async with pool.acquire() as db:
                await db.execute(
                    'UPDATE meetings SET status = $1 WHERE id = $2',
                    'FAILED',
                    meeting_id,
                )
        raise
