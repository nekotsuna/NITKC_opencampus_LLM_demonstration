"""API routes exposed by the web application."""

from fastapi import APIRouter, HTTPException, status

from client.services.inference import (
    GenerateRequest,
    GenerateResponse,
    InferenceServiceError,
    generate_next_token_candidates,
)

router = APIRouter(prefix="/api", tags=["web-api"])


@router.post("/generate", response_model=GenerateResponse)
async def generate(request_body: GenerateRequest) -> GenerateResponse:
    """Return next-token candidates from the configured inference server."""

    try:
        return await generate_next_token_candidates(request_body)
    except InferenceServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
