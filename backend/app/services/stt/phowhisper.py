import os
from pathlib import Path

from faster_whisper import BatchedInferencePipeline, WhisperModel

from app.core.settings import settings


if settings.cuda12_dll_dir.exists():
    os.environ['PATH'] = f"{settings.cuda12_dll_dir}{os.pathsep}" + os.environ.get('PATH', '')
    if hasattr(os, 'add_dll_directory'):
        os.add_dll_directory(str(settings.cuda12_dll_dir))


def normalize_language(language: str | None) -> str:
    candidate = (language or 'vi').strip().lower()
    return 'vi' if candidate.startswith('vi') else candidate


def resolve_audio_path(audio_path: str) -> str:
    return str(settings.upload_dir / audio_path)


def build_ct2_transcriber() -> BatchedInferencePipeline:
    model_dir = Path(settings.phowhisper_ct2_dir)
    if not model_dir.exists():
        raise RuntimeError(f'PhoWhisper CTranslate2 model directory not found: {model_dir}')

    model = WhisperModel(
        str(model_dir),
        device=settings.phowhisper_device,
        compute_type=settings.phowhisper_compute_type,
    )
    return BatchedInferencePipeline(model=model)


def transcribe_file(audio_path: str, language: str | None) -> dict:
    transcriber = build_ct2_transcriber()
    segments_iter, info = transcriber.transcribe(
        audio_path,
        language=normalize_language(language),
        task='transcribe',
        batch_size=settings.phowhisper_batch_size,
        beam_size=settings.phowhisper_beam_size,
        vad_filter=True,
        condition_on_previous_text=False,
    )

    raw_segments = list(segments_iter)
    full_text = ' '.join(
        segment.text.strip() for segment in raw_segments if segment.text
    ).strip()
    segments = [
        {
            'start': float(segment.start),
            'end': float(segment.end),
            'speaker': None,
            'text': segment.text.strip(),
        }
        for segment in raw_segments
        if segment.text and segment.text.strip()
    ]

    return {
        'text': full_text,
        'segments': segments,
        'info': {
            'language': getattr(info, 'language', None),
            'duration': getattr(info, 'duration', None),
        },
    }
