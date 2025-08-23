"""
Prompt injection detection and prevention system for AI RPG Manager.
Implements multiple detection strategies to identify and mitigate prompt injection attacks.
"""

import re
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import hashlib
import json

logger = logging.getLogger(__name__)

class ThreatLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high" 
    CRITICAL = "critical"

@dataclass
class DetectionResult:
    is_malicious: bool
    threat_level: ThreatLevel
    detected_patterns: List[str]
    confidence_score: float
    risk_factors: List[str]
    sanitized_content: Optional[str] = None

class PromptInjectionDetector:
    """
    Multi-layered prompt injection detection system using pattern matching,
    heuristics, and behavioral analysis.
    """
    
    def __init__(self):
        self.detection_patterns = self._load_detection_patterns()
        self.rate_limit_cache: Dict[str, List[datetime]] = {}
        self.suspicious_patterns_cache: Dict[str, int] = {}
        
    def _load_detection_patterns(self) -> Dict[str, List[str]]:
        """Load known prompt injection patterns organized by category."""
        return {
            "system_override": [
                r"ignore\s+(all\s+)?previous\s+(instructions?|prompts?)",
                r"disregard\s+(all\s+)?above\s+(instructions?|prompts?)",
                r"forget\s+(all\s+)?previous\s+(context|instructions?)",
                r"act\s+as\s+if\s+you\s+(are|were)\s+(?!a\s+(player|character|NPC))",
                r"pretend\s+you\s+are\s+(?!a\s+(player|character|NPC))",
                r"roleplay\s+as\s+(?!a\s+(player|character|NPC))",
                r"system\s*[:=]\s*[\"']?[^\"']*[\"']?",
                r"___\s*system\s*___",
                r"\[SYSTEM\]|\[SYS\]|\[ADMIN\]",
            ],
            "prompt_leakage": [
                r"show\s+me\s+(your\s+)?(system\s+)?(prompt|instructions?)",
                r"reveal\s+(your\s+)?(system\s+)?(prompt|instructions?)",
                r"what\s+(are\s+)?your\s+(system\s+)?(prompt|instructions?)",
                r"print\s+(your\s+)?(system\s+)?(prompt|instructions?)",
                r"display\s+(your\s+)?(system\s+)?(prompt|instructions?)",
                r"repeat\s+(your\s+)?(system\s+)?(prompt|instructions?)",
            ],
            "injection_markers": [
                r"\\n\\n(human|assistant|user|system):",
                r"<\|im_(start|end)\|>",
                r"<\|endoftext\|>",
                r"###\s*(human|assistant|user|system)",
                r"---\s*(human|assistant|user|system)",
                r"\[INST\]|\[/INST\]",
                r"<instruction>|</instruction>",
            ],
            "malicious_commands": [
                r"(execute|run|eval)\s+code",
                r"import\s+os|import\s+subprocess",
                r"__import__\s*\(",
                r"eval\s*\(|exec\s*\(",
                r"system\s*\(|popen\s*\(",
                r"shell\s+command",
            ],
            "data_exfiltration": [
                r"(access|read|retrieve)\s+(database|db|file|system)",
                r"show\s+(me\s+)?(all\s+)?(users?|passwords?|keys?|secrets?)",
                r"list\s+(all\s+)?(users?|files?|directories?)",
                r"dump\s+(database|db|table|schema)",
                r"select\s+\*\s+from",
            ],
            "context_manipulation": [
                r"new\s+(conversation|chat|session)",
                r"reset\s+(conversation|chat|context)",
                r"clear\s+(history|context|memory)",
                r"start\s+over",
                r"begin\s+new\s+(task|conversation)",
            ],
        }
    
    def analyze_content(self, content: str, user_id: str = None, context: str = "") -> DetectionResult:
        """
        Analyze content for prompt injection attempts using multiple detection methods.
        
        Args:
            content: The user input to analyze
            user_id: Optional user identifier for rate limiting
            context: Additional context (campaign data, etc.)
            
        Returns:
            DetectionResult with analysis findings
        """
        detected_patterns = []
        risk_factors = []
        confidence_score = 0.0
        
        # 1. Pattern-based detection
        pattern_results = self._detect_patterns(content)
        detected_patterns.extend(pattern_results)
        confidence_score += len(pattern_results) * 0.15
        
        # 2. Heuristic analysis
        heuristic_score, heuristic_risks = self._heuristic_analysis(content)
        confidence_score += heuristic_score
        risk_factors.extend(heuristic_risks)
        
        # 3. Context analysis
        context_score, context_risks = self._context_analysis(content, context)
        confidence_score += context_score
        risk_factors.extend(context_risks)
        
        # 4. Rate limiting analysis
        if user_id:
            rate_score, rate_risks = self._rate_limit_analysis(user_id, content)
            confidence_score += rate_score
            risk_factors.extend(rate_risks)
        
        # 5. Behavioral analysis
        behavior_score, behavior_risks = self._behavioral_analysis(content, user_id)
        confidence_score += behavior_score
        risk_factors.extend(behavior_risks)
        
        # Normalize confidence score
        confidence_score = min(confidence_score, 1.0)
        
        # Determine threat level
        threat_level = self._calculate_threat_level(confidence_score, len(detected_patterns))
        
        # Determine if content is malicious
        is_malicious = (
            confidence_score >= 0.6 or 
            len(detected_patterns) >= 2 or 
            threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]
        )
        
        # Generate sanitized version if needed
        sanitized_content = None
        if is_malicious and confidence_score < 0.9:
            sanitized_content = self._sanitize_content(content, detected_patterns)
        
        return DetectionResult(
            is_malicious=is_malicious,
            threat_level=threat_level,
            detected_patterns=detected_patterns,
            confidence_score=confidence_score,
            risk_factors=risk_factors,
            sanitized_content=sanitized_content
        )
    
    def _detect_patterns(self, content: str) -> List[str]:
        """Detect known prompt injection patterns."""
        detected = []
        content_lower = content.lower()
        
        for category, patterns in self.detection_patterns.items():
            for pattern in patterns:
                if re.search(pattern, content_lower, re.IGNORECASE | re.MULTILINE):
                    detected.append(f"{category}:{pattern[:50]}...")
                    logger.warning(f"Detected {category} pattern: {pattern[:50]}...")
        
        return detected
    
    def _heuristic_analysis(self, content: str) -> Tuple[float, List[str]]:
        """Analyze content using heuristic rules."""
        score = 0.0
        risks = []
        
        # Check for suspicious length
        if len(content) > 5000:
            score += 0.1
            risks.append("Unusually long input")
        
        # Check for repeated suspicious keywords
        suspicious_words = ["system", "ignore", "forget", "disregard", "admin", "root", "execute"]
        word_counts = {word: content.lower().count(word) for word in suspicious_words}
        
        for word, count in word_counts.items():
            if count > 3:
                score += count * 0.05
                risks.append(f"Repeated suspicious keyword: {word} ({count} times)")
        
        # Check for unusual character patterns
        if re.search(r'[<>]{3,}|[_]{5,}|[#]{3,}|[\[\]]{3,}', content):
            score += 0.15
            risks.append("Suspicious character sequences")
        
        # Check for multiple language mixing (potential obfuscation)
        if re.search(r'[^\x00-\x7F]{5,}', content):
            score += 0.1
            risks.append("Non-ASCII character sequences")
        
        # Check for base64/encoded patterns
        if re.search(r'[A-Za-z0-9+/]{20,}={0,2}', content):
            score += 0.15
            risks.append("Potential encoded content")
        
        return score, risks
    
    def _context_analysis(self, content: str, context: str) -> Tuple[float, List[str]]:
        """Analyze content in relation to the provided context."""
        score = 0.0
        risks = []
        
        # Check if content is completely unrelated to RPG context
        rpg_keywords = ["character", "campaign", "quest", "npc", "player", "dice", "dungeon", "adventure"]
        context_keywords = context.lower().split() if context else []
        content_lower = content.lower()
        
        # If no RPG-related keywords in a long message, it's suspicious
        if len(content) > 200 and not any(keyword in content_lower for keyword in rpg_keywords):
            if not any(keyword in context_keywords for keyword in rpg_keywords):
                score += 0.2
                risks.append("Content unrelated to RPG context")
        
        # Check for sudden topic changes
        if context and len(context) > 100:
            if "now let's" in content_lower or "instead," in content_lower:
                score += 0.15
                risks.append("Potential topic manipulation")
        
        return score, risks
    
    def _rate_limit_analysis(self, user_id: str, content: str) -> Tuple[float, List[str]]:
        """Analyze user behavior patterns for rate limiting."""
        score = 0.0
        risks = []
        now = datetime.now()
        
        # Initialize user's request history if not exists
        if user_id not in self.rate_limit_cache:
            self.rate_limit_cache[user_id] = []
        
        # Clean old entries (keep last hour)
        cutoff = now - timedelta(hours=1)
        self.rate_limit_cache[user_id] = [
            req_time for req_time in self.rate_limit_cache[user_id] 
            if req_time > cutoff
        ]
        
        # Add current request
        self.rate_limit_cache[user_id].append(now)
        
        # Check request frequency
        request_count = len(self.rate_limit_cache[user_id])
        if request_count > 50:  # More than 50 requests per hour
            score += 0.3
            risks.append(f"High request frequency: {request_count}/hour")
        elif request_count > 20:
            score += 0.15
            risks.append(f"Elevated request frequency: {request_count}/hour")
        
        # Check for identical or near-identical requests
        content_hash = hashlib.md5(content.encode()).hexdigest()
        if content_hash in self.suspicious_patterns_cache:
            self.suspicious_patterns_cache[content_hash] += 1
            if self.suspicious_patterns_cache[content_hash] > 3:
                score += 0.25
                risks.append("Repeated identical requests")
        else:
            self.suspicious_patterns_cache[content_hash] = 1
        
        return score, risks
    
    def _behavioral_analysis(self, content: str, user_id: str = None) -> Tuple[float, List[str]]:
        """Analyze behavioral patterns in the request."""
        score = 0.0
        risks = []
        
        # Check for conversation hijacking attempts
        if re.search(r'(human|user|assistant):\s*$', content, re.MULTILINE):
            score += 0.25
            risks.append("Potential conversation hijacking")
        
        # Check for system prompt probing
        system_probes = [
            "what are you?", "who are you?", "what is your purpose?",
            "what can you do?", "what are your capabilities?", "what are your limits?"
        ]
        
        if any(probe in content.lower() for probe in system_probes):
            if len(content) < 50:  # Short, direct probing questions
                score += 0.1
                risks.append("Potential system probing")
        
        # Check for rapid escalation patterns
        escalation_words = ["urgent", "immediately", "now", "right now", "asap", "emergency"]
        if sum(content.lower().count(word) for word in escalation_words) > 2:
            score += 0.1
            risks.append("Potential urgency manipulation")
        
        return score, risks
    
    def _calculate_threat_level(self, confidence_score: float, pattern_count: int) -> ThreatLevel:
        """Calculate threat level based on analysis results."""
        if confidence_score >= 0.8 or pattern_count >= 3:
            return ThreatLevel.CRITICAL
        elif confidence_score >= 0.6 or pattern_count >= 2:
            return ThreatLevel.HIGH
        elif confidence_score >= 0.4 or pattern_count >= 1:
            return ThreatLevel.MEDIUM
        else:
            return ThreatLevel.LOW
    
    def _sanitize_content(self, content: str, detected_patterns: List[str]) -> str:
        """
        Attempt to sanitize content by removing or neutralizing detected threats.
        Only used for medium-confidence threats where content might be salvageable.
        """
        sanitized = content
        
        # Remove common injection patterns
        injection_removals = [
            r"ignore\s+(all\s+)?previous\s+(instructions?|prompts?)",
            r"disregard\s+(all\s+)?above\s+(instructions?|prompts?)",
            r"forget\s+(all\s+)?previous\s+(context|instructions?)",
            r"system\s*[:=]\s*[\"']?[^\"']*[\"']?",
            r"___\s*system\s*___",
            r"\[SYSTEM\]|\[SYS\]|\[ADMIN\]",
        ]
        
        for pattern in injection_removals:
            sanitized = re.sub(pattern, "", sanitized, flags=re.IGNORECASE | re.MULTILINE)
        
        # Clean up whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized).strip()
        
        return sanitized if sanitized != content else None

    def get_security_stats(self) -> Dict:
        """Get current security statistics."""
        now = datetime.now()
        cutoff = now - timedelta(hours=1)
        
        # Count recent requests
        recent_requests = 0
        for user_requests in self.rate_limit_cache.values():
            recent_requests += len([req for req in user_requests if req > cutoff])
        
        return {
            "total_users_tracked": len(self.rate_limit_cache),
            "recent_requests_1h": recent_requests,
            "patterns_in_cache": len(self.suspicious_patterns_cache),
            "detection_categories": len(self.detection_patterns),
            "total_patterns": sum(len(patterns) for patterns in self.detection_patterns.values())
        }