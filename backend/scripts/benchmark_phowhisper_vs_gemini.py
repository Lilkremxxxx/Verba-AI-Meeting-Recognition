from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import sys
import time
import unicodedata
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import av
import httpx
from dotenv import load_dotenv
from jiwer import wer


PROJECT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_AUDIO_PATH = PROJECT_DIR.parent / "STT_Test" / "thoisu.mp3"
DEFAULT_MEDIUM_PATH = PROJECT_DIR.parent / "STT_Test" / "pho-whisper-medium.txt"
DEFAULT_LARGE_PATH = PROJECT_DIR.parent / "STT_Test" / "pho-whisper-large.txt"
DEFAULT_OUTPUT_DIR = PROJECT_DIR / "benchmark_outputs"
DEFAULT_MODEL = "gemini-2.5-flash"
DEFAULT_CHUNK_SECONDS = 120
DEFAULT_OVERLAP_SECONDS = 3
DEFAULT_SAMPLE_RATE = 16000

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


@dataclass
class ChunkResult:
    index: int
    start_seconds: float
    end_seconds: float
    transcript: str


def pick_gemini_api_keys() -> list[str]:
    load_dotenv(PROJECT_DIR / ".env")
    keys: list[str] = []
    env_names = ["LLM_API_KEY"]
    env_names.extend(
        sorted(
            (name for name in os.environ if re.fullmatch(r"GEMINI_API_KEY\d+", name)),
            key=lambda name: int(re.search(r"\d+", name).group()),
        )
    )
    for env_name in env_names:
        api_key = os.getenv(env_name)
        if api_key:
            cleaned = api_key.strip()
            if cleaned and cleaned not in keys:
                keys.append(cleaned)
    if not keys:
        raise RuntimeError("Khong tim thay Gemini API key trong backend/.env")
    return keys


def read_text_file(path: Path) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1258"):
        try:
            return path.read_text(encoding=encoding).strip()
        except UnicodeDecodeError:
            continue
    return path.read_text(encoding="utf-8", errors="replace").strip()


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text).lower()
    text = text.replace("\r", " ").replace("\n", " ")
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text, flags=re.UNICODE)
    return text.strip()


def decode_audio_to_pcm16(audio_path: Path, sample_rate: int) -> bytes:
    container = av.open(str(audio_path))
    try:
        audio_stream = next(stream for stream in container.streams if stream.type == "audio")
    except StopIteration as exc:
        raise RuntimeError(f"Khong tim thay audio stream trong {audio_path}") from exc

    resampler = av.audio.resampler.AudioResampler(format="s16", layout="mono", rate=sample_rate)
    pcm_chunks: list[bytes] = []

    for packet in container.demux(audio_stream):
        for frame in packet.decode():
            resampled = resampler.resample(frame)
            if resampled is None:
                continue
            frames = resampled if isinstance(resampled, list) else [resampled]
            for out_frame in frames:
                pcm_chunks.append(bytes(out_frame.planes[0]))

    container.close()
    return b"".join(pcm_chunks)


def pcm16_to_wav_bytes(pcm_bytes: bytes, sample_rate: int) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_bytes)
    return buffer.getvalue()


def chunk_audio_bytes(pcm_bytes: bytes, sample_rate: int, chunk_seconds: int, overlap_seconds: int) -> list[tuple[int, float, float, bytes]]:
    bytes_per_second = sample_rate * 2
    chunk_size = chunk_seconds * bytes_per_second
    overlap_size = overlap_seconds * bytes_per_second
    if chunk_size <= 0:
        raise ValueError("chunk_seconds phai lon hon 0")
    if overlap_size >= chunk_size:
        raise ValueError("overlap_seconds phai nho hon chunk_seconds")

    chunks: list[tuple[int, float, float, bytes]] = []
    start = 0
    index = 0

    while start < len(pcm_bytes):
        end = min(start + chunk_size, len(pcm_bytes))
        start_seconds = start / bytes_per_second
        end_seconds = end / bytes_per_second
        chunks.append((index, start_seconds, end_seconds, pcm16_to_wav_bytes(pcm_bytes[start:end], sample_rate)))
        if end >= len(pcm_bytes):
            break
        start = end - overlap_size
        index += 1

    return chunks


