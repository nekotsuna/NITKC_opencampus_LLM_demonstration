"""Configuration for the inference server.

Values are loaded from environment variables and from a local `.env` file.
The `.env` file is intentionally ignored by Git, so each environment can choose
its own provider without changing application code.
"""

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


AppEnvironment = Literal["test", "production"]


class ServerSettings(BaseSettings):
    """Runtime settings for the inference server."""

    app_env: AppEnvironment = Field(
        default="test",
        description="test uses dummy.py, production uses llama.py.",
    )
    llama_model_path: str = Field(
        default="../kadaikenkyu/Meta-Llama-3.1-8B-Instruct",
        description="Local path or Hugging Face model ID for the Llama provider.",
    )
    max_input_tokens: int = Field(
        default=1024,
        ge=1,
        description="Maximum number of input tokens accepted by the server.",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="LLM_DEMO_SERVER_",
    )


settings = ServerSettings()
