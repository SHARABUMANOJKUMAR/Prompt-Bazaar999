"""
Prompt Bazaar V7 — Agent 3: Multi-Domain Classifier
ML-based domain classification with weighted confidence scoring.
"""
import logging
from services.agents.base_agent import BaseAgent
from services.ml.classifier import get_domain_classifier

logger = logging.getLogger(__name__)


class MultiDomainClassifierAgent(BaseAgent):
    """
    Agent 3: Uses TF-IDF ML classifier to predict multiple domains.
    Returns top-5 domains with confidence scores.
    """

    name = "Agent 3: Multi-Domain Classifier"

    def execute(self, context: dict) -> dict:
        text = context.get("normalized_input", context.get("raw_input", ""))
        if not text:
            return {"domains": [{"domain": "Business", "confidence": 50}]}

        classifier = get_domain_classifier()
        domains = classifier.classify_domain(text, top_k=5)

        # Map classifier output to expected format
        detected_domains = []
        for d in domains:
            detected_domains.append({
                "domain": d["domain"],
                "confidence": d["confidence"],
            })

        primary_domain = detected_domains[0]["domain"] if detected_domains else "Business"

        return {
            "domains": detected_domains,
            "primary_domain": primary_domain,
            "domain_count": len(detected_domains),
        }
