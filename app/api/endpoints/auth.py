from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut
from app.core.security import hash_password, verify_password, create_access_token
from datetime import timedelta
from jose import JWTError, jwt
from app.core.security import SECRET_KEY, ALGORITHM
from fastapi.security import OAuth2PasswordBearer
import os

router = APIRouter()
## 1. Khai báo schema bảo mật (để hiện nút cái khóa trên Swagger)
# 1. API Đăng ký (Đã có Hash mật khẩu)
@router.post("/register", response_model=UserOut)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email này đã tồn tại!")
    
    # Mã hóa mật khẩu trước khi lưu vào database của Diện
    new_user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password) # PHẢI CÓ HÀM NÀY
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# 2. API Đăng nhập để lấy Token
@router.post("/login")
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    # Kiểm tra email
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng!")
    
    # Tạo Token trả về cho Frontend
    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")))
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

## 2. Máy quét vé (Dependency)
# Khai báo đường dẫn lấy Token để Swagger UI hiện nút "Authorize" (cái khóa)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
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
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user
##3. API "Thông tin của tôi" - Kiểm tra Token
@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    API này dùng để kiểm tra xem Token có hoạt động không.
    Nếu có Token chuẩn, nó sẽ trả về thông tin của chính người đang đăng nhập.
    """
    return current_user