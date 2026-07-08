"""
Prompt Bazaar V7 — Agent 4: Prompt Type Classifier
ML-based prompt type classification.
"""
import logging
from services.agents.base_agent import BaseAgent
from services.ml.classifier import get_prompt_type_classifier

logger = logging.getLogger(__name__)


class PromptTypeClassifierAgent(BaseAgent):
    """
    Agent 4: Classifies the type of prompt the user needs.
    Returns primary prompt type with confidence.
    """

    name = "Agent 4: Prompt Type Classifier"

    def execute(self, context: dict) -> dict:
        text = context.get("normalized_input", context.get("raw_input", ""))
        if not text:
            return {"prompt_types": [{"prompt_type": "Business", "confidence": 50}]}

        classifier = get_prompt_type_classifier()
        types = classifier.classify_type(text, top_k=3)

        primary_type = types[0]["prompt_type"] if types else "Business"

        return {
            "prompt_types": types,
            "primary_prompt_type": primary_type,
        }
