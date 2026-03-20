from __future__ import annotations

import json
import logging
import re
import time
from typing import List, Optional

import asyncpg
import httpx
from fastapi import HTTPException
from pydantic import ValidationError

from app.core.settings import settings
from app.schemas.meeting import SummaryData, SummarizeByIdResponse


logger = logging.getLogger(__name__)
GEMINI_KEY_COOLDOWNS: dict[str, float] = {}
GEMINI_KEY_CURSOR = 0


def iter_gemini_api_keys() -> List[tuple[int, str]]:
    if not settings.gemini_api_keys:
        return []

    global GEMINI_KEY_CURSOR
    total = len(settings.gemini_api_keys)
    now = time.time()
    available: List[tuple[int, str]] = []
    cooling_down: List[tuple[int, str]] = []

    for offset in range(total):
        index = (GEMINI_KEY_CURSOR + offset) % total
        api_key = settings.gemini_api_keys[index]
        cooldown_until = GEMINI_KEY_COOLDOWNS.get(api_key, 0)
        if cooldown_until > now:
            cooling_down.append((index, api_key))
        else:
            available.append((index, api_key))

    return available if available else cooling_down


def mark_gemini_key_rate_limited(api_key: str, key_index: int) -> None:
    GEMINI_KEY_COOLDOWNS[api_key] = time.time() + settings.gemini_key_cooldown_seconds
    logger.warning(
        '[Gemini] Key #%s hit rate limit, cooldown %ss',
        key_index,
        settings.gemini_key_cooldown_seconds,
    )


def mark_gemini_key_success(api_key: str) -> None:
    global GEMINI_KEY_CURSOR
    try:
        GEMINI_KEY_CURSOR = settings.gemini_api_keys.index(api_key)
    except ValueError:
        return
    GEMINI_KEY_COOLDOWNS.pop(api_key, None)


