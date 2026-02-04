from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv
from schemas import TokenData

load_dotenv()

SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = os.environ.get("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

security = HTTPBearer()

def _normalize_role(role: Optional[str]) -> Optional[str]:
    if not role:
        return None
    r = role.lower()
    if "админ" in r or "admin" in r:
        return "admin"
    if "преподав" in r or "teacher" in r:
        return "teacher"
    if "студ" in r or "student" in r:
        return "student"
    return r

class AuthHandler:
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
        token = credentials.credentials
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            user_id: int = payload.get("user_id")
            role: str = payload.get("role")

            if username is None or user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            normalized = _normalize_role(role)
            return TokenData(username=username, user_id=user_id, role=normalized)
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    @staticmethod
    async def verify_admin(token_data: TokenData = Depends(verify_token)):
        if token_data.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return token_data

    @staticmethod
    async def verify_teacher(token_data: TokenData = Depends(verify_token)):
        if token_data.role not in ["admin", "teacher"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return token_data

    @staticmethod
    async def verify_student(token_data: TokenData = Depends(verify_token)):
        return token_data