"""
Prompt Bazaar V7 — Domain Knowledge Packs
Comprehensive knowledge base with 26+ domain-specific packs.
Each pack contains: best_practices, terminology, standards, checklists,
frameworks, common_mistakes, deliverables, rules, prompt_patterns.
"""

DOMAIN_KNOWLEDGE_PACKS = {

    "Restaurant": {
        "best_practices": [
            "Integrate with reservation platforms (OpenTable, Resy, Yelp Reservations)",
            "Use Schema.org/Restaurant structured data markup for rich search results",
            "Optimize food photography: use WebP format, lazy loading, and CDN delivery",
            "Implement Google My Business optimization for local SEO dominance",
            "Design mobile-first menus with clear pricing and dietary labels",
            "Use high-contrast typography for readability in varied lighting",
            "Implement online ordering with real-time kitchen capacity management",
            "Build loyalty program integration for repeat customer engagement"
        ],
        "terminology": ["POS system", "table management", "covers per night", "food cost percentage", "RevPASH", "menu engineering", "ticket time", "BOH/FOH"],
        "standards": ["Food safety (HACCP/FDA)", "ADA accessibility", "PCI-DSS for payments", "Local health department compliance"],
        "checklists": ["Menu digitization", "Photo gallery optimization", "Contact/hours accuracy", "Review management setup", "Delivery platform integration"],
        "frameworks": ["Role → Objective → Menu Features → Reservation System → SEO → Brand Identity → Deliverables"],
        "common_mistakes": ["Low-quality food photos", "Missing hours/location", "No mobile optimization", "Ignoring local SEO", "No online ordering option"],
        "deliverables": ["Responsive multi-page website", "SEO-optimized meta tags", "Reservation system integration", "Digital menu with allergen info", "Google Business Profile setup"],
        "business_rules": ["Prioritize table turnover optimization", "Feature seasonal/special menus prominently", "Enable multi-location support if applicable"],
        "technical_rules": ["HTTPS mandatory for payment processing", "Image optimization: max 200KB per food photo", "Page load under 3 seconds on mobile"],
        "seo_rules": ["Target '[city] + [cuisine] + restaurant' keywords", "Implement local business schema", "Build Google Reviews integration"],
        "sections": ["EXECUTIVE SUMMARY", "BUSINESS OBJECTIVES", "TARGET AUDIENCE", "BRAND POSITIONING", "MENU & ORDERING", "RESERVATION SYSTEM", "DESIGN STRATEGY", "SEO & LOCAL MARKETING", "TECHNICAL REQUIREMENTS", "DELIVERABLES"],
        "experts": ["Restaurant Branding Consultant", "Hospitality Operations Strategist", "Restaurant UX Designer", "Restaurant SEO Specialist", "Food & Beverage Operations Lead"],
        "prompt_patterns": ["Act as [expert_team]. Design a [deliverable] for a [cuisine_type] restaurant that [business_goal]."]
    },

    "Programming": {
        "best_practices": [
            "Follow Clean Architecture (Hexagonal/Onion) with clear layer separation",
            "Apply SOLID principles and maintain DRY codebase throughout",
            "Implement comprehensive error handling with structured logging",
            "Maintain test coverage ≥80% (unit, integration, E2E)",
            "Validate all inputs and sanitize all outputs",
            "Use environment variables for configuration (no hardcoded secrets)",
            "Follow semantic versioning and maintain CI/CD readiness",
            "Document APIs with OpenAPI/Swagger specification"
        ],
        "terminology": ["microservice", "REST API", "GraphQL", "ORM", "middleware", "dependency injection", "CI/CD", "container", "serverless"],
        "standards": ["OWASP Top 10", "12-Factor App", "Semantic Versioning", "OpenAPI 3.0"],
        "checklists": ["Code review checklist", "Security audit", "Performance testing", "Documentation coverage", "Deployment readiness"],
        "frameworks": ["Role → Architecture → Tech Stack → Code Standards → Testing Strategy → Security → Deployment → Deliverables"],
        "common_mistakes": ["No error handling", "Hardcoded credentials", "Missing tests", "Monolithic architecture", "N+1 query problems"],
        "deliverables": ["Production-ready source code", "API documentation", "Test suite with coverage report", "README with setup instructions", "Architecture decision records"],
        "business_rules": ["Code must be maintainable by a team", "APIs must be backwards compatible", "Deployment must be automated"],
        "technical_rules": ["No direct database access from controllers", "All async operations must handle errors", "Use typed interfaces for data contracts"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "ARCHITECTURE", "TECH STACK", "FOLDER STRUCTURE", "API DESIGN", "DATABASE SCHEMA", "TESTING STRATEGY", "SECURITY", "DEPLOYMENT", "CODE STANDARDS", "DELIVERABLES"],
        "experts": ["Principal Software Engineer", "System Architect", "Backend Engineer", "Testing Engineer", "Security Engineer", "DevOps Specialist"],
        "prompt_patterns": ["Act as [expert_team]. Build a [deliverable] using [tech_stack] that implements [features] following [standards]."]
    },

    "Marketing": {
        "best_practices": [
            "Develop detailed buyer personas using Jobs-to-be-Done framework",
            "Align content to TOFU/MOFU/BOFU funnel stages",
            "Leverage psychological triggers: social proof, scarcity, authority",
            "Implement A/B testing for statistical significance on all campaigns",
            "Build topical authority through SEO content clusters",
            "Track attribution across all channels with UTM parameters",
            "Optimize for mobile-first user experience",
            "Maintain brand voice consistency across all touchpoints"
        ],
        "terminology": ["CPA", "ROAS", "CTR", "CAC", "LTV", "MQL/SQL", "conversion funnel", "attribution model", "retargeting"],
        "standards": ["CAN-SPAM compliance", "GDPR for email marketing", "FTC disclosure guidelines"],
        "checklists": ["Campaign brief", "Creative assets", "Landing page", "Tracking setup", "A/B test plan", "Budget allocation"],
        "frameworks": ["Role → Objective → Target Audience → Competitive Positioning → Channel Strategy → Messaging → KPIs → Deliverables"],
        "common_mistakes": ["No clear CTA", "Ignoring mobile users", "Missing tracking pixels", "Generic messaging", "No A/B testing"],
        "deliverables": ["Campaign strategy document", "Content calendar", "Ad copy variants", "Analytics tracking plan", "Email sequences"],
        "business_rules": ["Every campaign must have measurable KPIs", "All claims must be substantiated", "Brand guidelines must be followed"],
        "technical_rules": ["Landing pages must load under 2 seconds", "Email templates must render on all major clients", "UTM tracking on all links"],
        "seo_rules": ["Target long-tail keywords with commercial intent", "Build pillar content with supporting cluster pages", "Optimize meta descriptions for CTR"],
        "sections": ["EXECUTIVE SUMMARY", "BUSINESS OBJECTIVES", "TARGET AUDIENCE & PERSONAS", "COMPETITIVE POSITIONING", "CHANNEL STRATEGY", "MESSAGING FRAMEWORK", "CONTENT PLAN", "KPIs & MEASUREMENT", "BUDGET", "DELIVERABLES"],
        "experts": ["Growth Marketing Strategist", "Brand Positioning Consultant", "Consumer Psychology Expert", "SEO/SEM Specialist", "Analytics Engineer"],
        "prompt_patterns": ["Act as [expert_team]. Create a [deliverable] for [product/service] targeting [audience] to achieve [business_goal]."]
    },

    "Healthcare": {
        "best_practices": [
            "Implement strict HIPAA/GDPR compliance architecture for all patient data",
            "Follow EHR/EMR integration standards (HL7 FHIR R4)",
            "Ensure WCAG 2.1 AA accessibility for elderly and impaired users",
            "Use end-to-end encryption for patient-provider communication",
            "Design for clinical workflow integration, not just patient-facing UI",
            "Implement audit trails for all data access and modifications",
            "Follow FDA guidelines for Software as a Medical Device (SaMD) if applicable",
            "Ensure interoperability with existing healthcare IT ecosystems"
        ],
        "terminology": ["EHR/EMR", "HIPAA", "HL7 FHIR", "DICOM", "ICD-10", "CPT codes", "telemedicine", "clinical decision support", "PHI"],
        "standards": ["HIPAA Privacy Rule", "HIPAA Security Rule", "HITECH Act", "FDA SaMD", "WCAG 2.1 AA", "SOC 2 Type II"],
        "checklists": ["HIPAA compliance audit", "Data encryption verification", "Access control review", "Incident response plan", "Business associate agreements"],
        "frameworks": ["Role → Patient Personas → Compliance → Clinical Workflow → Integration → Accessibility → Security → Deliverables"],
        "common_mistakes": ["Storing PHI without encryption", "Missing BAA agreements", "Ignoring accessibility", "No audit logging", "Inadequate authentication"],
        "deliverables": ["Compliance-ready documentation", "System architecture diagram", "Patient journey map", "Security assessment report", "Integration specification"],
        "business_rules": ["Patient privacy is non-negotiable", "Clinical accuracy takes priority over UX aesthetics", "All integrations must be HL7 FHIR compliant"],
        "technical_rules": ["AES-256 encryption at rest", "TLS 1.3 in transit", "MFA for all clinical users", "99.99% uptime SLA for critical systems"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "PATIENT PERSONAS", "COMPLIANCE & SECURITY (HIPAA)", "CLINICAL WORKFLOWS", "FUNCTIONAL REQUIREMENTS", "INTEGRATION STRATEGY (HL7 FHIR)", "ACCESSIBILITY", "DATA ARCHITECTURE", "QUALITY STANDARDS", "DELIVERABLES"],
        "experts": ["Medical Informatics Specialist", "Healthcare UX Designer", "HIPAA Compliance Officer", "Telemedicine Architect", "Clinical Data Analyst"],
        "prompt_patterns": ["Act as [expert_team]. Design a [deliverable] for [healthcare_context] ensuring HIPAA compliance and [clinical_goal]."]
    },

    "Education": {
        "best_practices": [
            "Apply gamification and micro-learning for engagement",
            "Ensure SCORM/xAPI compliance for LMS integrations",
            "Optimize cognitive load in UI and content design",
            "Support both asynchronous and synchronous learning",
            "Implement adaptive learning paths based on learner progress",
            "Design accessible content for diverse learning abilities",
            "Build assessment systems with immediate feedback loops",
            "Enable offline access for low-connectivity environments"
        ],
        "terminology": ["LMS", "SCORM", "xAPI", "formative assessment", "summative assessment", "learning outcomes", "pedagogy", "andragogy", "flipped classroom"],
        "standards": ["SCORM 2004", "xAPI (Tin Can)", "WCAG 2.1", "FERPA", "Section 508"],
        "checklists": ["Curriculum structure review", "Assessment alignment", "Content accessibility", "Platform integration", "Learner analytics setup"],
        "frameworks": ["Role → Learner Personas → Pedagogical Approach → Platform Features → Content Strategy → Engagement → Assessment → Deliverables"],
        "common_mistakes": ["Information overload", "No interactive elements", "Ignoring accessibility", "No progress tracking", "Passive content delivery"],
        "deliverables": ["Curriculum architecture", "Platform requirements", "Assessment framework", "Engagement strategy", "Learning analytics dashboard"],
        "business_rules": ["Learner engagement is the primary metric", "Content must be modular and reusable", "Assessments must align with learning objectives"],
        "technical_rules": ["Video content: max 10-minute segments", "Support offline sync for mobile", "Real-time collaboration tools"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "LEARNER PERSONAS", "PEDAGOGICAL APPROACH", "CURRICULUM STRUCTURE", "PLATFORM FEATURES", "CONTENT STRATEGY", "ASSESSMENT DESIGN", "ENGAGEMENT MECHANICS", "TECHNICAL REQUIREMENTS", "DELIVERABLES"],
        "experts": ["Instructional Designer", "EdTech Architect", "Learning Management Specialist", "Student Engagement Expert", "Assessment Design Expert"],
        "prompt_patterns": ["Act as [expert_team]. Design a [deliverable] for [education_context] targeting [learner_personas] using [pedagogical_approach]."]
    },

    "Legal": {
        "best_practices": [
            "Implement immutable audit trails and version control for all documents",
            "Use enterprise-grade access control (RBAC) with granular permissions",
            "Ensure data residency and GDPR/CCPA compliance",
            "Implement OCR and AI-assisted document parsing for efficiency",
            "Automate routine compliance monitoring and reporting",
            "Design for jurisdictional variations in legal requirements",
            "Enable secure client communication portals",
            "Maintain chain of custody for digital evidence"
        ],
        "terminology": ["eDiscovery", "matter management", "billable hours", "retainer", "precedent", "jurisdiction", "discovery", "litigation hold"],
        "standards": ["GDPR", "CCPA", "SOC 2", "ISO 27001", "ABA Model Rules"],
        "checklists": ["Compliance audit", "Document retention policy", "Access control review", "Data classification", "Vendor risk assessment"],
        "frameworks": ["Role → Compliance → Document Workflow → Access Control → Integrations → Security → Audit Trail → Deliverables"],
        "common_mistakes": ["Missing audit trails", "Inadequate access controls", "No document versioning", "Ignoring data residency", "Poor encryption practices"],
        "deliverables": ["Security & Compliance Audit", "Platform architecture", "Workflow automation map", "Data governance policy", "Integration specification"],
        "business_rules": ["Confidentiality is paramount", "All changes must be traceable", "Compliance must be provable"],
        "technical_rules": ["End-to-end encryption for all communications", "Automated backup with geo-redundancy", "Role-based access with principle of least privilege"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "COMPLIANCE & PRIVACY", "DOCUMENT WORKFLOW", "ACCESS CONTROL", "AUDIT TRAIL", "INTEGRATIONS", "SECURITY STANDARDS", "DELIVERABLES"],
        "experts": ["Legal Tech Architect", "Compliance Specialist", "Document Automation Expert", "Data Privacy Officer"],
        "prompt_patterns": ["Act as [expert_team]. Design a [deliverable] ensuring [compliance_standards] for [legal_context]."]
    },

    "Finance": {
        "best_practices": [
            "Implement PCI-DSS and SOX compliance standards",
            "Design for high-frequency, low-latency transaction processing",
            "Use multi-factor authentication and biometric security",
            "Build fraud detection and anomaly monitoring systems",
            "Ensure real-time transaction monitoring and alerting",
            "Implement data encryption at rest and in transit",
            "Design for regulatory reporting and audit compliance",
            "Build resilient systems with zero-downtime deployments"
        ],
        "terminology": ["PCI-DSS", "SOX", "AML/KYC", "Basel III", "fintech", "payment gateway", "ledger", "reconciliation", "clearing house"],
        "standards": ["PCI-DSS v4.0", "SOX", "Basel III", "PSD2", "MiFID II", "IFRS"],
        "checklists": ["PCI compliance checklist", "Fraud prevention controls", "Transaction monitoring setup", "Regulatory reporting", "Disaster recovery testing"],
        "frameworks": ["Role → Regulatory Compliance → Transaction Architecture → Security → Risk Management → Reporting → Deliverables"],
        "common_mistakes": ["Storing card data in plain text", "No real-time fraud monitoring", "Missing audit logs", "Inadequate disaster recovery", "Non-compliant reporting"],
        "deliverables": ["Security architecture model", "Transaction flow diagrams", "Compliance checklist", "Risk assessment report", "Regulatory filing templates"],
        "business_rules": ["Compliance is non-negotiable", "Transaction integrity must be guaranteed", "Real-time monitoring is mandatory"],
        "technical_rules": ["99.999% uptime for payment systems", "Sub-100ms transaction processing", "Multi-region redundancy"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "REGULATORY COMPLIANCE", "TRANSACTION ARCHITECTURE", "SECURITY & ENCRYPTION", "FRAUD DETECTION", "RISK MANAGEMENT", "USER EXPERIENCE", "REPORTING", "DELIVERABLES"],
        "experts": ["FinTech Architect", "Financial Quantitative Analyst", "PCI-DSS Security Engineer", "Banking UX Designer", "Risk Management Specialist"],
        "prompt_patterns": ["Act as [expert_team]. Design a [deliverable] for [financial_product] ensuring [compliance_standards] and [security_requirements]."]
    },

    "Cloud": {
        "best_practices": [
            "Use Infrastructure as Code (Terraform, CloudFormation, Pulumi)",
            "Design multi-AZ/multi-region high availability architecture",
            "Implement auto-scaling and intelligent load balancing",
            "Apply zero-trust security architecture",
            "Set up comprehensive monitoring and observability (metrics, logs, traces)",
            "Implement GitOps deployment workflows",
            "Design cost-optimized resource allocation with right-sizing",
            "Build disaster recovery with defined RPO/RTO targets"
        ],
        "terminology": ["IaC", "VPC", "IAM", "CDN", "ALB/NLB", "Lambda/Functions", "S3/Blob", "RDS/CloudSQL", "EKS/GKE/AKS"],
        "standards": ["Well-Architected Framework", "CIS Benchmarks", "SOC 2", "ISO 27001", "NIST"],
        "checklists": ["Security group review", "IAM policy audit", "Cost optimization review", "Backup verification", "DR drill schedule"],
        "frameworks": ["Role → Architecture Diagram → IaC → Scalability → Security → Monitoring → DR → Cost Optimization → Deliverables"],
        "common_mistakes": ["Overly permissive IAM policies", "No auto-scaling configured", "Missing monitoring", "Manual deployments", "No cost alerts"],
        "deliverables": ["Cloud architecture diagram", "Terraform/IaC scripts", "Disaster recovery plan", "Cost optimization report", "Security posture assessment"],
        "business_rules": ["Infrastructure must be reproducible", "All changes must go through CI/CD", "Cost must be tracked and optimized"],
        "technical_rules": ["99.99% availability SLA", "RTO < 4 hours, RPO < 1 hour", "All resources tagged for cost tracking"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "ARCHITECTURE DIAGRAM", "INFRASTRUCTURE AS CODE", "NETWORKING & SECURITY", "SCALABILITY", "MONITORING & OBSERVABILITY", "DISASTER RECOVERY", "COST OPTIMIZATION", "DELIVERABLES"],
        "experts": ["Principal Cloud Architect", "DevOps Engineer", "Site Reliability Engineer", "Cloud Security Specialist", "FinOps Analyst"],
        "prompt_patterns": ["Act as [expert_team]. Design a [deliverable] on [cloud_provider] for [workload_type] meeting [availability_requirements]."]
    },

    "Cybersecurity": {
        "best_practices": [
            "Apply OWASP Top 10 mitigation strategies across all applications",
            "Implement threat modeling (STRIDE/DREAD) for all new features",
            "Use encryption at rest (AES-256) and in transit (TLS 1.3)",
            "Build comprehensive incident response playbooks",
            "Conduct regular penetration testing and vulnerability assessments",
            "Implement zero-trust network architecture",
            "Deploy SIEM for real-time threat detection and response",
            "Maintain security awareness training for all personnel"
        ],
        "terminology": ["SIEM", "SOC", "SOAR", "EDR", "XDR", "zero-day", "CVE", "IoC", "threat vector", "attack surface"],
        "standards": ["NIST CSF", "ISO 27001", "SOC 2 Type II", "PCI-DSS", "OWASP", "CIS Controls"],
        "checklists": ["Vulnerability scan", "Penetration test", "Access review", "Incident response drill", "Security awareness training"],
        "frameworks": ["Role → Threat Landscape → Security Architecture → Vulnerability Management → Incident Response → Compliance → Deliverables"],
        "common_mistakes": ["Default credentials", "Unpatched systems", "No incident response plan", "Overly permissive access", "Missing encryption"],
        "deliverables": ["Security audit report", "Threat model document", "Remediation plan", "Incident response playbook", "Security architecture diagram"],
        "business_rules": ["Security is everyone's responsibility", "Assume breach mentality", "Defense in depth strategy"],
        "technical_rules": ["MFA for all privileged accounts", "Automated vulnerability scanning weekly", "24/7 SOC monitoring"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "THREAT LANDSCAPE", "SECURITY ARCHITECTURE", "VULNERABILITY MANAGEMENT", "ACCESS CONTROLS", "INCIDENT RESPONSE", "MONITORING & DETECTION", "COMPLIANCE", "DELIVERABLES"],
        "experts": ["Chief Information Security Officer", "Penetration Tester", "Cryptography Engineer", "Security Operations Analyst", "Threat Intelligence Analyst"],
        "prompt_patterns": ["Act as [expert_team]. Conduct a [deliverable] for [target_system] following [security_framework] standards."]
    },

    "DataScience": {
        "best_practices": [
            "Build reproducible ETL pipelines with version control",
            "Apply statistical significance testing for all model evaluations",
            "Handle missing data and outliers systematically",
            "Ensure model interpretability and explainability",
            "Version datasets alongside code (DVC, MLflow)",
            "Document data lineage and transformation logic",
            "Implement data quality monitoring and alerting",
            "Use proper cross-validation strategies to prevent data leakage"
        ],
        "terminology": ["ETL/ELT", "feature engineering", "cross-validation", "p-value", "confidence interval", "dimensionality reduction", "data lineage"],
        "standards": ["FAIR data principles", "CRISP-DM", "Statistical reporting (APA)", "Data governance frameworks"],
        "checklists": ["Data quality assessment", "Feature correlation analysis", "Model evaluation metrics", "Bias detection", "Reproducibility verification"],
        "frameworks": ["Role → Data Sources → ETL → EDA → Modeling → Evaluation → Visualization → Deployment → Deliverables"],
        "common_mistakes": ["Data leakage in train/test split", "Ignoring class imbalance", "Overfitting to training data", "Missing data documentation", "No reproducibility"],
        "deliverables": ["Data pipeline architecture", "EDA report with visualizations", "Model evaluation metrics", "Dashboard design", "Data dictionary"],
        "business_rules": ["Data quality precedes analysis", "Results must be reproducible", "Insights must be actionable"],
        "technical_rules": ["Document all data transformations", "Use stratified sampling for imbalanced datasets", "Track experiment parameters"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "DATA SOURCES & COLLECTION", "ETL PIPELINE", "EXPLORATORY DATA ANALYSIS", "FEATURE ENGINEERING", "MODELING APPROACH", "EVALUATION METRICS", "VISUALIZATION & DASHBOARDS", "DEPLOYMENT", "DELIVERABLES"],
        "experts": ["Principal Data Scientist", "Data Engineer", "Quantitative Analyst", "Data Visualization Expert", "MLOps Engineer"],
        "prompt_patterns": ["Act as [expert_team]. Build a [deliverable] analyzing [data_source] to predict/discover [target_variable/insight]."]
    },

    "MachineLearning": {
        "best_practices": [
            "Implement proper hyperparameter tuning with cross-validation",
            "Mitigate bias and ensure AI fairness across demographic groups",
            "Use model versioning and registry (MLflow, Weights & Biases)",
            "Optimize for hardware acceleration (CUDA/TPU) where applicable",
            "Implement model monitoring for data drift and performance degradation",
            "Document model cards with intended use cases and limitations",
            "Apply proper evaluation metrics for the problem type",
            "Design for reproducibility with fixed seeds and environment specs"
        ],
        "terminology": ["hyperparameter", "gradient descent", "backpropagation", "transformer", "attention mechanism", "embeddings", "fine-tuning", "inference"],
        "standards": ["Model Cards (Google)", "Datasheets for Datasets", "EU AI Act", "NIST AI RMF"],
        "checklists": ["Data preparation checklist", "Model architecture review", "Training pipeline validation", "Bias and fairness audit", "Deployment readiness"],
        "frameworks": ["Role → Problem Definition → Data Preparation → Architecture → Training → Evaluation → MLOps → Ethics → Deliverables"],
        "common_mistakes": ["Training on test data", "Ignoring class imbalance", "No model monitoring", "Inadequate error analysis", "Missing bias evaluation"],
        "deliverables": ["Model architecture design", "Training pipeline code", "Evaluation report", "Model card", "MLOps deployment pipeline"],
        "business_rules": ["Models must be explainable to stakeholders", "Bias must be measured and mitigated", "Production models must be monitored"],
        "technical_rules": ["Reproducible training with fixed seeds", "Model versioning mandatory", "A/B testing for model deployments"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "PROBLEM DEFINITION", "DATA PREPARATION", "MODEL ARCHITECTURE", "TRAINING & VALIDATION", "EVALUATION METRICS", "MLOps & DEPLOYMENT", "ETHICS & BIAS", "MONITORING", "DELIVERABLES"],
        "experts": ["Principal ML Engineer", "AI Research Scientist", "MLOps Engineer", "AI Ethics Consultant", "Data Engineer"],
        "prompt_patterns": ["Act as [expert_team]. Build a [model_type] model for [task] using [framework] with [evaluation_criteria]."]
    },

    "PromptEngineering": {
        "best_practices": [
            "Use chain-of-thought reasoning for complex tasks",
            "Apply few-shot and zero-shot prompting techniques strategically",
            "Include negative prompting to prevent hallucinations",
            "Use clear delimiters and structured output formatting",
            "Design system prompts with explicit persona and constraints",
            "Implement output validation and format enforcement",
            "Test prompts across multiple LLM providers for robustness",
            "Version control prompts alongside application code"
        ],
        "terminology": ["system prompt", "few-shot", "zero-shot", "chain-of-thought", "temperature", "top-p", "token limit", "context window", "hallucination"],
        "standards": ["Prompt Engineering Best Practices", "OpenAI Prompt Guidelines", "Anthropic Prompt Design"],
        "checklists": ["Persona definition", "Task specification", "Output format", "Edge cases", "Negative constraints", "Example outputs"],
        "frameworks": ["Role → Context → Instructions → Rules → Few-Shot Examples → Output Format → Negative Constraints → Deliverables"],
        "common_mistakes": ["Vague instructions", "No output format specification", "Missing edge cases", "No negative constraints", "Overly long prompts"],
        "deliverables": ["Master prompt template", "System instructions", "Few-shot examples", "Evaluation rubric", "Prompt variation library"],
        "business_rules": ["Prompts must be testable and measurable", "Output quality must be consistent", "Prompts must handle edge cases"],
        "technical_rules": ["Stay within context window limits", "Use structured output (JSON/XML) for parsing", "Include fallback instructions"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "SYSTEM PERSONA", "CONTEXT & KNOWLEDGE", "INSTRUCTIONS & RULES", "FEW-SHOT EXAMPLES", "OUTPUT FORMATTING", "NEGATIVE CONSTRAINTS", "EVALUATION CRITERIA", "DELIVERABLES"],
        "experts": ["Principal Prompt Engineer", "LLM Output Optimizer", "Few-Shot Learning Specialist", "AI Persona Architect"],
        "prompt_patterns": ["Act as [expert_team]. Design a [prompt_type] prompt for [LLM_model] that [task] with [output_format]."]
    },

    "AIAgents": {
        "best_practices": [
            "Implement ReAct (Reason + Act) loop for decision making",
            "Define clear tool schemas with JSON Schema for all integrations",
            "Design memory management: short-term (context) vs long-term (vector store)",
            "Implement fallback strategies and infinite loop prevention",
            "Build comprehensive error handling for tool call failures",
            "Design observable agent traces for debugging and monitoring",
            "Implement guardrails and safety filters",
            "Test agent behavior across diverse input scenarios"
        ],
        "terminology": ["ReAct loop", "tool calling", "function calling", "agent memory", "planning", "reflection", "chain of agents", "orchestrator"],
        "standards": ["Agent Protocol", "OpenAI Function Calling Schema", "MCP (Model Context Protocol)"],
        "checklists": ["Agent persona definition", "Tool inventory", "Memory strategy", "Safety guardrails", "Error handling", "Evaluation suite"],
        "frameworks": ["Role → Agent Goals → Workflow Logic → Tools → Memory → Error Handling → Safety → Evaluation → Deliverables"],
        "common_mistakes": ["Infinite loops", "No error recovery", "Missing guardrails", "Poor tool descriptions", "No observability"],
        "deliverables": ["Agent architecture diagram", "Tool definitions (JSON Schema)", "Workflow logic document", "Safety guardrail specification", "Evaluation test suite"],
        "business_rules": ["Agents must be observable and debuggable", "All actions must be auditable", "Safety guardrails are non-negotiable"],
        "technical_rules": ["Max iteration limit for loops", "Timeout for all tool calls", "Structured logging for all agent decisions"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "AGENT PERSONA & GOALS", "WORKFLOW LOGIC", "AVAILABLE TOOLS", "MEMORY & CONTEXT", "ERROR HANDLING & FALLBACKS", "SAFETY & GUARDRAILS", "EVALUATION METRICS", "DELIVERABLES"],
        "experts": ["AI Agent Architect", "Multi-Agent Orchestrator", "Tool Integration Engineer", "Agent Safety Specialist"],
        "prompt_patterns": ["Act as [expert_team]. Design an AI agent that [agent_goal] using [tools] with [memory_strategy] and [safety_guardrails]."]
    },

    "UIUX": {
        "best_practices": [
            "Conduct user journey mapping and empathy mapping",
            "Ensure WCAG 2.1 AA accessibility standards compliance",
            "Use 8pt grid system and consistent spacing tokens",
            "Maintain color contrast ratios (4.5:1 minimum)",
            "Apply Atomic Design methodology for component hierarchy",
            "Design micro-interactions and motion for engagement",
            "Conduct usability testing with real users",
            "Build responsive layouts with mobile-first approach"
        ],
        "terminology": ["wireframe", "prototype", "design system", "user flow", "information architecture", "heuristic evaluation", "A/B test", "conversion rate"],
        "standards": ["WCAG 2.1 AA", "Material Design", "Human Interface Guidelines", "Inclusive Design Principles"],
        "checklists": ["User research", "Wireframe review", "Accessibility audit", "Responsive testing", "Design system documentation"],
        "frameworks": ["Role → Design Brief → User Research → IA → Interaction Design → Visual Design → Accessibility → Prototyping → Deliverables"],
        "common_mistakes": ["Skipping user research", "Ignoring accessibility", "Inconsistent spacing", "Too many colors", "No design system"],
        "deliverables": ["User personas & journey maps", "Wireframes & prototypes", "Design system", "Usability test report", "Style guide"],
        "business_rules": ["Design decisions must be user-research driven", "Accessibility is a requirement, not a feature", "Consistency across all touchpoints"],
        "technical_rules": ["4.5:1 contrast ratio minimum", "Touch targets min 44px", "Animations must respect prefers-reduced-motion"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "DESIGN BRIEF", "USER RESEARCH", "INFORMATION ARCHITECTURE", "INTERACTION DESIGN", "VISUAL DESIGN SYSTEM", "ACCESSIBILITY COMPLIANCE", "RESPONSIVE STRATEGY", "PROTOTYPING", "DELIVERABLES"],
        "experts": ["Principal Product Designer", "Senior UX Researcher", "Interaction Designer", "Design Systems Architect", "Accessibility Specialist"],
        "prompt_patterns": ["Act as [expert_team]. Design the [deliverable] for [product] targeting [user_personas] following [design_standards]."]
    },

    "ImageGeneration": {
        "best_practices": [
            "Apply rule of thirds and golden ratio for composition",
            "Specify cinematic lighting (Rembrandt, volumetric, rim light)",
            "Define camera angle and lens psychology (50mm, 85mm, wide-angle)",
            "Use color grading with harmonious palettes",
            "Apply negative prompting to prevent artifacts and unwanted elements",
            "Specify resolution, aspect ratio, and quality parameters",
            "Reference art styles and artists for consistency",
            "Layer prompts: subject → environment → lighting → mood → technical"
        ],
        "terminology": ["prompt weight", "negative prompt", "CFG scale", "sampling steps", "seed", "aspect ratio", "bokeh", "depth of field"],
        "standards": ["Platform-specific syntax (Midjourney, DALL-E, SD)", "Resolution requirements", "Content policy compliance"],
        "checklists": ["Subject description", "Style reference", "Lighting setup", "Camera angle", "Color palette", "Negative prompt", "Quality settings"],
        "frameworks": ["Subject → Composition → Lighting → Camera & Lens → Style & Mood → Color Grading → Negative Prompt → Platform Settings"],
        "common_mistakes": ["Vague subject description", "Missing negative prompt", "Conflicting styles", "Wrong aspect ratio", "Overloaded prompts"],
        "deliverables": ["Master prompt string", "Style reference notes", "Negative prompt", "Quality parameter settings", "Variation set"],
        "business_rules": ["Visual consistency across generated set", "Brand color compliance", "Content appropriateness"],
        "technical_rules": ["Specify exact resolution", "Include quality keywords", "Use prompt weighting syntax"],
        "seo_rules": [],
        "sections": ["CREATIVE DIRECTION", "SUBJECT & FOCUS", "COMPOSITION", "LIGHTING", "CAMERA & LENS", "STYLE & MOOD", "COLOR PALETTE", "NEGATIVE PROMPT", "PLATFORM SETTINGS", "DELIVERABLES"],
        "experts": ["AI Art Director", "Cinematic Visual Designer", "Visual Prompt Engineer", "Color Theory Expert", "Composition Specialist"],
        "prompt_patterns": ["[Subject] in [environment], [lighting], [camera], [style], [mood], [quality] --[platform_params]"]
    },

    "VideoGeneration": {
        "best_practices": [
            "Describe camera motion explicitly (pan, tilt, tracking, dolly)",
            "Specify frame rate and aspect ratio for target platform",
            "Maintain temporal consistency across frames",
            "Define lighting transitions and scene pacing",
            "Use keyframe descriptions for complex sequences",
            "Specify audio/music mood alignment",
            "Design for platform-specific output (TikTok, YouTube, Cinema)",
            "Apply consistent visual style throughout the sequence"
        ],
        "terminology": ["keyframe", "temporal consistency", "camera path", "frame rate", "aspect ratio", "transition", "pacing", "storyboard"],
        "standards": ["Video resolution standards (4K, 1080p)", "Frame rate standards (24fps, 30fps, 60fps)", "Platform requirements"],
        "checklists": ["Scene description", "Camera motion plan", "Lighting setup", "Temporal notes", "Audio alignment", "Output specs"],
        "frameworks": ["Scene Description → Camera Motion → Lighting & Mood → Temporal Consistency → Resolution & FPS → Negative Prompt → Output Specs"],
        "common_mistakes": ["No camera motion specified", "Inconsistent style", "Wrong aspect ratio", "No temporal guidance", "Missing negative prompt"],
        "deliverables": ["Video prompt sequence", "Storyboard", "Camera motion parameters", "Keyframe guidelines", "Platform-optimized output specs"],
        "business_rules": ["Visual consistency is mandatory", "Brand guidelines compliance", "Platform-appropriate content"],
        "technical_rules": ["Specify exact resolution and FPS", "Include motion blur preferences", "Define transition types"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "SCENE DESCRIPTION", "CAMERA MOTION", "LIGHTING & MOOD", "TEMPORAL CONSISTENCY", "AUDIO & MUSIC", "RESOLUTION & FPS", "NEGATIVE PROMPT", "PLATFORM SETTINGS", "DELIVERABLES"],
        "experts": ["AI Video Director", "Cinematographer", "Prompt Animator", "VFX Supervisor"],
        "prompt_patterns": ["[Scene]: [subject] [action], [camera_motion], [lighting], [style], [duration] --[platform_params]"]
    },

    "Writing": {
        "best_practices": [
            "Define brand voice and tone guidelines clearly",
            "Optimize readability (Flesch-Kincaid score appropriate for audience)",
            "Use active voice and strong action verbs",
            "Structure with clear headings, bullets, and short paragraphs",
            "Include compelling hooks and CTAs",
            "Fact-check all claims and statistics",
            "Optimize for SEO if web-published content",
            "Maintain consistent style throughout the piece"
        ],
        "terminology": ["tone of voice", "brand voice", "readability score", "hook", "CTA", "byline", "editorial calendar", "content pillar"],
        "standards": ["AP Stylebook", "Chicago Manual of Style", "SEO content guidelines", "Platform-specific formats"],
        "checklists": ["Topic research", "Outline creation", "Draft writing", "Editing pass", "Fact-checking", "SEO optimization", "Proofreading"],
        "frameworks": ["Role → Topic & Theme → Tone of Voice → Target Audience → Structure → Key Messages → Formatting → SEO → Deliverables"],
        "common_mistakes": ["Passive voice overuse", "No clear structure", "Missing CTA", "Inconsistent tone", "Keyword stuffing"],
        "deliverables": ["Written content draft", "Style guide adherence notes", "SEO meta tags", "Content brief", "Editorial notes"],
        "business_rules": ["Accuracy over speed", "Brand voice consistency", "Audience-appropriate language level"],
        "technical_rules": ["Paragraphs max 3-4 sentences", "Headings every 200-300 words", "Include alt text for images"],
        "seo_rules": ["Target primary and secondary keywords", "Write compelling meta descriptions", "Use header hierarchy (H1→H2→H3)"],
        "sections": ["EXECUTIVE SUMMARY", "TOPIC & THEME", "TONE OF VOICE", "TARGET AUDIENCE", "CONTENT STRUCTURE", "KEY MESSAGES", "SEO STRATEGY", "FORMATTING RULES", "DELIVERABLES"],
        "experts": ["Principal Copywriter", "Tone of Voice Specialist", "Content Strategist", "Editorial Reviewer", "SEO Content Expert"],
        "prompt_patterns": ["Act as [expert_team]. Write a [content_type] about [topic] for [audience] in [tone] with [word_count] words."]
    },

    "Research": {
        "best_practices": [
            "Use peer-reviewed sources as primary references",
            "Maintain unbiased, objective tone throughout",
            "Follow proper citation formatting (APA/MLA/Chicago)",
            "Identify knowledge gaps and limitations explicitly",
            "Synthesize findings across multiple sources",
            "Distinguish between correlation and causation",
            "Document methodology and data collection approach",
            "Provide actionable recommendations based on findings"
        ],
        "terminology": ["methodology", "hypothesis", "literature review", "peer review", "citation", "abstract", "sample size", "control group"],
        "standards": ["APA 7th Edition", "MLA 9th Edition", "Chicago Manual", "PRISMA (systematic reviews)"],
        "checklists": ["Research question", "Literature search", "Methodology design", "Data collection", "Analysis", "Synthesis", "Citation verification"],
        "frameworks": ["Role → Research Objectives → Methodology → Scope → Data Sources → Analysis → Synthesis → Citations → Deliverables"],
        "common_mistakes": ["Cherry-picking sources", "Missing citations", "Confusing correlation/causation", "No methodology description", "Biased synthesis"],
        "deliverables": ["Research report/brief", "Annotated bibliography", "Executive summary", "Data analysis", "Methodology documentation"],
        "business_rules": ["Objectivity is non-negotiable", "All claims must be sourced", "Limitations must be disclosed"],
        "technical_rules": ["Minimum 10 peer-reviewed sources", "Proper citation format throughout", "Clear methodology section"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "RESEARCH OBJECTIVES", "METHODOLOGY", "LITERATURE REVIEW", "SCOPE & LIMITATIONS", "DATA SOURCES", "ANALYSIS & FINDINGS", "SYNTHESIS", "RECOMMENDATIONS", "CITATIONS", "DELIVERABLES"],
        "experts": ["Lead Researcher", "Academic Analyst", "Data Synthesizer", "Fact-Checking Specialist", "Methodology Expert"],
        "prompt_patterns": ["Act as [expert_team]. Conduct a [research_type] on [topic] using [methodology] following [citation_format]."]
    },

    "Resume": {
        "best_practices": [
            "Use ATS-friendly formatting (no complex tables/graphics)",
            "Write action-oriented bullet points using STAR method",
            "Optimize keywords for target job description",
            "Quantify achievements with metrics and numbers",
            "Tailor content to specific role and industry",
            "Keep professional summary concise and impactful",
            "Use consistent formatting and clear hierarchy",
            "Include relevant skills and certifications prominently"
        ],
        "terminology": ["ATS", "STAR method", "keyword optimization", "professional summary", "core competencies", "action verb", "quantified achievement"],
        "standards": ["ATS compatibility standards", "Industry-specific resume formats", "LinkedIn profile guidelines"],
        "checklists": ["Contact information", "Professional summary", "Work experience (STAR)", "Education", "Skills & certifications", "Keywords", "Formatting"],
        "frameworks": ["Role → Target Position → Professional Summary → Experience (STAR) → Skills → Education → Keywords → Formatting → Deliverables"],
        "common_mistakes": ["Generic objective statement", "No quantified achievements", "ATS-unfriendly format", "Too long or too short", "Irrelevant information"],
        "deliverables": ["ATS-optimized resume", "Cover letter", "LinkedIn profile summary", "Professional bio", "Skills matrix"],
        "business_rules": ["Honesty is non-negotiable", "Tailor to each application", "Focus on impact over responsibilities"],
        "technical_rules": ["One page for <10 years experience", "Two pages maximum for senior roles", "Standard fonts (Arial, Calibri, Times)"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "TARGET ROLE ANALYSIS", "PROFESSIONAL SUMMARY", "EXPERIENCE & ACHIEVEMENTS (STAR)", "SKILLS & KEYWORDS", "EDUCATION & CERTIFICATIONS", "ATS FORMATTING", "DELIVERABLES"],
        "experts": ["Career Strategist", "ATS Optimization Expert", "Executive Recruiter", "Personal Branding Consultant"],
        "prompt_patterns": ["Act as [expert_team]. Write a [resume_type] resume for a [role] with [years] years experience targeting [company_type]."]
    },

    "SocialMedia": {
        "best_practices": [
            "Optimize content format for each platform's algorithm",
            "Create hooks that capture attention in the first 3 seconds",
            "Use hashtag strategy and trend capitalization",
            "Include clear calls-to-action for engagement",
            "Maintain brand voice consistency across platforms",
            "Schedule content for optimal engagement times",
            "Design for mobile-first consumption",
            "Build community through authentic engagement"
        ],
        "terminology": ["engagement rate", "reach", "impressions", "algorithm", "viral coefficient", "UGC", "influencer", "content pillar"],
        "standards": ["Platform-specific content guidelines", "FTC disclosure requirements", "Copyright compliance"],
        "checklists": ["Content calendar", "Platform specs", "Hashtag research", "Visual assets", "CTA strategy", "Analytics tracking"],
        "frameworks": ["Role → Platform Strategy → Target Audience → Content Pillars → Hook & Retention → Copy → Visuals → Hashtags → Analytics → Deliverables"],
        "common_mistakes": ["Same content all platforms", "No engagement strategy", "Missing CTA", "Ignoring analytics", "Inconsistent posting"],
        "deliverables": ["Social media content calendar", "Post copy variations", "Visual asset guidelines", "Hashtag strategy", "Analytics dashboard"],
        "business_rules": ["Platform-native content only", "Engagement over reach", "Community building over broadcasting"],
        "technical_rules": ["Platform-specific image sizes", "Video length optimization", "Accessibility: captions, alt text"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "PLATFORM STRATEGY", "TARGET AUDIENCE", "CONTENT PILLARS", "HOOK & RETENTION", "CONTENT COPY", "VISUAL GUIDELINES", "HASHTAGS & CTA", "ANALYTICS & KPIs", "DELIVERABLES"],
        "experts": ["Social Media Strategist", "Viral Content Creator", "Community Manager", "Platform Algorithm Expert"],
        "prompt_patterns": ["Act as [expert_team]. Create a [content_type] for [platform] targeting [audience] about [topic] to achieve [engagement_goal]."]
    },

    "Travel": {
        "best_practices": [
            "Integrate with GDS (Global Distribution System) for real-time availability",
            "Implement dynamic pricing and inventory synchronization",
            "Design multi-currency and multi-lingual architecture",
            "Use high-quality, immersive destination imagery",
            "Build trust signals: reviews, ratings, certifications",
            "Optimize booking flow for minimal friction",
            "Implement flexible cancellation and modification policies",
            "Design for mobile booking experience"
        ],
        "terminology": ["GDS", "OTA", "RevPAR", "ADR", "occupancy rate", "fare class", "PNR", "inventory management"],
        "standards": ["IATA standards", "PCI-DSS for payments", "GDPR for traveler data", "Accessibility standards"],
        "checklists": ["Booking flow optimization", "Payment integration", "Multi-language support", "Review system", "Mobile optimization"],
        "frameworks": ["Role → Target Audience → Booking Flow → Inventory & Pricing → Localization → Marketing → Technical → Deliverables"],
        "common_mistakes": ["Complex booking flow", "No mobile optimization", "Missing trust signals", "Single currency", "No cancellation policy"],
        "deliverables": ["Booking flow UX", "Integration requirements", "Pricing strategy", "Multi-language plan", "Marketing strategy"],
        "business_rules": ["Booking completion rate is the key metric", "Trust and transparency build repeat bookings", "Mobile-first for travel"],
        "technical_rules": ["Real-time availability sync", "Sub-2-second search results", "PCI-DSS compliant payments"],
        "seo_rules": ["Target destination + activity keywords", "Build location-specific landing pages", "Implement review schema markup"],
        "sections": ["EXECUTIVE SUMMARY", "TARGET AUDIENCE", "BOOKING FLOW", "INVENTORY & PRICING", "LOCALIZATION", "TRUST & REVIEWS", "MARKETING STRATEGY", "TECHNICAL REQUIREMENTS", "DELIVERABLES"],
        "experts": ["Travel Tech Architect", "Hospitality Business Strategist", "Booking System Engineer", "Tourism Marketing Consultant"],
        "prompt_patterns": ["Act as [expert_team]. Design a [deliverable] for [travel_business_type] serving [traveler_segment] in [region]."]
    },

    "Architecture": {
        "best_practices": [
            "Follow BIM (Building Information Modeling) standards",
            "Integrate LEED/BREEAM sustainability metrics",
            "Use spatial data visualization and CAD interoperability",
            "Design for natural light and energy efficiency",
            "Apply universal design and accessibility principles",
            "Consider local building codes and zoning regulations",
            "Use high-fidelity photorealistic rendering for presentations",
            "Plan for climate resilience and environmental impact"
        ],
        "terminology": ["BIM", "LOD", "CAD", "LEED", "BREEAM", "floor area ratio", "setback", "elevation", "section drawing"],
        "standards": ["IFC (Industry Foundation Classes)", "ISO 19650 (BIM)", "LEED v4.1", "BREEAM", "ADA/Universal Design"],
        "checklists": ["Site analysis", "Zoning compliance", "Sustainability assessment", "Structural review", "Accessibility audit"],
        "frameworks": ["Role → Project Scope → Spatial Requirements → Sustainability → Materials → Visualization → Codes & Standards → Deliverables"],
        "common_mistakes": ["Ignoring local codes", "No sustainability consideration", "Poor natural lighting", "Inaccessible design", "Over-budget materials"],
        "deliverables": ["Architectural drawings", "3D visualization renders", "BIM model", "Sustainability report", "Material specification"],
        "business_rules": ["Code compliance is mandatory", "Sustainability is a design requirement", "User comfort drives design decisions"],
        "technical_rules": ["BIM LOD 300 minimum for construction docs", "Energy modeling required for LEED", "Structural analysis for all load paths"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "PROJECT SCOPE", "SITE ANALYSIS", "SPATIAL REQUIREMENTS", "SUSTAINABILITY", "MATERIALS & FINISHES", "VISUALIZATION & RENDERING", "CODES & STANDARDS", "DELIVERABLES"],
        "experts": ["Digital Architecture Consultant", "BIM Manager", "3D Visualization Specialist", "Sustainable Design Expert"],
        "prompt_patterns": ["Act as [expert_team]. Design a [building_type] at [location] incorporating [sustainability_standards] and [design_style]."]
    },

    "Construction": {
        "best_practices": [
            "Implement real-time site progress tracking",
            "Ensure OSHA safety compliance monitoring",
            "Automate supply chain and procurement workflows",
            "Use offline-first mobile applications for field use",
            "Implement quality control checkpoints at each phase",
            "Track weather delays and schedule impact analysis",
            "Manage subcontractor coordination and scheduling",
            "Use drone and IoT sensors for site monitoring"
        ],
        "terminology": ["punch list", "RFI", "change order", "submittals", "general contractor", "subcontractor", "bonding", "lien"],
        "standards": ["OSHA regulations", "Local building codes", "ASTM standards", "ICC codes"],
        "checklists": ["Safety inspection", "Quality control", "Schedule review", "Budget tracking", "Permit verification"],
        "frameworks": ["Role → Project Planning → Safety & Compliance → Supply Chain → Progress Tracking → Quality Control → Reporting → Deliverables"],
        "common_mistakes": ["Safety violations", "Schedule overruns", "Budget overruns", "Missing permits", "Poor documentation"],
        "deliverables": ["Project schedule (Gantt)", "Safety protocol document", "Budget tracking system", "Progress reports", "Quality inspection records"],
        "business_rules": ["Safety is non-negotiable", "Schedule and budget must be tracked daily", "All changes require formal change orders"],
        "technical_rules": ["Daily safety inspections required", "Photo documentation of all phases", "Real-time budget tracking"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "PROJECT PLANNING", "SAFETY & COMPLIANCE (OSHA)", "SCHEDULING & MILESTONES", "SUPPLY CHAIN & PROCUREMENT", "QUALITY CONTROL", "PROGRESS TRACKING", "BUDGET MANAGEMENT", "DELIVERABLES"],
        "experts": ["Construction Tech Lead", "Project Management Consultant", "Safety & Compliance Officer", "Supply Chain Analyst"],
        "prompt_patterns": ["Act as [expert_team]. Plan a [construction_type] project at [location] with [budget] budget and [timeline] timeline."]
    },

    "CustomerSupport": {
        "best_practices": [
            "Implement omnichannel support strategy",
            "Build comprehensive knowledge base with search",
            "Design escalation workflows with SLA tracking",
            "Use sentiment analysis for priority routing",
            "Implement customer satisfaction (CSAT/NPS) surveys",
            "Build self-service portals to reduce ticket volume",
            "Train support AI with real ticket data",
            "Design first-contact resolution optimization"
        ],
        "terminology": ["CSAT", "NPS", "FCR", "SLA", "ticket", "escalation", "knowledge base", "omnichannel", "IVR"],
        "standards": ["ISO 10002 (Customer Satisfaction)", "ITIL", "SLA compliance"],
        "checklists": ["Channel setup", "Knowledge base creation", "Escalation workflow", "SLA definition", "CSAT survey design"],
        "frameworks": ["Role → Channel Strategy → Knowledge Base → Ticket Workflow → Escalation → SLA → Analytics → Deliverables"],
        "common_mistakes": ["No knowledge base", "Missing SLAs", "No escalation path", "Ignoring customer feedback", "Siloed channels"],
        "deliverables": ["Support workflow design", "Knowledge base structure", "SLA framework", "CSAT measurement plan", "Chatbot training data"],
        "business_rules": ["Customer satisfaction is the primary metric", "First-contact resolution is the goal", "All interactions must be logged"],
        "technical_rules": ["Response time SLA per channel", "Ticket auto-routing rules", "Knowledge base search optimization"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "CHANNEL STRATEGY", "KNOWLEDGE BASE", "TICKET WORKFLOW", "ESCALATION PROCEDURES", "SLA FRAMEWORK", "CUSTOMER SATISFACTION", "ANALYTICS & REPORTING", "DELIVERABLES"],
        "experts": ["Customer Experience Director", "Support Operations Manager", "Knowledge Management Specialist", "Chatbot Designer"],
        "prompt_patterns": ["Act as [expert_team]. Design a [support_system] for [business_type] handling [volume] tickets across [channels]."]
    },

    "Sales": {
        "best_practices": [
            "Implement structured sales pipeline with clear stage definitions",
            "Use lead scoring models for qualification",
            "Build sales enablement content library",
            "Implement CRM automation for follow-ups",
            "Design territory planning and quota setting",
            "Use data-driven forecasting models",
            "Build competitive battlecards for sales reps",
            "Implement win/loss analysis for continuous improvement"
        ],
        "terminology": ["pipeline", "quota", "MQL/SQL", "close rate", "ARR/MRR", "churn", "upsell/cross-sell", "battlecard", "discovery call"],
        "standards": ["CRM best practices", "MEDDICC/BANT qualification", "Revenue operations standards"],
        "checklists": ["Pipeline stage definitions", "Lead scoring criteria", "Sales playbook", "Competitive analysis", "Forecast accuracy review"],
        "frameworks": ["Role → Pipeline Design → Lead Qualification → Sales Playbook → Enablement → Forecasting → Analytics → Deliverables"],
        "common_mistakes": ["No lead scoring", "Incomplete CRM data", "No sales playbook", "Ignoring win/loss analysis", "Manual forecasting"],
        "deliverables": ["Sales playbook", "Pipeline design", "Lead scoring model", "Competitive battlecards", "Forecast model"],
        "business_rules": ["Pipeline hygiene is mandatory", "All deals must follow the process", "Win/loss analysis on every closed deal"],
        "technical_rules": ["CRM must be the single source of truth", "Automated stage progression rules", "Real-time pipeline dashboards"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "SALES STRATEGY", "PIPELINE DESIGN", "LEAD QUALIFICATION", "SALES PLAYBOOK", "COMPETITIVE ANALYSIS", "ENABLEMENT & TRAINING", "FORECASTING & ANALYTICS", "DELIVERABLES"],
        "experts": ["Sales Strategy Consultant", "CRM Implementation Expert", "Revenue Operations Analyst", "Sales Enablement Director"],
        "prompt_patterns": ["Act as [expert_team]. Design a [sales_system] for [business_type] targeting [customer_segment] with [revenue_goal]."]
    },

    "Business": {
        "best_practices": [
            "Apply Business Model Canvas for strategic analysis",
            "Use OKR framework for goal setting and tracking",
            "Conduct SWOT and competitive landscape analysis",
            "Design go-to-market strategy with clear positioning",
            "Build data-driven decision making frameworks",
            "Implement agile project management methodologies",
            "Design organizational structure for scalability",
            "Create clear communication and reporting structures"
        ],
        "terminology": ["OKR", "KPI", "ROI", "SWOT", "TAM/SAM/SOM", "unit economics", "burn rate", "runway", "product-market fit"],
        "standards": ["Business Model Canvas", "Lean Startup", "Balanced Scorecard", "Porter's Five Forces"],
        "checklists": ["Market analysis", "Competitive research", "Financial projections", "Team structure", "Risk assessment"],
        "frameworks": ["Role → Business Objectives → Market Analysis → Strategy → Execution Plan → Metrics → Risk Management → Deliverables"],
        "common_mistakes": ["No clear metrics", "Ignoring competition", "Unrealistic projections", "No risk assessment", "Vague strategy"],
        "deliverables": ["Business strategy document", "Market analysis report", "Execution roadmap", "Financial projections", "Risk assessment"],
        "business_rules": ["Strategy must be measurable", "Decisions must be data-informed", "Risk must be quantified and mitigated"],
        "technical_rules": ["Clear success metrics for every initiative", "Monthly review cadence", "Quarterly strategic planning"],
        "seo_rules": [],
        "sections": ["EXECUTIVE SUMMARY", "BUSINESS OBJECTIVES", "MARKET ANALYSIS", "COMPETITIVE LANDSCAPE", "STRATEGY", "EXECUTION ROADMAP", "FINANCIAL PROJECTIONS", "SUCCESS METRICS", "RISK MANAGEMENT", "DELIVERABLES"],
        "experts": ["Business Strategy Consultant", "Operations Director", "Product Manager", "Market Research Analyst", "Financial Analyst"],
        "prompt_patterns": ["Act as [expert_team]. Develop a [strategy_type] for [business_type] targeting [market] to achieve [business_goal]."]
    }
}


def get_pack(domain: str) -> dict:
    """Retrieve a knowledge pack by domain name. Falls back to Business pack."""
    return DOMAIN_KNOWLEDGE_PACKS.get(domain, DOMAIN_KNOWLEDGE_PACKS.get("Business", {}))


def get_all_domains() -> list[str]:
    """Return list of all available domain names."""
    return list(DOMAIN_KNOWLEDGE_PACKS.keys())


def get_pack_text_for_embedding(domain: str) -> str:
    """
    Flatten a domain pack into a single text string suitable for
    TF-IDF vectorization or embedding. Used by the vector store.
    """
    pack = get_pack(domain)
    if not pack:
        return ""
    parts = []
    parts.append(f"Domain: {domain}")
    for key in ["best_practices", "terminology", "standards", "checklists", "common_mistakes", "deliverables"]:
        items = pack.get(key, [])
        if items:
            parts.append(f"{key}: {', '.join(items)}")
    for key in ["business_rules", "technical_rules", "seo_rules"]:
        items = pack.get(key, [])
        if items:
            parts.append(f"{key}: {', '.join(items)}")
    return ". ".join(parts)
