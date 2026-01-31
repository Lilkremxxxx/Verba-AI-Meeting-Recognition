import os
import hashlib
from datetime import datetime, timedelta 
from typing import Optional               
from jose import JWTError, jwt
from passlib.context import CryptContext
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Lấy thông số từ file .env của Diện
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))


# Thiết lập thuật toán mã hóa bcrypt với backend cụ thể
pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto",
    bcrypt__rounds=12,
    bcrypt__ident="2b"
)

def _preprocess_password(password: str) -> str:
    """
    Xử lý password trước khi hash để tránh lỗi bcrypt 72 bytes limit.
    Hash bằng SHA256 trước rồi mới dùng bcrypt.
    """
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def hash_password(password: str):
    preprocessed = _preprocess_password(password)
    return pwd_context.hash(preprocessed)

def verify_password(plain_password: str, hashed_password: str):
    preprocessed = _preprocess_password(plain_password)
    return pwd_context.verify(preprocessed, hashed_password)
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt