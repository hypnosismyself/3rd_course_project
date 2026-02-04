from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List, Optional
import asyncpg
from datetime import date
import schemas
from dependencies import get_connection

router = APIRouter(
    prefix="/schedule",
    tags=["schedule"],
    responses={404: {"description": "Not found"}}
)


@router.post("/", response_model=schemas.Schedule, status_code=status.HTTP_201_CREATED)
async def create_schedule_item(schedule: schemas.ScheduleCreate, conn: asyncpg.Connection = Depends(get_connection)):
    """Создать элемент расписания"""
    async with conn.transaction():
        course_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM courses.courses WHERE id = $1)",
            schedule.course_id
        )
        if not course_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Указанный курс не существует"
            )

        if schedule.start_date_time >= schedule.end_date_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Время начала должно быть раньше времени окончания"
            )

        row = await conn.fetchrow(
            """
            INSERT INTO courses.schedule (course_id, start_date_time, end_date_time)
            VALUES ($1, $2, $3)
            RETURNING id, course_id, start_date_time, end_date_time
            """,
            schedule.course_id, schedule.start_date_time, schedule.end_date_time
        )
        return dict(row)


@router.get("/", response_model=List[schemas.ScheduleWithCourse])
async def get_schedule(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, le=1000),
        course_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        conn: asyncpg.Connection = Depends(get_connection)
):
    """Получить расписание"""
    query = """
        SELECT s.*, c.title, c.description, c.duration, t.first_name, t.last_name
        FROM courses.schedule s
        JOIN courses.courses c ON s.course_id = c.id
        JOIN courses.teachers t ON c.teacher_id = t.id
        WHERE 1=1
    """
    params = []
    param_count = 1

    if course_id:
        query += f" AND s.course_id = ${param_count}"
        params.append(course_id)
        param_count += 1

    if date_from:
        query += f" AND DATE(s.start_date_time) >= ${param_count}"
        params.append(date_from)
        param_count += 1

    if date_to:
        query += f" AND DATE(s.start_date_time) <= ${param_count}"
        params.append(date_to)
        param_count += 1

    query += f" ORDER BY s.start_date_time OFFSET ${param_count} LIMIT ${param_count + 1}"
    params.extend([skip, limit])

    rows = await conn.fetch(query, *params)

    schedule_items = []
    for row in rows:
        schedule_dict = dict(row)
        schedule_dict['course'] = {
            'id': row['course_id'],
            'title': row['title'],
            'description': row['description'],
            'duration': row['duration'],
            'teacher': {
                'first_name': row['first_name'],
                'last_name': row['last_name']
            }
        }
        schedule_items.append(schedule_dict)

    return schedule_items


