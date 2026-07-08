"""
Prompt Bazaar V7 — Agent 2: Intent Intelligence Agent
ML-based intent classification with confidence scoring.
"""
import logging
from services.agents.base_agent import BaseAgent
from services.ml.classifier import get_intent_classifier

logger = logging.getLogger(__name__)


class IntentIntelligenceAgent(BaseAgent):
    """
    Agent 2: Uses TF-IDF ML classifier to predict user intent.
    Returns top-3 intents with confidence scores.
    """

    name = "Agent 2: Intent Intelligence"

    def execute(self, context: dict) -> dict:
        text = context.get("normalized_input", context.get("raw_input", ""))
        if not text:
            return {"intents": [{"intent": "Create", "confidence": 50}]}

        classifier = get_intent_classifier()
        intents = classifier.classify_intent(text, top_k=3)

        # Determine primary intent and action verbs
        primary = intents[0] if intents else {"intent": "Create", "confidence": 50}

        # Estimate complexity from text length and keywords
        words = text.split()
        word_count = len(words)
        complexity_keywords = [
            "enterprise", "production", "scale", "global", "secure",
            "distributed", "microservices", "high-availability", "real-time",
            "multi-tenant", "compliance", "HIPAA", "PCI", "million",
        ]
        has_complexity = any(kw in text.lower() for kw in complexity_keywords)

        if word_count < 6:
            complexity = "Underspecified"
            readiness = "Needs Elaboration"
        elif word_count < 15:
            complexity = "Standard"
            readiness = "Good"
        elif has_complexity or word_count > 40:
            complexity = "Enterprise"
            readiness = "Production Ready"
        else:
            complexity = "Standard"
            readiness = "Good"

        return {
            "intents": intents,
            "primary_intent": primary["intent"],
            "intent_confidence": primary["confidence"],
            "complexity": complexity,
            "readiness": readiness,
            "word_count": word_count,
        }