def overlap_merge(previous_text: str, current_text: str, min_overlap_tokens: int = 8, max_window_tokens: int = 120) -> str:
    prev_tokens = previous_text.split()
    curr_tokens = current_text.split()
    max_overlap = min(len(prev_tokens), len(curr_tokens), max_window_tokens)

    for size in range(max_overlap, min_overlap_tokens - 1, -1):
        if prev_tokens[-size:] == curr_tokens[:size]:
            return " ".join(prev_tokens + curr_tokens[size:])

    return f"{previous_text} {current_text}".strip()


def gemini_generate(api_keys: list[str], model: str, prompt: str, inline_wav_bytes: bytes | None = None, timeout_seconds: int = 180) -> str:
    parts: list[dict[str, object]] = [{"text": prompt}]
    if inline_wav_bytes is not None:
        parts.append(
            {
                "inline_data": {
                    "mime_type": "audio/wav",
                    "data": base64.b64encode(inline_wav_bytes).decode("ascii"),
                }
            }
        )

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0,
            "topP": 0.95,
            "responseMimeType": "text/plain",
        },
    }

    last_error: Exception | None = None

    with httpx.Client(timeout=timeout_seconds) as client:
        for attempt in range(1, 4):
            for key_index, api_key in enumerate(api_keys, start=1):
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                try:
                    response = client.post(url, json=payload)
                    if response.status_code == 429:
                        last_error = RuntimeError(f"429 on key #{key_index}")
                        continue
                    response.raise_for_status()
                    data = response.json()
                    candidates = data.get("candidates") or []
                    if not candidates:
                        return ""
                    content = candidates[0].get("content") or {}
                    parts_out = content.get("parts") or []
                    return "".join(part.get("text", "") for part in parts_out).strip()
                except Exception as exc:
                    last_error = exc
                    if getattr(exc, "response", None) is not None and exc.response.status_code == 429:
                        continue
                    if key_index == len(api_keys):
                        break
            time.sleep(2 * attempt)

    raise RuntimeError(f"Gemini request failed after retries: {last_error}")


def load_cached_chunk_results(cache_path: Path) -> dict[int, ChunkResult]:
    if not cache_path.exists():
        return {}
    raw = json.loads(cache_path.read_text(encoding="utf-8"))
    return {item["index"]: ChunkResult(**item) for item in raw}


