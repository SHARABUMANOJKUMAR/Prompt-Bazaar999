"""
Prompt Bazaar V7 — ML Classifier Engine
TF-IDF + Cosine Similarity classifiers for Intent, Domain, and Prompt Type.
No external model downloads required. Pure scikit-learn.
"""
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from services.ml.corpus import INTENT_CORPUS, DOMAIN_CORPUS, PROMPT_TYPE_CORPUS

logger = logging.getLogger(__name__)


class SemanticClassifier:
    """
    Base TF-IDF + Cosine Similarity classifier.
    Trains on a corpus dict of {label: [example_sentences]} and predicts
    the most similar labels for a given input text.
    """

    def __init__(self, corpus: dict, name: str = "Classifier"):
        self._name = name
        self._labels = []
        self._label_indices = {}
        self._documents = []
        self._vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            max_features=5000,
            sublinear_tf=True
        )
        self._class_vectors = None
        self._build(corpus)

    def _build(self, corpus: dict):
        """Build TF-IDF matrix from the corpus."""
        all_texts = []
        label_doc_ranges = {}

        for label, examples in corpus.items():
            start = len(all_texts)
            all_texts.extend(examples)
            end = len(all_texts)
            label_doc_ranges[label] = (start, end)
            self._labels.append(label)

        if not all_texts:
            logger.warning(f"[{self._name}] Empty corpus, classifier will return defaults.")
            return

        tfidf_matrix = self._vectorizer.fit_transform(all_texts)

        # Compute centroid vector for each class (mean of all example vectors)
        centroids = []
        for label in self._labels:
            start, end = label_doc_ranges[label]
            class_vectors = tfidf_matrix[start:end]
            centroid = class_vectors.mean(axis=0)
            centroids.append(centroid)

        self._class_vectors = np.asarray(np.vstack(centroids))
        logger.info(f"[{self._name}] Trained on {len(self._labels)} classes, {len(all_texts)} documents.")

    def classify(self, text: str, top_k: int = 5) -> list[dict]:
        """
        Classify input text against all class centroids.
        Returns list of {label, confidence} sorted by confidence descending.
        """
        if self._class_vectors is None or not text or not text.strip():
            return [{"label": self._labels[0] if self._labels else "Unknown", "confidence": 50}]

        try:
            input_vector = self._vectorizer.transform([text.lower().strip()])
            similarities = cosine_similarity(input_vector, self._class_vectors).flatten()

            # Normalize similarities to 0-100 confidence scale
            max_sim = similarities.max()
            min_sim = similarities.min()
            spread = max_sim - min_sim if max_sim != min_sim else 1.0

            results = []
            for i, label in enumerate(self._labels):
                raw_sim = similarities[i]
                # Scale: top match gets 92-99, others scale proportionally
                if spread > 0:
                    normalized = (raw_sim - min_sim) / spread
                else:
                    normalized = 0.5
                confidence = int(65 + normalized * 34)  # Range: 65-99
                if confidence > 0:
                    results.append({"label": label, "confidence": confidence})

            results.sort(key=lambda x: x["confidence"], reverse=True)
            return results[:top_k]

        except Exception as e:
            logger.error(f"[{self._name}] Classification error: {e}")
            return [{"label": self._labels[0] if self._labels else "Unknown", "confidence": 50}]


class IntentClassifier(SemanticClassifier):
    """Classifies user intent (Create, Analyze, Build, Debug, etc.)"""

    def __init__(self):
        super().__init__(INTENT_CORPUS, name="IntentClassifier")

    def classify_intent(self, text: str, top_k: int = 3) -> list[dict]:
        """Returns top-k intents with confidence."""
        raw = self.classify(text, top_k=top_k)
        return [{"intent": r["label"], "confidence": r["confidence"]} for r in raw]


class DomainClassifier(SemanticClassifier):
    """Classifies domain (Restaurant, Programming, Healthcare, etc.)"""

    def __init__(self):
        super().__init__(DOMAIN_CORPUS, name="DomainClassifier")

    def classify_domain(self, text: str, top_k: int = 5) -> list[dict]:
        """Returns top-k domains with confidence."""
        raw = self.classify(text, top_k=top_k)
        return [{"domain": r["label"], "confidence": r["confidence"]} for r in raw]


class PromptTypeClassifier(SemanticClassifier):
    """Classifies prompt type (Coding, Business, Image, etc.)"""

    def __init__(self):
        super().__init__(PROMPT_TYPE_CORPUS, name="PromptTypeClassifier")

    def classify_type(self, text: str, top_k: int = 3) -> list[dict]:
        """Returns top-k prompt types with confidence."""
        raw = self.classify(text, top_k=top_k)
        return [{"prompt_type": r["label"], "confidence": r["confidence"]} for r in raw]


# =============================================================================
# Singleton instances — initialized once at module import
# =============================================================================
_intent_classifier = None
_domain_classifier = None
_prompt_type_classifier = None


def get_intent_classifier() -> IntentClassifier:
    """Get or create the singleton IntentClassifier."""
    global _intent_classifier
    if _intent_classifier is None:
        _intent_classifier = IntentClassifier()
    return _intent_classifier


def get_domain_classifier() -> DomainClassifier:
    """Get or create the singleton DomainClassifier."""
    global _domain_classifier
    if _domain_classifier is None:
        _domain_classifier = DomainClassifier()
    return _domain_classifier


def get_prompt_type_classifier() -> PromptTypeClassifier:
    """Get or create the singleton PromptTypeClassifier."""
    global _prompt_type_classifier
    if _prompt_type_classifier is None:
        _prompt_type_classifier = PromptTypeClassifier()
    return _prompt_type_classifier
