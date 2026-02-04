from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
import asyncpg
from schemas import Role
from dependencies import get_connection

router = APIRouter(
    prefix="/roles",
    tags=["roles"],
    responses={404: {"description": "Not found"}}
)


@router.get("/", response_model=List[Role])
async def get_all_roles(conn: asyncpg.Connection = Depends(get_connection)):
    """
    Получить список всех ролей из схемы courses.
    """
    try:
        rows = await conn.fetch("SELECT id, name FROM courses.roles ORDER BY id")
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении ролей: {str(e)}"
        )


@router.get("/{role_id}", response_model=Role)
async def get_role_by_id(role_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """
    Получить роль по ID.
    """
    row = await conn.fetchrow("SELECT id, name FROM courses.roles WHERE id = $1", role_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Роль с ID {role_id} не найдена"
        )
    return dict(row)