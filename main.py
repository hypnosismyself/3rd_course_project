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

    # Убедимся, что директория uploads существует
    os.makedirs(UPLOADS_DIR, exist_ok=True)

    yield

    print("Остановка приложения...")
    await app.state.pool.close()


app = FastAPI(
    title="Roles API",
    description="API для управления ролями пользователей",
    version="1.0.0",
    lifespan=lifespan
)

# Регистрируем API роутеры (сначала API)
app.include_router(roles.router)
app.include_router(users.router)
app.include_router(teachers.router)
app.include_router(students.router)
app.include_router(courses.router)
app.include_router(enrollments.router)
app.include_router(grades.router)
app.include_router(schedule.router)
app.include_router(reports.router)

# Монтируем /uploads (загрузки) — отдача файлов загрузок
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Монтируем статику на корень — это позволит отдавать /css/... /js/... /pages/...
# html=True не обязателен, но полезен для прямого запроса "/" или "/index.html"
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

# SPA fallback: возвращаем index.html для "чистых" путей (не api, не static, не uploads, не docs)
@app.get("/{full_path:path}", response_class=HTMLResponse)
async def spa_fallback(full_path: str, request: Request):
    # Пути, которые НЕ должны попадать в SPA fallback
    forbidden_prefixes = ("api", "static", "uploads", "docs", "redoc", "openapi.json")
    # Если путь явно начинается с одного из префиксов — вернуть 404, чтобы обычный роутер/статик промаршрутили
    if any(full_path.startswith(p) for p in forbidden_prefixes):
        return HTMLResponse("Not found", status_code=404)

    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("Frontend not found", status_code=404)