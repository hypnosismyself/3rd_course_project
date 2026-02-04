from pydantic import BaseModel, EmailStr
from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, EmailStr


class RoleEnum(str, Enum):
    ADMIN = "Администратор"
    TEACHER = "Преподаватель"
    STUDENT = "Студент"

class RoleBase(BaseModel):
    name: str

class Role(RoleBase):
    id: int

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    username: str
    email: EmailStr
    role_id: int


class UserCreate(UserBase):
    password: str
    photo_url: Optional[str] = None
    class Config:
        extra = "ignore"


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    photo_url: Optional[str] = None
    role_id: Optional[int] = None


class User(UserBase):
    id: int
    registration_date_time: datetime
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True


class UserWithRole(User):
    role: Role


class TeacherBase(BaseModel):
    first_name: str
    last_name: str
    qualification: str
    bio: Optional[str] = None


class TeacherCreate(BaseModel):
    username: str
    password: str
    email: EmailStr
    role_id: int
    first_name: str
    last_name: str
    qualification: str
    bio: Optional[str] = None

    class Config:
        extra = "ignore"


class TeacherUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    qualification: Optional[str] = None
    bio: Optional[str] = None


class Teacher(TeacherBase):
    id: int
    user_id: Optional[int] = None

    class Config:
        from_attributes = True


class TeacherWithUser(Teacher):
    user: Optional[User] = None


class StudentBase(BaseModel):
    first_name: str
    last_name: str
    group_number: str


class StudentCreate(BaseModel):
    username: str
    password: str
    email: EmailStr
    role_id: int
    first_name: str
    last_name: str
    group_number: str

    class Config:
        extra = "ignore"


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    group_number: Optional[str] = None

class Student(StudentBase):
    id: int
    user_id: Optional[int] = None

    class Config:
        from_attributes = True

class StudentWithUser(Student):
    user: Optional[User] = None


class CourseBase(BaseModel):
    title: str
    description: str
    duration: int
    teacher_id: int

class CourseCreate(CourseBase):
    class Config:
        extra = "ignore"

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    teacher_id: Optional[int] = None

class Course(CourseBase):
    id: int

    class Config:
        from_attributes = True

class CourseWithTeacher(Course):
    teacher: Teacher


class EnrollmentBase(BaseModel):
    student_id: int
    course_id: int
    enrollment_date: date


class EnrollmentCreate(EnrollmentBase):
    pass

    class Config:
        extra = "ignore"


class EnrollmentUpdate(BaseModel):
    grade: Optional[float] = None


class Enrollment(EnrollmentBase):
    grade: Optional[float] = None

    class Config:
        from_attributes = True


class EnrollmentWithDetails(Enrollment):
    student: Student
    course: Course


class GradeBase(BaseModel):
    student_id: int
    course_id: int
    assignment_title: str
    grade_value: float


class GradeCreate(GradeBase):
    submission_date: date

    class Config:
        extra = "ignore"


class GradeUpdate(BaseModel):
    assignment_title: Optional[str] = None
    grade_value: Optional[float] = None
    submission_date: Optional[date] = None


class Grade(GradeBase):
    id: int
    submission_date: date

    class Config:
        from_attributes = True


class GradeWithDetails(Grade):
    student: Student
    course: Course


class AttachmentBase(BaseModel):
    filename: str
    file_type: str
    storage_path: str


class AttachmentCreate(AttachmentBase):
    uploaded_by_user_id: int

    class Config:
        extra = "ignore"


class Attachment(AttachmentBase):
    id: int
    uploaded_by_user_id: int
    upload_date: datetime

    class Config:
        from_attributes = True


class AttachmentWithUser(Attachment):
    user: User


class ScheduleBase(BaseModel):
    course_id: int
    start_date_time: datetime
    end_date_time: datetime


class ScheduleCreate(ScheduleBase):
    pass

    class Config:
        extra = "ignore"


class ScheduleUpdate(BaseModel):
    start_date_time: Optional[datetime] = None
    end_date_time: Optional[datetime] = None


class Schedule(ScheduleBase):
    id: int

    class Config:
        from_attributes = True


class ScheduleWithCourse(Schedule):
    course: Course


class StudentPerformanceReport(BaseModel):
    student_id: int
    student_name: str
    course_id: int
    course_title: str
    average_grade: float
    completed_assignments: int
    total_assignments: int
    enrollment_date: date


class CourseReport(BaseModel):
    course_id: int
    course_title: str
    teacher_name: str
    total_students: int
    average_grade: float
    start_date: date
    end_date: Optional[date]


class ScheduleReport(BaseModel):
    date: date
    courses: List[Dict[str, Any]]


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None