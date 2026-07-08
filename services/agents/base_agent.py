"""
Prompt Bazaar V7 — Base Agent
Abstract base class for all pipeline agents.
"""
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """
    Abstract base class for all V7 pipeline agents.
    Every agent receives a shared context dict and returns its additions.
    """

    name: str = "BaseAgent"

    @abstractmethod
    def execute(self, context: dict) -> dict:
        """
        Execute the agent's logic.

        Args:
            context: Shared pipeline context with keys added by prior agents.

        Returns:
            dict with keys to merge into the pipeline context.
        """
        raise NotImplementedError

    def safe_execute(self, context: dict) -> dict:
        """
        Wrapper that catches exceptions and returns an empty dict on failure.
        Ensures the pipeline never breaks due to a single agent failure.
        """
        try:
            result = self.execute(context)
            logger.info(f"[{self.name}] Completed successfully.")
            return result if isinstance(result, dict) else {}
        except Exception as e:
            logger.error(f"[{self.name}] Failed: {e}", exc_info=True)
            return {"_errors": [f"{self.name}: {str(e)}"]}
