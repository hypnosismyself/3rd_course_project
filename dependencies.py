import os
from fastapi import Request, HTTPException, status, Depends
import jwt
import asyncpg
from typing import List, Optional, AsyncGenerator
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = os.environ.get("ALGORITHM")

async def get_connection(request: Request) -> AsyncGenerator[asyncpg.Connection, None]:
    """
    dependency: получить соединение из пула request.app.state.pool.
    """
    pool = getattr(request.app.state, "pool", None)
    if pool is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database pool is not initialized")
    async with pool.acquire() as conn:
        yield conn

def get_token_from_header(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization")
    if not auth:
        return None
    parts = auth.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None

async def get_user_from_token(token: str, conn: asyncpg.Connection):
    """Вычислить пользователя из токена"""
    try:

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        payload = None

    user = None

    if payload:
        user_id = payload.get("user_id") or payload.get("id")
        role_claim = payload.get("role") or payload.get("roles") or payload.get("role_name")
        print(role_claim)
        if user_id:
            row = await conn.fetchrow("SELECT id, username, email, role_id FROM courses.users WHERE id = $1", int(user_id))
            if row:
                user = dict(row)
                try:
                    r = await conn.fetchrow("SELECT name FROM courses.roles WHERE id = $1", row.get("role_id"))
                    if r:
                        user['role_name'] = r['name']
                except Exception:
                    pass
                user['raw'] = payload
                return user
        if role_claim and not user:

            return { "id": None, "username": payload.get("username"), "role": role_claim, "raw": payload }

    return None