def render_transcript_with_timestamps(transcript_json_value: object) -> str:
    try:
        data = json.loads(transcript_json_value) if isinstance(transcript_json_value, str) else transcript_json_value
        if not isinstance(data, dict) or 'segments' not in data:
            return ''

        lines = []
        for seg in data['segments']:
            start = seg.get('start', 0)
            end = seg.get('end', 0)
            text = seg.get('text', '').strip()
            speaker = seg.get('speaker', 'Speaker')
            start_min = int(start // 60)
            start_sec = start % 60
            end_min = int(end // 60)
            end_sec = end % 60
            timestamp = f'[{start_min:02d}:{start_sec:05.2f}-{end_min:02d}:{end_sec:05.2f}]'
            lines.append(f'{timestamp} {speaker}: {text}')
        return '\n'.join(lines)
    except Exception as exc:
        logger.warning('[Summary] Error rendering transcript: %s', exc)
        return ''


def extract_transcript_text(meeting: dict) -> str:
    transcript = meeting.get('transcript')
    if transcript and str(transcript).strip():
        return str(transcript)

    transcript_json = meeting.get('transcript_json')
    if transcript_json:
        return render_transcript_with_timestamps(transcript_json)

    return ''


def extract_json_object(raw_text: str) -> dict:
    if not raw_text or not raw_text.strip():
        raise json.JSONDecodeError('Empty JSON payload', raw_text, 0)

    cleaned = raw_text.strip()
    fenced_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', cleaned, flags=re.DOTALL)
    if fenced_match:
        cleaned = fenced_match.group(1).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    for start_index, char in enumerate(cleaned):
        if char != '{':
            continue
        try:
            payload, _ = decoder.raw_decode(cleaned[start_index:])
            if isinstance(payload, dict):
                return payload
        except json.JSONDecodeError:
            continue

    raise json.JSONDecodeError('No valid JSON object found', cleaned, 0)


def parse_summary_payload(summary_value: Optional[object]) -> Optional[SummaryData]:
    if not summary_value:
        return None

    try:
        if isinstance(summary_value, dict):
            payload = summary_value
        elif isinstance(summary_value, str):
            payload = extract_json_object(summary_value)
        else:
            return None
        return SummaryData(**payload)
    except (json.JSONDecodeError, ValidationError, TypeError) as exc:
        logger.warning('[Summary] Invalid cached summary format: %s', exc)
        return None


def build_summary_response(summary_data: SummaryData) -> SummarizeByIdResponse:
    return SummarizeByIdResponse(
        summary=summary_data.summary,
        decisions=summary_data.decisions,
        tasks=summary_data.tasks,
        deadlines=summary_data.deadlines,
    )


def normalize_summary_result(result: dict) -> dict:
    if 'decisions' not in result or not isinstance(result['decisions'], list):
        result['decisions'] = []
    if 'tasks' not in result or not isinstance(result['tasks'], list):
        result['tasks'] = []
    if 'deadlines' not in result or not isinstance(result['deadlines'], list):
        result['deadlines'] = []
    return result


def split_transcript_for_summary(
    transcript: str,
    chunk_size: int = settings.summary_chunk_char_limit,
    overlap: int = settings.summary_chunk_overlap,
) -> List[str]:
    cleaned = transcript.strip()
    if len(cleaned) <= chunk_size:
        return [cleaned]

    chunks: List[str] = []
    start = 0
    length = len(cleaned)

    while start < length:
        end = min(start + chunk_size, length)
        if end < length:
            split_at = cleaned.rfind('\n', start, end)
            if split_at <= start + chunk_size // 2:
                split_at = cleaned.rfind('. ', start, end)
            if split_at > start:
                end = split_at + 1
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= length:
            break
        start = max(end - overlap, start + 1)

    return chunks


def collapse_summary_sentences(summary_texts: List[str], max_sentences: int = 3) -> str:
    combined = ' '.join(text.strip() for text in summary_texts if text and text.strip())
    if not combined:
        return ''
    sentences = [segment.strip() for segment in re.split(r'(?<=[.!?])\s+', combined) if segment.strip()]
    if sentences:
        return ' '.join(sentences[:max_sentences]).strip()
    return combined[:500].strip()


def merge_summary_chunks(chunk_results: List[dict]) -> dict:
    decisions: List[str] = []
    decision_seen: set[str] = set()
    task_seen: set[str] = set()
    deadline_seen: set[str] = set()
    tasks: List[dict] = []
    deadlines: List[dict] = []

    for result in chunk_results:
        for decision in result.get('decisions', []):
            normalized = str(decision).strip()
            if normalized and normalized not in decision_seen:
                decision_seen.add(normalized)
                decisions.append(normalized)

        for task in result.get('tasks', []):
            if not isinstance(task, dict):
                continue
            normalized_task = {
                'task': str(task.get('task', '')).strip(),
                'owner': (str(task.get('owner')).strip() if task.get('owner') is not None else None),
                'deadline': (str(task.get('deadline')).strip() if task.get('deadline') is not None else None),
            }
            task_key = json.dumps(normalized_task, ensure_ascii=False, sort_keys=True)
            if normalized_task['task'] and task_key not in task_seen:
                task_seen.add(task_key)
                tasks.append(normalized_task)

        for deadline in result.get('deadlines', []):
            if not isinstance(deadline, dict):
                continue
            normalized_deadline = {
                'date': str(deadline.get('date', '')).strip(),
                'item': str(deadline.get('item', '')).strip(),
            }
            deadline_key = json.dumps(normalized_deadline, ensure_ascii=False, sort_keys=True)
            if normalized_deadline['date'] and normalized_deadline['item'] and deadline_key not in deadline_seen:
                deadline_seen.add(deadline_key)
                deadlines.append(normalized_deadline)

    return {
        'summary': collapse_summary_sentences([result.get('summary', '') for result in chunk_results]),
        'decisions': decisions,
        'tasks': tasks,
        'deadlines': deadlines,
    }


async def call_gemini_summarize(transcript: str) -> dict:
    if not settings.gemini_api_keys:
        raise HTTPException(status_code=500, detail='LLM_API_KEY not configured')

    prompt = f"""Ban la he thong trich xuat bien ban cuoc hop tu MOT DOAN transcript.

Yeu cau:
- Chi dua thong tin xuat hien trong doan transcript nay.
- Tra ve JSON hop le, khong markdown, khong giai thich.
- Tom tat ngan gon trong 1-2 cau.
- Chi giu cac muc quan trong nhat cua doan nay de tranh output qua dai.
- Neu khong co thong tin cho mot muc thi tra mang rong.
- Giu nguyen ngon ngu cua transcript, uu tien tieng Viet.

Schema JSON:
{{
  "summary": "Tom tat ngan gon cua doan transcript nay",
  "decisions": ["Toi da 5 quyet dinh quan trong nhat"],
  "tasks": [
    {{
      "task": "cong viec can lam",
      "owner": "nguoi chiu trach nhiem neu co, neu khong co thi null",
      "deadline": "thoi han neu co, neu khong co thi null"
    }}
  ],
  "deadlines": [
    {{
      "date": "moc thoi gian",
      "item": "su kien hoac cong viec lien quan"
    }}
  ]
}}

Rang buoc output cho moi lan tra loi:
- decisions: toi da 5 item
- tasks: toi da 8 item
- deadlines: toi da 8 item
- Moi item phai ngan gon, khong lap lai.

Transcript doan nay:
{transcript}"""

    max_output_attempts: List[int] = []
    for candidate in (
        settings.gemini_summary_max_output_tokens,
        max(settings.gemini_summary_max_output_tokens * 2, 8192),
    ):
        if candidate not in max_output_attempts:
            max_output_attempts.append(candidate)

    native_base_url = settings.llm_base_url.removesuffix('/openai')
    headers = {'Content-Type': 'application/json'}

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            last_parse_error = None
            last_api_error_detail = None

            for max_output_tokens in max_output_attempts:
                payload = {
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {
                        'temperature': 0.1,
                        'maxOutputTokens': max_output_tokens,
                        'responseMimeType': 'application/json',
                    },
                }

                for key_position, api_key in iter_gemini_api_keys():
                    key_index = key_position + 1
                    url = f'{native_base_url}/models/{settings.llm_model}:generateContent?key={api_key}'
                    response = await client.post(url, headers=headers, json=payload)

                    if response.status_code == 429:
                        last_api_error_detail = f'Gemini API key #{key_index} hit rate limit'
                        mark_gemini_key_rate_limited(api_key, key_index)
                        continue

                    if response.status_code != 200:
                        logger.error('[Gemini] HTTP %s on key #%s: %s', response.status_code, key_index, response.text[:500])
                        raise HTTPException(status_code=502, detail=f'Gemini API error: HTTP {response.status_code}')

                    data = response.json()
                    if 'error' in data:
                        error_status = str(data['error'].get('status', ''))
                        error_msg = data['error'].get('message', str(data['error']))
                        if error_status == 'RESOURCE_EXHAUSTED':
                            last_api_error_detail = error_msg
                            mark_gemini_key_rate_limited(api_key, key_index)
                            continue
                        raise HTTPException(status_code=502, detail=f'Gemini API error: {error_msg}')

                    candidates = data.get('candidates') or []
                    if not candidates:
                        raise HTTPException(status_code=502, detail='No response from Gemini')

                    candidate = candidates[0]
                    finish_reason = candidate.get('finishReason')
                    content = (
                        candidate
                        .get('content', {})
                        .get('parts', [{}])[0]
                        .get('text', '')
                        .strip()
                    )
                    if not content:
                        raise HTTPException(status_code=502, detail='Empty response from Gemini')

                    try:
                        result = extract_json_object(content)
                    except json.JSONDecodeError as exc:
                        last_parse_error = exc
                        logger.warning(
                            '[Gemini] JSON parse failed with maxOutputTokens=%s, finishReason=%s, key=#%s: %s',
                            max_output_tokens,
                            finish_reason,
                            key_index,
                            exc,
                        )
                        logger.warning('[Gemini] Content preview: %s', content[:500])
                        looks_truncated = finish_reason == 'MAX_TOKENS' or (
                            content.startswith('{') and not content.rstrip().endswith('}')
                        )
                        if looks_truncated and max_output_tokens != max_output_attempts[-1]:
                            break
                        raise HTTPException(status_code=502, detail='Failed to parse LLM response as JSON')

                    if 'summary' not in result:
                        raise HTTPException(status_code=502, detail='Invalid response schema from Gemini')

                    mark_gemini_key_success(api_key)
                    return normalize_summary_result(result)

            if last_parse_error is not None:
                raise HTTPException(status_code=502, detail='Failed to parse LLM response as JSON')
            if last_api_error_detail is not None:
                raise HTTPException(status_code=502, detail=f'Gemini API error: {last_api_error_detail}')
            raise HTTPException(status_code=502, detail='No response from Gemini')
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail='Gemini request timeout')


async def generate_and_store_summary(
    db: asyncpg.Connection,
    meeting_id: str,
    transcript_text: str,
) -> SummaryData:
    if not transcript_text or not transcript_text.strip():
        raise HTTPException(status_code=400, detail='Transcript is empty')

    logger.info('[Summarize] Meeting %s: %s chars', meeting_id, len(transcript_text))

    transcript_chunks = split_transcript_for_summary(transcript_text)
    if len(transcript_chunks) == 1:
        llm_result = await call_gemini_summarize(transcript_chunks[0])
    else:
        logger.info(
            '[Summarize] Using chunked summarize for meeting %s: %s chunks',
            meeting_id,
            len(transcript_chunks),
        )
        chunk_results: List[dict] = []
        for index, chunk in enumerate(transcript_chunks, start=1):
            logger.info('[Summarize] Chunk %s/%s: %s chars', index, len(transcript_chunks), len(chunk))
            chunk_results.append(await call_gemini_summarize(chunk))
        llm_result = merge_summary_chunks(chunk_results)

    try:
        summary_data = SummaryData(**llm_result)
    except ValidationError as exc:
        logger.error('[Summarize] Validation error: %s', exc)
        raise HTTPException(status_code=502, detail='Invalid response format from LLM')

    summary_payload = json.dumps(summary_data.model_dump(), ensure_ascii=False)
    try:
        await db.execute(
            '''
            UPDATE meetings
            SET summary = $1::jsonb, status = 'DONE', updated_at = NOW()
            WHERE id = $2
            ''',
            summary_payload,
            meeting_id,
        )
    except Exception as exc:
        logger.error('[Summarize] Failed to save summary to DB: %s', exc)
        raise HTTPException(status_code=500, detail='Failed to save summary to database')

    return summary_data

