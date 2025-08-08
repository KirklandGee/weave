import tiktoken
from typing import List
from langchain_core.messages import BaseMessage
from backend.models.schemas import LLMMessage


class TokenCounter:
    """Utility class for counting tokens in messages and text."""

    @staticmethod
    def get_encoding_for_model(model: str) -> tiktoken.Encoding:
        """Get the appropriate encoding for a model."""
        model_lower = model.lower()
        
        # Pattern matching for model families
        if model_lower.startswith("gpt"):
            # All GPT models (including gpt-4o, gpt-5, etc.) use o200k_base
            encoding_name = "o200k_base"
        elif model_lower.startswith("gemini"):
            # All Gemini models use o200k_base as approximation (they actually use SentencePiece)
            encoding_name = "o200k_base"
        else:
            # Default to cl100k_base
            encoding_name = "cl100k_base"
        return tiktoken.get_encoding(encoding_name)

    @staticmethod
    def count_tokens_in_text(text: str, model: str = "gpt-4o") -> int:
        """Count tokens in a text string."""
        encoding = TokenCounter.get_encoding_for_model(model)
        return len(encoding.encode(text))

    @staticmethod
    def count_tokens_in_messages(
        messages: List[LLMMessage], model: str = "gpt-4o"
    ) -> int:
        """Count tokens in a list of LLM messages."""
        encoding = TokenCounter.get_encoding_for_model(model)

        total_tokens = 0

        # Add tokens for each message
        for message in messages:
            # Count tokens in the message content
            total_tokens += len(encoding.encode(message.content))

            # Add overhead tokens for message structure
            # Based on OpenAI's token counting rules:
            # - Each message has a base overhead of ~4 tokens
            # - Role names add additional tokens
            total_tokens += 4  # Base overhead

            # Role-specific token overhead
            role_tokens = len(encoding.encode(message.role))
            total_tokens += role_tokens

        # Add conversation overhead (usually ~2-3 tokens)
        total_tokens += 2

        return total_tokens

    @staticmethod
    def count_tokens_in_langchain_messages(
        messages: List[BaseMessage], model: str = "gpt-4o"
    ) -> int:
        """Count tokens in langchain messages."""
        encoding = TokenCounter.get_encoding_for_model(model)

        total_tokens = 0

        for message in messages:
            # Count tokens in the message content
            total_tokens += len(encoding.encode(message.content))

            # Add overhead for message structure
            total_tokens += 4  # Base overhead

            # Role-specific overhead
            role = message.__class__.__name__.lower().replace("message", "")
            role_tokens = len(encoding.encode(role))
            total_tokens += role_tokens

        # Add conversation overhead
        total_tokens += 2

        return total_tokens

    @staticmethod
    def estimate_response_tokens(model: str = "gpt-4o", max_tokens: int = 4096) -> int:
        """
        Estimate response tokens based on model and max_tokens setting.
        This is used for pre-flight cost estimation.
        Returns a conservative estimate (usually 50% of max_tokens for safety).
        """
        # Conservative estimate - assume we'll use about 50% of max tokens
        # This prevents users from being blocked due to underestimation
        return min(max_tokens // 2, 2048)  # Cap at 2048 for reasonable estimates
