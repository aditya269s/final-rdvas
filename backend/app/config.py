"""Application configuration loaded from environment / .env."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/smartroad"
    upload_dir: str = "app/uploads"
    processed_dir: str = "app/processed_videos"

    yolo_model: str = "yolov8n.pt"
    device: str = "auto"
    confidence: float = 0.45
    frame_skip: int = 1
    tracker: str = "bytetrack"

    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def upload_path(self) -> Path:
        return BASE_DIR / self.upload_dir

    @property
    def processed_path(self) -> Path:
        return BASE_DIR / self.processed_dir

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
settings.upload_path.mkdir(parents=True, exist_ok=True)
settings.processed_path.mkdir(parents=True, exist_ok=True)
