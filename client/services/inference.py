"""Client-side service for calling the inference server."""

from typing import List

import httpx
from pydantic import BaseModel, Field

from client.config import settings


class GenerateRequest(BaseModel):
    """Request body accepted by both the web app and inference server."""

    text: str = Field(..., description="Text sent to the language model.")
    top_k: int = Field(
        ...,
        ge=1,
        le=256,
        description="Number of next-token candidates to request.",
    )


class TokenItem(BaseModel):
    """A tokenized part of the input text."""

    token_id: int
    token: str


class ProbabilityItem(BaseModel):
    """One candidate token returned by the inference server."""

    token_id: int
    rank: int
    token: str
    probability: float


class GenerateResponse(BaseModel):
    """Response body returned by both the web app and inference server."""

    tokens: List[TokenItem]
    table: List[ProbabilityItem]


class InferenceServiceError(Exception):
    """Raised when the inference server cannot return a valid response."""


async def generate_next_token_candidates(
    request_body: GenerateRequest,
) -> GenerateResponse:
    """Forward a generation request to the configured inference server.

    The web backend intentionally does not keep history or model state.  It only
    validates the browser request, forwards it to the inference API, and returns
    the parsed JSON response.  This keeps the real inference server and dummy
    server interchangeable.
    """

    generate_url = f"{settings.inference_server_url.rstrip('/')}/generate"
    timeout = httpx.Timeout(settings.inference_timeout_seconds)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                generate_url,
                json=request_body.model_dump(),
            )
            response.raise_for_status()
    except httpx.TimeoutException as error:
        raise InferenceServiceError("推論サーバへの接続がタイムアウトしました。") from error
    except httpx.HTTPStatusError as error:
        status_code = error.response.status_code
        raise InferenceServiceError(
            f"推論サーバがHTTPエラーを返しました: {status_code}"
        ) from error
    except httpx.RequestError as error:
        raise InferenceServiceError(
            "推論サーバに接続できません。SSHトンネルまたはURL設定を確認してください。"
        ) from error

    try:
        return GenerateResponse.model_validate(response.json())
    except ValueError as error:
        raise InferenceServiceError(
            "推論サーバから不正なJSONレスポンスが返されました。"
        ) from error
