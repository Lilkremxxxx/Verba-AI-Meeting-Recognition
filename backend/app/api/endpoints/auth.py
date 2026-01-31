from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import asyncpg
from db.session import get_db
from schemas.user import UserCreate, UserOut
from core.security import hash_password, verify_password, create_access_token
from datetime import timedelta
from jose import JWTError, jwt
from core.security import SECRET_KEY, ALGORITHM
from fastapi.security import OAuth2PasswordBearer
import os

router = APIRouter()
## 1. Khai báo schema bảo mật (để hiện nút cái khóa trên Swagger)
# 1. API Đăng ký (Đã có Hash mật khẩu)
@router.post("/register", response_model=UserOut)
async def register(user_in: UserCreate, db: asyncpg.Connection = Depends(get_db)):
    # Kiểm tra email đã tồn tại chưa
    existing_user = await db.fetchrow(
        "SELECT id, email FROM users WHERE email = $1",
        user_in.email
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="Email này đã tồn tại!")
    
    # Mã hóa mật khẩu trước khi lưu vào database
    hashed_pwd = hash_password(user_in.password)
    
    # Thêm user mới vào database
    new_user = await db.fetchrow(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
        user_in.email,
        hashed_pwd
    )
    
    return UserOut(id=new_user["id"], email=new_user["email"], created_at=new_user["created_at"])

# 2. API Đăng nhập để lấy Token
@router.post("/login")
async def login(db: asyncpg.Connection = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    # Kiểm tra email
    user = await db.fetchrow(
        "SELECT id, email, password_hash FROM users WHERE email = $1",
        form_data.username
    )
    
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng!")
    
    # Tạo Token trả về cho Frontend
    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")))
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

## 2. Máy quét vé (Dependency)
# Khai báo đường dẫn lấy Token để Swagger UI hiện nút "Authorize" (cái khóa)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(db: asyncpg.Connection = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực quyền truy cập!",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Giải mã Token mà Diện đã cấp
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Tìm người dùng trong Database
    user = await db.fetchrow(
        "SELECT id, email, created_at FROM users WHERE email = $1",
        email
    )
    if user is None:
        raise credentials_exception
    
    return UserOut(id=user["id"], email=user["email"], created_at=user["created_at"])
##3. API "Thông tin của tôi" - Kiểm tra Token
@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: UserOut = Depends(get_current_user)):
    """
    API này dùng để kiểm tra xem Token có hoạt động không.
    Nếu có Token chuẩn, nó sẽ trả về thông tin của chính người đang đăng nhập.
    """
    return current_user