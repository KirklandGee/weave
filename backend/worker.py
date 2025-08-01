#!/usr/bin/env python3
"""
Redis Queue worker for AI RPG Manager.

This script starts an RQ worker that processes background tasks
like template generation and other async operations.
"""

import os
import sys
import signal
import logging
from rq import Worker
from services.queue_service import get_redis_connection, get_task_queue

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    logger.info(f"Received signal {signum}, shutting down worker gracefully...")
    sys.exit(0)


def main():
    """Main worker function."""
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    # Get Redis connection
    redis_conn = get_redis_connection()

    # Test connection
    try:
        redis_conn.ping()
        logger.info("Successfully connected to Redis")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        sys.exit(1)

    # Define queues to listen to (in order of priority)
    queue_names = ["priority", "default", "long_running"]
    queues = [get_task_queue(name) for name in queue_names]

    # Create worker
    worker = Worker(queues, connection=redis_conn, name=f"worker-{os.getpid()}")

    logger.info(
        f"Starting RQ worker '{worker.name}' listening on queues: {queue_names}"
    )
    logger.info(f"Worker PID: {os.getpid()}")

    # Start processing jobs
    try:
        worker.work(with_scheduler=True)
    except KeyboardInterrupt:
        logger.info("Worker interrupted by user")
    except Exception as e:
        logger.error(f"Worker error: {e}")
        raise
    finally:
        logger.info("Worker stopped")


if __name__ == "__main__":
    main()
