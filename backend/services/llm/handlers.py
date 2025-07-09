from langchain_core.callbacks.base import BaseCallbackHandler
from collections.abc import Iterator
from typing import override

class StreamingHandler(BaseCallbackHandler):
    def __init__(self):
        self.queue: list[str] = []
    
    @override
    def on_llm_new_token(self, token: str, **kwargs):
        self.queue.append(token)

    def get_stream(self) -> Iterator[str]:
        while self.queue:
            yield self.queue.pop(0)