import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

# 1. Import Base và Model để Alembic thấy bảng dữ liệu của Diện
from app.db.database import Base
from app.models.user import User 

# Load file .env
load_dotenv()

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 2. Gán Metadata
target_metadata = Base.metadata

def run_migrations_online() -> None:
    # Lấy URL từ .env để bảo mật mật khẩu
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = os.getenv("DATABASE_URL")

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

# Giữ nguyên phần logic cuối file
if context.is_offline_mode():
    # Gọi hàm offline tương tự (nếu cần) hoặc để mặc định
    pass 
else:
    run_migrations_online()