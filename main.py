from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from routers import roles, users, teachers, schedule, students, grades, courses, enrollments, reports
from contextlib import asynccontextmanager
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Запуск приложения...")
    DATABASE_URL = os.getenv("DATABASE_URL")
    app.state.pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)

    os.makedirs(UPLOADS_DIR, exist_ok=True)

    yield

    print("Остановка приложения...")
    await app.state.pool.close()


app = FastAPI(
    title="Courses API",
    description="API для управления онлайн курсами",
    version="26.1.0",
    lifespan=lifespan
)

app.include_router(roles.router)
app.include_router(users.router)
app.include_router(teachers.router)
app.include_router(students.router)
app.include_router(courses.router)
app.include_router(enrollments.router)
app.include_router(grades.router)
app.include_router(schedule.router)
app.include_router(reports.router)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

@app.get("/{full_path:path}", response_class=HTMLResponse)
async def spa_fallback(full_path: str, request: Request):
    forbidden_prefixes = ("api", "static", "uploads", "docs", "redoc", "openapi.json")

    if any(full_path.startswith(p) for p in forbidden_prefixes):
        return HTMLResponse("Not found", status_code=404)

    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("Frontend not found", status_code=404)
