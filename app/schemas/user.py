from pydantic import BaseModel, EmailStr
from datetime import datetime

# Quy tắc khi người dùng gửi dữ liệu Đăng ký lên
class UserCreate(BaseModel):
    email: EmailStr
    password: str

# Quy tắc khi trả dữ liệu về (không được trả mật khẩu về cho FE)
class UserOut(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True