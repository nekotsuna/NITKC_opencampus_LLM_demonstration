"""FastAPI entry point for the inference server."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from server.api import router as inference_router
from server.config import settings
from server.providers.base import BaseInferenceProvider
from server.providers.dummy import DummyInferenceProvider
from server.providers.llama import LlamaInferenceProvider


def create_inference_provider() -> BaseInferenceProvider:
    """Create the provider that matches the current environment.

    `LLM_DEMO_SERVER_APP_ENV=test` uses the dummy provider for development and
    automated checks.  `LLM_DEMO_SERVER_APP_ENV=production` uses the real Llama
    provider.  Changing `.env` is enough to switch providers.
    """

    if settings.app_env == "production":
        return LlamaInferenceProvider(
            model_path=settings.llama_model_path,
            max_input_tokens=settings.max_input_tokens,
        )

    return DummyInferenceProvider()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Load the inference provider once when the server starts."""

    provider = create_inference_provider()
    await provider.load_model()
    app.state.inference_provider = provider
    yield


app = FastAPI(title="LLM Demo Inference Server", lifespan=lifespan)
app.include_router(inference_router)
