"""Base interface for inference providers."""

from abc import ABC, abstractmethod

from server.model import GenerateRequest, GenerateResponse


class InferenceProviderError(Exception):
    """Raised when an inference provider cannot complete a request."""


class ModelNotLoadedError(InferenceProviderError):
    """Raised when a request arrives before the model is ready."""


class BaseInferenceProvider(ABC):
    """Common interface for dummy and real inference providers.

    The FastAPI route depends only on this abstract class.  A real Llama
    provider can therefore replace the dummy provider without changing the API
    shape or browser-facing client code.
    """

    is_loaded: bool = False

    @abstractmethod
    async def load_model(self) -> None:
        """Load model resources once at server startup."""

    @abstractmethod
    async def generate(self, request_body: GenerateRequest) -> GenerateResponse:
        """Return tokenized input and next-token candidates."""
