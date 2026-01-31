from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID

# Quy tắc khi người dùng gửi dữ liệu Đăng ký lên
class UserCreate(BaseModel):
    email: EmailStr
    password: str

# Quy tắc khi trả dữ liệu về (không được trả mật khẩu về cho FE)
class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True