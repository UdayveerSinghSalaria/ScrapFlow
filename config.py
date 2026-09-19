"""Environment-backed application settings."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

_config_dir = Path(__file__).parent
_env_file = _config_dir / ".env"
_env_example_file = _config_dir / ".env.example"
load_dotenv(_env_file if _env_file.exists() else _env_example_file)


@dataclass(frozen=True)
class Settings:
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
    classification_timeout: float = float(os.getenv("CLASSIFICATION_TIMEOUT", "30"))
    ai_provider: str = os.getenv("AI_PROVIDER", "gemini").lower()
    fallback_enabled: bool = True


settings = Settings()
