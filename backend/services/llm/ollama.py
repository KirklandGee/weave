from langchain_ollama import ChatOllama


def call_ollama(user: str, system: str):
    llm = ChatOllama(
        model="llama3.1",
        temperature=0,
    )
    messages = [
        (
            "system",
            system,
        ),
        ("human", user),
    ]

    return llm.invoke(messages)


async def call_ollama_stream(user: str, system: str):
    llm = ChatOllama(model="llama3.1", temperature=0)
    messages = [("system", system), ("human", user)]
    async for chunk in llm.astream(messages):  # note .astream
        yield chunk.text()
