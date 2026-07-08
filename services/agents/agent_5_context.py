"""
Prompt Bazaar V7 — Agent 5: Context Inference Agent
Infers reasonable missing information based on detected domains and intents.
Never fabricates — only infers what is logically supported.
"""
import logging
from services.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

# Domain-specific inference rules
CONTEXT_INFERENCE_RULES = {
    "Restaurant": {
        "audience": ["Local diners and food enthusiasts", "Tourists and visitors", "Professionals seeking dining options", "Families and groups"],
        "business_goal": ["Increase table reservations and online orders", "Build strong local brand presence", "Enhance customer loyalty and repeat visits"],
        "deliverables": ["Responsive website with online menu", "Reservation system", "Photo gallery", "SEO-optimized local listings"],
        "output_format": "Professional web development specification with detailed feature requirements",
        "constraints": ["Mobile-first design", "Fast page load times", "ADA/WCAG accessibility compliance"],
        "technical_needs": ["Content Management System", "Online ordering integration", "Payment processing", "Analytics tracking"],
        "seo": ["Local SEO optimization", "Google Business Profile", "Schema.org markup", "Review management"],
    },
    "Programming": {
        "audience": ["End users of the application", "Development team maintaining the code", "API consumers"],
        "business_goal": ["Deliver production-ready, maintainable software", "Ensure scalability and performance", "Minimize technical debt"],
        "deliverables": ["Source code with documentation", "Test suite", "API documentation", "Deployment scripts"],
        "output_format": "Technical specification with architecture decisions, code standards, and testing strategy",
        "constraints": ["Clean Architecture principles", "Security best practices (OWASP)", "Comprehensive error handling"],
        "technical_needs": ["Version control", "CI/CD pipeline", "Monitoring and logging", "Containerization"],
    },
    "Marketing": {
        "audience": ["Target demographic defined by buyer personas", "High-intent prospects", "Existing customers for retention"],
        "business_goal": ["Maximize ROI and conversion rates", "Drive organic engagement and brand awareness", "Build market authority"],
        "deliverables": ["Campaign strategy document", "Content calendar", "Ad copy variants", "Analytics plan"],
        "output_format": "Marketing strategy with channel-specific tactics, messaging framework, and KPI tracking",
        "constraints": ["Brand guidelines compliance", "Budget optimization", "Legal/compliance requirements"],
        "creative_needs": ["Compelling visual assets", "Persuasive copywriting", "A/B test variants"],
    },
    "Healthcare": {
        "audience": ["Patients and their families", "Healthcare providers", "Administrative staff"],
        "business_goal": ["Improve patient outcomes and satisfaction", "Ensure regulatory compliance", "Streamline clinical workflows"],
        "deliverables": ["Compliance documentation", "System architecture", "Patient journey map", "Security assessment"],
        "output_format": "HIPAA-compliant specification with security architecture and clinical workflow design",
        "constraints": ["HIPAA/GDPR compliance mandatory", "End-to-end encryption", "Audit trail for all data access", "99.99% uptime SLA"],
        "security": ["PHI data protection", "Role-based access control", "Encryption at rest and in transit"],
    },
    "ImageGeneration": {
        "audience": ["Creative director reviewing outputs", "Brand marketing team", "Social media managers"],
        "business_goal": ["Create visually compelling, brand-consistent imagery", "Achieve high aesthetic quality"],
        "deliverables": ["Master prompt string", "Negative prompt", "Style reference notes", "Quality settings"],
        "output_format": "Structured image generation prompt with composition, lighting, camera, and style parameters",
        "creative_needs": ["Composition balance", "Color harmony", "Emotional impact", "Visual consistency"],
    },
    "VideoGeneration": {
        "audience": ["Content team and creative director", "Social media audience", "Marketing stakeholders"],
        "business_goal": ["Create engaging, platform-optimized video content", "Drive viewer retention and engagement"],
        "deliverables": ["Video prompt sequence", "Storyboard", "Camera motion notes", "Platform-specific output specs"],
        "output_format": "Detailed video generation prompt with scene descriptions, camera motion, and temporal guidance",
        "creative_needs": ["Visual storytelling", "Pacing and rhythm", "Audio-visual synchronization"],
    },
    "DataScience": {
        "audience": ["Data team", "Business stakeholders", "Decision makers"],
        "business_goal": ["Extract actionable insights from data", "Build predictive models", "Enable data-driven decisions"],
        "deliverables": ["Data pipeline architecture", "EDA report", "Model evaluation", "Dashboard design"],
        "output_format": "Data science specification with methodology, evaluation metrics, and visualization requirements",
        "technical_needs": ["Data pipeline infrastructure", "Statistical computing environment", "Visualization tools"],
    },
    "MachineLearning": {
        "audience": ["ML engineering team", "Research scientists", "Product stakeholders"],
        "business_goal": ["Build accurate, fair ML models", "Deploy and monitor models in production", "Ensure reproducibility"],
        "deliverables": ["Model architecture", "Training pipeline", "Evaluation report", "MLOps deployment plan"],
        "output_format": "ML specification with model design, training strategy, evaluation metrics, and deployment plan",
        "technical_needs": ["GPU/TPU compute resources", "Model registry", "Experiment tracking", "Feature store"],
    },
}

