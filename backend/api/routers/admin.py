from fastapi import APIRouter, HTTPException, Depends, Query
from backend.services.usage_service import UsageService
from backend.models.schemas import (
    UsageSummary,
    SetUsageLimitRequest,
    UsageHistoryRequest,
    BatchEmbeddingResult,
)
from backend.api.auth import get_current_user
from backend.services.queue_service import get_task_queue, get_queue_stats
from backend.services.sync_hooks import get_sync_embedding_hook
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users/{user_id}/usage")
async def get_user_usage(
    user_id: str, current_user: str = Depends(get_current_user)
) -> UsageSummary:
    """Get usage summary for a specific user. For Clerk admin integration."""
    try:
        usage_summary = UsageService.get_usage_summary(user_id)
        return usage_summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/{user_id}/usage/history")
async def get_user_usage_history(
    user_id: str,
    start_date: Optional[str] = Query(None, description="Start date in ISO format"),
    end_date: Optional[str] = Query(None, description="End date in ISO format"),
    limit: int = Query(100, description="Maximum number of records"),
    current_user: str = Depends(get_current_user),
):
    """Get usage history for a specific user."""
    try:
        from backend.services.neo4j import query

        # Parse dates if provided
        start_dt = None
        end_dt = None
        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))

        # Build query with optional date filters
        cypher = """
            MATCH (u:UsageEvent)
            WHERE u.user_id = $user_id
        """
        params = {"user_id": user_id, "limit": limit}

        if start_dt:
            cypher += " AND u.timestamp >= datetime($start_date)"
            params["start_date"] = start_dt.isoformat()

        if end_dt:
            cypher += " AND u.timestamp <= datetime($end_date)"
            params["end_date"] = end_dt.isoformat()

        cypher += """
            RETURN u.timestamp as timestamp, u.model as model, 
                   u.input_tokens as input_tokens, u.output_tokens as output_tokens,
                   u.cost as cost, u.campaign_id as campaign_id
            ORDER BY u.timestamp DESC
            LIMIT $limit
        """

        result = query(cypher, **params)

        usage_events = []
        for record in result:
            # Convert Neo4j datetime object to ISO string
            timestamp = record["timestamp"]
            if hasattr(timestamp, "to_native"):
                # Neo4j datetime object
                timestamp_str = timestamp.to_native().isoformat()
            elif isinstance(timestamp, str):
                # Already a string
                timestamp_str = timestamp
            else:
                # Python datetime object
                timestamp_str = timestamp.isoformat()

            usage_events.append(
                {
                    "timestamp": timestamp_str,
                    "model": record["model"],
                    "input_tokens": record["input_tokens"],
                    "output_tokens": record["output_tokens"],
                    "cost": float(record["cost"]),
                    "campaign_id": record["campaign_id"],
                }
            )

        return {
            "user_id": user_id,
            "events": usage_events,
            "total_events": len(usage_events),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}/usage-limit")
