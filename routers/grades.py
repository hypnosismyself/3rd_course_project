from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List, Optional
import asyncpg
from datetime import date
import schemas
from dependencies import get_connection

router = APIRouter(
    prefix="/grades",
    tags=["grades"],
    responses={404: {"description": "Not found"}}
)


@router.post("/", response_model=schemas.Grade, status_code=status.HTTP_201_CREATED)
async def create_grade(grade: schemas.GradeCreate, conn: asyncpg.Connection = Depends(get_connection)):
    """Создать оценку"""
    async with conn.transaction():
        student_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM courses.students WHERE id = $1)",
            grade.student_id
        )
        if not student_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Указанный студент не существует"
            )

        course_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM courses.courses WHERE id = $1)",
            grade.course_id
        )
        if not course_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Указанный курс не существует"
            )

        row = await conn.fetchrow(
            """
            INSERT INTO courses.grades (student_id, course_id, assignment_title, grade_value, submission_date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, student_id, course_id, assignment_title, grade_value, submission_date
            """,
            grade.student_id, grade.course_id, grade.assignment_title,
            grade.grade_value, grade.submission_date
        )
        return dict(row)


@router.get("/", response_model=List[schemas.GradeWithDetails])
async def get_grades(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, le=1000),
        student_id: Optional[int] = None,
        course_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        conn: asyncpg.Connection = Depends(get_connection)
):
    """Получить список оценок"""
    query = """
        SELECT g.*, s.first_name, s.last_name, s.group_number, c.title as course_title
        FROM courses.grades g
        JOIN courses.students s ON g.student_id = s.id
        JOIN courses.courses c ON g.course_id = c.id
        WHERE 1=1
    """
    params = []
    param_count = 1

    if student_id:
        query += f" AND g.student_id = ${param_count}"
        params.append(student_id)
        param_count += 1

    if course_id:
        query += f" AND g.course_id = ${param_count}"
        params.append(course_id)
        param_count += 1

    if date_from:
        query += f" AND g.submission_date >= ${param_count}"
        params.append(date_from)
        param_count += 1

    if date_to:
        query += f" AND g.submission_date <= ${param_count}"
        params.append(date_to)
        param_count += 1

    query += f" ORDER BY g.submission_date DESC OFFSET ${param_count} LIMIT ${param_count + 1}"
    params.extend([skip, limit])

    rows = await conn.fetch(query, *params)

    grades = []
    for row in rows:
        grade_dict = dict(row)
        grade_dict['student'] = {
            'id': row['student_id'],
            'first_name': row['first_name'],
            'last_name': row['last_name'],
            'group_number': row['group_number']
        }
        grade_dict['course'] = {
            'id': row['course_id'],
            'title': row['course_title']
        }
        grades.append(grade_dict)

    return grades


@router.get("/{grade_id}", response_model=schemas.GradeWithDetails)
async def get_grade(grade_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Получить оценку по ID"""
    row = await conn.fetchrow(
        """
        SELECT g.*, s.first_name, s.last_name, s.group_number, c.title as course_title
        FROM courses.grades g
        JOIN courses.students s ON g.student_id = s.id
        JOIN courses.courses c ON g.course_id = c.id
        WHERE g.id = $1
        """,
        grade_id
    )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Оценка не найдена"
        )

    grade_dict = dict(row)
    grade_dict['student'] = {
        'id': row['student_id'],
        'first_name': row['first_name'],
        'last_name': row['last_name'],
        'group_number': row['group_number']
    }
    grade_dict['course'] = {
        'id': row['course_id'],
        'title': row['course_title']
    }

    return grade_dict


@router.put("/{grade_id}", response_model=schemas.Grade)
async def update_grade(grade_id: int, grade_update: schemas.GradeUpdate, conn: asyncpg.Connection = Depends(get_connection)):
    """Обновить оценку"""
    existing = await conn.fetchrow(
        "SELECT id FROM courses.grades WHERE id = $1",
        grade_id
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Оценка не найдена"
        )

    update_fields = []
    params = []
    param_count = 1

    if grade_update.assignment_title is not None:
        update_fields.append(f"assignment_title = ${param_count}")
        params.append(grade_update.assignment_title)
        param_count += 1

    if grade_update.grade_value is not None:
        update_fields.append(f"grade_value = ${param_count}")
        params.append(grade_update.grade_value)
        param_count += 1

    if grade_update.submission_date is not None:
        update_fields.append(f"submission_date = ${param_count}")
        params.append(grade_update.submission_date)
        param_count += 1

    if not update_fields:
        row = await conn.fetchrow("SELECT * FROM courses.grades WHERE id = $1", grade_id)
        return dict(row)

    params.append(grade_id)

    row = await conn.fetchrow(
        f"""
        UPDATE courses.grades
        SET {', '.join(update_fields)}
        WHERE id = ${param_count}
        RETURNING *
        """,
        *params
    )

    return dict(row)


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade(grade_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Удалить оценку"""
    result = await conn.execute(
        "DELETE FROM courses.grades WHERE id = $1",
        grade_id
    )

    if result == "DELETE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Оценка не найдена"
        )


@router.get("/average/{student_id}/{course_id}")
async def get_average_grade(student_id: int, course_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Получить среднюю оценку студента по курсу"""
    average = await conn.fetchval(
        """
        SELECT AVG(grade_value) 
        FROM courses.grades 
        WHERE student_id = $1 AND course_id = $2
        """,
        student_id, course_id
    )

    if average is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Оценки для данного студента и курса не найдены"
        )

    return {
        "student_id": student_id,
        "course_id": course_id,
        "average_grade": float(average)
    }