from fastapi import APIRouter, HTTPException, Query, status, UploadFile, File, Depends
import asyncpg
import schemas
from database import verify_password
from auth import AuthHandler, _normalize_role
from datetime import datetime, timedelta
import time
import os
import shutil
from dependencies import get_connection

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}}
)

auth_handler = AuthHandler()

@router.post("/login")
async def login(login_data: schemas.LoginRequest, conn: asyncpg.Connection = Depends(get_connection)):
    """Аутентификация пользователя"""
    user = await conn.fetchrow(
        """
        SELECT u.id, u.username, u.password_hash, r.name as role_name
        FROM courses.users u
        JOIN courses.roles r ON u.role_id = r.id
        WHERE u.username = $1
        """,
        login_data.username
    )

    if not user or not await verify_password(login_data.password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверное имя пользователя или пароль")

    # Нормализуем роль в токене (чтобы фр��нт и auth.verify_* использовали единый набор значений)
    raw_role = user.get('role_name')
    token_role = _normalize_role(raw_role) or raw_role

    access_token = auth_handler.create_access_token(
        data={
            "sub": user['username'],
            "user_id": user['id'],
            "role": token_role
        },
        expires_delta=timedelta(minutes=30)
    )

    return {"access_token": access_token, "token_type": "bearer"}

# ... остальные endpoint'ы остаются те же, только в upload_photo меняем путь на /uploads/...
@router.post("/{user_id}/upload-photo")
async def upload_user_photo(
        user_id: int,
        file: UploadFile = File(...),
        conn: asyncpg.Connection = Depends(get_connection)
):
    """Загрузить фотографию пользователя"""
    user = await conn.fetchrow("SELECT id FROM courses.users WHERE id = $1", user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    # Папка uploads должна быть смонтирована в main.py как /uploads
    upload_dir = os.path.join("uploads", "photos")
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"user_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)

    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # URL, доступный клиентам (main.py должен монтировать /uploads)
    photo_url = f"/uploads/photos/{unique_filename}"

    await conn.execute("UPDATE courses.users SET photo_url = $1 WHERE id = $2", photo_url, user_id)

    return {"filename": unique_filename, "photo_url": photo_url}

@router.post("/{user_id}/upload-photo")
async def upload_photo(user_id: int, file: UploadFile = File(...), conn = Depends(get_connection)):
    # simple checks
    if file.content_type.split('/')[0] != 'image':
        raise HTTPException(status_code=415, detail="Только изображения поддерживаются")
    contents = await file.read()
    # optionally check size
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Файл слишком большой (макс 5MB)")
    # save file (example)
    upload_dir = os.path.join('static', 'uploads', 'photos')
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"user_{user_id}_{int(time.time())}_{file.filename}"
    path = os.path.join(upload_dir, filename)
    with open(path, 'wb') as f:
        f.write(contents)
    photo_url = f"/uploads/photos/{filename}"
    # update DB (best-effort)
    try:
        await conn.execute("UPDATE courses.users SET photo_url = $1 WHERE id = $2", photo_url, user_id)
    except Exception:
        pass
    return {"photo_url": photo_url, "filename": filename}