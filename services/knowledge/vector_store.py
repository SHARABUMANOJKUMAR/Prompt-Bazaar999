"""
Prompt Bazaar V7 — Vector Store Manager
TF-IDF-based local semantic search over knowledge packs.
Designed to be swappable with Qdrant Cloud when credentials are available.
"""
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from services.knowledge.domain_packs import (
    DOMAIN_KNOWLEDGE_PACKS,
    get_pack_text_for_embedding,
    get_all_domains,
    get_pack,
)

logger = logging.getLogger(__name__)


class LocalVectorStore:
    """
    TF-IDF-based local vector store for semantic knowledge retrieval.
    Stores flattened domain pack texts as TF-IDF vectors and performs
    cosine similarity search. Zero external dependencies.
    """

    def __init__(self):
        self._vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            max_features=8000,
            sublinear_tf=True,
        )
        self._domains: list[str] = []
        self._matrix = None
        self._ready = False
        self._build()

    def _build(self):
        """Index all domain knowledge packs."""
        texts = []
        for domain in get_all_domains():
            text = get_pack_text_for_embedding(domain)
            if text:
                self._domains.append(domain)
                texts.append(text)

        if not texts:
            logger.warning("[VectorStore] No domain texts to index.")
            return

        self._matrix = self._vectorizer.fit_transform(texts)
        self._ready = True
        logger.info(f"[VectorStore] Indexed {len(self._domains)} domain packs.")

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """
        Semantic search for the most relevant knowledge packs.
        Returns list of {domain, score, pack} sorted by relevance.
        """
        if not self._ready or not query or not query.strip():
            return []

        try:
            query_vec = self._vectorizer.transform([query.lower().strip()])
            similarities = cosine_similarity(query_vec, self._matrix).flatten()

            ranked = np.argsort(similarities)[::-1][:top_k]
            results = []
            for idx in ranked:
                domain = self._domains[idx]
                score = float(similarities[idx])
                if score > 0.01:  # Minimum relevance threshold
                    results.append({
                        "domain": domain,
                        "score": round(score, 4),
                        "pack": get_pack(domain),
                    })
            return results

        except Exception as e:
            logger.error(f"[VectorStore] Search error: {e}")
            return []

    def search_by_domains(self, detected_domains: list[dict], query: str, top_k: int = 5) -> list[dict]:
        """
        Hybrid search: uses both detected domains (from ML classifier) and
        semantic query similarity to retrieve the best knowledge packs.
        Prioritizes domains already detected by the classifier.
        """
        results = []
        seen = set()

        # First, add packs for ML-detected domains (highest priority)
        for d in detected_domains:
            domain_name = d.get("domain", "")
            if domain_name and domain_name not in seen:
                pack = get_pack(domain_name)
                if pack:
                    results.append({
                        "domain": domain_name,
                        "score": d.get("confidence", 80) / 100.0,
                        "pack": pack,
                    })
                    seen.add(domain_name)

        # Then, augment with semantic search results
        semantic_results = self.search(query, top_k=top_k)
        for sr in semantic_results:
            if sr["domain"] not in seen:
                results.append(sr)
                seen.add(sr["domain"])

        return results[:top_k]


# Singleton
_store = None


def get_vector_store() -> LocalVectorStore:
    """Get or create the singleton LocalVectorStore."""
    global _store
    if _store is None:
        _store = LocalVectorStore()
    return _store
