from datetime import datetime, timezone
from decimal import Decimal
from calendar import monthrange
from typing import Optional
from backend.services.neo4j import query
from backend.models.schemas import UsageEvent, UsageLimit, UsageSummary
from backend.services.llm.config import MODEL_PRICING, DEFAULT_MONTHLY_LIMIT


class UsageService:
    """Service for tracking and managing user LLM usage and limits."""
    
    @staticmethod
    def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> Decimal:
        """Calculate the cost for a given model and token usage."""
        if model not in MODEL_PRICING:
            # Default to free for unknown models
            return Decimal("0.00")
        
        pricing = MODEL_PRICING[model]
        input_cost = (Decimal(input_tokens) / Decimal("1000000")) * pricing["input_cost"]
        output_cost = (Decimal(output_tokens) / Decimal("1000000")) * pricing["output_cost"]
        
        return input_cost + output_cost
    
    @staticmethod
    def record_usage(
        user_id: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        campaign_id: Optional[str] = None,
        session_id: Optional[str] = None
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
            session_id=session_id
        )
        
        # Store in Neo4j
        query("""
            CREATE (u:UsageEvent {
                user_id: $user_id,
                timestamp: datetime($timestamp),
                model: $model,
                input_tokens: $input_tokens,
                output_tokens: $output_tokens,
                cost: $cost,
                campaign_id: $campaign_id,
                session_id: $session_id
            })
        """, 
            user_id=user_id,
            timestamp=usage_event.timestamp.isoformat(),
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=float(cost),
            campaign_id=campaign_id,
            session_id=session_id
        )
        
        return usage_event
    
    @staticmethod
    def get_current_month_usage(user_id: str) -> Decimal:
        """Get the total usage for the current month for a user."""
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        result = query("""
            MATCH (u:UsageEvent)
            WHERE u.user_id = $user_id 
            AND u.timestamp >= datetime($start_of_month)
            RETURN sum(u.cost) as total_cost
        """, 
            user_id=user_id,
            start_of_month=start_of_month.isoformat()
        )
        
        total_cost = result[0].get("total_cost") if result and result[0].get("total_cost") else 0
        return Decimal(str(total_cost))
    
    @staticmethod
    def get_user_limit(user_id: str) -> UsageLimit:
        """Get or create a user's usage limit."""
        now = datetime.now(timezone.utc)
        
        # Check if user has a custom limit
        result = query("""
            MATCH (l:UsageLimit)
            WHERE l.user_id = $user_id
            RETURN l.monthly_limit as monthly_limit, l.reset_date as reset_date
        """, user_id=user_id)
        
        if result:
            limit_data = result[0]
            monthly_limit = Decimal(str(limit_data["monthly_limit"]))
            reset_date = datetime.fromisoformat(limit_data["reset_date"])
            
            # Check if we need to reset for new month
            if now.month != reset_date.month or now.year != reset_date.year:
                next_month_reset = UsageService._get_next_month_reset_date(now)
                query("""
                    MATCH (l:UsageLimit)
                    WHERE l.user_id = $user_id
                    SET l.reset_date = datetime($reset_date)
                """, user_id=user_id, reset_date=next_month_reset.isoformat())
                reset_date = next_month_reset
        else:
            # Create default limit for user
            monthly_limit = DEFAULT_MONTHLY_LIMIT
            reset_date = UsageService._get_next_month_reset_date(now)
            
            query("""
                CREATE (l:UsageLimit {
                    user_id: $user_id,
                    monthly_limit: $monthly_limit,
                    reset_date: datetime($reset_date)
                })
            """, 
                user_id=user_id,
                monthly_limit=float(monthly_limit),
                reset_date=reset_date.isoformat()
            )
        
        current_usage = UsageService.get_current_month_usage(user_id)
        
        return UsageLimit(
            user_id=user_id,
            monthly_limit=monthly_limit,
            current_usage=current_usage,
            reset_date=reset_date
        )
    
    @staticmethod
    def check_usage_limit(user_id: str, estimated_cost: Decimal) -> bool:
        """Check if a user can make a request without exceeding their limit."""
        usage_limit = UsageService.get_user_limit(user_id)
        return (usage_limit.current_usage + estimated_cost) <= usage_limit.monthly_limit
    
    @staticmethod
    def set_user_limit(user_id: str, monthly_limit: Decimal) -> UsageLimit:
        """Set a custom usage limit for a user."""
        now = datetime.now(timezone.utc)
        reset_date = UsageService._get_next_month_reset_date(now)
        
        # Upsert the user limit
        query("""
            MERGE (l:UsageLimit {user_id: $user_id})
            SET l.monthly_limit = $monthly_limit,
                l.reset_date = datetime($reset_date)
        """, 
            user_id=user_id,
            monthly_limit=float(monthly_limit),
            reset_date=reset_date.isoformat()
        )
        
        current_usage = UsageService.get_current_month_usage(user_id)
        
        return UsageLimit(
            user_id=user_id,
            monthly_limit=monthly_limit,
            current_usage=current_usage,
            reset_date=reset_date
        )
    
    @staticmethod
    def get_usage_summary(user_id: str) -> UsageSummary:
        """Get a comprehensive usage summary for a user."""
        usage_limit = UsageService.get_user_limit(user_id)
        
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Get additional stats
        result = query("""
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
            start_of_month=start_of_month.isoformat()
        )
        
        total_requests = 0
        most_used_model = None
        
        if result:
            total_requests = result[0].get("total_requests", 0)
            most_used_model = result[0].get("model")
        
        remaining_budget = usage_limit.monthly_limit - usage_limit.current_usage
        usage_percentage = float((usage_limit.current_usage / usage_limit.monthly_limit) * 100) if usage_limit.monthly_limit > 0 else 0
        
        return UsageSummary(
            user_id=user_id,
            current_month_usage=usage_limit.current_usage,
            monthly_limit=usage_limit.monthly_limit,
            remaining_budget=remaining_budget,
            usage_percentage=usage_percentage,
            total_requests=total_requests,
            most_used_model=most_used_model
        )
    
    @staticmethod
    def _get_next_month_reset_date(current_date: datetime) -> datetime:
        """Get the reset date for the next month."""
        if current_date.month == 12:
            return current_date.replace(year=current_date.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            return current_date.replace(month=current_date.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)