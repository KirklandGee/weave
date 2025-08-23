from decimal import Decimal
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class SubscriptionService:
    """Service for managing user subscription plans and AI credit limits."""
    
    # Plan-based monthly AI credit limits
    PLAN_LIMITS: Dict[str, Decimal] = {
        'free_user': Decimal('0.00'),     # $0/month - no AI access
        'player': Decimal('10.00'),       # $10/month - $10 AI credits  
        'game_master': Decimal('25.00')   # $25/month - $25 AI credits
    }
    
    # Plan display names for logging/debugging
    PLAN_NAMES: Dict[str, str] = {
        'free_user': 'Storyteller (Free)',
        'player': 'Player ($10/month)',
        'game_master': 'Game Master ($25/month)'
    }
    
    @staticmethod
    def get_user_plan(user_id: str) -> str:
        """
        Get user's current plan from Clerk.
        
        For now, this is a placeholder that defaults to free_user.
        In the actual implementation, this would call Clerk's API to get
        the user's subscription plan.
        
        Args:
            user_id: The Clerk user ID
            
        Returns:
            Plan ID string: 'free_user', 'player', or 'game_master'
        """
        try:
            # TODO: Implement actual Clerk API call
            # user = clerk.users.get(user_id)
            # return user.get('subscription', {}).get('plan', 'free_user')
            
            # For now, default to free_user
            # This will be updated when we integrate with Clerk's billing API
            logger.info(f"Getting plan for user {user_id} - defaulting to free_user")
            return 'free_user'
            
        except Exception as e:
            logger.error(f"Error getting plan for user {user_id}: {str(e)}")
            return 'free_user'  # Safe fallback
    
    @staticmethod
    def get_monthly_limit(user_id: str) -> Decimal:
        """
        Get monthly AI credit limit based on user's subscription plan.
        
        Args:
            user_id: The Clerk user ID
            
        Returns:
            Monthly AI credit limit as Decimal
        """
        plan = SubscriptionService.get_user_plan(user_id)
        limit = SubscriptionService.PLAN_LIMITS.get(plan, Decimal('0.00'))
        
        logger.debug(f"User {user_id} has plan '{plan}' with limit ${limit}")
        return limit
    
    @staticmethod
    def has_ai_access(user_id: str) -> bool:
        """
        Check if user has access to AI features based on their plan.
        
        Args:
            user_id: The Clerk user ID
            
        Returns:
            True if user has AI access (paid plan), False otherwise
        """
        plan = SubscriptionService.get_user_plan(user_id)
        has_access = plan in ['player', 'game_master']
        
        logger.debug(f"User {user_id} AI access check: {has_access} (plan: {plan})")
        return has_access
    
    @staticmethod
    def get_plan_display_name(plan_id: str) -> str:
        """
        Get human-readable plan name for display.
        
        Args:
            plan_id: The plan ID
            
        Returns:
            Human-readable plan name
        """
        return SubscriptionService.PLAN_NAMES.get(plan_id, f"Unknown Plan ({plan_id})")
    
    @staticmethod
    def is_valid_plan(plan_id: str) -> bool:
        """
        Check if a plan ID is valid.
        
        Args:
            plan_id: The plan ID to validate
            
        Returns:
            True if valid plan ID, False otherwise
        """
        return plan_id in SubscriptionService.PLAN_LIMITS