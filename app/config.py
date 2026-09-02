"""
Centralised configuration using pydantic-settings.
All values come from environment variables (or .env file via python-dotenv).
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Security
    jwt_secret_key: str = ""  # REQUIRED in production — checked at startup
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    # Database
    database_url: str = "sqlite:///./textile_broker.db"

    # Environment
    env: str = "dev"  # "dev" | "prod"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    # Production default — override in .env for local dev:
    # GOOGLE_REDIRECT_URI=http://localhost:5173/google-callback
    google_redirect_uri: str = "https://textile-broker.up.railway.app/google-callback"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.env.lower() == "dev"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if not s.jwt_secret_key:
        # In dev, use a default insecure key and warn; in prod, hard-fail
        if s.env.lower() == "prod":
            raise RuntimeError(
                "JWT_SECRET_KEY environment variable is not set. "
                "Set it before starting the server in production."
            )
        # Dev fallback — clearly insecure
        s.jwt_secret_key = "dev-only-insecure-key-DO-NOT-USE-IN-PROD"
        print("WARNING: JWT_SECRET_KEY not set — using insecure dev default. Set .env for real use.")
    return s


# Module-level singleton for easy import
settings = get_settings()
