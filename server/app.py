"""FastAPI entry point for the dummy inference server."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from server.api import router as inference_router
from server.providers.dummy import DummyInferenceProvider


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Load the inference provider once when the server starts."""

    provider = DummyInferenceProvider()
    await provider.load_model()
    app.state.inference_provider = provider
    yield


app = FastAPI(title="LLM Demo Dummy Inference Server", lifespan=lifespan)
app.include_router(inference_router)
