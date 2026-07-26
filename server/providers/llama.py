"""Hugging Face Llama inference provider.

This provider follows the flow in docs/llama_sample.py:

1. Load a causal language model and tokenizer.
2. Tokenize the full input text on every request.
3. Run the model without gradients.
4. Convert the final-token logits to probabilities.
5. Return the top-k next-token candidates.
"""

from typing import Any

from server.model import (
    GenerateRequest,
    GenerateResponse,
    ProbabilityItem,
    TokenizeRequest,
    TokenizeResponse,
    TokenItem,
)
from server.providers.base import (
    BaseInferenceProvider,
    InferenceProviderError,
    ModelNotLoadedError,
)


class LlamaInferenceProvider(BaseInferenceProvider):
    """Inference provider for Hugging Face causal language models."""

    def __init__(
        self,
        model_path: str = "../kadaikenkyu/Meta-Llama-3.1-8B-Instruct",
        max_input_tokens: int = 1024,
    ) -> None:
        self.model_path = model_path
        self.max_input_tokens = max_input_tokens
        self.is_loaded = False
        self.model: Any | None = None
        self.tokenizer: Any | None = None
        self.torch: Any | None = None
        self.device = "cpu"

    async def load_model(self) -> None:
        """Load tokenizer and model weights once when the server starts."""

        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
        except ImportError as error:
            raise InferenceProviderError(
                "torch または transformers がインストールされていません。"
            ) from error

        self.torch = torch
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
            self.model = AutoModelForCausalLM.from_pretrained(self.model_path)
            self.model.to(self.device)
            self.model.eval()
        except Exception as error:
            raise InferenceProviderError(
                f"モデルのロードに失敗しました: {self.model_path}"
            ) from error

        self.is_loaded = True

    async def generate(self, request_body: GenerateRequest) -> GenerateResponse:
        """Generate top-k next-token candidates with the loaded Llama model."""

        if not self.is_loaded or self.model is None or self.tokenizer is None:
            raise ModelNotLoadedError("Llama model is not loaded.")

        if self.torch is None:
            raise InferenceProviderError("torch is not available.")

        try:
            input_token_ids = [
                token_item.token_id
                for token_item in request_body.tokens
            ]
            input_ids = self.torch.tensor(
                [input_token_ids],
                dtype=self.torch.long,
                device=self.device,
            )
        except Exception as error:
            raise InferenceProviderError("入力トークン列の変換に失敗しました。") from error

        if input_ids.shape[1] > self.max_input_tokens:
            raise ValueError(
                f"入力トークン数は{self.max_input_tokens}以下にしてください。"
            )

        try:
            with self.torch.no_grad():
                outputs = self.model(input_ids=input_ids)
                logits = outputs.logits[0, -1]
                probabilities = self.torch.softmax(logits, dim=-1)
                top_k_result = self.torch.topk(
                    probabilities,
                    request_body.top_k,
                )
        except Exception as error:
            raise InferenceProviderError("モデル推論に失敗しました。") from error

        probability_table = self._build_probability_table(top_k_result)

        return GenerateResponse(
            decoded_text=self.tokenizer.decode(input_token_ids),
            tokens=request_body.tokens,
            table=probability_table,
        )

    async def tokenize(self, request_body: TokenizeRequest) -> TokenizeResponse:
        """Convert text into Llama tokenizer tokens."""

        if not self.is_loaded or self.tokenizer is None:
            raise ModelNotLoadedError("Llama model is not loaded.")

        try:
            encoded_inputs = self.tokenizer(
                request_body.text,
                return_tensors="pt",
            )
            input_ids = encoded_inputs["input_ids"][0]
        except Exception as error:
            raise InferenceProviderError("入力テキストのトークン化に失敗しました。") from error

        return TokenizeResponse(tokens=self._build_input_tokens(input_ids))

    def _build_input_tokens(self, input_ids: Any) -> list[TokenItem]:
        """Convert tokenizer input IDs into API response token items."""

        token_items: list[TokenItem] = []
        for token_id_tensor in input_ids:
            token_id = int(token_id_tensor.item())
            token_text = self.tokenizer.decode([token_id])
            token_items.append(
                TokenItem(
                    token_id=token_id,
                    token=token_text,
                )
            )

        return token_items

    def _build_probability_table(self, top_k_result: Any) -> list[ProbabilityItem]:
        """Convert torch.topk output into ranked probability rows."""

        probability_items: list[ProbabilityItem] = []
        for index, token_id_tensor in enumerate(top_k_result.indices):
            token_id = int(token_id_tensor.item())
            token_text = self.tokenizer.decode([token_id])
            probability = float(top_k_result.values[index].item())
            probability_items.append(
                ProbabilityItem(
                    token_id=token_id,
                    rank=index + 1,
                    token=token_text,
                    probability=probability,
                )
            )

        return probability_items
