from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List, Optional
import asyncpg
import schemas
from dependencies import get_connection

router = APIRouter(
    prefix="/enrollments",
    tags=["enrollments"],
    responses={404: {"description": "Not found"}}
)


@router.post("/", response_model=schemas.Enrollment, status_code=status.HTTP_201_CREATED)
async def enroll_student(enrollment: schemas.EnrollmentCreate, conn: asyncpg.Connection = Depends(get_connection)):
    """Записать студента на курс"""

    async with conn.transaction():
        student_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM courses.students WHERE id = $1)",
            enrollment.student_id
        )
        if not student_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Указанный студент не существует"
            )

        course_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM courses.courses WHERE id = $1)",
            enrollment.course_id
        )
        if not course_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Указанный курс не существует"
            )

        existing_enrollment = await conn.fetchrow(
            """
            SELECT id FROM courses.student_course_enrollment 
            WHERE student_id = $1 AND course_id = $2
            """,
            enrollment.student_id, enrollment.course_id
        )
        if existing_enrollment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Студент уже записан на этот курс"
            )

        row = await conn.fetchrow(
            """
            INSERT INTO courses.student_course_enrollment (student_id, course_id, enrollment_date)
            VALUES ($1, $2, $3)
            RETURNING student_id, course_id, enrollment_date, grade
            """,
            enrollment.student_id, enrollment.course_id, enrollment.enrollment_date
        )
        return dict(row)


@router.get("/", response_model=List[schemas.EnrollmentWithDetails])
async def get_enrollments(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, le=1000),
        student_id: Optional[int] = None,
        course_id: Optional[int] = None,
        conn: asyncpg.Connection = Depends(get_connection)
):
    """Получить список записей на курсы"""

    query = """
        SELECT sce.*, s.first_name, s.last_name, s.group_number, c.title, c.description
        FROM courses.student_course_enrollment sce
        JOIN courses.students s ON sce.student_id = s.id
        JOIN courses.courses c ON sce.course_id = c.id
        WHERE 1=1
    """
    params = []
    param_count = 1

    if student_id:
        query += f" AND sce.student_id = ${param_count}"
        params.append(student_id)
        param_count += 1

    if course_id:
        query += f" AND sce.course_id = ${param_count}"
        params.append(course_id)
        param_count += 1

    query += f" ORDER BY sce.enrollment_date DESC OFFSET ${param_count} LIMIT ${param_count + 1}"
    params.extend([skip, limit])

    rows = await conn.fetch(query, *params)

    enrollments = []
    for row in rows:
        enrollment_dict = dict(row)
        enrollment_dict['student'] = {
            'id': row['student_id'],
            'first_name': row['first_name'],
            'last_name': row['last_name'],
            'group_number': row['group_number']
        }
        enrollment_dict['course'] = {
            'id': row['course_id'],
            'title': row['title'],
            'description': row['description']
        }
        enrollments.append(enrollment_dict)

    return enrollments


@router.put("/", response_model=schemas.Enrollment)
async def update_grade(
        student_id: int = Query(...),
        course_id: int = Query(...),
        grade_update: schemas.EnrollmentUpdate = ...,
        conn: asyncpg.Connection = Depends(get_connection)
):
    """Обновить оценку студента за курс"""

    existing = await conn.fetchrow(
        """
        SELECT student_id, course_id FROM courses.student_course_enrollment 
        WHERE student_id = $1 AND course_id = $2
        """,
        student_id, course_id
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запись на курс не найдена"
        )

    row = await conn.fetchrow(
        """
        UPDATE courses.student_course_enrollment
        SET grade = $1
        WHERE student_id = $2 AND course_id = $3
        RETURNING student_id, course_id, enrollment_date, grade
        """,
        grade_update.grade, student_id, course_id
    )
    return dict(row)


@router.delete("/")
async def unenroll_student(
        student_id: int = Query(...),
        course_id: int = Query(...),
        conn: asyncpg.Connection = Depends(get_connection)
):
    """Отписать студента от курса"""

    result = await conn.execute(
        """
        DELETE FROM courses.student_course_enrollment 
        WHERE student_id = $1 AND course_id = $2
        """,
        student_id, course_id
    )

    if result == "DELETE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запись на курс не найдена"
        )

    return {"message": "Студент успешно отписан от курса"}

@router.get("/", response_model=List[schemas.EnrollmentWithDetails])
async def get_enrollments(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, le=1000),
        student_id: Optional[int] = None,
        course_id: Optional[int] = None,
        conn: asyncpg.Connection = Depends(get_connection)
):
    """Получить список записей на курсы"""

    query = """
        SELECT sce.*, s.first_name, s.last_name, s.group_number, c.title, c.description
        FROM courses.student_course_enrollment sce
        JOIN courses.students s ON sce.student_id = s.id
        JOIN courses.courses c ON sce.course_id = c.id
        WHERE 1=1
    """
    params = []
    param_count = 1

    if student_id:
        query += f" AND sce.student_id = ${param_count}"
        params.append(student_id)
        param_count += 1

    if course_id:
        query += f" AND sce.course_id = ${param_count}"
        params.append(course_id)
        param_count += 1

    query += f" ORDER BY sce.enrollment_date DESC OFFSET ${param_count} LIMIT ${param_count + 1}"
    params.extend([skip, limit])

    try:
        rows = await conn.fetch(query, *params)
    except asyncpg.exceptions.UndefinedTableError:
        return []

    enrollments = []
    for row in rows:
        enrollment_dict = dict(row)
        enrollment_dict['student'] = {
            'id': row['student_id'],
            'first_name': row['first_name'],
            'last_name': row['last_name'],
            'group_number': row['group_number']
        }
        enrollment_dict['course'] = {
            'id': row['course_id'],
            'title': row['title'],
            'description': row['description']
        }
        enrollments.append(enrollment_dict)

    return enrollments
