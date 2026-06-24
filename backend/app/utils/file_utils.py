"""File handling helpers for secure uploads."""
import shutil
import uuid
from pathlib import Path

from app.config import settings

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_BYTES = 500 * 1024 * 1024  # 500 MB


def save_upload(upload_file) -> tuple[str, Path]:
    """Persist an UploadFile to disk and return (video_id, path).

    The on-disk name is a uuid (never the user-supplied filename) to avoid
    path traversal / collisions.
    """
    original = Path(upload_file.filename or "video.mp4")
    ext = original.suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext or '(none)'}")

    video_id = uuid.uuid4().hex
    dest = settings.upload_path / f"{video_id}{ext}"

    with dest.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    if dest.stat().st_size > MAX_BYTES:
        dest.unlink(missing_ok=True)
        raise ValueError("File exceeds the 500 MB size limit")

    return video_id, dest
