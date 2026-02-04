from fastapi import APIRouter, HTTPException, Query, status, Depends
import asyncpg
from datetime import date, datetime
from dependencies import get_connection

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    responses={404: {"description": "Not found"}}
)


@router.get("/students-by-course/{course_id}")
async def get_students_by_course_report(course_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Отчет: Список студентов по курсу"""

    rows = await conn.fetch(
        """
        SELECT 
            s.id as student_id,
            s.first_name,
            s.last_name,
            s.group_number,
            sce.enrollment_date,
            sce.grade as final_grade,
            COUNT(g.id) as assignments_count,
            AVG(g.grade_value) as average_grade
        FROM courses.student_course_enrollment sce
        JOIN courses.students s ON sce.student_id = s.id
        LEFT JOIN courses.grades g ON sce.student_id = g.student_id AND sce.course_id = g.course_id
        WHERE sce.course_id = $1
        GROUP BY s.id, s.first_name, s.last_name, s.group_number, sce.enrollment_date, sce.grade
        ORDER BY s.last_name, s.first_name
        """,
        course_id
    )

    course_info = await conn.fetchrow(
        "SELECT title, description FROM courses.courses WHERE id = $1",
        course_id
    )

    if not course_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден"
        )

    return {
        "course_id": course_id,
        "course_title": course_info['title'],
        "course_description": course_info['description'],
        "generated_at": datetime.now(),
        "total_students": len(rows),
        "students": [dict(row) for row in rows]
    }


@router.get("/performance-report/{course_id}")
async def get_performance_report(course_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Отчет по успеваемости студентов"""

    rows = await conn.fetch(
        """
        SELECT 
            s.id as student_id,
            CONCAT(s.first_name, ' ', s.last_name) as student_name,
            s.group_number,
            COUNT(g.id) as assignments_completed,
            AVG(g.grade_value) as average_grade,
            MIN(g.grade_value) as min_grade,
            MAX(g.grade_value) as max_grade,
            sce.grade as final_grade,
            CASE 
                WHEN AVG(g.grade_value) >= 4.5 THEN 'Отлично'
                WHEN AVG(g.grade_value) >= 3.5 THEN 'Хорошо'
                WHEN AVG(g.grade_value) >= 2.5 THEN 'Удовлетворительно'
                ELSE 'Неудовлетворительно'
            END as performance_level
        FROM courses.student_course_enrollment sce
        JOIN courses.students s ON sce.student_id = s.id
        LEFT JOIN courses.grades g ON sce.student_id = g.student_id AND sce.course_id = g.course_id
        WHERE sce.course_id = $1
        GROUP BY s.id, s.first_name, s.last_name, s.group_number, sce.grade
        ORDER BY average_grade DESC NULLS LAST
        """,
        course_id
    )

    course_info = await conn.fetchrow(
        "SELECT title FROM courses.courses WHERE id = $1",
        course_id
    )

    return {
        "course_id": course_id,
        "course_title": course_info['title'] if course_info else "Неизвестный курс",
        "generated_at": datetime.now(),
        "performance_summary": {
            "total_students": len(rows),
            "excellent": len([r for r in rows if r['performance_level'] == 'Отлично']),
            "good": len([r for r in rows if r['performance_level'] == 'Хорошо']),
            "satisfactory": len([r for r in rows if r['performance_level'] == 'Удовлетворительно']),
            "unsatisfactory": len([r for r in rows if r['performance_level'] == 'Неудовлетворительно'])
        },
        "students": [dict(row) for row in rows]
    }


@router.get("/course-report")
async def get_course_report(conn: asyncpg.Connection = Depends(get_connection)):
    """Отчет по курсам и преподавателям"""

    rows = await conn.fetch(
        """
        SELECT 
            c.id as course_id,
            c.title,
            c.description,
            c.duration,
            CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
            t.qualification,
            COUNT(DISTINCT sce.student_id) as enrolled_students,
            COUNT(DISTINCT g.id) as total_assignments,
            AVG(g.grade_value) as average_grade
        FROM courses.courses c
        JOIN courses.teachers t ON c.teacher_id = t.id
        LEFT JOIN courses.student_course_enrollment sce ON c.id = sce.course_id
        LEFT JOIN courses.grades g ON c.id = g.course_id
        GROUP BY c.id, c.title, c.description, c.duration, t.id, t.first_name, t.last_name, t.qualification
        ORDER BY c.title
        """
    )

    return {
        "generated_at": datetime.now(),
        "total_courses": len(rows),
        "courses": [dict(row) for row in rows]
    }


@router.get("/schedule-report/{start_date}/{end_date}")
async def get_schedule_report(start_date: date, end_date: date, conn: asyncpg.Connection = Depends(get_connection)):
    """Отчет: Расписание курсов и занятий"""

    rows = await conn.fetch(
        """
        SELECT 
            DATE(s.start_date_time) as schedule_date,
            c.title as course_title,
            CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
            s.start_date_time,
            s.end_date_time,
            EXTRACT(HOUR FROM (s.end_date_time - s.start_date_time)) as duration_hours,
            COUNT(DISTINCT sce.student_id) as enrolled_students
        FROM courses.schedule s
        JOIN courses.courses c ON s.course_id = c.id
        JOIN courses.teachers t ON c.teacher_id = t.id
        LEFT JOIN courses.student_course_enrollment sce ON c.id = sce.course_id
        WHERE DATE(s.start_date_time) BETWEEN $1 AND $2
        GROUP BY DATE(s.start_date_time), c.title, t.first_name, t.last_name, 
                 s.start_date_time, s.end_date_time
        ORDER BY s.start_date_time
        """,
        start_date, end_date
    )

    schedule_by_day = {}
    for row in rows:
        day = row['schedule_date'].strftime('%Y-%m-%d')
        if day not in schedule_by_day:
            schedule_by_day[day] = []

        schedule_by_day[day].append({
            'course_title': row['course_title'],
            'teacher_name': row['teacher_name'],
            'start_time': row['start_date_time'].strftime('%H:%M'),
            'end_time': row['end_date_time'].strftime('%H:%M'),
            'duration_hours': float(row['duration_hours']),
            'enrolled_students': row['enrolled_students']
        })

    return {
        "start_date": start_date,
        "end_date": end_date,
        "generated_at": datetime.now(),
        "schedule_by_day": schedule_by_day
    }


@router.get("/student-performance/{student_id}")
async def get_student_performance_report(student_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Ведомость успеваемости студента"""

    student_info = await conn.fetchrow(
        """
        SELECT s.*, u.username, u.email
        FROM courses.students s
        JOIN courses.users u ON s.user_id = u.id
        WHERE s.id = $1
        """,
        student_id
    )

    if not student_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Студент не найден"
        )

    rows = await conn.fetch(
        """
        SELECT 
            c.id as course_id,
            c.title as course_title,
            c.description,
            CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
            sce.enrollment_date,
            sce.grade as final_grade,
            COUNT(g.id) as assignments_count,
            AVG(g.grade_value) as average_grade,
            MIN(g.grade_value) as min_grade,
            MAX(g.grade_value) as max_grade
        FROM courses.student_course_enrollment sce
        JOIN courses.courses c ON sce.course_id = c.id
        JOIN courses.teachers t ON c.teacher_id = t.id
        LEFT JOIN courses.grades g ON sce.student_id = g.student_id AND sce.course_id = g.course_id
        WHERE sce.student_id = $1
        GROUP BY c.id, c.title, c.description, t.first_name, t.last_name, sce.enrollment_date, sce.grade
        ORDER BY sce.enrollment_date DESC
        """,
        student_id
    )

    total_stats = await conn.fetchrow(
        """
        SELECT 
            COUNT(DISTINCT sce.course_id) as total_courses,
            COUNT(g.id) as total_assignments,
            AVG(g.grade_value) as overall_average
        FROM courses.student_course_enrollment sce
        LEFT JOIN courses.grades g ON sce.student_id = g.student_id AND sce.course_id = g.course_id
        WHERE sce.student_id = $1
        """,
        student_id
    )

    return {
        "student": {
            "id": student_info['id'],
            "name": f"{student_info['first_name']} {student_info['last_name']}",
            "group_number": student_info['group_number'],
            "username": student_info['username'],
            "email": student_info['email']
        },
        "generated_at": datetime.now(),
        "overall_statistics": {
            "total_courses": total_stats['total_courses'] or 0,
            "total_assignments": total_stats['total_assignments'] or 0,
            "overall_average": float(total_stats['overall_average'] or 0)
        },
        "courses": [dict(row) for row in rows]
    }


@router.get("/export/csv/students/{course_id}")
async def export_students_csv(course_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Экспорт списка студентов курса в CSV"""

    rows = await conn.fetch(
        """
        SELECT 
            s.first_name,
            s.last_name,
            s.group_number,
            sce.enrollment_date,
            sce.grade as final_grade
        FROM courses.student_course_enrollment sce
        JOIN courses.students s ON sce.student_id = s.id
        WHERE sce.course_id = $1
        ORDER BY s.last_name, s.first_name
        """,
        course_id
    )

    output = []
    output.append("Имя,Фамилия,Группа,Дата записи,Итоговая оценка")

    for row in rows:
        output.append(f"{row['first_name']},{row['last_name']},{row['group_number']},"
                      f"{row['enrollment_date']},{row['final_grade'] or ''}")

    return {
        "filename": f"students_course_{course_id}.csv",
        "content": "\n".join(output),
        "content_type": "text/csv"
    }

@router.get("/students-by-course/{course_id}")
async def get_students_by_course_report(course_id: int, conn: asyncpg.Connection = Depends(get_connection)):
    """Отчет: Список студентов по курсу"""

    try:
        rows = await conn.fetch(
            """
            SELECT 
                s.id as student_id,
                s.first_name,
                s.last_name,
                s.group_number,
                sce.enrollment_date,
                sce.grade as final_grade,
                COUNT(g.id) as assignments_count,
                AVG(g.grade_value) as average_grade
            FROM courses.student_course_enrollment sce
            JOIN courses.students s ON sce.student_id = s.id
            LEFT JOIN courses.grades g ON sce.student_id = g.student_id AND sce.course_id = g.course_id
            WHERE sce.course_id = $1
            GROUP BY s.id, s.first_name, s.last_name, s.group_number, sce.enrollment_date, sce.grade
            ORDER BY s.last_name, s.first_name
            """,
            course_id
        )
    except asyncpg.exceptions.UndefinedTableError:
        # Таблица отсутствует — возвращаем пустой отчёт
        return {
            "course_id": course_id,
            "course_title": None,
            "course_description": None,
            "generated_at": datetime.now(),
            "total_students": 0,
            "students": []
        }

    course_info = None
    try:
        course_info = await conn.fetchrow("SELECT title, description FROM courses.courses WHERE id = $1", course_id)
    except asyncpg.exceptions.UndefinedTableError:
        course_info = None

    if not course_info:
        return {
            "course_id": course_id,
            "course_title": None,
            "course_description": None,
            "generated_at": datetime.now(),
            "total_students": len(rows),
            "students": [dict(row) for row in rows]
        }

    return {
        "course_id": course_id,
        "course_title": course_info['title'],
        "course_description": course_info['description'],
        "generated_at": datetime.now(),
        "total_students": len(rows),
        "students": [dict(row) for row in rows]
    }
