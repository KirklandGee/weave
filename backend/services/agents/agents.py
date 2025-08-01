from inspect import EndOfBlock
import json
from dotenv import load_dotenv
from typing import Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain.chat_models import init_chat_model
from typing_extensions import TypedDict
from tools import tools
from langchain_core.messages import ToolMessage

load_dotenv()

llm = init_chat_model(
  "google_genai:gemini-2.5-flash"
)


class AgentState(TypedDict):
  messages: Annotated[list, add_messages]
  current_task: str
  completed_tasks: list[str]
  agent_responses: dict

class BasicToolNode:
  """A node that runs requested tools"""
  def __init__(self, tools: list) -> None:
    self.tools_by_name = {tool.name: tool for tool in tools}

  def __call__(self, inputs: dict):
    if messages := inputs.get("messages", []):
      message = messages[-1]
    else:
      raise ValueError("Nom message found in input")
    outputs = []
    for tool_call in message.tool_calls:
      tool_result = self.tools_by_name[tool_call["name"]].invoke(
        tool_call["args"]
      )
      outputs.append(
        ToolMessage(
          content=json.dumps(tool_result),
          name=tool_call["name"],
          tool_call_id=tool_call["id"]
        )
      )
    return {"messages": outputs}

def route_tools(
  state: AgentState
):
  """
  For the conditional_edge to route to the ToolNode if the message has tool calls
  """
  if isinstance(state, list):
    ai_message = state[-1]
  elif messages := state.get("messages", []):
    ai_message = messages[-1]
  else:
    raise ValueError(f"No messages found in input state to tool_edge: {state}")
  if hasattr(ai_message, "tool_calls") and len(ai_message.tool_calls) > 0:
    return "tools"
  return EndOfBlock

tool_node = BasicToolNode(tools=tools)

graph_builder = StateGraph(AgentState)

llm_with_tools = llm.bind_tools(tools)


def chatbot(state: AgentState):
  return {"messages": [llm.invoke(state["messages"])]}

graph_builder.add_node("chatbot", chatbot)
graph_builder.add_node("tools", tool_node)
graph_builder.add_edge(START, "chatbot")
graph_builder.add_edge("chatbot", END)

graph_builder.add_conditional_edges(
  "chatbot",
  route_tools,
  {"tools": "tools", END: END},
)

graph = graph_builder.compile() 