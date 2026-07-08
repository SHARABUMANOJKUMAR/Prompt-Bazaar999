"""
Prompt Bazaar V7 — Agent 7: Prompt Engineering Agent (Composer)
Dynamic framework selection and prompt composition.
Does NOT use ML — uses structured prompt engineering with
domain-specific framework templates.
"""
import logging
from services.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)


class PromptEngineeringAgent(BaseAgent):
    """
    Agent 7: Composes the final production-ready prompt by merging
    all agent outputs using domain-specific frameworks.
    Dynamically selects the composition framework based on detected
    prompt type and domain.
    """

    name = "Agent 7: Prompt Engineering (Composer)"

    def execute(self, context: dict) -> dict:
        text = context.get("normalized_input", context.get("raw_input", ""))
        primary_domain = context.get("primary_domain", "Business")
        primary_intent = context.get("primary_intent", "Create")
        primary_type = context.get("primary_prompt_type", "Business")
        domains = context.get("domains", [])
        experts = context.get("retrieved_experts", [])
        best_practices = context.get("retrieved_best_practices", [])
        deliverables = context.get("retrieved_deliverables", [])
        sections = context.get("retrieved_sections", [])
        common_mistakes = context.get("retrieved_common_mistakes", [])
        frameworks = context.get("retrieved_frameworks", [])
        inferred = context.get("inferred_context", {})

        # Build the composed prompt sections
        composed_sections = []

        # Dynamically build each section based on the domain's framework
        for section_title in sections:
            content = self._build_section(
                section_title=section_title,
                text=text,
                primary_domain=primary_domain,
                primary_intent=primary_intent,
                experts=experts,
                best_practices=best_practices,
                deliverables=deliverables,
                common_mistakes=common_mistakes,
                inferred=inferred,
            )
            if content and content.strip():
                composed_sections.append({
                    "title": section_title,
                    "content": content,
                })

        # Build the final markdown
        md_parts = []
        for sec in composed_sections:
            md_parts.append(f"## {sec['title']}\n\n{sec['content']}")

        enhanced_prompt = "\n\n---\n\n".join(md_parts)

        return {
            "composed_sections": composed_sections,
            "enhanced_prompt": enhanced_prompt,
            "section_count": len(composed_sections),
        }

    def _build_section(
        self,
        section_title: str,
        text: str,
        primary_domain: str,
        primary_intent: str,
        experts: list,
        best_practices: list,
        deliverables: list,
        common_mistakes: list,
        inferred: dict,
    ) -> str:
        """Build content for a single section based on its title and domain context."""
        title_upper = section_title.upper()

        # === EXECUTIVE SUMMARY / CREATIVE DIRECTION ===
        if any(kw in title_upper for kw in ["EXECUTIVE SUMMARY", "CREATIVE DIRECTION", "PROJECT SCOPE"]):
            expert_str = ", ".join(experts[:4]) if experts else "Senior Domain Experts"
            return (
                f"Act as an expert task force consisting of: **{expert_str}**.\n\n"
                f"Your objective is to produce a world-class, production-ready output for:\n\n"
                f"*\"{text}\"*\n\n"
                f"Apply the highest professional standards for the **{primary_domain}** domain. "
                f"The result must significantly exceed what a non-expert could produce. "
                f"Think deeply about the requirements before writing. "
                f"Reason through the constraints and domain-specific standards. "
                f"Then generate the output with precision and expertise."
            )

        # === BUSINESS OBJECTIVES ===
        if any(kw in title_upper for kw in ["BUSINESS OBJECTIVE", "GOAL"]):
            goals = inferred.get("business_goal", ["Deliver exceptional quality output"])
            lines = [f"- {g}" for g in goals]
            return "\n".join(lines)

        # === TARGET AUDIENCE / PERSONAS ===
        if any(kw in title_upper for kw in ["TARGET AUDIENCE", "PERSONA", "PATIENT PERSONA", "LEARNER PERSONA"]):
            audience = inferred.get("audience", ["Primary stakeholders and end users"])
            lines = [f"- {a}" for a in audience]
            return "\n".join(lines)

        # === BRAND / COMPETITIVE / MARKET ===
        if any(kw in title_upper for kw in ["BRAND", "COMPETITIVE", "MARKET", "POSITIONING"]):
            return (
                f"- Conduct competitive analysis within the **{primary_domain}** space\n"
                f"- Identify unique value propositions and differentiators\n"
                f"- Position the output to stand out against industry leaders\n"
                f"- Align with current market trends and user expectations"
            )

        # === TECHNICAL / ARCHITECTURE / TECH STACK ===
        if any(kw in title_upper for kw in ["TECHNICAL", "ARCHITECTURE", "TECH STACK", "INFRASTRUCTURE", "DATA"]):
            tech_needs = inferred.get("technical_needs", [])
            items = []
            if tech_needs:
                items.extend([f"- {t}" for t in tech_needs])
            # Add relevant best practices
            tech_practices = [bp for bp in best_practices if any(
                kw in bp.lower() for kw in ["architecture", "code", "api", "database", "infrastructure", "pipeline", "deploy", "scale", "performance"]
            )]
            items.extend([f"- {p}" for p in tech_practices[:5]])
            if not items:
                items.append(f"- Apply industry-standard technical best practices for {primary_domain}")
            return "\n".join(items)

        # === REQUIREMENTS / FEATURES / FUNCTIONAL ===
        if any(kw in title_upper for kw in ["REQUIREMENT", "FEATURE", "FUNCTIONAL", "PLATFORM", "WORKFLOW"]):
            items = []
            # Domain best practices as functional requirements
            func_practices = [bp for bp in best_practices if not any(
                kw in bp.lower() for kw in ["security", "encryption", "hipaa", "pci", "owasp", "compliance", "accessibility", "wcag"]
            )]
            items.extend([f"- {p}" for p in func_practices[:6]])
            if not items:
                items.append(f"- Ensure comprehensive coverage of all domain-specific requirements for {primary_domain}")
            return "\n".join(items)

        # === SECURITY / COMPLIANCE / PRIVACY / CONSTRAINTS ===
        if any(kw in title_upper for kw in ["SECURITY", "COMPLIANCE", "PRIVACY", "CONSTRAINT", "SAFETY", "HIPAA", "OSHA"]):
            constraints = inferred.get("constraints", [])
            security = inferred.get("security", [])
            sec_practices = [bp for bp in best_practices if any(
                kw in bp.lower() for kw in ["security", "encryption", "hipaa", "pci", "owasp", "compliance", "audit", "auth", "access", "safety"]
            )]
            items = []
            items.extend([f"- {c}" for c in constraints])
            items.extend([f"- {s}" for s in security])
            items.extend([f"- {p}" for p in sec_practices[:4]])
            if not items:
                items.append("- Follow industry-standard security and compliance best practices")
                items.append("- Implement proper access controls and data protection")
            return "\n".join(items)

        # === DESIGN / VISUAL / UI/UX / STYLE / COMPOSITION ===
        if any(kw in title_upper for kw in ["DESIGN", "VISUAL", "UI", "UX", "STYLE", "MOOD", "COMPOSITION", "LIGHTING", "CAMERA"]):
            creative = inferred.get("creative_needs", [])
            items = [f"- {c}" for c in creative]
            design_practices = [bp for bp in best_practices if any(
                kw in bp.lower() for kw in ["design", "ui", "ux", "color", "typography", "composition", "lighting", "camera", "visual", "accessibility"]
            )]
            items.extend([f"- {p}" for p in design_practices[:4]])
            if not items:
                items.append("- Apply professional design standards appropriate to the domain")
            return "\n".join(items)

        # === SEO / MARKETING / CHANNEL ===
        if any(kw in title_upper for kw in ["SEO", "MARKETING", "CHANNEL", "CAMPAIGN", "CONTENT PLAN", "MESSAGING"]):
            seo = inferred.get("seo", [])
            items = [f"- {s}" for s in seo]
            mktg_practices = [bp for bp in best_practices if any(
                kw in bp.lower() for kw in ["seo", "marketing", "content", "campaign", "engagement", "analytics", "conversion"]
            )]
            items.extend([f"- {p}" for p in mktg_practices[:4]])
            if not items:
                items.append("- Implement relevant marketing and SEO best practices for the domain")
            return "\n".join(items)

        # === DELIVERABLES / OUTPUT / RESULTS ===
        if any(kw in title_upper for kw in ["DELIVERABLE", "OUTPUT", "RESULT"]):
            items = [f"- {d}" for d in deliverables]
            if not items:
                items.append("- A complete, production-ready output that is immediately actionable")
            items.append("- All deliverables must meet professional industry standards")
            return "\n".join(items)

        # === QUALITY / STANDARDS / EVALUATION / KPI / METRICS / ASSESSMENT ===
        if any(kw in title_upper for kw in ["QUALITY", "STANDARD", "EVALUATION", "KPI", "METRIC", "ASSESSMENT", "ACCEPTANCE"]):
            items = [
                "- Output must meet production-grade quality standards",
                "- No placeholders, TODOs, or incomplete sections",
                "- Must pass peer review by domain experts",
                f"- Must align with {primary_domain} industry best practices",
            ]
            return "\n".join(items)

        # === NEGATIVE PROMPT (Image/Video specific) ===
        if "NEGATIVE" in title_upper:
            mistakes = [f"- Avoid: {m}" for m in common_mistakes[:5]]
            if not mistakes:
                mistakes.append("- Avoid: Low quality, blurry, distorted, artifacts")
            return "\n".join(mistakes)

        # === METHODOLOGY / RESEARCH / ANALYSIS ===
        if any(kw in title_upper for kw in ["METHODOLOGY", "RESEARCH", "LITERATURE", "ANALYSIS", "FINDINGS", "SYNTHESIS"]):
            items = [f"- Apply rigorous {primary_domain} methodology and standards"]
            relevant = [bp for bp in best_practices if any(
                kw in bp.lower() for kw in ["research", "analysis", "methodology", "review", "study", "data", "evidence"]
            )]
            items.extend([f"- {p}" for p in relevant[:4]])
            if len(items) < 2:
                items.append("- Use evidence-based approaches with proper citations where applicable")
            return "\n".join(items)

        # === BUDGET / FINANCIAL / PRICING / COST ===
        if any(kw in title_upper for kw in ["BUDGET", "FINANCIAL", "PRICING", "COST", "REVENUE"]):
            return (
                "- Provide cost-effective recommendations with clear ROI justification\n"
                "- Consider both short-term and long-term financial implications\n"
                "- Include pricing models and budget allocation recommendations"
            )

        # === MONITORING / OBSERVABILITY / ANALYTICS / REPORTING ===
        if any(kw in title_upper for kw in ["MONITORING", "OBSERVABILITY", "ANALYTICS", "REPORTING", "DASHBOARD"]):
            return (
                "- Implement comprehensive monitoring and observability\n"
                "- Track key metrics and KPIs with automated dashboards\n"
                "- Set up alerting for anomalies and threshold breaches\n"
                "- Design reporting for both technical and business stakeholders"
            )

        # === RISK / DISASTER RECOVERY / INCIDENT ===
        if any(kw in title_upper for kw in ["RISK", "DISASTER", "INCIDENT", "RECOVERY", "CONTINUITY"]):
            return (
                "- Identify and assess potential risks with mitigation strategies\n"
                "- Design disaster recovery procedures with defined RPO/RTO\n"
                "- Build incident response playbooks for critical scenarios\n"
                "- Test recovery procedures regularly"
            )

        # === TOOLS / INTEGRATIONS / API ===
        if any(kw in title_upper for kw in ["TOOL", "INTEGRATION", "API", "MEMORY", "CONTEXT"]):
            return (
                "- Define all required integrations and their specifications\n"
                "- Design API contracts with clear input/output schemas\n"
                "- Implement proper error handling for all external dependencies\n"
                "- Document integration requirements and dependencies"
            )

        # === FALLBACK: Generic section builder ===
        # Find relevant best practices based on section title keywords
        title_words = [w.lower() for w in section_title.split() if len(w) > 2]
        relevant = [
            bp for bp in best_practices
            if any(tw in bp.lower() for tw in title_words)
        ]
        if relevant:
            return "\n".join([f"- {p}" for p in relevant[:5]])

        return (
            f"- Address all aspects of **{section_title}** following {primary_domain} industry best practices\n"
            f"- Ensure this section integrates seamlessly with the overall strategy\n"
            f"- Apply expert-level knowledge and attention to detail"
        )
