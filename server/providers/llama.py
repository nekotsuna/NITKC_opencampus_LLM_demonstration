"""Placeholder for the future Hugging Face Llama inference provider."""

from server.model import GenerateRequest, GenerateResponse
from server.providers.base import BaseInferenceProvider


class LlamaInferenceProvider(BaseInferenceProvider):
    """Provider shape for a real causal language model implementation."""

    async def load_model(self) -> None:
        """Load tokenizer and model weights.

        This project currently uses DummyInferenceProvider.  Keeping this class
        separate makes the future torch/transformers implementation a provider
        change instead of an API rewrite.
        """

        raise NotImplementedError("Real Llama provider is not implemented yet.")

    async def generate(self, request_body: GenerateRequest) -> GenerateResponse:
        """Generate top-k candidates with the real model."""

        raise NotImplementedError("Real Llama provider is not implemented yet.")
