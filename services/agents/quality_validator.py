"""
Prompt Bazaar V7 — Quality Validator
Evaluates the composed prompt across multiple quality dimensions.
Flags issues for automatic re-composition. Never exposes chain-of-thought.
"""
import logging
import re

logger = logging.getLogger(__name__)


class QualityValidator:
    """
    Evaluates the final composed prompt against 10 quality dimensions.
    Returns individual scores + overall score.
    Triggers re-composition if overall quality is below threshold.
    """

    QUALITY_THRESHOLD = 70  # Minimum acceptable overall score

    def validate(self, context: dict) -> dict:
        """
        Run quality validation on the composed prompt.
        Returns quality scores and pass/fail status.
        """
        enhanced = context.get("enhanced_prompt", "")
        sections = context.get("composed_sections", [])
        text = context.get("normalized_input", "")
        primary_domain = context.get("primary_domain", "Business")
        primary_intent = context.get("primary_intent", "Create")

        scores = {}

        # 1. Intent Alignment — does the prompt address the user's intent?
        scores["intent_alignment"] = self._score_intent_alignment(enhanced, primary_intent)

        # 2. Domain Accuracy — are domain-specific terms and practices present?
        scores["domain_accuracy"] = self._score_domain_accuracy(enhanced, primary_domain)

        # 3. Context Quality — is there rich contextual information?
        scores["context_quality"] = self._score_context_quality(enhanced, sections)

        # 4. Requirement Coverage — are functional requirements addressed?
        scores["requirement_coverage"] = self._score_requirement_coverage(sections)

        # 5. Specificity — is the output specific rather than generic?
        scores["specificity"] = self._score_specificity(enhanced)

        # 6. Professionalism — professional language and structure?
        scores["professionalism"] = self._score_professionalism(enhanced, sections)

        # 7. Technical Accuracy — no broken content or templates?
        scores["technical_accuracy"] = self._score_technical_accuracy(enhanced)

        # 8. Business Relevance — aligned with business context?
        scores["business_relevance"] = self._score_business_relevance(enhanced, context)

        # 9. Readability — well-structured and readable?
        scores["readability"] = self._score_readability(enhanced, sections)

        # 10. Actionability — can someone act on this prompt?
        scores["actionability"] = self._score_actionability(enhanced, sections)

        # Calculate overall score
        overall = int(sum(scores.values()) / len(scores)) if scores else 50
        scores["overall_score"] = overall

        passed = overall >= self.QUALITY_THRESHOLD

        issues = []
        for dimension, score in scores.items():
            if dimension != "overall_score" and score < 70:
                issues.append(f"{dimension}: {score}/100")

        return {
            "quality_scores": scores,
            "quality_passed": passed,
            "quality_issues": issues,
            "overall_score": overall,
        }

    def _score_intent_alignment(self, enhanced: str, intent: str) -> int:
        """Score how well the prompt addresses the user's intent."""
        intent_keywords = {
            "Create": ["create", "build", "develop", "design", "implement"],
            "Analyze": ["analyze", "evaluate", "assess", "review", "audit"],
            "Build": ["build", "construct", "implement", "develop", "architect"],
            "Optimize": ["optimize", "improve", "enhance", "refactor", "streamline"],
            "Debug": ["debug", "fix", "troubleshoot", "resolve", "diagnose"],
            "Research": ["research", "investigate", "study", "explore", "review"],
            "Design": ["design", "create", "wireframe", "prototype", "visual"],
            "Plan": ["plan", "strategy", "roadmap", "milestone", "timeline"],
            "Generate": ["generate", "produce", "create", "output", "compose"],
        }
        keywords = intent_keywords.get(intent, ["create", "build"])
        lower = enhanced.lower()
        matches = sum(1 for kw in keywords if kw in lower)
        return min(99, 75 + matches * 5)

    def _score_domain_accuracy(self, enhanced: str, domain: str) -> int:
        """Score domain-specific content presence."""
        lower = enhanced.lower()
        domain_lower = domain.lower()
        if domain_lower in lower:
            return min(99, 88 + len(enhanced) // 500)
        return 78

    def _score_context_quality(self, enhanced: str, sections: list) -> int:
        """Score the richness of contextual information."""
        word_count = len(enhanced.split())
        section_count = len(sections)
        base = 70
        if word_count > 200:
            base += 10
        if word_count > 500:
            base += 5
        if section_count > 5:
            base += 5
        if section_count > 8:
            base += 5
        return min(99, base)

    def _score_requirement_coverage(self, sections: list) -> int:
        """Score how many requirement-type sections are present."""
        req_keywords = ["requirement", "feature", "deliverable", "technical", "functional", "security", "quality"]
        count = sum(
            1 for sec in sections
            if any(kw in sec.get("title", "").lower() for kw in req_keywords)
        )
        return min(99, 70 + count * 5)

    def _score_specificity(self, enhanced: str) -> int:
        """Score specificity vs genericity."""
        generic_phrases = [
            "ensure this aspect is addressed",
            "apply best practices",
            "follow industry standards",
            "ensure quality",
        ]
        lower = enhanced.lower()
        generic_count = sum(1 for p in generic_phrases if p in lower)
        base = 92
        base -= generic_count * 4
        return max(65, min(99, base))

    def _score_professionalism(self, enhanced: str, sections: list) -> int:
        """Score professional language and structure."""
        has_sections = len(sections) >= 3
        has_bullets = "-" in enhanced or "•" in enhanced
        word_count = len(enhanced.split())
        base = 75
        if has_sections:
            base += 8
        if has_bullets:
            base += 5
        if word_count > 300:
            base += 5
        return min(99, base)

    def _score_technical_accuracy(self, enhanced: str) -> int:
        """Check for broken content (undefined, null, template variables)."""
        issues = 0
        if "undefined" in enhanced:
            issues += 10
        if "null" in enhanced.lower():
            issues += 5
        if "{{" in enhanced or "}}" in enhanced:
            issues += 8
        if "[object Object]" in enhanced:
            issues += 15
        return max(50, 98 - issues)

    def _score_business_relevance(self, enhanced: str, context: dict) -> int:
        """Score business relevance."""
        inferred = context.get("inferred_context", {})
        if inferred and inferred.get("business_goal"):
            return min(99, 85 + len(inferred.get("business_goal", [])) * 2)
        return 80

    def _score_readability(self, enhanced: str, sections: list) -> int:
        """Score structural readability."""
        has_headings = "##" in enhanced
        has_lists = "- " in enhanced
        section_count = len(sections)
        base = 75
        if has_headings:
            base += 8
        if has_lists:
            base += 5
        if section_count >= 5:
            base += 5
        return min(99, base)

    def _score_actionability(self, enhanced: str, sections: list) -> int:
        """Score how actionable the prompt is."""
        action_verbs = ["implement", "build", "create", "design", "ensure", "deliver", "deploy", "integrate", "optimize"]
        lower = enhanced.lower()
        matches = sum(1 for v in action_verbs if v in lower)
        return min(99, 72 + matches * 3)
