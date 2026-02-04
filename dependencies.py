import os
from fastapi import Request, HTTPException, status, Depends
import jwt  # PyJWT
import asyncpg
from typing import List, Optional, AsyncGenerator

JWT_SECRET = os.environ.get("JWT_SECRET", "CHANGE_THIS_SECRET")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")

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
    """
    Попытка получить user_id/role из JWT payload; если нет роли — подтянуть из БД.
    Возвращает dict { id, username, email, role_id, role_name, ... }
    """
    payload = None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        payload = None

    user = None

    if payload:
        # Try to read role or user id from payload
        user_id = payload.get("sub") or payload.get("user_id") or payload.get("id")
        role_claim = payload.get("role") or payload.get("roles") or payload.get("role_name")
        if user_id:
            # get user from DB to obtain authoritative role_name if needed
            row = await conn.fetchrow("SELECT id, username, email, role_id FROM courses.users WHERE id = $1", int(user_id))
            if row:
                user = dict(row)
                # try to get role name
                try:
                    r = await conn.fetchrow("SELECT name FROM courses.roles WHERE id = $1", row.get("role_id"))
                    if r:
                        user['role_name'] = r['name']
                except Exception:
                    pass
                # attach raw payload
                user['raw'] = payload
                return user
        if role_claim and not user:
            # If token contains role but no id, return payload as pseudo-user
            return { "id": None, "username": payload.get("username"), "role": role_claim, "raw": payload }

    # If token not decodable or didn't include user id, try to find a user by other means (optional)
    return None

def require_roles(*allowed_roles: List[str]):
    """
    Использование:
      @router.post(..., dependencies=[Depends(require_roles('Администратор'))])
    or
      async def endpoint(..., user = Depends(require_roles('Администратор','Преподаватель'))):
        # user — объект пользователя (dict)
    """
    allowed = set([str(r) for r in allowed_roles])

    async def _require(request: Request, conn: asyncpg.Connection = Depends(get_connection)):
        token = get_token_from_header(request)
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
        user = await get_user_from_token(token, conn)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token or user not found")

        # determine role name(s)
        role_candidates = set()
        if user.get("role_name"):
            role_candidates.add(user["role_name"])
        if user.get("role"):
            if isinstance(user["role"], str):
                role_candidates.add(user["role"])
            elif isinstance(user["role"], (list, tuple)):
                role_candidates.update(user["role"])
        if user.get("raw") and user["raw"].get("role"):
            rawrole = user["raw"].get("role")
            if isinstance(rawrole, str): role_candidates.add(rawrole)
            elif isinstance(rawrole, (list, tuple)): role_candidates.update(rawrole)

        # last resort: check role_id against roles table name
        if not role_candidates and user.get("role_id"):
            try:
                r = await conn.fetchrow("SELECT name FROM courses.roles WHERE id = $1", user["role_id"])
                if r:
                    role_candidates.add(r['name'])
            except Exception:
                pass

        # authorization check
        if not role_candidates:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no role information")

        allowed_intersection = role_candidates.intersection(allowed)
        if not allowed_intersection:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")

        # success: return user for endpoint usage
        return user

    return _require