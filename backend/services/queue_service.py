import redis
from rq import Queue
from functools import lru_cache
import os


# Connection pool (this can be "singleton-ish")
@lru_cache()
def get_redis_pool():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    return redis.ConnectionPool.from_url(redis_url)

def get_redis_connection():
    pool = get_redis_pool()
    return redis.Redis(connection_pool=pool)

def get_task_queue():
    return Queue(connection=get_redis_connection())

# For different priority queues if needed later
def get_priority_queue():
    return Queue('priority', connection=get_redis_connection())