def save_chunk_results(cache_path: Path, chunk_results: list[ChunkResult]) -> None:
    cache_path.write_text(
        json.dumps([result.__dict__ for result in chunk_results], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def transcribe_chunks_with_gemini(chunks: Iterable[tuple[int, float, float, bytes]], api_keys: list[str], model: str, cache_path: Path, request_delay_seconds: float) -> list[ChunkResult]:
    prompt = (
        "Ban la he thong chep loi audio tieng Viet. "
        "Hay chep gan nhu nguyen van noi dung audio thanh van ban tieng Viet. "
        "Khong them giai thich, khong them tieu de, khong sua nghia, chi tra transcript thuan."
    )
    cached = load_cached_chunk_results(cache_path)
    results: list[ChunkResult] = []

    for index, start_seconds, end_seconds, wav_bytes in chunks:
        if index in cached:
            results.append(cached[index])
            print(f"[chunk {index:02d}] reused cache | {len(cached[index].transcript)} chars")
            continue

        transcript = gemini_generate(
            api_keys=api_keys,
            model=model,
            prompt=prompt,
            inline_wav_bytes=wav_bytes,
            timeout_seconds=240,
        )
        result = ChunkResult(
            index=index,
            start_seconds=start_seconds,
            end_seconds=end_seconds,
            transcript=transcript,
        )
        results.append(result)
        save_chunk_results(cache_path, results)
        print(f"[chunk {index:02d}] {start_seconds:7.1f}s -> {end_seconds:7.1f}s | {len(transcript)} chars")
        if request_delay_seconds > 0:
            time.sleep(request_delay_seconds)

    return results


def stitch_chunk_transcripts(chunk_results: list[ChunkResult]) -> str:
    merged = ""
    for result in chunk_results:
        cleaned = normalize_text(result.transcript)
        if not cleaned:
            continue
        if not merged:
            merged = cleaned
            continue
        merged = overlap_merge(merged, cleaned)
    return merged.strip()


def build_review_prompt(reference_text: str, medium_text: str, large_text: str, medium_wer: float, large_wer: float) -> str:
    return (
        "Ban la nguoi danh gia chat luong nhan dien giong noi tieng Viet.\n"
        "Duoi day la transcript tham chieu va ket qua tu 2 mo hinh PhoWhisper.\n"
        "Hay dua ra nhan xet tong quat ngan gon bang tieng Viet, tap trung vao: "
        "mo hinh nao tot hon, cac loi noi bat, va khi nao nen uu tien medium hoac large.\n"
        "Tra ve JSON hop le theo schema:\n"
        "{\n"
        '  "winner": "medium|large|tie",\n'
        '  "summary": "2-4 cau nhan xet tong quat",\n'
        '  "medium_strengths": ["..."],\n'
        '  "medium_weaknesses": ["..."],\n'
        '  "large_strengths": ["..."],\n'
        '  "large_weaknesses": ["..."]\n'
        "}\n\n"
        f"WER medium: {medium_wer:.6f}\n"
        f"WER large: {large_wer:.6f}\n\n"
        "REFERENCE:\n"
        f"{reference_text}\n\n"
        "MEDIUM:\n"
        f"{medium_text}\n\n"
        "LARGE:\n"
        f"{large_text}\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark PhoWhisper medium vs large bang transcript tham chieu tu Gemini.")
    parser.add_argument("--audio", type=Path, default=DEFAULT_AUDIO_PATH)
    parser.add_argument("--medium", type=Path, default=DEFAULT_MEDIUM_PATH)
    parser.add_argument("--large", type=Path, default=DEFAULT_LARGE_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL)
    parser.add_argument("--chunk-seconds", type=int, default=DEFAULT_CHUNK_SECONDS)
    parser.add_argument("--overlap-seconds", type=int, default=DEFAULT_OVERLAP_SECONDS)
    parser.add_argument("--sample-rate", type=int, default=DEFAULT_SAMPLE_RATE)
    parser.add_argument("--request-delay-seconds", type=float, default=0.0)
    args = parser.parse_args()

    api_keys = pick_gemini_api_keys()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    medium_raw = read_text_file(args.medium)
    large_raw = read_text_file(args.large)

    print(f"Decoding audio: {args.audio}")
    pcm_bytes = decode_audio_to_pcm16(args.audio, sample_rate=args.sample_rate)
    chunks = chunk_audio_bytes(
        pcm_bytes,
        sample_rate=args.sample_rate,
        chunk_seconds=args.chunk_seconds,
        overlap_seconds=args.overlap_seconds,
    )
    print(f"Created {len(chunks)} chunks with {args.chunk_seconds}s chunk / {args.overlap_seconds}s overlap")

    chunk_cache_path = args.output_dir / 'gemini_chunk_results.json'
    chunk_results = transcribe_chunks_with_gemini(chunks, api_keys=api_keys, model=args.model, cache_path=chunk_cache_path, request_delay_seconds=args.request_delay_seconds)
    reference_text = stitch_chunk_transcripts(chunk_results)

    medium_normalized = normalize_text(medium_raw)
    large_normalized = normalize_text(large_raw)

    medium_wer = wer(reference_text, medium_normalized)
    large_wer = wer(reference_text, large_normalized)

    review_prompt = build_review_prompt(
        reference_text=reference_text,
        medium_text=medium_normalized,
        large_text=large_normalized,
        medium_wer=medium_wer,
        large_wer=large_wer,
    )
    review_raw = gemini_generate(api_keys=api_keys, model=args.model, prompt=review_prompt, inline_wav_bytes=None, timeout_seconds=240)

    benchmark_result = {
        "audio_path": str(args.audio.resolve()),
        "medium_path": str(args.medium.resolve()),
        "large_path": str(args.large.resolve()),
        "gemini_model": args.model,
        "chunk_seconds": args.chunk_seconds,
        "overlap_seconds": args.overlap_seconds,
        "sample_rate": args.sample_rate,
        "chunk_count": len(chunk_results),
        "reference_word_count": len(reference_text.split()),
        "medium_word_count": len(medium_normalized.split()),
        "large_word_count": len(large_normalized.split()),
        "wer": {
            "pho_whisper_medium": medium_wer,
            "pho_whisper_large": large_wer,
        },
        "review_raw": review_raw,
        "reference_transcript_path": str((args.output_dir / "gemini_reference.txt").resolve()),
        "chunk_results_path": str((args.output_dir / "gemini_chunk_results.json").resolve()),
    }

    (args.output_dir / "gemini_reference.txt").write_text(reference_text, encoding="utf-8")
    save_chunk_results(chunk_cache_path, chunk_results)
    (args.output_dir / "benchmark_result.json").write_text(
        json.dumps(benchmark_result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(json.dumps(benchmark_result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
