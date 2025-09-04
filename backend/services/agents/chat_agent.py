from pydantic_ai import Agent
from backend.services.llm.prompts.base_chat import BASE_CHAT_SYSTEM_PROMPT
from backend.services.agents.models import AssistantOutput, AssistantDependencies
from backend.services.agents.tools import assistant_tools

def create_assistant(model: str = "openai:gpt-5", system_prompt: str = BASE_CHAT_SYSTEM_PROMPT) -> Agent:
  return Agent(
    model,
    system_prompt=system_prompt,
    output_type=AssistantOutput,
    deps_type=AssistantDependencies,
    toolsets=[assistant_tools],
  )
