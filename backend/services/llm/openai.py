import getpass
import os

if not os.environ.get("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("Enter your OpenAI API key: ")

from langchain_openai import ChatOpenAI


def call_open_ai(user: str, system: str):
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0,
        timeout=None,
        max_retries=2,
    )
    messages = [("system", system), ("human", user)]

    return llm.invoke(messages)


async def call_open_ai_streaming(user: str, system: str):
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0,
        timeout=None,
        max_retries=2,
    )
    messages = [("system", system), ("human", user)]

    async for chunk in llm.astream(messages):
        yield chunk.text
