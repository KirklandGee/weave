from datetime import datetime, timezone
from decimal import Decimal
from calendar import monthrange
from typing import Optional
import time
import logging
from backend.services.neo4j import query
from backend.models.schemas import UsageEvent, UsageLimit, UsageSummary
from backend.services.llm.config import MODEL_PRICING, DEFAULT_MONTHLY_LIMIT
from backend.services.subscription_service import SubscriptionService

logger = logging.getLogger(__name__)


class UsageService:
    """Service for tracking and managing user LLM usage and limits."""
    
    # Cache for usage data to avoid frequent database queries
    _usage_cache = {}  # user_id -> (usage_data, timestamp)
    _limit_cache = {}  # user_id -> (limit_data, timestamp)
    CACHE_TTL = 60  # 1 minute cache for usage data
    LIMIT_CACHE_TTL = 300  # 5 minutes cache for limit data

    @staticmethod
    def _is_cache_valid(timestamp: float, ttl: int) -> bool:
        """Check if cache entry is still valid based on TTL."""
        return time.time() - timestamp < ttl

    @staticmethod
    def _get_cached_usage(user_id: str) -> Optional[Decimal]:
        """Get cached usage if valid."""
        if user_id in UsageService._usage_cache:
            usage, timestamp = UsageService._usage_cache[user_id]
            if UsageService._is_cache_valid(timestamp, UsageService.CACHE_TTL):
                return usage
            else:
                del UsageService._usage_cache[user_id]
        return None

    @staticmethod
    def _cache_usage(user_id: str, usage: Decimal):
        """Cache usage data."""
        UsageService._usage_cache[user_id] = (usage, time.time())

    @staticmethod
    def _get_cached_limit(user_id: str) -> Optional[UsageLimit]:
        """Get cached limit if valid."""
        if user_id in UsageService._limit_cache:
            limit, timestamp = UsageService._limit_cache[user_id]
            if UsageService._is_cache_valid(timestamp, UsageService.LIMIT_CACHE_TTL):
                return limit
            else:
                del UsageService._limit_cache[user_id]
        return None

    @staticmethod
    def _cache_limit(user_id: str, limit: UsageLimit):
        """Cache limit data."""
        UsageService._limit_cache[user_id] = (limit, time.time())

    @staticmethod
    def _invalidate_user_caches(user_id: str):
        """Invalidate all caches for a user (called when usage is recorded)."""
        if user_id in UsageService._usage_cache:
            del UsageService._usage_cache[user_id]
        if user_id in UsageService._limit_cache:
            del UsageService._limit_cache[user_id]

    @staticmethod
    def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> Decimal:
        """Calculate the cost for a given model and token usage."""
        if model not in MODEL_PRICING:
            # Default to free for unknown models
            return Decimal("0.00")

        pricing = MODEL_PRICING[model]
        input_cost = (Decimal(input_tokens) / Decimal("1000000")) * pricing[
            "input_cost"
        ]
        output_cost = (Decimal(output_tokens) / Decimal("1000000")) * pricing[
            "output_cost"
        ]

        return input_cost + output_cost

    @staticmethod
    def record_usage(
        user_id: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        campaign_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> UsageEvent:
        """Record a usage event in the database."""
        cost = UsageService.calculate_cost(model, input_tokens, output_tokens)

        usage_event = UsageEvent(
            user_id=user_id,
            timestamp=datetime.now(timezone.utc),
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=cost,
            campaign_id=campaign_id,
            session_id=session_id,
        )

        # Store in Neo4j
        query(
            """
            CREATE (u:UsageEvent {
                user_id: $user_id,
                timestamp: datetime($timestamp),
                model: $model,
                input_tokens: $input_tokens,
                output_tokens: $output_tokens,
                cost: $cost,
                session_id: $session_id
            })
        """,
            user_id=user_id,
            timestamp=usage_event.timestamp.isoformat(),
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=float(cost),
            session_id=session_id,
        )

        # Invalidate cache since usage has changed
        UsageService._invalidate_user_caches(user_id)

        return usage_event

    @staticmethod
    def get_current_month_usage(user_id: str) -> Decimal:
        """Get the total usage for the current month for a user. Uses cache to reduce DB queries."""
        # Check cache first
        cached_usage = UsageService._get_cached_usage(user_id)
        if cached_usage is not None:
            return cached_usage
            
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        result = query(
            """
            MATCH (u:UsageEvent)
            WHERE u.user_id = $user_id 
            AND u.timestamp >= datetime($start_of_month)
            RETURN sum(u.cost) as total_cost
        """,
            user_id=user_id,
            start_of_month=start_of_month.isoformat(),
        )

        total_cost = (
            result[0].get("total_cost") if result and result[0].get("total_cost") else 0
        )
        usage = Decimal(str(total_cost))
        
        # Cache the result
        UsageService._cache_usage(user_id, usage)
        
        return usage

    @staticmethod
    def get_user_limit_from_request(request) -> UsageLimit:
        """Get user's usage limit based on their subscription plan from request. Uses cache to reduce queries."""
        from fastapi import Request
        from backend.services.subscription_service import SubscriptionService
        
        # Get user_id from request auth
        user_id = "unknown"  # fallback
        try:
            # Extract user_id from auth header (similar to get_current_user)
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                import jwt
                token = auth_header.split(" ")[1]
                decoded = jwt.decode(token, options={"verify_signature": False})
                user_id = decoded.get("sub", "unknown")
        except:
            pass
            
        # Check cache first
        cached_limit = UsageService._get_cached_limit(user_id)
        if cached_limit is not None:
            return cached_limit
            
        now = datetime.now(timezone.utc)
        
        # Get monthly limit from subscription plan using request (not user_id)
        monthly_limit = SubscriptionService.get_monthly_limit_from_request(request)
        reset_date = UsageService._get_next_month_reset_date(now)

        # Get current usage for this month
        current_usage = UsageService.get_current_month_usage(user_id)

        usage_limit = UsageLimit(
            user_id=user_id,
            monthly_limit=monthly_limit,
            current_usage=current_usage,
            reset_date=reset_date,
        )
        
        # Cache the result
        UsageService._cache_limit(user_id, usage_limit)
        
        return usage_limit

    @staticmethod
    def get_user_limit(user_id: str) -> UsageLimit:
        """Get user's usage limit based on their subscription plan. Uses cache to reduce queries."""
        # Check cache first
        cached_limit = UsageService._get_cached_limit(user_id)
        if cached_limit is not None:
            return cached_limit
            
        now = datetime.now(timezone.utc)
        
        # Get monthly limit from subscription plan (not database)
        # Try to get from subscription service - this will use the updated logic
        monthly_limit = SubscriptionService.get_monthly_limit(user_id)
        reset_date = UsageService._get_next_month_reset_date(now)

        # Get current usage for this month
        current_usage = UsageService.get_current_month_usage(user_id)

        usage_limit = UsageLimit(
            user_id=user_id,
            monthly_limit=monthly_limit,
            current_usage=current_usage,
            reset_date=reset_date,
        )
        
        # Cache the result
        UsageService._cache_limit(user_id, usage_limit)
        
        return usage_limit

    @staticmethod
    def check_usage_limit_from_request(request, estimated_cost: Decimal) -> bool:
        """Check if a user can make a request without exceeding their limit (using request auth)."""
        usage_limit = UsageService.get_user_limit_from_request(request)
        return (usage_limit.current_usage + estimated_cost) <= usage_limit.monthly_limit

    @staticmethod
    def check_usage_limit(user_id: str, estimated_cost: Decimal) -> bool:
        """Check if a user can make a request without exceeding their limit."""
        usage_limit = UsageService.get_user_limit(user_id)
        return (usage_limit.current_usage + estimated_cost) <= usage_limit.monthly_limit

    @staticmethod
    def check_ai_access(user_id: str) -> bool:
        """Check if user has access to AI features based on subscription plan."""
        return SubscriptionService.has_ai_access(user_id)

    @staticmethod
    def set_user_limit(user_id: str, monthly_limit: Decimal) -> UsageLimit:
        """Set a custom usage limit for a user."""
        now = datetime.now(timezone.utc)
        reset_date = UsageService._get_next_month_reset_date(now)

        # Upsert the user limit
        query(
            """
            MERGE (l:UsageLimit {user_id: $user_id})
            SET l.monthly_limit = $monthly_limit,
                l.reset_date = datetime($reset_date)
        """,
            user_id=user_id,
            monthly_limit=float(monthly_limit),
            reset_date=reset_date.isoformat(),
        )

        # Invalidate cache since limit has changed
        UsageService._invalidate_user_caches(user_id)

        current_usage = UsageService.get_current_month_usage(user_id)

        return UsageLimit(
            user_id=user_id,
            monthly_limit=monthly_limit,
            current_usage=current_usage,
            reset_date=reset_date,
        )

    @staticmethod
    def get_usage_summary(user_id: str) -> UsageSummary:
        """Get a comprehensive usage summary for a user."""
        usage_limit = UsageService.get_user_limit(user_id)

        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get additional stats
        result = query(
            """
            MATCH (u:UsageEvent)
            WHERE u.user_id = $user_id 
            AND u.timestamp >= datetime($start_of_month)
            RETURN 
                count(u) as total_requests,
                u.model as model,
                count(u.model) as model_count
            ORDER BY model_count DESC
            LIMIT 1
        """,
            user_id=user_id,
            start_of_month=start_of_month.isoformat(),
        )

        total_requests = 0
        most_used_model = None

        if result:
            total_requests = result[0].get("total_requests", 0)
            most_used_model = result[0].get("model")

        remaining_budget = usage_limit.monthly_limit - usage_limit.current_usage
        usage_percentage = (
            float((usage_limit.current_usage / usage_limit.monthly_limit) * 100)
            if usage_limit.monthly_limit > 0
            else 0
        )

        return UsageSummary(
            user_id=user_id,
            current_month_usage=usage_limit.current_usage,
            monthly_limit=usage_limit.monthly_limit,
            remaining_budget=remaining_budget,
            usage_percentage=usage_percentage,
            total_requests=total_requests,
            most_used_model=most_used_model,
        )

    @staticmethod
    def _get_next_month_reset_date(current_date: datetime) -> datetime:
        """Get the reset date for the next month."""
        if current_date.month == 12:
            return current_date.replace(
                year=current_date.year + 1,
                month=1,
                day=1,
                hour=0,
                minute=0,
                second=0,
                microsecond=0,
            )
        else:
            return current_date.replace(
                month=current_date.month + 1,
                day=1,
                hour=0,
                minute=0,
                second=0,
                microsecond=0,
            )
