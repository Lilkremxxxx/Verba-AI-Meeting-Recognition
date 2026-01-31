import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Xác định đường dẫn file .env và nạp dữ liệu
# Path(__file__) giúp Python tìm đúng file .env dù bạn chạy lệnh từ thư mục nào
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Lấy giá trị qua nhãn "DATABASE_URL"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Kiểm tra xem đã đọc được chưa để tránh lỗi None
if SQLALCHEMY_DATABASE_URL is None:
    raise ValueError("LỖI: Không tìm thấy DATABASE_URL trong file .env. Diện kiểm tra lại vị trí file nhé!")

# 2. Tạo "động cơ" kết nối
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 3. Tạo phiên làm việc (Session)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Tạo lớp nền (Base) để vẽ các bảng dữ liệu
Base = declarative_base()

# Hàm bổ trợ để mở/đóng kết nối tự động
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()