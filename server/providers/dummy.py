"""Dummy inference provider used before connecting a real LLM."""

from server.model import (
    GenerateRequest,
    GenerateResponse,
    ProbabilityItem,
    TokenItem,
)
from server.providers.base import BaseInferenceProvider, ModelNotLoadedError


class DummyInferenceProvider(BaseInferenceProvider):
    """Return deterministic token candidates with the real API interface."""

    def __init__(self) -> None:
        self.is_loaded = False
        self._candidate_tokens = [
            "東京",
            "大阪",
            "京都",
            "AI",
            "モデル",
            "次",
            "文章",
            "です",
            "。",
            "!",
        ]
        self._candidate_probabilities = [
            0.42,
            0.18,
            0.12,
            0.09,
            0.07,
            0.04,
            0.03,
            0.025,
            0.02,
            0.015,
        ]

    async def load_model(self) -> None:
        """Pretend to load a model.

        The real provider will load tokenizer and model weights here.  The
        dummy provider only flips a flag so the rest of the application can
        exercise the same "model is ready" flow.
        """

        self.is_loaded = True

    async def generate(self, request_body: GenerateRequest) -> GenerateResponse:
        """Return fixed candidates for the requested input text."""

        if not self.is_loaded:
            raise ModelNotLoadedError("Dummy model is not loaded.")

        tokens = self._tokenize_for_demo(request_body.text)
        if len(tokens) > 1024:
            raise ValueError("入力トークン数は1024以下にしてください。")

        table = [
            ProbabilityItem(
                token_id=1000 + index,
                rank=index + 1,
                token=self._candidate_token_at(index),
                probability=self._candidate_probability_at(index),
            )
            for index in range(request_body.top_k)
        ]
        return GenerateResponse(tokens=tokens, table=table)

    def _tokenize_for_demo(self, text: str) -> list[TokenItem]:
        """Split text into display tokens without pretending to be an LLM tokenizer."""

        if not text:
            return []

        raw_tokens = text.split()
        if len(raw_tokens) == 1:
            raw_tokens = list(text)

        return [
            TokenItem(token_id=index + 1, token=token)
            for index, token in enumerate(raw_tokens)
        ]

    def _candidate_token_at(self, index: int) -> str:
        """Return a deterministic token even when top_k is larger than the list."""

        if index < len(self._candidate_tokens):
            return self._candidate_tokens[index]
        return f"候補{index + 1}"

    def _candidate_probability_at(self, index: int) -> float:
        """Return a small deterministic probability for generated candidates."""

        if index < len(self._candidate_probabilities):
            return self._candidate_probabilities[index]
        return max(0.001, 0.01 / (index + 1))