@router.get("/{schedule_id}", response_model=schemas.ScheduleWithCourse)
async def get_schedule_item(schedule_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Получить элемент расписания по ID"""
    row = await conn.fetchrow(
        """
        SELECT s.*, c.title, c.description, c.duration, t.first_name, t.last_name
        FROM courses.schedule s
        JOIN courses.courses c ON s.course_id = c.id
        JOIN courses.teachers t ON c.teacher_id = t.id
        WHERE s.id = $1
        """,
        schedule_id
    )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Элемент расписания не найден"
        )

    schedule_dict = dict(row)
    schedule_dict['course'] = {
        'id': row['course_id'],
        'title': row['title'],
        'description': row['description'],
        'duration': row['duration'],
        'teacher': {
            'first_name': row['first_name'],
            'last_name': row['last_name']
        }
    }

    return schedule_dict


@router.put("/{schedule_id}", response_model=schemas.Schedule)
async def update_schedule_item(schedule_id: int, schedule_update: schemas.ScheduleUpdate, conn: asyncpg.Connection = Depends(get_connection)):
    """Обновить элемент расписания"""
    existing = await conn.fetchrow(
        "SELECT id FROM courses.schedule WHERE id = $1",
        schedule_id
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Элемент расписания не найден"
        )

    update_fields = []
    params = []
    param_count = 1

    if schedule_update.start_date_time is not None:
        update_fields.append(f"start_date_time = ${param_count}")
        params.append(schedule_update.start_date_time)
        param_count += 1

    if schedule_update.end_date_time is not None:
        update_fields.append(f"end_date_time = ${param_count}")
        params.append(schedule_update.end_date_time)
        param_count += 1

    if schedule_update.start_date_time and schedule_update.end_date_time:
        if schedule_update.start_date_time >= schedule_update.end_date_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Время начала должно быть раньше времени окончания"
            )

    if not update_fields:
        row = await conn.fetchrow("SELECT * FROM courses.schedule WHERE id = $1", schedule_id)
        return dict(row)

    params.append(schedule_id)

    row = await conn.fetchrow(
        f"""
        UPDATE courses.schedule
        SET {', '.join(update_fields)}
        WHERE id = ${param_count}
        RETURNING *
        """,
        *params
    )

    return dict(row)


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule_item(schedule_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Удалить элемент расписания"""
    result = await conn.execute("DELETE FROM courses.schedule WHERE id = $1", schedule_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Элемент расписания не найден")


@router.get("/daily/{day}")
async def get_daily_schedule(day: date, conn: asyncpg.Connection = Depends(get_connection)):
    """Получить расписание на день"""
    rows = await conn.fetch(
        """
        SELECT s.*, c.title, c.description, t.first_name, t.last_name
        FROM courses.schedule s
        JOIN courses.courses c ON s.course_id = c.id
        JOIN courses.teachers t ON c.teacher_id = t.id
        WHERE DATE(s.start_date_time) = $1
        ORDER BY s.start_date_time
        """,
        day
    )

    schedule_items = []
    for row in rows:
        item = dict(row)
        item['course'] = {
            'title': row['title'],
            'description': row['description'],
            'teacher': f"{row['first_name']} {row['last_name']}"
        }
        schedule_items.append(item)

    return {"date": day, "schedule": schedule_items}


@router.get("/student/{student_id}")
async def get_student_schedule(student_id: int, days_ahead: int = Query(7, ge=1, le=30), conn: asyncpg.Connection = Depends(get_connection)):
    """Получить расписание студента"""
    student_exists = await conn.fetchval(
        "SELECT EXISTS(SELECT 1 FROM courses.students WHERE id = $1)",
        student_id
    )
    if not student_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Студент не найден")

    rows = await conn.fetch(
        """
        SELECT DISTINCT s.*, c.title, c.description, t.first_name, t.last_name
        FROM courses.schedule s
        JOIN courses.courses c ON s.course_id = c.id
        JOIN courses.teachers t ON c.teacher_id = t.id
        JOIN courses.student_course_enrollment sce ON c.id = sce.course_id
        WHERE sce.student_id = $1 
        AND s.start_date_time >= CURRENT_DATE 
        AND s.start_date_time <= CURRENT_DATE + INTERVAL '1 day' * $2
        ORDER BY s.start_date_time
        """,
        student_id, days_ahead
    )

    schedule_items = []
    for row in rows:
        item = dict(row)
        item['course'] = {
            'title': row['title'],
            'description': row['description'],
            'teacher': f"{row['first_name']} {row['last_name']}"
        }
        schedule_items.append(item)

    return {"student_id": student_id, "days_ahead": days_ahead, "schedule": schedule_items}


@router.get("/teacher/{teacher_id}")
async def get_teacher_schedule(teacher_id: int, days_ahead: int = Query(7, ge=1, le=30), conn: asyncpg.Connection = Depends(get_connection)):
    """Получить расписание преподавателя"""
    teacher_exists = await conn.fetchval(
        "SELECT EXISTS(SELECT 1 FROM courses.teachers WHERE id = $1)",
        teacher_id
    )
    if not teacher_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Преподаватель не найден")

    rows = await conn.fetch(
        """
        SELECT s.*, c.title, c.description
        FROM courses.schedule s
        JOIN courses.courses c ON s.course_id = c.id
        WHERE c.teacher_id = $1 
        AND s.start_date_time >= CURRENT_DATE 
        AND s.start_date_time <= CURRENT_DATE + INTERVAL '1 day' * $2
        ORDER BY s.start_date_time
        """,
        teacher_id, days_ahead
    )

    schedule_items = []
    for row in rows:
        item = dict(row)
        item['course'] = {
            'title': row['title'],
            'description': row['description']
        }
        schedule_items.append(item)

    return {"teacher_id": teacher_id, "days_ahead": days_ahead, "schedule": schedule_items}