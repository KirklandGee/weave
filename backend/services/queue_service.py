import redis
from rq import Queue, Worker
from functools import lru_cache
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


# Connection pool (singleton-like pattern)
@lru_cache()
def get_redis_pool():
    """Get Redis connection pool (cached)."""
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        return redis.ConnectionPool.from_url(redis_url)
    except Exception as e:
        logger.error(f"Failed to create Redis connection pool: {e}")
        raise


def get_redis_connection():
    """Get Redis connection from pool."""
    try:
        pool = get_redis_pool()
        return redis.Redis(connection_pool=pool)
    except Exception as e:
        logger.error(f"Failed to get Redis connection: {e}")
        raise


def get_task_queue(name: str = "default"):
    """Get RQ queue for tasks."""
    try:
        return Queue(name, connection=get_redis_connection())
    except Exception as e:
        logger.error(f"Failed to create queue '{name}': {e}")
        raise


def get_priority_queue():
    """Get high-priority queue for urgent tasks."""
    return get_task_queue("priority")


def get_long_running_queue():
    """Get queue for long-running tasks (with higher timeout)."""
    return get_task_queue("long_running")


def health_check() -> bool:
    """Check if Redis connection is healthy."""
    try:
        conn = get_redis_connection()
        conn.ping()
        return True
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return False


def get_queue_stats(queue_name: str = "default") -> dict:
    """Get statistics for a queue."""
    try:
        queue = get_task_queue(queue_name)
        return {
            "name": queue_name,
            "length": len(queue),
            "failed_jobs": queue.failed_job_registry.count,
            "started_jobs": queue.started_job_registry.count,
            "finished_jobs": queue.finished_job_registry.count,
        }
    except Exception as e:
        logger.error(f"Failed to get stats for queue '{queue_name}': {e}")
        return {}


def cleanup_failed_jobs(queue_name: str = "default", max_age: int = 3600) -> int:
    """Clean up failed jobs older than max_age seconds."""
    try:
        queue = get_task_queue(queue_name)
        failed_registry = queue.failed_job_registry

        # Get jobs older than max_age
        job_ids = failed_registry.get_job_ids()
        cleaned = 0

        for job_id in job_ids:
            try:
                job = queue.fetch_job(job_id)
                if job and job.ended_at:
                    import time

                    age = time.time() - job.ended_at.timestamp()
                    if age > max_age:
                        failed_registry.remove(job_id)
                        cleaned += 1
            except Exception as job_error:
                logger.warning(f"Error processing job {job_id}: {job_error}")

        logger.info(f"Cleaned up {cleaned} failed jobs from queue '{queue_name}'")
        return cleaned

    except Exception as e:
        logger.error(f"Failed to cleanup failed jobs for queue '{queue_name}': {e}")
        return 0
