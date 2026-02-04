from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List, Optional
import asyncpg
from datetime import datetime
import schemas
from dependencies import get_connection
from database import hash_password

router = APIRouter(
    prefix="/teachers",
    tags=["teachers"],
    responses={404: {"description": "Not found"}}
)


async def table_has_column(conn: asyncpg.Connection, schema: str, table: str, column: str) -> bool:
    """Проверка столбца в таблице"""

    q = """
    SELECT EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
    )
    """
    return await conn.fetchval(q, schema, table, column)


@router.post("/", response_model=schemas.TeacherWithUser, status_code=status.HTTP_201_CREATED)
async def create_teacher(teacher: schemas.TeacherCreate, conn: asyncpg.Connection = Depends(get_connection)):
    """Создать прпеодавателя"""

    if not teacher.role_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="role_id обязателен")

    try:
        role_exists = await conn.fetchval("SELECT EXISTS(SELECT 1 FROM courses.roles WHERE id = $1)", teacher.role_id)
    except Exception:
        role_exists = False

    if not role_exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Указанная роль не найдена")

    existing = await conn.fetchrow("SELECT id FROM courses.users WHERE username = $1 OR email = $2", teacher.username, teacher.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь с таким username или email уже существует")

    async with conn.transaction():
        pwd_hash = await hash_password(teacher.password)

        try:
            user_row = await conn.fetchrow(
                """
                INSERT INTO courses.users (username, password_hash, email, role_id, registration_date_time, photo_url)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, username, email, role_id, registration_date_time, photo_url
                """,
                teacher.username, pwd_hash, teacher.email, teacher.role_id, datetime.now(), None
            )
        except asyncpg.exceptions.UniqueViolationError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь с таким username или email уже существует")
        except asyncpg.exceptions.ForeignKeyViolationError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Указанная роль не существует (FK error)")
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при создании пользователя: {e}")

        user_id = user_row['id']

        try:
            has_user_id = await table_has_column(conn, 'courses', 'teachers', 'user_id')
        except Exception:
            has_user_id = False

        try:
            if has_user_id:
                teacher_row = await conn.fetchrow(
                    """
                    INSERT INTO courses.teachers (user_id, first_name, last_name, qualification, bio)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, user_id, first_name, last_name, qualification, bio
                    """,
                    user_id, teacher.first_name, teacher.last_name, teacher.qualification, teacher.bio
                )
            else:
                teacher_row = await conn.fetchrow(
                    """
                    INSERT INTO courses.teachers (id, first_name, last_name, qualification, bio)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, first_name, last_name, qualification, bio
                    """,
                    user_id, teacher.first_name, teacher.last_name, teacher.qualification, teacher.bio
                )
                teacher_row = dict(teacher_row)
                teacher_row['user_id'] = user_id

        except asyncpg.exceptions.UniqueViolationError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот пользователь уже является преподавателем")
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при создании преподавателя: {e}")

        teacher_dict = dict(teacher_row) if isinstance(teacher_row, asyncpg.Record) else dict(teacher_row)
        teacher_dict['user'] = dict(user_row)
        return teacher_dict


@router.get("/", response_model=List[schemas.TeacherWithUser])
async def get_teachers(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, le=1000),
        search: Optional[str] = None,
        conn: asyncpg.Connection = Depends(get_connection)
):
    """Получить преподавателя"""
    try:
        has_user_id = await table_has_column(conn, 'courses', 'teachers', 'user_id')
    except Exception:
        has_user_id = False

    params = []
    param_count = 1

    if has_user_id:
        query = """
            SELECT t.*, u.id as user_id, u.username, u.email, u.photo_url, u.role_id, u.registration_date_time
            FROM courses.teachers t
            JOIN courses.users u ON t.user_id = u.id
            WHERE 1=1
        """
    else:
        query = """
            SELECT t.*, u.id as user_id, u.username, u.email, u.photo_url, u.role_id, u.registration_date_time
            FROM courses.teachers t
            JOIN courses.users u ON t.id = u.id
            WHERE 1=1
        """

    if search:
        query += f" AND (t.first_name ILIKE ${param_count} OR t.last_name ILIKE ${param_count} OR t.qualification ILIKE ${param_count} OR u.username ILIKE ${param_count})"
        params.append(f"%{search}%")
        param_count += 1

    query += f" ORDER BY t.id OFFSET ${param_count} LIMIT ${param_count + 1}"
    params.extend([skip, limit])

    try:
        rows = await conn.fetch(query, *params)
    except asyncpg.exceptions.UndefinedTableError:
        return []
    except asyncpg.exceptions.UndefinedColumnError:
        rows = await conn.fetch("SELECT * FROM courses.teachers ORDER BY id OFFSET $1 LIMIT $2", skip, limit)
        teachers = []
        for row in rows:
            t = dict(row)
            t['user'] = None
            teachers.append(t)
        return teachers

    teachers = []
    for row in rows:
        t = dict(row)
        t['user'] = {
            'id': row.get('user_id'),
            'username': row.get('username'),
            'email': row.get('email'),
            'photo_url': row.get('photo_url'),
            'role_id': row.get('role_id'),
            'registration_date_time': row.get('registration_date_time')
        } if 'username' in row else None
        teachers.append(t)

    return teachers


@router.get("/{teacher_id}", response_model=schemas.TeacherWithUser)
async def get_teacher(teacher_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Получить преподавателя"""

    try:
        has_user_id = await table_has_column(conn, 'courses', 'teachers', 'user_id')
    except Exception:
        has_user_id = False

    try:
        if has_user_id:
            row = await conn.fetchrow(
                """
                SELECT t.*, u.id as user_id, u.username, u.email, u.photo_url, u.role_id, u.registration_date_time
                FROM courses.teachers t
                JOIN courses.users u ON t.user_id = u.id
                WHERE t.id = $1
                """,
                teacher_id
            )
        else:
            row = await conn.fetchrow(
                """
                SELECT t.*, u.id as user_id, u.username, u.email, u.photo_url, u.role_id, u.registration_date_time
                FROM courses.teachers t
                JOIN courses.users u ON t.id = u.id
                WHERE t.id = $1
                """,
                teacher_id
            )
    except asyncpg.exceptions.UndefinedTableError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Преподаватель не найден")
    except asyncpg.exceptions.UndefinedColumnError:
        row = await conn.fetchrow("SELECT * FROM courses.teachers WHERE id = $1", teacher_id)

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Преподаватель не найден")

    res = dict(row)
    res['user'] = {
        'id': row.get('user_id'),
        'username': row.get('username'),
        'email': row.get('email'),
        'photo_url': row.get('photo_url'),
        'role_id': row.get('role_id'),
        'registration_date_time': row.get('registration_date_time')
    } if 'username' in row else None

    return res

@router.patch("/{teacher_id}", response_model=schemas.TeacherWithUser)
async def update_teacher(
    teacher_id: int,
    data: schemas.TeacherUpdate,
    conn: asyncpg.Connection = Depends(get_connection)
):
    """Обновить данные преподавателя"""

    values = {k: v for k, v in data.dict().items() if v is not None}
    if not values:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нет данных для обновления"
        )

    set_parts = []
    params = []
    idx = 1

    for field, value in values.items():
        set_parts.append(f"{field} = ${idx}")
        params.append(value)
        idx += 1

    params.append(teacher_id)

    query = f"""
        UPDATE courses.teachers
        SET {", ".join(set_parts)}
        WHERE id = ${idx}
        RETURNING *
    """

    row = await conn.fetchrow(query, *params)

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Преподаватель не найден"
        )

    return await get_teacher(teacher_id, conn)