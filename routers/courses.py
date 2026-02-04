from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List, Optional
import asyncpg
import schemas
from dependencies import get_connection

router = APIRouter(
    prefix="/courses",
    tags=["courses"],
    responses={404: {"description": "Not found"}}
)


@router.post("/", response_model=schemas.Course, status_code=status.HTTP_201_CREATED)
async def create_course(course: schemas.CourseCreate, conn: asyncpg.Connection = Depends(get_connection)):
    """Создать новый курс"""

    async with conn.transaction():
        teacher_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM courses.teachers WHERE id = $1)",
            course.teacher_id
        )
        if not teacher_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Указанный преподаватель не существует"
            )

        row = await conn.fetchrow(
            """
            INSERT INTO courses.courses (title, description, duration, teacher_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, description, duration, teacher_id
            """,
            course.title, course.description, course.duration, course.teacher_id
        )
        return dict(row)


@router.get("/", response_model=List[schemas.CourseWithTeacher])
async def get_courses(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, le=1000),
        search: Optional[str] = None,
        teacher_id: Optional[int] = None,
        conn: asyncpg.Connection = Depends(get_connection)
):
    """Получить список курсов"""
    query = """
        SELECT c.*, t.first_name, t.last_name, t.qualification
        FROM courses.courses c
        JOIN courses.teachers t ON c.teacher_id = t.id
        WHERE 1=1
    """
    params = []
    param_count = 1

    if search:
        query += f" AND (c.title ILIKE ${param_count} OR c.description ILIKE ${param_count})"
        params.append(f"%{search}%")
        param_count += 1

    if teacher_id:
        query += f" AND c.teacher_id = ${param_count}"
        params.append(teacher_id)
        param_count += 1

    query += f" ORDER BY c.id OFFSET ${param_count} LIMIT ${param_count + 1}"
    params.extend([skip, limit])

    rows = await conn.fetch(query, *params)

    courses = []
    for row in rows:
        course_dict = dict(row)
        course_dict['teacher'] = {
            'id': row['teacher_id'],
            'first_name': row['first_name'],
            'last_name': row['last_name'],
            'qualification': row['qualification']
        }
        courses.append(course_dict)

    return courses


@router.get("/{course_id}", response_model=schemas.CourseWithTeacher)
async def get_course(course_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Получить курс по ID"""

    row = await conn.fetchrow(
        """
        SELECT c.*, t.first_name, t.last_name, t.qualification, t.bio
        FROM courses.courses c
        JOIN courses.teachers t ON c.teacher_id = t.id
        WHERE c.id = $1
        """,
        course_id
    )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден"
        )

    course_dict = dict(row)
    course_dict['teacher'] = {
        'id': row['teacher_id'],
        'first_name': row['first_name'],
        'last_name': row['last_name'],
        'qualification': row['qualification'],
        'bio': row['bio']
    }

    return course_dict


@router.put("/{course_id}", response_model=schemas.Course)
async def update_course(course_id: int, course_update: schemas.CourseUpdate, conn: asyncpg.Connection = Depends(get_connection)):
    """Обновить данные курса"""

    existing = await conn.fetchrow(
        "SELECT id FROM courses.courses WHERE id = $1",
        course_id
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден"
        )

    if course_update.teacher_id is not None:
        teacher_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM courses.teachers WHERE id = $1)",
            course_update.teacher_id
        )
        if not teacher_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Указанный преподаватель не существует"
            )

    update_fields = []
    params = []
    param_count = 1

    if course_update.title is not None:
        update_fields.append(f"title = ${param_count}")
        params.append(course_update.title)
        param_count += 1

    if course_update.description is not None:
        update_fields.append(f"description = ${param_count}")
        params.append(course_update.description)
        param_count += 1

    if course_update.duration is not None:
        update_fields.append(f"duration = ${param_count}")
        params.append(course_update.duration)
        param_count += 1

    if course_update.teacher_id is not None:
        update_fields.append(f"teacher_id = ${param_count}")
        params.append(course_update.teacher_id)
        param_count += 1

    if not update_fields:
        row = await conn.fetchrow("SELECT * FROM courses.courses WHERE id = $1", course_id)
        return dict(row)

    params.append(course_id)

    row = await conn.fetchrow(
        f"""
        UPDATE courses.courses
        SET {', '.join(update_fields)}
        WHERE id = ${param_count}
        RETURNING *
        """,
        *params
    )

    return dict(row)


@router.get("/{course_id}/students", response_model=List[schemas.EnrollmentWithDetails])
async def get_course_students(course_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Получить студентов курса"""

    rows = await conn.fetch(
        """
        SELECT sce.*, s.first_name, s.last_name, s.group_number, c.title, c.description
        FROM courses.student_course_enrollment sce
        JOIN courses.students s ON sce.student_id = s.id
        JOIN courses.courses c ON sce.course_id = c.id
        WHERE sce.course_id = $1
        ORDER BY sce.enrollment_date DESC
        """,
        course_id
    )

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


@router.get("/{course_id}/grades")
async def get_course_grades(course_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Получить оценки по курсу"""

    rows = await conn.fetch(
        """
        SELECT g.*, s.first_name, s.last_name, s.group_number
        FROM courses.grades g
        JOIN courses.students s ON g.student_id = s.id
        WHERE g.course_id = $1
        ORDER BY g.submission_date DESC
        """,
        course_id
    )

    return [dict(row) for row in rows]


@router.get("/{course_id}/statistics")
async def get_course_statistics(course_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Получить статистику курса"""

    course_exists = await conn.fetchval(
        "SELECT EXISTS(SELECT 1 FROM courses.courses WHERE id = $1)",
        course_id
    )
    if not course_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден"
        )

    stats = await conn.fetchrow(
        """
        SELECT 
            COUNT(DISTINCT sce.student_id) as total_students,
            COUNT(DISTINCT g.id) as total_assignments,
            AVG(g.grade_value) as average_grade,
            MIN(g.grade_value) as min_grade,
            MAX(g.grade_value) as max_grade
        FROM courses.student_course_enrollment sce
        LEFT JOIN courses.grades g ON sce.student_id = g.student_id AND sce.course_id = g.course_id
        WHERE sce.course_id = $1
        """,
        course_id
    )

    return {
        "course_id": course_id,
        "total_students": stats["total_students"] or 0,
        "total_assignments": stats["total_assignments"] or 0,
        "average_grade": float(stats["average_grade"] or 0),
        "min_grade": float(stats["min_grade"] or 0),
        "max_grade": float(stats["max_grade"] or 0)
    }

@router.get("/{course_id}/students", response_model=List[schemas.EnrollmentWithDetails])
async def get_course_students(course_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Получить студентов курса"""

    try:
        rows = await conn.fetch(
            """
            SELECT sce.*, s.first_name, s.last_name, s.group_number, c.title, c.description
            FROM courses.student_course_enrollment sce
            JOIN courses.students s ON sce.student_id = s.id
            JOIN courses.courses c ON sce.course_id = c.id
            WHERE sce.course_id = $1
            ORDER BY sce.enrollment_date DESC
            """,
            course_id
        )
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

@router.post("/", response_model=schemas.Course, status_code=status.HTTP_201_CREATED)
async def create_course(course: schemas.CourseCreate, conn: asyncpg.Connection = Depends(get_connection)):
    """Создать новый курс"""

    async with conn.transaction():
        row = await conn.fetchrow(
            """
            INSERT INTO courses.courses (title, description, duration, teacher_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, description, duration, teacher_id
            """,
            course.title, course.description, course.duration, course.teacher_id
        )
        return dict(row)
