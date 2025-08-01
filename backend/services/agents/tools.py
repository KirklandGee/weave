from dotenv import load_dotenv
from langchain_tavily import TavilySearch

load_dotenv()

webSearch = TavilySearch(max_results=2)

def get_context():
  return


tools = [webSearch,]