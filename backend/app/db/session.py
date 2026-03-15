import asyncpg
from typing import Optional

from app.core.settings import settings


_pool: Optional[asyncpg.Pool] = None


async def create_pool() -> asyncpg.Pool:
    global _pool

    if _pool is None:
        _pool = await asyncpg.create_pool(
            host=settings.pg_host,
            port=settings.pg_port,
            database=settings.pg_dbname,
            user=settings.pg_user,
            password=settings.pg_password,
            min_size=5,
            max_size=20,
            timeout=30,
            command_timeout=10,
        )

    return _pool


async def close_pool() -> None:
    global _pool

    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_db():
    global _pool

    if _pool is None:
        await create_pool()

    async with _pool.acquire() as connection:
        yield connection


def get_pool() -> Optional[asyncpg.Pool]:
    return _pool