# Fallback inference for domains not explicitly mapped
DEFAULT_INFERENCE = {
    "audience": ["Primary stakeholders and end users", "Project team members"],
    "business_goal": ["Deliver high-quality, professional output", "Meet industry standards and best practices"],
    "deliverables": ["Comprehensive specification document", "Implementation roadmap"],
    "output_format": "Professional specification with clear requirements, constraints, and deliverables",
    "constraints": ["Follow industry best practices", "Ensure quality and professionalism"],
}


class ContextInferenceAgent(BaseAgent):
    """
    Agent 5: Infers reasonable missing context from detected domains and intents.
    Never fabricates information — only infers what the domain logically requires.
    """

    name = "Agent 5: Context Inference"

    def execute(self, context: dict) -> dict:
        primary_domain = context.get("primary_domain", "Business")
        primary_intent = context.get("primary_intent", "Create")
        text = context.get("normalized_input", "")

        # Get domain-specific inference rules
        rules = CONTEXT_INFERENCE_RULES.get(primary_domain, DEFAULT_INFERENCE)

        inferred = {}
        inferred_count = 0

        # Infer each dimension if not already explicitly stated by the user
        for dimension in ["audience", "business_goal", "deliverables", "output_format", "constraints"]:
            if dimension in rules:
                value = rules[dimension]
                inferred[dimension] = value
                if isinstance(value, list):
                    inferred_count += len(value)
                else:
                    inferred_count += 1

        # Optional dimensions (only if present in domain rules)
        for opt in ["technical_needs", "creative_needs", "seo", "security", "accessibility", "performance", "testing", "analytics"]:
            if opt in rules:
                inferred[opt] = rules[opt]
                inferred_count += len(rules[opt]) if isinstance(rules[opt], list) else 1

        # Infer output format refinement from intent
        intent_format_hints = {
            "Create": "A comprehensive creation specification",
            "Analyze": "An analytical framework with evaluation criteria",
            "Build": "A technical build specification with architecture",
            "Optimize": "An optimization strategy with measurable improvements",
            "Debug": "A diagnostic specification with troubleshooting methodology",
            "Research": "A research framework with methodology and scope",
            "Design": "A design specification with visual and interaction guidelines",
            "Plan": "A strategic plan with milestones, timelines, and success metrics",
        }
        if primary_intent in intent_format_hints:
            inferred["intent_format_hint"] = intent_format_hints[primary_intent]
            inferred_count += 1

        return {
            "inferred_context": inferred,
            "inferred_count": inferred_count,
        }
