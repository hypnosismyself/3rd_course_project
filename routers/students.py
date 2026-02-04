from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List, Optional
import asyncpg
from datetime import datetime
import schemas
from dependencies import get_connection
from database import hash_password

router = APIRouter(
    prefix="/students",
    tags=["students"],
    responses={404: {"description": "Not found"}}
)


async def table_has_column(conn: asyncpg.Connection, schema: str, table: str, column: str) -> bool:
    """Проверка стобца в таблице"""

    q = """
    SELECT EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
    )
    """
    return await conn.fetchval(q, schema, table, column)


@router.post("/", response_model=schemas.StudentWithUser, status_code=status.HTTP_201_CREATED)
async def create_student(student: schemas.StudentCreate, conn: asyncpg.Connection = Depends(get_connection)):
    """Создание студента"""

    if not student.role_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="role_id обязателен")

    try:
        role_exists = await conn.fetchval("SELECT EXISTS(SELECT 1 FROM courses.roles WHERE id = $1)", student.role_id)
    except Exception:
        role_exists = False

    if not role_exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Указанная роль не найдена")

    existing = await conn.fetchrow("SELECT id FROM courses.users WHERE username = $1 OR email = $2", student.username, student.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь с таким username или email уже существует")

    async with conn.transaction():
        pwd_hash = await hash_password(student.password)

        try:
            user_row = await conn.fetchrow(
                """
                INSERT INTO courses.users (username, password_hash, email, role_id, registration_date_time, photo_url)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, username, email, role_id, registration_date_time, photo_url
                """,
                student.username, pwd_hash, student.email, student.role_id, datetime.now(), None
            )
        except asyncpg.exceptions.UniqueViolationError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь с таким username или email уже существует")
        except asyncpg.exceptions.ForeignKeyViolationError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Указанная роль не существует (FK error)")
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при создании пользователя: {e}")

        user_id = user_row['id']

        try:
            has_user_id = await table_has_column(conn, 'courses', 'students', 'user_id')
        except Exception:
            has_user_id = False

        try:
            if has_user_id:
                student_row = await conn.fetchrow(
                    """
                    INSERT INTO courses.students (user_id, first_name, last_name, group_number)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, user_id, first_name, last_name, group_number
                    """,
                    user_id, student.first_name, student.last_name, student.group_number
                )
            else:
                student_row = await conn.fetchrow(
                    """
                    INSERT INTO courses.students (id, first_name, last_name, group_number)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, first_name, last_name, group_number
                    """,
                    user_id, student.first_name, student.last_name, student.group_number
                )
                student_row = dict(student_row)
                student_row['user_id'] = user_id

        except asyncpg.exceptions.UniqueViolationError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот пользователь уже является студентом")
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при создании студента: {e}")

        s = dict(student_row)
        s['user'] = dict(user_row)
        return s


@router.get("/", response_model=List[schemas.StudentWithUser])
async def get_students(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, le=1000),
        search: Optional[str] = None,
        group_number: Optional[str] = None,
        conn: asyncpg.Connection = Depends(get_connection)
):
    """Получить студента"""

    try:
        has_user_id = await table_has_column(conn, 'courses', 'students', 'user_id')
    except Exception:
        has_user_id = False

    params = []
    param_count = 1

    if has_user_id:
        query = """
            SELECT s.*, u.id as user_id, u.username, u.email, u.photo_url, u.role_id, u.registration_date_time
            FROM courses.students s
            JOIN courses.users u ON s.user_id = u.id
            WHERE 1=1
        """
    else:
        query = """
            SELECT s.*, u.id as user_id, u.username, u.email, u.photo_url, u.role_id, u.registration_date_time
            FROM courses.students s
            JOIN courses.users u ON s.id = u.id
            WHERE 1=1
        """

    if search:
        query += f" AND (s.first_name ILIKE ${param_count} OR s.last_name ILIKE ${param_count} OR u.username ILIKE ${param_count})"
        params.append(f"%{search}%")
        param_count += 1

    if group_number:
        query += f" AND s.group_number = ${param_count}"
        params.append(group_number)
        param_count += 1

    query += f" ORDER BY s.id OFFSET ${param_count} LIMIT ${param_count + 1}"
    params.extend([skip, limit])

    try:
        rows = await conn.fetch(query, *params)
    except asyncpg.exceptions.UndefinedTableError:
        return []
    except asyncpg.exceptions.UndefinedColumnError:
        rows = await conn.fetch("SELECT * FROM courses.students ORDER BY id OFFSET $1 LIMIT $2", skip, limit)
        students = []
        for row in rows:
            s = dict(row)
            s['user'] = None
            students.append(s)
        return students

    students = []
    for row in rows:
        student_dict = dict(row)
        student_dict['user'] = {
            'id': row.get('user_id'),
            'username': row.get('username'),
            'email': row.get('email'),
            'photo_url': row.get('photo_url'),
            'role_id': row.get('role_id'),
            'registration_date_time': row.get('registration_date_time')
        }
        students.append(student_dict)

    return students

@router.get("/{student_id}", response_model=schemas.StudentWithUser)
async def get_student(
    student_id: int,
    conn: asyncpg.Connection = Depends(get_connection)
):
    """Получить студента"""

    try:
        has_user_id = await table_has_column(conn, 'courses', 'students', 'user_id')
    except Exception:
        has_user_id = False

    try:
        if has_user_id:
            row = await conn.fetchrow(
                """
                SELECT s.*, 
                       u.id AS user_id,
                       u.username,
                       u.email,
                       u.photo_url,
                       u.role_id,
                       u.registration_date_time
                FROM courses.students s
                JOIN courses.users u ON s.user_id = u.id
                WHERE s.id = $1
                """,
                student_id
            )
        else:
            row = await conn.fetchrow(
                """
                SELECT s.*, 
                       u.id AS user_id,
                       u.username,
                       u.email,
                       u.photo_url,
                       u.role_id,
                       u.registration_date_time
                FROM courses.students s
                JOIN courses.users u ON s.id = u.id
                WHERE s.id = $1
                """,
                student_id
            )
    except asyncpg.exceptions.UndefinedTableError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Студент не найден"
        )
    except asyncpg.exceptions.UndefinedColumnError:
        row = await conn.fetchrow(
            "SELECT * FROM courses.students WHERE id = $1",
            student_id
        )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Студент не найден"
        )

    res = dict(row)

    res["user"] = (
        {
            "id": row.get("user_id"),
            "username": row.get("username"),
            "email": row.get("email"),
            "photo_url": row.get("photo_url"),
            "role_id": row.get("role_id"),
            "registration_date_time": row.get("registration_date_time"),
        }
        if "username" in row
        else None
    )

    return res

@router.patch("/{student_id}", response_model=schemas.StudentWithUser)
async def update_student(
    student_id: int,
    data: schemas.StudentUpdate,
    conn: asyncpg.Connection = Depends(get_connection)
):
    """Обновить данные студента"""

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

    params.append(student_id)

    query = f"""
        UPDATE courses.students
        SET {", ".join(set_parts)}
        WHERE id = ${idx}
        RETURNING *
    """

    row = await conn.fetchrow(query, *params)

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Студент не найден"
        )

    # ⬇ используем существующий GET
    return await get_student(student_id, conn)
