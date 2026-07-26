"""HTTP API for the inference server."""

from fastapi import APIRouter, HTTPException, Request, status

from server.model import (
    GenerateRequest,
    GenerateResponse,
    TokenizeRequest,
    TokenizeResponse,
)
from server.providers.base import (
    InferenceProviderError,
    ModelNotLoadedError,
)

router = APIRouter(tags=["inference"])


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    request: Request,
    request_body: GenerateRequest,
) -> GenerateResponse:
    """Return tokenized input and top-k next-token candidates."""

    provider = request.app.state.inference_provider

    try:
        return await provider.generate(request_body)
    except ModelNotLoadedError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="モデルがまだロードされていません。",
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except InferenceProviderError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error


@router.post("/tokenize", response_model=TokenizeResponse)
async def tokenize(
    request: Request,
    request_body: TokenizeRequest,
) -> TokenizeResponse:
    """Return tokens for an arbitrary input string."""

    provider = request.app.state.inference_provider

    try:
        return await provider.tokenize(request_body)
    except ModelNotLoadedError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="モデルがまだロードされていません。",
        ) from error
    except InferenceProviderError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error
