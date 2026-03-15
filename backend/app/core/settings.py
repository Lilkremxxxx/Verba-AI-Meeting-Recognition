from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / '.env'

load_dotenv(dotenv_path=ENV_PATH, override=False)


@dataclass(frozen=True)
class Settings:
    base_dir: Path = BASE_DIR
    env_path: Path = ENV_PATH
    upload_dir: Path = BASE_DIR / 'uploads'
    media_mount_path: str = '/media'

    pg_host: str | None = os.getenv('PG_HOST')
    pg_port: int = int(os.getenv('PG_PORT', '5432'))
    pg_dbname: str | None = os.getenv('PG_DBNAME')
    pg_user: str | None = os.getenv('PG_USER')
    pg_password: str | None = os.getenv('PG_PASSWORD')

    llm_model: str = os.getenv('LLM_MODEL', 'gemini-2.5-flash').strip()
    llm_base_url: str = os.getenv(
        'LLM_BASE_URL',
        'https://generativelanguage.googleapis.com/v1beta',
    ).strip().rstrip('/')
    gemini_summary_max_output_tokens: int = int(
        os.getenv('GEMINI_SUMMARY_MAX_OUTPUT_TOKENS', '4096')
    )
    summary_chunk_char_limit: int = int(os.getenv('SUMMARY_CHUNK_CHAR_LIMIT', '7000'))
    summary_chunk_overlap: int = int(os.getenv('SUMMARY_CHUNK_OVERLAP', '400'))
    gemini_key_cooldown_seconds: int = int(
        os.getenv('GEMINI_KEY_COOLDOWN_SECONDS', '30')
    )

    phowhisper_ct2_dir: str = os.getenv(
        'PHOWHISPER_CT2_DIR',
        str(BASE_DIR / '.cache' / 'phowhisper-medium-ct2'),
    ).strip()
    phowhisper_batch_size: int = int(os.getenv('PHOWHISPER_BATCH_SIZE', '16'))
    phowhisper_beam_size: int = int(os.getenv('PHOWHISPER_BEAM_SIZE', '1'))
    phowhisper_device: str = os.getenv('PHOWHISPER_DEVICE', 'cuda').strip()
    phowhisper_compute_type: str = os.getenv(
        'PHOWHISPER_COMPUTE_TYPE',
        'float16',
    ).strip()
    cuda12_dll_dir: Path = BASE_DIR / 'third_party' / 'cuda12'

    cors_origins: List[str] | None = None

    def __post_init__(self) -> None:
        if self.cors_origins is None:
            object.__setattr__(
                self,
                'cors_origins',
                [
                    'http://localhost:8000',
                    'http://localhost:5173',
                    'http://localhost:8080',
                ],
            )

    @property
    def gemini_api_keys(self) -> List[str]:
        keys: List[str] = []
        env_names = ['LLM_API_KEY']
        env_names.extend(
            sorted(
                (
                    name
                    for name in os.environ
                    if name.startswith('GEMINI_API_KEY') and name[14:].isdigit()
                ),
                key=lambda name: int(name[14:]),
            )
        )
        for env_name in env_names:
            value = os.getenv(env_name, '').strip()
            if value and value not in keys:
                keys.append(value)
        return keys


settings = Settings()
