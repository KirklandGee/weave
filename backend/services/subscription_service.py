from decimal import Decimal
from typing import Dict, Optional
import logging
import os
import requests
from fastapi import Request
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions

logger = logging.getLogger(__name__)

# Initialize Clerk client for subscription queries
clerk_client = Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY"))


class SubscriptionService:
    """Service for managing user subscription plans and AI credit limits."""

    # Plan-based monthly AI credit limits
    PLAN_LIMITS: Dict[str, Decimal] = {
        "free_user": Decimal("0.00"),  # $0/month - no AI access
        "player": Decimal("10.00"),  # $10/month - $10 AI credits
        "game_master": Decimal("25.00"),  # $25/month - $25 AI credits
    }

    # Plan display names for logging/debugging
    PLAN_NAMES: Dict[str, str] = {
        "free_user": "Storyteller (Free)",
        "player": "Player ($10/month)",
        "game_master": "Game Master ($25/month)",
    }

    @staticmethod
    def get_user_plan_from_request(request: Request) -> str:
        """
        Get user's current plan from Clerk auth state in the request.
        This uses the same auth object that's available on the frontend.
        
        Args:
            request: FastAPI Request object with Clerk authentication
            
        Returns:
            Plan ID string: 'free_user', 'player', or 'game_master'
        """
        try:
            # Use Clerk's built-in authentication to get auth state
            request_state = clerk_client.authenticate_request(
                request,
                AuthenticateRequestOptions(
                    authorized_parties=[
                        "http://localhost:3000",
                        "https://localhost:3000", 
                        "http://app.localhost:3001",
                        "http://localhost:3001",
                        "https://localhost:3001",
                        "https://use-weave.app",
                        "https://www.use-weave.app",
                        "https://my.use-weave.app",
                        "https://weave-app-git-main-kirkland-gees-projects.vercel.app",
                    ]
                ),
            )
            
            if not request_state.is_signed_in:
                logger.info("User not signed in - defaulting to free_user")
                return "free_user"
                
            # Check if request_state has plan checking capabilities similar to frontend
            # Look for has() method or similar functionality
            if hasattr(request_state, 'has'):
                # Try to check for game_master plan first (highest tier)
                if request_state.has({'plan': 'game_master'}):
                    logger.info("User has game_master plan via request_state.has()")
                    return "game_master"
                elif request_state.has({'plan': 'player'}):
                    logger.info("User has player plan via request_state.has()")
                    return "player"
                    
            # Fallback: Check in the JWT payload for plan information
            if hasattr(request_state, "payload") and request_state.payload:
                payload = request_state.payload
                
                # Look for plan information in various possible locations in the JWT
                plan = None
                if 'pla' in payload:
                    # Clerk stores plan as 'pla' field with format 'u:plan_name' or 'o:plan_name'
                    pla_value = payload['pla']
                    if isinstance(pla_value, str) and ':' in pla_value:
                        # Extract plan name from format like 'u:player' or 'o:game_master'  
                        plan = pla_value.split(':', 1)[1]
                    else:
                        plan = pla_value
                elif 'plan' in payload:
                    plan = payload['plan']
                elif 'org_plan' in payload:
                    plan = payload['org_plan']
                elif 'subscription_plan' in payload:
                    plan = payload['subscription_plan']
                    
                if plan in SubscriptionService.PLAN_LIMITS:
                    logger.info(f"Found plan '{plan}' in JWT payload")
                    return plan
                    
            # If we get here, no plan was found - default to free
            user_id = request_state.payload.get("sub") if hasattr(request_state, "payload") else "unknown"
            logger.info(f"User {user_id} has no paid subscription found via request auth - defaulting to free_user")
            return "free_user"
            
        except Exception as e:
            logger.error(f"Error getting plan from request auth: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            # Safe fallback if auth fails
            return "free_user"
    
    @staticmethod
    def get_user_plan(user_id: str) -> str:
        """
        Get user's current plan from Clerk.

        Queries Clerk's API to retrieve the user's actual subscription plan
        based on their organization memberships and roles.

        Args:
            user_id: The Clerk user ID

        Returns:
            Plan ID string: 'free_user', 'player', or 'game_master'
        """
        try:
            # Get user details from Clerk using REST API since SDK method is unreliable
            headers = {
                'Authorization': f'Bearer {os.getenv("CLERK_SECRET_KEY")}',
                'Content-Type': 'application/json'
            }
            response = requests.get(f'https://api.clerk.com/v1/users/{user_id}', headers=headers)
            response.raise_for_status()
            user_data = response.json()
            
            # Debug logging to see what we actually get from Clerk  
            logger.debug(f"DEBUG: Full user data for {user_id}: {user_data}")
            logger.debug(f"DEBUG: Organization memberships: {user_data.get('organization_memberships', 'None')}")
            logger.debug(f"DEBUG: Public metadata: {user_data.get('public_metadata', 'None')}")
            logger.debug(f"DEBUG: Private metadata: {user_data.get('private_metadata', 'None')}")

            # Check user's organization memberships for subscription plans
            # Clerk stores subscription plans as organization roles or metadata
            org_memberships = user_data.get("organization_memberships", [])

            # Check for plan-specific roles or metadata
            for membership in org_memberships:
                role = membership.get("role")
                if role:
                    # Map organization roles to subscription plans
                    if role == "game_master" or role == "admin":
                        logger.info(
                            f"User {user_id} has game_master plan (role: {role})"
                        )
                        return "game_master"
                    elif role == "player" or role == "member":
                        logger.info(f"User {user_id} has player plan (role: {role})")
                        return "player"

            # Check user's public metadata for subscription info
            public_metadata = user_data.get("public_metadata")
            if public_metadata and isinstance(public_metadata, dict):
                plan = public_metadata.get("subscription_plan") or public_metadata.get("plan")
                if plan in SubscriptionService.PLAN_LIMITS:
                    logger.info(f"User {user_id} has {plan} plan from public metadata")
                    return plan

            # Check user's private metadata for subscription info
            private_metadata = user_data.get("private_metadata")
            if private_metadata and isinstance(private_metadata, dict):
                plan = private_metadata.get("subscription_plan") or private_metadata.get("plan")
                if plan in SubscriptionService.PLAN_LIMITS:
                    logger.info(f"User {user_id} has {plan} plan from private metadata")
                    return plan

            # Default to free_user if no subscription found
            logger.info(
                f"User {user_id} has no paid subscription - defaulting to free_user"
            )
            return "free_user"

        except Exception as e:
            logger.error(f"Error getting plan for user {user_id}: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            return "free_user"  # Safe fallback

    @staticmethod
    def get_monthly_limit_from_request(request: Request) -> Decimal:
        """
        Get monthly AI credit limit based on user's subscription plan from request.
        
        Args:
            request: FastAPI Request object with Clerk authentication
            
        Returns:
            Monthly AI credit limit as Decimal
        """
        plan = SubscriptionService.get_user_plan_from_request(request)
        limit = SubscriptionService.PLAN_LIMITS.get(plan, Decimal("0.00"))
        
        logger.debug(f"User has plan '{plan}' with limit ${limit} (from request)")
        return limit
    
    @staticmethod
    def has_ai_access_from_request(request: Request) -> bool:
        """
        Check if user has access to AI features based on their plan from request.
        
        Args:
            request: FastAPI Request object with Clerk authentication
            
        Returns:
            True if user has AI access (paid plan), False otherwise
        """
        plan = SubscriptionService.get_user_plan_from_request(request)
        has_access = plan in ["player", "game_master"]
        
        logger.debug(f"User AI access check: {has_access} (plan: {plan}, from request)")
        return has_access

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
        limit = SubscriptionService.PLAN_LIMITS.get(plan, Decimal("0.00"))

        logger.info(f"User {user_id} has plan '{plan}' with limit ${limit}")
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
        has_access = plan in ["player", "game_master"]

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
