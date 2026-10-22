import os
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "ChainMind AI — Intelligent Supply Chain Copilot"
    API_V1_STR: str = "/api/v1"
    
    # Base directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "app" / "data"
    DB_PATH: Path = BASE_DIR / "chainmind.db"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{DB_PATH}"
    
    # LLM Settings (Groq API free tier + fallback)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # App configs
    DEFAULT_SERVICE_LEVEL_Z: float = 1.65  # 95% service level
    STOCKOUT_ALERT_DAYS_THRESHOLD: int = 14
    CRITICAL_SUPPLIER_RISK_THRESHOLD: float = 65.0
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
