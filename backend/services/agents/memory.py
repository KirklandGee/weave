import os
from langgraph.checkpoint.redis import RedisSaver
from redisvl.redis.constants import REDIS_URL_ENV_VAR
    
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")



write_config = {"configurable": {"thread_id": "1", "checkpoint_ns": ""}}
read_config = {"configurable": {"thread_id": "1"}}

with RedisSaver.from_conn_string(redis_url=redis_url) as checkpointer:
  checkpointer.setup()
