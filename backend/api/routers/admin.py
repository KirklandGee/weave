from fastapi import APIRouter, HTTPException, Depends, Query
from backend.services.usage_service import UsageService
from backend.models.schemas import (
    UsageSummary,
    SetUsageLimitRequest,
    UsageHistoryRequest,
)
from backend.api.auth import get_current_user
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
