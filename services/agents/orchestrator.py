"""
Prompt Bazaar V7 — Agent Orchestrator
Sequential pipeline controller that runs all 7 agents,
validates quality, and returns the final result.
"""
import logging
import time
import json

from services.agents.agent_1_normalizer import InputNormalizationAgent
from services.agents.agent_2_intent import IntentIntelligenceAgent
from services.agents.agent_3_domain import MultiDomainClassifierAgent
from services.agents.agent_4_prompt_type import PromptTypeClassifierAgent
from services.agents.agent_5_context import ContextInferenceAgent
from services.agents.agent_6_knowledge import KnowledgeRetrievalAgent
from services.agents.agent_7_composer import PromptEngineeringAgent
from services.agents.quality_validator import QualityValidator

logger = logging.getLogger(__name__)


class Orchestrator:
    """
    V7 Multi-Agent Orchestrator.
    Runs 7 specialized agents sequentially through a shared context,
    validates quality, and auto-regenerates if quality is insufficient.
    """

    MAX_RETRIES = 2

    def __init__(self):
        self._agents = [
            InputNormalizationAgent(),
            IntentIntelligenceAgent(),
            MultiDomainClassifierAgent(),
            PromptTypeClassifierAgent(),
            ContextInferenceAgent(),
            KnowledgeRetrievalAgent(),
            PromptEngineeringAgent(),
        ]
        self._validator = QualityValidator()

    def run(self, raw_input: str) -> dict:
        """
        Execute the full multi-agent pipeline.

        Args:
            raw_input: The user's raw, messy input text.

        Returns:
            dict with: enhanced, insights, raw, pipeline_trace
        """
        start_time = time.time()

        if not raw_input or not raw_input.strip():
            return self._empty_result()

        # Initialize the shared pipeline context
        context = {
            "raw_input": raw_input.strip(),
            "_errors": [],
            "_pipeline_trace": [],
        }

        # Run all 7 agents sequentially
        for agent in self._agents:
            agent_start = time.time()
            result = agent.safe_execute(context)

            # Merge results into context
            for key, value in result.items():
                if key == "_errors" and "_errors" in context:
                    context["_errors"].extend(value)
                else:
                    context[key] = value

            agent_ms = int((time.time() - agent_start) * 1000)
            context["_pipeline_trace"].append({
                "agent": agent.name,
                "duration_ms": agent_ms,
                "status": "error" if "_errors" in result and result["_errors"] else "ok",
            })

        # Run quality validation
        quality = self._validator.validate(context)
        context.update(quality)

        # Auto-regenerate if quality is insufficient
        retry_count = 0
        while not context.get("quality_passed", False) and retry_count < self.MAX_RETRIES:
            retry_count += 1
            logger.info(f"[Orchestrator] Quality check failed (score={context.get('overall_score', 0)}). "
                       f"Re-composing (retry {retry_count}/{self.MAX_RETRIES})...")

            # Re-run Agent 7 (Composer) with the same context
            composer = PromptEngineeringAgent()
            result = composer.safe_execute(context)
            context.update(result)

            # Re-validate
            quality = self._validator.validate(context)
            context.update(quality)

        total_ms = int((time.time() - start_time) * 1000)

        # Build the response for the frontend
        return self._build_response(context, total_ms, retry_count)

    def _build_response(self, context: dict, total_ms: int, retry_count: int) -> dict:
        """Build the final response dict compatible with the frontend."""
        enhanced = context.get("enhanced_prompt", "")
        domains = context.get("domains", [])
        intents = context.get("intents", [])
        primary_intent = context.get("primary_intent", "Create")
        knowledge_packs = context.get("knowledge_pack_names", [])
        experts = context.get("retrieved_experts", [])
        inferred = context.get("inferred_context", {})
        quality_scores = context.get("quality_scores", {})
        overall_score = context.get("overall_score", 85)
        complexity = context.get("complexity", "Standard")
        readiness = context.get("readiness", "Good")
        prompt_types = context.get("prompt_types", [])
        normalization = context.get("normalization_applied", [])

        # Build insights object (frontend-compatible)
        insights = {
            "detectedIntent": primary_intent,
            "detectedDomains": domains,
            "knowledgePacks": knowledge_packs,
            "expertTeam": experts,
            "businessContextInferred": context.get("inferred_count", 0),
            "requirementsAdded": len(context.get("retrieved_best_practices", [])),
            "optimizationSummary": (
                f"V7 Multi-Agent Pipeline processed through 7 specialized agents "
                f"using {len(knowledge_packs)} knowledge packs in {total_ms}ms. "
                f"Quality score: {overall_score}/100."
            ),
            "estimatedComplexity": complexity,
            "estimatedPromptReadiness": readiness,
            "confidenceLevel": f"{context.get('intent_confidence', 85)}%",
            "overallScore": overall_score,
            "promptTypes": prompt_types,
            "qualityScores": quality_scores,
            "normalizationApplied": normalization,
            "pipelineTrace": context.get("_pipeline_trace", []),
            "retryCount": retry_count,
            "totalProcessingMs": total_ms,
        }

        return {
            "enhanced": enhanced,
            "insights": insights,
            "raw": context.get("raw_input", ""),
            "normalized": context.get("normalized_input", ""),
        }

    def _empty_result(self) -> dict:
        """Return an empty result for empty input."""
        return {
            "enhanced": "",
            "insights": {
                "detectedIntent": "",
                "detectedDomains": [],
                "knowledgePacks": [],
                "expertTeam": [],
                "businessContextInferred": 0,
                "requirementsAdded": 0,
                "optimizationSummary": "No input provided.",
                "estimatedComplexity": "None",
                "estimatedPromptReadiness": "N/A",
                "confidenceLevel": "0%",
                "overallScore": 0,
            },
            "raw": "",
            "normalized": "",
        }


# Singleton
_orchestrator = None


def get_orchestrator() -> Orchestrator:
    """Get or create the singleton Orchestrator."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = Orchestrator()
    return _orchestrator
