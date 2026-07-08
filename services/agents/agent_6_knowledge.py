"""
Prompt Bazaar V7 — Agent 6: Knowledge Retrieval Agent
Semantic search over the Knowledge Base using the local vector store.
"""
import logging
from services.agents.base_agent import BaseAgent
from services.knowledge.vector_store import get_vector_store

logger = logging.getLogger(__name__)


class KnowledgeRetrievalAgent(BaseAgent):
    """
    Agent 6: Retrieves the most relevant knowledge packs using
    semantic search (TF-IDF cosine similarity on the local vector store).
    Combines ML-detected domains with query-based semantic search for
    hybrid retrieval.
    """

    name = "Agent 6: Knowledge Retrieval"

    def execute(self, context: dict) -> dict:
        text = context.get("normalized_input", context.get("raw_input", ""))
        domains = context.get("domains", [])

        store = get_vector_store()
        results = store.search_by_domains(domains, text, top_k=3)

        if not results:
            return {
                "knowledge_packs": [],
                "knowledge_pack_names": [],
                "retrieved_best_practices": [],
                "retrieved_deliverables": [],
                "retrieved_sections": [],
                "retrieved_experts": [],
                "retrieved_common_mistakes": [],
                "retrieved_frameworks": [],
            }

        # Merge knowledge from the top retrieved packs
        pack_names = []
        all_best_practices = []
        all_deliverables = []
        all_experts = []
        all_common_mistakes = []
        all_frameworks = []
        primary_sections = []

        for i, r in enumerate(results):
            pack = r.get("pack", {})
            domain = r.get("domain", "Unknown")
            pack_names.append(f"{domain} Pack")

            # Best practices: take from all packs
            for bp in pack.get("best_practices", []):
                if bp not in all_best_practices:
                    all_best_practices.append(bp)

            # Deliverables: take from all packs
            for d in pack.get("deliverables", []):
                if d not in all_deliverables:
                    all_deliverables.append(d)

            # Experts: take from top 2 packs
            if i < 2:
                for e in pack.get("experts", []):
                    if e not in all_experts:
                        all_experts.append(e)

            # Common mistakes: take from all packs
            for cm in pack.get("common_mistakes", []):
                if cm not in all_common_mistakes:
                    all_common_mistakes.append(cm)

            # Frameworks: take from all packs
            for f in pack.get("frameworks", []):
                if f not in all_frameworks:
                    all_frameworks.append(f)

            # Sections: use the primary (first) pack's sections
            if i == 0:
                primary_sections = pack.get("sections", [])

        return {
            "knowledge_packs": results,
            "knowledge_pack_names": pack_names,
            "retrieved_best_practices": all_best_practices,
            "retrieved_deliverables": all_deliverables,
            "retrieved_sections": primary_sections,
            "retrieved_experts": all_experts[:6],  # Cap at 6 experts
            "retrieved_common_mistakes": all_common_mistakes,
            "retrieved_frameworks": all_frameworks,
        }
