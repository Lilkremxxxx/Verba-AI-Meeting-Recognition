import json
import os
import uuid
import logging
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.endpoints.auth import get_current_user
from app.db.session import get_db
from app.schemas.meeting import (
    SummarizeByIdRequest,
    SummarizeByIdResponse,
    SummaryData,
    SummaryUpdateRequest,
)
from app.schemas.user import UserOut
from app.services.storage.local import LocalStorageService
from app.services.summary_service import (
    build_summary_response,
    extract_transcript_text,
    generate_and_store_summary,
    parse_summary_payload,
)


logger = logging.getLogger(__name__)
router = APIRouter()


async def ensure_done_status_if_completed(
    db: asyncpg.Connection,
    meeting: dict,
    user_id: str,
) -> dict:
    has_transcript = bool(meeting.get('transcript')) or bool(meeting.get('transcript_json'))
    has_summary = bool(meeting.get('summary'))

    if meeting.get('status') != 'DONE' and has_transcript and has_summary:
        await db.execute(
            '''
            UPDATE meetings
            SET status = 'DONE', updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            ''',
            meeting['id'],
            user_id,
        )
        meeting['status'] = 'DONE'

    return meeting


async def get_user_meeting(
    db: asyncpg.Connection,
    meeting_id: str,
    user_id: str,
) -> Optional[dict]:
    row = await db.fetchrow(
        '''
        SELECT id, user_id, title, original_filename, storage_path, status,
               transcript, transcript_json, summary, created_at, updated_at
        FROM meetings
        WHERE id = $1 AND user_id = $2
        ''',
        meeting_id,
        user_id,
    )
    if not row:
        return None

    meeting = dict(row)
    return await ensure_done_status_if_completed(db, meeting, user_id)


def normalize_summary_update(request: SummaryUpdateRequest) -> SummaryData:
    decisions = [item.strip() for item in request.decisions if item and item.strip()]
    tasks = [
        {
            'task': task.task.strip(),
            'owner': task.owner.strip() if task.owner and task.owner.strip() else None,
            'deadline': task.deadline.strip() if task.deadline and task.deadline.strip() else None,
        }
        for task in request.tasks
        if task.task.strip() or (task.owner and task.owner.strip()) or (task.deadline and task.deadline.strip())
    ]
    deadlines = [
        {
            'date': deadline.date.strip(),
            'item': deadline.item.strip(),
        }
        for deadline in request.deadlines
        if deadline.date.strip() or deadline.item.strip()
    ]

    return SummaryData(
        summary=request.summary.strip(),
        decisions=decisions,
        tasks=tasks,
        deadlines=deadlines,
    )


