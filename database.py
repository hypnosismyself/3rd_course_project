import hashlib
from typing import Optional
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

async def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

_pool: Optional[asyncpg.Pool] = None

async def init_pool(min_size: int = 1, max_size: int = 10):
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=min_size, max_size=max_size)
    return _pool

async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
