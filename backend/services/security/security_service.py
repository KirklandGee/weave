"""
Security service that integrates prompt injection detection with the existing system.
Handles logging, alerting, and fallback responses for security events.
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime
from .prompt_injection_detector import PromptInjectionDetector, DetectionResult, ThreatLevel
from backend.models.schemas import LLMMessage

logger = logging.getLogger(__name__)

class SecurityService:
    """
    Main security service that provides prompt injection protection
    and security event management for the AI RPG Manager.
    """
    
    def __init__(self):
        self.detector = PromptInjectionDetector()
        self.security_logger = self._setup_security_logger()
        
    def _setup_security_logger(self) -> logging.Logger:
        """Setup dedicated security logging."""
        security_logger = logging.getLogger("security")
        security_logger.setLevel(logging.INFO)
        
        # Create handler if it doesn't exist
        if not security_logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - SECURITY - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            security_logger.addHandler(handler)
        
        return security_logger
    
    def validate_llm_request(
        self, 
        messages: list[LLMMessage], 
        context: str = "", 
        user_id: str = None
    ) -> tuple[bool, Optional[str], Optional[list[LLMMessage]]]:
        """
        Validate an LLM request for security threats.
        
        Args:
            messages: List of messages to validate
            context: Additional context for the request
            user_id: User making the request
            
        Returns:
            Tuple of (is_safe, error_message, sanitized_messages)
            - is_safe: Whether the request is safe to process
            - error_message: Error message if request is blocked
            - sanitized_messages: Cleaned messages if partially recoverable
        """
        # Analyze each message for threats
        threat_results = []
        all_content = ""
        
        for message in messages:
            if message.role in ["human", "user"]:  # Only scan user messages
                result = self.detector.analyze_content(
                    content=message.content,
                    user_id=user_id,
                    context=context
                )
                threat_results.append((message, result))
                all_content += f" {message.content}"
        
        # Determine overall threat level
        highest_threat = ThreatLevel.LOW
        is_malicious = False
        all_detected_patterns = []
        total_confidence = 0.0
        
        for message, result in threat_results:
            if result.is_malicious:
                is_malicious = True
            if result.threat_level.value > highest_threat.value:
                highest_threat = result.threat_level
            all_detected_patterns.extend(result.detected_patterns)
            total_confidence = max(total_confidence, result.confidence_score)
        
        # Log security event
        self._log_security_event(
            user_id=user_id,
            threat_level=highest_threat,
            is_malicious=is_malicious,
            detected_patterns=all_detected_patterns,
            confidence_score=total_confidence,
            content_preview=all_content[:200] + "..." if len(all_content) > 200 else all_content
        )
        
        # Handle based on threat level
        if highest_threat == ThreatLevel.CRITICAL or total_confidence >= 0.8:
            return False, self._get_fallback_response(highest_threat), None
        
        elif highest_threat == ThreatLevel.HIGH or total_confidence >= 0.6:
            # Try to sanitize if possible
            sanitized_messages = self._sanitize_messages(messages, threat_results)
            if sanitized_messages:
                self.security_logger.info(
                    f"Sanitized HIGH threat request for user {user_id}"
                )
                return True, None, sanitized_messages
            else:
                return False, self._get_fallback_response(highest_threat), None
        
        elif highest_threat == ThreatLevel.MEDIUM:
            # Allow with sanitization if possible
            sanitized_messages = self._sanitize_messages(messages, threat_results)
            if sanitized_messages:
                return True, None, sanitized_messages
            else:
                return True, None, messages  # Allow original if sanitization fails
        
        # LOW or no threat - allow through
        return True, None, messages
    
    def _sanitize_messages(
        self, 
        original_messages: list[LLMMessage], 
        threat_results: list[tuple[LLMMessage, DetectionResult]]
    ) -> Optional[list[LLMMessage]]:
        """
        Sanitize messages based on threat detection results.
        
        Returns:
            Sanitized messages if successful, None if unsalvageable
        """
        sanitized_messages = []
        
        # Create a mapping of original messages to results
        result_map = {id(msg): result for msg, result in threat_results}
        
        for message in original_messages:
            if id(message) in result_map:
                result = result_map[id(message)]
                if result.sanitized_content is not None:
                    # Use sanitized version
                    sanitized_message = LLMMessage(
                        role=message.role,
                        content=result.sanitized_content,
                        name=message.name,
                        additional_kwargs=message.additional_kwargs
                    )
                    sanitized_messages.append(sanitized_message)
                elif not result.is_malicious:
                    # Keep original if not malicious
                    sanitized_messages.append(message)
                else:
                    # Skip malicious messages that can't be sanitized
                    self.security_logger.warning(
                        f"Skipping unsanitizable malicious message: {message.content[:100]}..."
                    )
            else:
                # Keep system and assistant messages as-is
                sanitized_messages.append(message)
        
        # Return None if all user messages were removed
        if not any(msg.role in ["human", "user"] for msg in sanitized_messages):
            return None
        
        return sanitized_messages
    
    def _log_security_event(
        self,
        user_id: str,
        threat_level: ThreatLevel,
        is_malicious: bool,
        detected_patterns: list[str],
        confidence_score: float,
        content_preview: str
    ):
        """Log security events for monitoring and analysis."""
        event_data = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "threat_level": threat_level.value,
            "is_malicious": is_malicious,
            "confidence_score": confidence_score,
            "detected_patterns": detected_patterns,
            "content_preview": content_preview
        }
        
        if is_malicious or threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]:
            self.security_logger.warning(
                f"THREAT DETECTED - User: {user_id}, Level: {threat_level.value}, "
                f"Confidence: {confidence_score:.2f}, Patterns: {len(detected_patterns)}"
            )
            self.security_logger.info(f"Event details: {event_data}")
        else:
            self.security_logger.info(
                f"Security check - User: {user_id}, Level: {threat_level.value}, "
                f"Confidence: {confidence_score:.2f}"
            )
    
    def _get_fallback_response(self, threat_level: ThreatLevel) -> str:
        """
        Generate appropriate fallback response based on threat level.
        """
        fallback_responses = {
            ThreatLevel.CRITICAL: (
                "I cannot process this request as it appears to contain content that violates "
                "our security policies. Please rephrase your request focusing on your RPG campaign "
                "and game-related content."
            ),
            ThreatLevel.HIGH: (
                "I'm having trouble processing your request as it contains some concerning elements. "
                "Could you please rephrase this focusing specifically on your RPG campaign, "
                "characters, or game mechanics?"
            ),
            ThreatLevel.MEDIUM: (
                "I notice your request might be unclear or contain some unusual elements. "
                "Could you please clarify what you'd like help with regarding your RPG campaign?"
            ),
            ThreatLevel.LOW: (
                "I want to make sure I understand your request correctly. "
                "How can I help you with your RPG campaign today?"
            )
        }
        
        return fallback_responses.get(
            threat_level, 
            "I'm having trouble understanding your request. How can I help with your RPG campaign?"
        )
    
    def check_rate_limits(self, user_id: str) -> tuple[bool, Optional[str]]:
        """
        Check if user has exceeded rate limits for suspicious activity.
        
        Returns:
            Tuple of (is_allowed, error_message)
        """
        # Get current user stats from detector
        if user_id in self.detector.rate_limit_cache:
            recent_requests = len(self.detector.rate_limit_cache[user_id])
            
            if recent_requests > 100:  # Very high usage
                self.security_logger.warning(
                    f"Rate limit BLOCKED - User {user_id}: {recent_requests} requests/hour"
                )
                return False, (
                    "Request rate limit exceeded. Please wait a moment before making more requests. "
                    "If you're experiencing issues, please contact support."
                )
            elif recent_requests > 60:  # Warning level
                self.security_logger.info(
                    f"Rate limit WARNING - User {user_id}: {recent_requests} requests/hour"
                )
        
        return True, None
    
    def get_security_metrics(self) -> Dict[str, Any]:
        """Get security metrics and statistics."""
        detector_stats = self.detector.get_security_stats()
        
        return {
            "detector_stats": detector_stats,
            "service_status": "active",
            "last_updated": datetime.now().isoformat()
        }

# Global security service instance
security_service = SecurityService()