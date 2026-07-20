"""Configuration values for the web application.

The web application talks to an inference server through HTTP.  During local
development this URL points to the dummy inference server.  In production or
for a real demonstration, change the environment variable only; application
code does not need to change.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    inference_server_url: str = "http://127.0.0.1:8001"
    inference_timeout_seconds: float = 10.0

    model_config = SettingsConfigDict(env_prefix="LLM_DEMO_")


settings = Settings()
