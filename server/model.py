"""Pydantic models shared by inference server endpoints and providers."""

from typing import List

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    """Input tokens and candidate count for next-token prediction."""

    tokens: List["TokenItem"] = Field(
        ...,
        description="Token sequence to send to the model.",
    )
    top_k: int = Field(
        ...,
        ge=1,
        le=256,
        description="Maximum number of token candidates to return.",
    )


class TokenItem(BaseModel):
    """One token from the input text."""

    token_id: int
    token: str


class ProbabilityItem(BaseModel):
    """One ranked next-token candidate."""

    token_id: int
    rank: int
    token: str
    probability: float


class GenerateResponse(BaseModel):
    """Tokenized input text and top-k next-token candidates."""

    decoded_text: str
    tokens: List[TokenItem]
    table: List[ProbabilityItem]


class TokenizeRequest(BaseModel):
    """Text to convert into model tokens."""

    text: str = Field(..., description="Text to tokenize.")


class TokenizeResponse(BaseModel):
    """Tokenized text."""

    tokens: List[TokenItem]
