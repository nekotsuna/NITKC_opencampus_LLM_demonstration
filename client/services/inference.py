"""Client-side service for calling the inference server."""

from typing import List

import httpx
from pydantic import BaseModel, Field

from client.config import settings


class GenerateRequest(BaseModel):
    """Request body accepted by both the web app and inference server."""

    tokens: List["TokenItem"] = Field(
        ...,
        description="Token sequence sent to the language model.",
    )
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

    decoded_text: str
    tokens: List[TokenItem]
    table: List[ProbabilityItem]


class TokenizeRequest(BaseModel):
    """Request body for tokenizing arbitrary text."""

    text: str = Field(..., description="Text to tokenize.")


class TokenizeResponse(BaseModel):
    """Response body returned by the tokenize API."""

    tokens: List[TokenItem]


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

    response_json = await _post_to_inference_server(
        path="/generate",
        body=request_body.model_dump(),
    )

    try:
        return GenerateResponse.model_validate(response_json)
    except ValueError as error:
        raise InferenceServiceError(
            "推論サーバから不正なgenerateレスポンスが返されました。"
        ) from error


async def tokenize_text(request_body: TokenizeRequest) -> TokenizeResponse:
    """Forward a tokenize request to the configured inference server."""

    response_json = await _post_to_inference_server(
        path="/tokenize",
        body=request_body.model_dump(),
    )

    try:
        return TokenizeResponse.model_validate(response_json)
    except ValueError as error:
        raise InferenceServiceError(
            "推論サーバから不正なtokenizeレスポンスが返されました。"
        ) from error


async def _post_to_inference_server(path: str, body: dict) -> dict:
    """POST JSON to the inference server and return parsed JSON."""

    request_url = f"{settings.inference_server_url.rstrip('/')}{path}"
    timeout = httpx.Timeout(settings.inference_timeout_seconds)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(request_url, json=body)
            response.raise_for_status()
            return response.json()
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
    except ValueError as error:
        raise InferenceServiceError(
            "推論サーバからJSONではないレスポンスが返されました。"
        ) from error