@router.get('/')
async def get_all_meetings(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        rows = await db.fetch(
            'SELECT * FROM meetings WHERE user_id = $1 ORDER BY created_at DESC',
            current_user.id,
        )
        meetings = []
        for row in rows:
            meeting = await ensure_done_status_if_completed(db, dict(row), str(current_user.id))
            meetings.append(
                {
                    'id': str(meeting['id']),
                    'title': meeting['title'],
                    'original_filename': meeting['original_filename'],
                    'status': meeting['status'],
                    'created_at': meeting['created_at'].isoformat(),
                }
            )
        return meetings
    except asyncpg.PostgresError as exc:
        logger.error('[Meetings] Database error while listing meetings: %s', exc)
        raise HTTPException(status_code=500, detail=f'Database error: {exc}')


@router.get('/{meeting_id}')
async def get_meeting_detail(
    meeting_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        row = await db.fetchrow(
            'SELECT * FROM meetings WHERE id = $1 AND user_id = $2',
            meeting_id,
            current_user.id,
        )
        if not row:
            raise HTTPException(status_code=404, detail='Meeting not found')

        meeting = await ensure_done_status_if_completed(db, dict(row), str(current_user.id))
        storage = LocalStorageService()
        return {
            'id': str(meeting['id']),
            'title': meeting['title'],
            'status': meeting['status'],
            'original_filename': meeting['original_filename'],
            'created_at': meeting['created_at'].isoformat(),
            'audioUrl': storage.get_url(meeting['storage_path']),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error('[Meetings] Failed to fetch meeting detail: %s', exc, exc_info=True)
        raise HTTPException(status_code=500, detail='Internal server error')


@router.post('/upload')
async def upload_single_meeting(
    title: str = Form(...),
    audio: UploadFile = File(...),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        extension = os.path.splitext(audio.filename)[1].lower().lstrip('.')
        if extension not in ['mp3', 'wav']:
            raise HTTPException(
                status_code=422,
                detail=f'Unsupported format: {extension}. Use mp3 or wav',
            )

        meeting_id = str(uuid.uuid4())
        user_id = str(current_user.id)
        storage_path = f'{user_id}/{meeting_id}/{audio.filename}'

        storage = LocalStorageService()
        saved_path = storage.save_file(audio.file, storage_path)
        file_stat = os.stat(saved_path)

        await db.execute(
            '''
            INSERT INTO meetings (
                id, user_id, title, original_filename, storage_provider, storage_path, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ''',
            meeting_id,
            current_user.id,
            title,
            audio.filename,
            'LOCAL',
            storage_path,
            'QUEUED',
        )

        return {
            'success': True,
            'data': {
                'id': meeting_id,
                'title': title,
                'filename': audio.filename,
                'path': saved_path,
                'size': file_stat.st_size,
                'status': 'QUEUED',
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error('[Meetings] Upload failed: %s', exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f'Upload failed: {exc}')


@router.delete('/{meeting_id}')
async def delete_meeting(
    meeting_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        row = await db.fetchrow(
            'SELECT * FROM meetings WHERE id = $1 AND user_id = $2',
            meeting_id,
            current_user.id,
        )
        if not row:
            raise HTTPException(status_code=404, detail='Meeting not found')

        storage = LocalStorageService()
        try:
            storage.delete(row['storage_path'])
        except Exception as exc:
            logger.warning('[Meetings] Could not delete storage file %s: %s', row['storage_path'], exc)

        await db.execute('DELETE FROM meetings WHERE id = $1', meeting_id)
        return {'success': True, 'message': 'Meeting deleted successfully'}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error('[Meetings] Delete failed: %s', exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f'Failed to delete meeting: {exc}')


@router.post('/{meeting_id}/summarize', response_model=SummarizeByIdResponse)
async def summarize_meeting(
    meeting_id: str,
    request: SummarizeByIdRequest = SummarizeByIdRequest(),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        meeting = await get_user_meeting(db, meeting_id, str(current_user.id))
        if not meeting:
            raise HTTPException(status_code=404, detail='Meeting not found')

        cached_summary = parse_summary_payload(meeting.get('summary'))
        if cached_summary:
            return build_summary_response(cached_summary)

        transcript_text = extract_transcript_text(meeting)
        summary_data = await generate_and_store_summary(db, meeting_id, transcript_text)
        logger.info('[Summarize] Success for meeting %s, language=%s', meeting_id, request.language)
        return build_summary_response(summary_data)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error('[Summarize] Unexpected error: %s', exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f'Summarize failed: {exc}')


@router.get('/{meeting_id}/summary', response_model=SummarizeByIdResponse)
async def get_meeting_summary(
    meeting_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        meeting = await get_user_meeting(db, meeting_id, str(current_user.id))
        if not meeting:
            raise HTTPException(status_code=404, detail='Meeting not found')

        cached_summary = parse_summary_payload(meeting.get('summary'))
        if cached_summary:
            return build_summary_response(cached_summary)

        transcript_text = extract_transcript_text(meeting)
        summary_data = await generate_and_store_summary(db, meeting_id, transcript_text)
        logger.info('[GetSummary] Generated summary for meeting %s', meeting_id)
        return build_summary_response(summary_data)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error('[GetSummary] Unexpected error: %s', exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f'Failed to get summary: {exc}')


@router.patch('/{meeting_id}/summary', response_model=SummarizeByIdResponse)
async def patch_meeting_summary(
    meeting_id: str,
    request: SummaryUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        meeting = await get_user_meeting(db, meeting_id, str(current_user.id))
        if not meeting:
            raise HTTPException(status_code=404, detail='Meeting not found')

        summary_data = normalize_summary_update(request)
        await db.execute(
            '''
            UPDATE meetings
            SET summary = $1::jsonb, status = 'DONE', updated_at = NOW()
            WHERE id = $2 AND user_id = $3
            ''',
            json.dumps(summary_data.model_dump(), ensure_ascii=False),
            meeting_id,
            current_user.id,
        )
        return build_summary_response(summary_data)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error('[PatchSummary] Unexpected error: %s', exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f'Failed to update summary: {exc}')
