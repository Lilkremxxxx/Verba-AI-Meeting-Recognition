import os
from pathlib import Path
from .base import StorageError, StorageService

class LocalStorageService(StorageService):
    def __init__(self, base_dir="uploads", base_url="http://localhost:8000"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)
        self.base_url = base_url

    def save_file(self, file_obj, storage_path) -> str:
        full_path = self.base_dir / storage_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(full_path, "wb") as f:
                f.write(file_obj.read())
            return str(full_path)
        except Exception as e:
            raise StorageError(f"Failed to save file: {e}")

    def delete(self, storage_path: str) -> bool:
        full_path = self.base_dir / storage_path
        try:
            os.remove(full_path)
            return True
        except FileNotFoundError:
            return False
        except Exception as e:
            raise StorageError(f"Failed to delete file: {e}")

    def get_url(self, storage_path: str) -> str:
        # Trả về full URL để frontend có thể load audio từ CORS domain khác
        return f"{self.base_url}/media/{storage_path}"

    def exists(self, storage_path: str) -> bool:
        return (self.base_dir / storage_path).exists()
