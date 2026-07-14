from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # App
    app_name: str = "Kosh API"
    log_level: str = "INFO"
    environment: str = "development"  # "development" | "staging" | "production"

    # CORS — comma-separated list of allowed origins
    cors_origins_str: str = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.cors_origins_str.split(",") if o.strip()]

    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/kosh"

    # JWT / Auth
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # OTP (Twilio or similar)
    otp_provider: str = "mock"          # "twilio" | "mock"
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    # AWS S3 (invoice photo storage)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-south-1"
    s3_bucket_name: str = "kosh-invoices"
    s3_prefix: str = "invoices"

    # Gemini (AI recommendations / OCR)
    gemini_api_key: str = ""

    # WhatsApp
    whatsapp_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_verify_token: str = ""
    sync_secret: str = ""  # shared secret for Mise → Kosh sync calls

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
