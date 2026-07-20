"""FastAPI entry point for the browser-facing web application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from client.routers.api import router as api_router

app = FastAPI(title="LLM Demo Web App")

# The browser is expected to access only localhost.  CORS remains restrictive
# enough for local development while still allowing common localhost ports.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(api_router)