async def set_user_usage_limit(
    user_id: str,
    request: SetUsageLimitRequest,
    current_user: str = Depends(get_current_user),
):
    """Set or update a user's monthly usage limit."""
    try:
        if request.monthly_limit < Decimal("0"):
            raise HTTPException(
                status_code=400, detail="Monthly limit must be non-negative"
            )

        updated_limit = UsageService.set_user_limit(user_id, request.monthly_limit)

        return {
            "message": f"Usage limit updated for user {user_id}",
            "user_id": user_id,
            "new_limit": float(updated_limit.monthly_limit),
            "current_usage": float(updated_limit.current_usage),
            "reset_date": updated_limit.reset_date.isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/usage/stats")
async def get_usage_stats(current_user: str = Depends(get_current_user)):
    """Get overall usage statistics for all users."""
    try:
        from backend.services.neo4j import query

        # Get overall stats
        stats_query = """
            MATCH (u:UsageEvent)
            RETURN 
                count(u) as total_requests,
                sum(u.cost) as total_cost,
                count(DISTINCT u.user_id) as active_users,
                avg(u.cost) as avg_cost_per_request,
                u.model as model,
                count(u.model) as model_usage_count
            ORDER BY model_usage_count DESC
        """

        result = query(stats_query)

        # Get monthly stats
        now = datetime.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        monthly_query = """
            MATCH (u:UsageEvent)
            WHERE u.timestamp >= datetime($start_of_month)
            RETURN 
                count(u) as monthly_requests,
                sum(u.cost) as monthly_cost,
                count(DISTINCT u.user_id) as monthly_active_users
        """

        monthly_result = query(monthly_query, start_of_month=start_of_month.isoformat())

        # Format response
        stats = {
            "total_requests": result[0]["total_requests"] if result else 0,
            "total_cost": (
                float(result[0]["total_cost"])
                if result and result[0]["total_cost"]
                else 0
            ),
            "active_users": result[0]["active_users"] if result else 0,
            "avg_cost_per_request": (
                float(result[0]["avg_cost_per_request"])
                if result and result[0]["avg_cost_per_request"]
                else 0
            ),
            "monthly_requests": (
                monthly_result[0]["monthly_requests"] if monthly_result else 0
            ),
            "monthly_cost": (
                float(monthly_result[0]["monthly_cost"])
                if monthly_result and monthly_result[0]["monthly_cost"]
                else 0
            ),
            "monthly_active_users": (
                monthly_result[0]["monthly_active_users"] if monthly_result else 0
            ),
        }

        # Get model usage breakdown
        model_query = """
            MATCH (u:UsageEvent)
            RETURN u.model as model, count(u) as usage_count, sum(u.cost) as total_cost
            ORDER BY usage_count DESC
            LIMIT 10
        """

        model_result = query(model_query)
        model_stats = []
        for record in model_result:
            model_stats.append(
                {
                    "model": record["model"],
                    "usage_count": record["usage_count"],
                    "total_cost": (
                        float(record["total_cost"]) if record["total_cost"] else 0
                    ),
                }
            )

        stats["model_breakdown"] = model_stats

        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/limits")
async def get_all_user_limits(current_user: str = Depends(get_current_user)):
    """Get usage limits for all users."""
    try:
        from backend.services.neo4j import query

        # Get all user limits
        limits_query = """
            MATCH (l:UsageLimit)
            RETURN l.user_id as user_id, l.monthly_limit as monthly_limit, 
                   l.reset_date as reset_date
            ORDER BY l.user_id
        """

        result = query(limits_query)

        user_limits = []
        for record in result:
            # Get current usage for each user
            current_usage = UsageService.get_current_month_usage(record["user_id"])

            user_limits.append(
                {
                    "user_id": record["user_id"],
                    "monthly_limit": float(record["monthly_limit"]),
                    "current_usage": float(current_usage),
                    "usage_percentage": (
                        float(
                            (current_usage / Decimal(str(record["monthly_limit"])))
                            * 100
                        )
                        if record["monthly_limit"] > 0
                        else 0
                    ),
                    "reset_date": record["reset_date"],
                }
            )

        return {"user_limits": user_limits, "total_users": len(user_limits)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ───────────────────────────────────── EMBEDDING ADMIN ENDPOINTS ──
@router.post("/embeddings/missing", response_model=BatchEmbeddingResult)
async def process_missing_embeddings(
    campaign_id: Optional[str] = Query(None, description="Campaign ID to process, or null for global"),
    limit: int = Query(50, description="Maximum number of nodes to process"),
    current_user: str = Depends(get_current_user)
):
    """Find and process nodes that don't have embeddings."""
    try:
        from backend.services.embeddings.tasks import find_and_process_missing_embeddings
        
        # Queue the missing embeddings task
        queue = get_task_queue("priority")  # Use priority queue for admin tasks
        
        task = queue.enqueue(
            find_and_process_missing_embeddings,
            campaign_id=campaign_id,
            limit=limit,
            job_timeout='15m'  # Allow longer timeout for admin tasks
        )
        
        return BatchEmbeddingResult(
            message=f"Queued task to find and process up to {limit} missing embeddings",
            processed=0,  # Will be updated when task completes
            updated=0,
            skipped=0,
            errors=[],
            task_id=task.id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue missing embeddings task: {str(e)}")


@router.post("/embeddings/sync-pending")
async def force_process_sync_pending(
    current_user: str = Depends(get_current_user)
):
    """Force process any pending embedding updates from sync operations."""
    try:
        hook = get_sync_embedding_hook()
        result = hook.force_check_all_pending()
        
        return {
            "message": result["message"],
            "updated": result.get("updated", 0),
            "errors": result.get("errors", []),
            "task_id": result.get("task_id"),
            "queued": result.get("queued", 0)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process pending embeddings: {str(e)}")


@router.get("/embeddings/status")
async def get_embedding_system_status(
    current_user: str = Depends(get_current_user)
):
    """Get status of the embedding system including queue stats."""
    try:
        from backend.services.neo4j import query
        import os
        
        # Get overall embedding statistics
        stats_query = """
        MATCH (n)
        WHERE (n:Campaign OR n:Session OR n:NPC OR n:Character OR n:Location OR n:Note)
        AND n.title IS NOT NULL
        RETURN 
            count(n) as total_nodes,
            count(n.embedding) as embedded_nodes,
            count(CASE WHEN n.embedding IS NULL OR size(n.embedding) = 0 THEN 1 END) as missing_embeddings,
            count(CASE WHEN n.updatedAt > coalesce(n.embeddedAt, datetime('1970-01-01')) THEN 1 END) as stale_embeddings
        """
        
        result = query(stats_query)
        stats = result[0] if result else {
            "total_nodes": 0,
            "embedded_nodes": 0, 
            "missing_embeddings": 0,
            "stale_embeddings": 0
        }
        
        # Get queue statistics
        queue_stats = {
            "default": get_queue_stats("default"),
            "priority": get_queue_stats("priority"),
            "long_running": get_queue_stats("long_running")
        }
        
        # Get sync hook status
        hook = get_sync_embedding_hook()
        
        return {
            "embedding_stats": {
                "total_nodes": stats["total_nodes"],
                "embedded_nodes": stats["embedded_nodes"],
                "missing_embeddings": stats["missing_embeddings"],
                "stale_embeddings": stats["stale_embeddings"],
                "embedding_coverage": stats["embedded_nodes"] / max(stats["total_nodes"], 1)
            },
            "sync_hook": {
                "background_enabled": hook.use_background_queue,
                "sync_threshold": hook.sync_count_threshold,
                "current_sync_count": hook.sync_count,
                "pending_nodes": len(hook.nodes_to_check)
            },
            "queue_stats": queue_stats,
            "configuration": {
                "background_enabled": os.getenv("EMBEDDING_BACKGROUND_ENABLED", "true"),
                "sync_threshold": os.getenv("SYNC_EMBEDDING_THRESHOLD", "5"),
                "embedding_model": os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get embedding system status: {str(e)}")


@router.post("/embeddings/campaign/{campaign_id}")
async def process_campaign_embeddings(
    campaign_id: str,
    force: bool = Query(False, description="Force re-embedding of all nodes"),
    current_user: str = Depends(get_current_user)
):
    """Process embeddings for all nodes in a campaign."""
    try:
        from backend.services.embeddings.tasks import process_campaign_embeddings
        
        # Queue the campaign embeddings task
        queue = get_task_queue("long_running")  # Use long-running queue for campaign-wide tasks
        
        task = queue.enqueue(
            process_campaign_embeddings,
            campaign_id=campaign_id,
            force=force,
            job_timeout='30m'  # Allow longer timeout for campaign-wide processing
        )
        
        return {
            "message": f"Queued task to process embeddings for campaign {campaign_id}",
            "task_id": task.id,
            "force": force
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue campaign embeddings task: {str(e)}")
