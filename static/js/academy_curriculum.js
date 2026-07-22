/**
 * Prompt Engineering Master Course — Full Curriculum
 * 17 Modules | 7 Phases | 50+ Real Lessons
 * Used as fallback data when the Google Apps Script database is empty.
 */
const ACADEMY_CURRICULUM = [
    {
        id: "M1", num: 1, title: "AI & Generative AI Foundations",
        phase: "🟢 Phase 1 — AI Foundations",
        lessons: [
            { id: "L1_1", num: 1, dur: "12:00", title: "Artificial Intelligence & Machine Learning", content: "<h3>AI & Machine Learning</h3><p>Understand what Artificial Intelligence is, how Machine Learning differs from traditional programming, and the role of Deep Learning and Neural Networks.</p><ul><li>What is Artificial Intelligence?</li><li>Types of Machine Learning: Supervised, Unsupervised, Reinforcement</li><li>Deep Learning Basics</li><li>Neural Network Architecture</li></ul>" },
            { id: "L1_2", num: 2, dur: "15:00", title: "Natural Language Processing & Transformers", content: "<h3>NLP & Transformers</h3><p>Learn how computers understand human language, and how the Transformer architecture enabled models like GPT, Claude, and Gemini.</p><ul><li>Natural Language Processing (NLP)</li><li>The Transformer Architecture</li><li>Attention Mechanism</li><li>BERT vs GPT models</li></ul>" },
            { id: "L1_3", num: 3, dur: "18:00", title: "Large Language Models, Tokens & Context Windows", content: "<h3>Large Language Models (LLMs)</h3><p>Explore how LLMs work. Understand tokens, context windows, and embeddings — the foundations of effective prompting.</p><ul><li>What are LLMs and how are they trained?</li><li>Tokens and Tokenization explained</li><li>Context Window: what it means and why it matters</li><li>Embeddings and Vector Space</li></ul>" },
            { id: "L1_4", num: 4, dur: "14:00", title: "Temperature, Top-P, Top-K & AI Hallucinations", content: "<h3>LLM Parameters and Limitations</h3><p>Master the key parameters that control AI creativity. Understand hallucinations, AI ethics, and responsible AI use.</p><ul><li>Temperature: controlling creativity and randomness</li><li>Top-P (Nucleus Sampling)</li><li>Top-K Sampling</li><li>What are AI Hallucinations and how to minimize them</li><li>Responsible AI and Ethics</li></ul>" },
            { id: "L1_5", num: 5, dur: "20:00", title: "🛠 Mini Project: Compare ChatGPT, Claude, Gemini, Grok & DeepSeek", content: "<h3>Mini Project: AI Model Comparison</h3><p>Run the same 10 prompts across all 5 major AI models and document the differences in output quality, speed, reasoning, and creativity.</p><p><strong>Deliverable:</strong> A comparison report with screenshots, scores, and a personal recommendation guide.</p>" }
        ]
    },
    {
        id: "M2", num: 2, title: "Prompt Engineering Fundamentals",
        phase: "🟢 Phase 2 — Prompt Engineering Core",
        lessons: [
            { id: "L2_1", num: 1, dur: "12:00", title: "What is Prompt Engineering? Anatomy & Lifecycle", content: "<h3>Prompt Engineering Fundamentals</h3><p>Learn what Prompt Engineering is and how to dissect any prompt into its core components: Role, Context, Instruction, Format, and Constraint.</p><ul><li>What is Prompt Engineering?</li><li>Prompt Anatomy: Role, Context, Instruction, Format, Constraint</li><li>The Prompt Lifecycle: Design, Test, Evaluate, Optimize</li><li>Design Principles for Effective Prompts</li></ul>" },
            { id: "L2_2", num: 2, dur: "15:00", title: "Instructions, Context, Delimiters & Variables", content: "<h3>Core Prompt Elements</h3><p>Master the distinction between instructions and context. Learn to use delimiters, dynamic variables, and constraints for precise, reusable prompts.</p><ul><li>Instructions vs Context: knowing the difference</li><li>Delimiters: triple backticks, XML tags, brackets</li><li>Variables: making prompts dynamic</li><li>Constraints: setting boundaries for AI output</li></ul>" },
            { id: "L2_3", num: 3, dur: "14:00", title: "Output Formatting, Negative Prompting & Evaluation", content: "<h3>Controlling AI Output</h3><p>Learn how to specify the exact format of AI responses and understand how to evaluate prompt quality systematically.</p><ul><li>Output Formatting: JSON, Markdown, Tables, Lists</li><li>Negative Prompting: telling AI what NOT to do</li><li>Prompt Evaluation Metrics: relevance, accuracy, completeness</li><li>Prompt Testing and Debugging strategies</li></ul>" },
            { id: "L2_4", num: 4, dur: "16:00", title: "Prompt Templates & Optimization Basics", content: "<h3>Prompt Templates and Optimization</h3><p>Build reusable prompt templates that work consistently. Learn the core optimization cycle to continuously improve your prompts.</p><ul><li>Creating Reusable Prompt Templates</li><li>Prompt Optimization: the iterative improvement cycle</li><li>A/B Testing Prompts for quality</li><li>Prompt Libraries: organizing your work</li></ul>" },
            { id: "L2_5", num: 5, dur: "30:00", title: "📝 Assignment: Write 20 Professional Prompts", content: "<h3>Assignment: 20 Professional Prompts</h3><p>Apply everything you have learned to write 20 production-quality prompts across different industries and use cases.</p><p><strong>Deliverable:</strong> A structured document with all 20 prompts, each including the Goal, Prompt Text, Expected Output, and Notes.</p>" }
        ]
    },
    {
        id: "M3", num: 3, title: "Basic Prompting Techniques",
        phase: null,
        lessons: [
            { id: "L3_1", num: 1, dur: "14:00", title: "Zero-shot, One-shot, Few-shot & Multi-shot Prompting", content: "<h3>Shot-Based Prompting</h3><p>Master the foundational prompting paradigms and learn when to use each based on task complexity and desired output quality.</p><ul><li>Zero-shot Prompting: no examples needed</li><li>One-shot Prompting: one powerful example</li><li>Few-shot Prompting: 2-5 examples for complex tasks</li><li>Multi-shot Prompting: extensive guidance for precision</li></ul>" },
            { id: "L3_2", num: 2, dur: "12:00", title: "Persona, Role, Goal & Step Prompting", content: "<h3>Persona and Role Prompting</h3><p>Learn how assigning roles and personas to AI dramatically improves output quality, consistency, and specialization.</p><ul><li>Persona Prompting: You are an expert...</li><li>Role Prompting: assigning professional identities</li><li>Goal Prompting: defining the desired outcome</li><li>Step Prompting: breaking tasks into sequences</li></ul>" },
            { id: "L3_3", num: 3, dur: "13:00", title: "Style Control, Constraint & Markdown Prompting", content: "<h3>Output Style and Control</h3><p>Control the tone, style, format, length, and constraints of AI responses to match your brand, audience, and use case.</p><ul><li>Style Control: formal, casual, technical, creative</li><li>Constraint Prompting: setting strict output boundaries</li><li>Markdown Prompting: using formatting in prompts</li><li>Output Templates: specifying exact structure</li></ul>" },
            { id: "L3_4", num: 4, dur: "25:00", title: "🛠 Mini Project: AI Email Generator", content: "<h3>Mini Project: AI Email Generator</h3><p>Build a prompt-powered email generator that creates professional emails for 5 different business use cases: Cold Sales, Customer Support, HR, Marketing Newsletter, and Executive Summary.</p><p><strong>Deliverable:</strong> 5 prompt templates with sample emails for each use case.</p>" }
        ]
    },
    {
        id: "M4", num: 4, title: "Intermediate Prompt Engineering",
        phase: null,
        lessons: [
            { id: "L4_1", num: 1, dur: "16:00", title: "Chain of Thought (CoT) & Self-Consistency", content: "<h3>Chain of Thought Prompting</h3><p>Learn how to instruct AI to reason step-by-step, dramatically improving performance on complex reasoning and math tasks.</p><ul><li>Chain of Thought (CoT): Let us think step by step</li><li>Zero-shot CoT: no examples, just the magic instruction</li><li>Few-shot CoT: example-guided reasoning</li><li>Self-Consistency: generate multiple answers and vote</li></ul>" },
            { id: "L4_2", num: 2, dur: "18:00", title: "Tree of Thought, Prompt Chaining & Reflection", content: "<h3>Advanced Reasoning Techniques</h3><p>Explore Tree of Thought for complex problem solving, prompt chaining for multi-step workflows, and reflection prompting for self-improvement.</p><ul><li>Tree of Thought (ToT): exploring multiple reasoning paths</li><li>Prompt Chaining: connecting prompts into workflows</li><li>Reflection Prompting: AI evaluates its own output</li><li>Self-Critique: structured self-improvement loops</li></ul>" },
            { id: "L4_3", num: 3, dur: "15:00", title: "Verification, Iterative & Multi-Step Prompting", content: "<h3>Iterative Prompting Strategies</h3><p>Master strategies for refining AI responses through verification loops, iterative refinement, and multi-step task decomposition.</p><ul><li>Verification Prompting: Is this correct? Check your work.</li><li>Iterative Prompting: progressive refinement cycles</li><li>Multi-Step Prompting: decompose complex tasks</li><li>Reasoning Strategies: systematic problem solving</li></ul>" },
            { id: "L4_4", num: 4, dur: "30:00", title: "🛠 Project: AI Research Assistant", content: "<h3>Project: AI Research Assistant</h3><p>Build a multi-step prompt workflow that takes any research topic and automatically produces a structured report with Executive Summary, Key Findings, Analysis, Evidence, and Recommendations.</p><p><strong>Deliverable:</strong> A prompt chain that generates a complete research report on any topic in under 5 minutes.</p>" }
        ]
    },
    {
        id: "M5", num: 5, title: "Advanced Prompt Engineering",
        phase: "🟡 Phase 3 — Advanced Prompt Engineering",
        lessons: [
            { id: "L5_1", num: 1, dur: "16:00", title: "Meta Prompting, Dynamic & Structured Prompting", content: "<h3>Advanced Prompting Paradigms</h3><p>Unlock the next level: meta-prompting (prompts that generate prompts), dynamic prompting with variables, and structured prompting with XML and JSON schemas.</p><ul><li>Meta Prompting: Write me a prompt that will...</li><li>Dynamic Prompting: using variables and templates</li><li>Structured Prompting: consistent, parseable outputs</li><li>XML Prompting: Anthropics recommended approach</li></ul>" },
            { id: "L5_2", num: 2, dur: "18:00", title: "Function Calling, Tool Calling & Schema-Based Prompting", content: "<h3>Function and Tool Calling</h3><p>Master how to instruct LLMs to call functions, use external tools, and return perfectly structured JSON outputs — the foundation of AI agents.</p><ul><li>Function Calling: definition and parameters</li><li>Tool Calling: connecting AI to external services</li><li>Schema-Based Prompting: defining exact output structure</li><li>JSON Mode: guaranteed structured outputs</li></ul>" },
            { id: "L5_3", num: 3, dur: "14:00", title: "Prompt Compression, Versioning & Markdown Mastery", content: "<h3>Prompt Management and Optimization</h3><p>Learn professional prompt management: compress prompts without losing quality, version control your work, and master advanced Markdown formatting.</p><ul><li>Prompt Compression: say more with less</li><li>Prompt Versioning: tracking changes over time</li><li>Advanced Markdown Prompting techniques</li></ul>" },
            { id: "L5_4", num: 4, dur: "30:00", title: "🛠 Project: AI Prompt Generator", content: "<h3>Project: AI Prompt Generator</h3><p>Build a meta-prompt system that takes a task description and automatically generates 5 optimized prompt variations tailored for different AI models and styles.</p><p><strong>Deliverable:</strong> A working prompt generation system that creates formal, creative, technical, minimal, and detailed variations for any task.</p>" }
        ]
    },
    {
        id: "M6", num: 6, title: "Prompt Engineering Frameworks",
        phase: null,
        lessons: [
            { id: "L6_1", num: 1, dur: "18:00", title: "RTF, RISEN, COAST, CARE & TAG Frameworks", content: "<h3>Professional Frameworks Part 1</h3><p>Learn the first 5 professional prompt engineering frameworks used by top AI practitioners to consistently produce high-quality outputs.</p><ul><li>RTF: Role, Task, Format</li><li>RISEN: Role, Instructions, Steps, End Goal, Narrowing</li><li>COAST: Context, Objective, Actions, Scenario, Task</li><li>CARE: Context, Action, Result, Example</li><li>TAG: Task, Action, Goal</li></ul>" },
            { id: "L6_2", num: 2, dur: "18:00", title: "APE, BROKE, SMART, CRISPE & RACE Frameworks", content: "<h3>Professional Frameworks Part 2</h3><p>Expand your toolkit with 5 more powerful structured frameworks for professional AI prompting.</p><ul><li>APE: Action, Purpose, Expectation</li><li>BROKE: Background, Role, Objectives, Key Results, Evolve</li><li>SMART: Specific, Measurable, Achievable, Relevant, Time-bound</li><li>CRISPE: Capacity, Role, Insight, Statement, Personality, Experiment</li><li>RACE: Role, Action, Context, Execute</li></ul>" },
            { id: "L6_3", num: 3, dur: "20:00", title: "CREATE, TRACE, PACE, COSTAR, ReAct & Chain of Density", content: "<h3>Professional Frameworks Part 3</h3><p>Complete your framework mastery with the final 10 frameworks, including the powerful COSTAR and ReAct — the foundation of AI agent reasoning.</p><ul><li>CREATE, TRACE, PACE, PECRA, CLEAR</li><li>COSTAR: Context, Objective, Style, Tone, Audience, Response</li><li>ICE, STAR frameworks</li><li>ReAct: Reasoning plus Acting</li><li>Chain of Density: progressive summarization</li></ul>" },
            { id: "L6_4", num: 4, dur: "35:00", title: "🛠 Practice: Apply All 20 Frameworks to Real Tasks", content: "<h3>Framework Mastery Challenge</h3><p>Apply all 20 frameworks to real-world tasks. Document which frameworks work best for which scenarios.</p><p><strong>Deliverable:</strong> A Framework Comparison Document with 20 prompts, sample outputs, your rating for each, and recommended use cases.</p>" }
        ]
    },
    {
        id: "M7", num: 7, title: "Domain-Specific Prompting",
        phase: null,
        lessons: [
            { id: "L7_1", num: 1, dur: "16:00", title: "Software Development, UI/UX Design & Marketing", content: "<h3>Domain Prompting: Tech and Creative</h3><p>Learn to craft highly effective prompts for Software Development (code generation, debugging), UI/UX Design (wireframes, user flows), and Marketing (ad copy, campaigns, SEO).</p>" },
            { id: "L7_2", num: 2, dur: "16:00", title: "Sales, HR, Finance, Healthcare & Legal Prompting", content: "<h3>Domain Prompting: Business and Professional</h3><p>Apply prompt engineering across Sales (cold outreach, proposals), HR (job descriptions, reviews), Finance (analysis, reports), Healthcare (clinical summaries), and Legal (contract drafting, compliance).</p>" },
            { id: "L7_3", num: 3, dur: "16:00", title: "Education, E-commerce, Content & Business Strategy", content: "<h3>Domain Prompting: Specialized Fields</h3><p>Master prompting for Education (curriculum design, lesson plans), E-commerce (product descriptions), Social Media (posts, campaigns), Content Writing, Research, and Business Strategy (SWOT, market research, roadmaps).</p>" }
        ]
    },
    {
        id: "M8", num: 8, title: "Image Prompt Engineering",
        phase: "🟠 Phase 4 — Multimodal AI",
        lessons: [
            { id: "L8_1", num: 1, dur: "18:00", title: "Midjourney, DALL·E 3, FLUX, Stable Diffusion & Ideogram", content: "<h3>Image Generation Platforms</h3><p>Master all five leading image generation platforms, their unique syntax, strengths, and best use cases: Midjourney (cinematic quality), DALL-E 3 (natural language), FLUX (photorealism), Stable Diffusion (customizable), and Ideogram (text in images).</p>" },
            { id: "L8_2", num: 2, dur: "16:00", title: "Composition, Camera Angles, Lighting, Color & Negative Prompts", content: "<h3>Visual Prompt Mastery</h3><p>Apply photography and cinematography principles to dramatically improve your AI image quality. Learn composition (rule of thirds), camera angles, lighting techniques, color theory, aspect ratios, negative prompts, and character consistency.</p>" },
            { id: "L8_3", num: 3, dur: "35:00", title: "🛠 Projects: AI Logo Designer, Product Photography & Posters", content: "<h3>Image Generation Projects</h3><p>Build three complete projects: an AI Logo Designer (5 brand styles), Product Photography workflow (studio-quality on any background), and Marketing Poster generator.</p><p><strong>Deliverable:</strong> 3 prompt libraries with 15 sample images.</p>" }
        ]
    },
    {
        id: "M9", num: 9, title: "Video Prompt Engineering",
        phase: null,
        lessons: [
            { id: "L9_1", num: 1, dur: "16:00", title: "Veo 3, Runway Gen-3, Kling, Pika & Luma Dream Machine", content: "<h3>AI Video Generation Platforms</h3><p>Explore the leading AI video platforms: Google Veo 3 (most realistic), Runway Gen-3 Alpha (professional-grade), Kling AI (motion quality), Pika 2.0 (creative effects), and Luma Dream Machine (smooth motion).</p>" },
            { id: "L9_2", num: 2, dur: "18:00", title: "Camera Motion, Cinematic Language, Scene Control & Storytelling", content: "<h3>Video Prompt Craft</h3><p>Master cinematic prompting: camera motion vocabulary (dolly, pan, tilt, orbit, zoom), cinematic language (establishing shot, close-up, cutaway), scene control, character consistency across frames, and video storytelling structure.</p>" },
            { id: "L9_3", num: 3, dur: "30:00", title: "🛠 Project: AI Product Advertisement", content: "<h3>Project: AI Product Advertisement Video</h3><p>Create a complete AI-generated product advertisement from concept to final render: script writing, storyboard (image prompts), video clip generation, voiceover scripting, and final assembly.</p><p><strong>Deliverable:</strong> A 30-60 second AI-generated product advertisement with full prompt library.</p>" }
        ]
    },
    {
        id: "M10", num: 10, title: "Retrieval-Augmented Generation (RAG)",
        phase: "🔵 Phase 5 — Enterprise AI",
        lessons: [
            { id: "L10_1", num: 1, dur: "20:00", title: "What is RAG? Chunking, Embeddings & Vector Databases", content: "<h3>RAG Fundamentals</h3><p>Learn how Retrieval-Augmented Generation supercharges LLMs with external knowledge. Understand chunking (splitting documents), text embeddings (converting text to vectors), and vector databases: Qdrant, Chroma, Pinecone, FAISS.</p>" },
            { id: "L10_2", num: 2, dur: "18:00", title: "Semantic Search, Retrieval Pipeline, Re-ranking & Hybrid Search", content: "<h3>RAG Pipeline Architecture</h3><p>Build a complete RAG retrieval pipeline with semantic search, intelligent re-ranking, context injection prompting, and hybrid search (keyword + semantic) for maximum accuracy.</p>" },
            { id: "L10_3", num: 3, dur: "35:00", title: "🛠 Project: Legal AI Assistant", content: "<h3>Project: Legal AI Assistant</h3><p>Build a RAG-powered Legal AI Assistant that answers complex legal questions from uploaded contracts and policy documents. Includes document upload pipeline, embedding storage, semantic search, and source citations.</p><p><strong>Deliverable:</strong> A deployed Legal AI Q&A system with clean UI and full prompt library.</p>" }
        ]
    },
    {
        id: "M11", num: 11, title: "AI Agents",
        phase: null,
        lessons: [
            { id: "L11_1", num: 1, dur: "18:00", title: "AI Agents, Multi-Agent Systems, Memory & Planning", content: "<h3>AI Agents Fundamentals</h3><p>Understand what AI Agents truly are: autonomous systems that reason, plan, use tools, and take actions to complete complex goals. Learn multi-agent collaboration, agent memory types (short-term, long-term, episodic), planning, and tool use.</p>" },
            { id: "L11_2", num: 2, dur: "20:00", title: "LangGraph, CrewAI, AutoGen & OpenAI Agents SDK", content: "<h3>Agent Frameworks</h3><p>Get hands-on with the four most important agent frameworks: LangGraph (stateful DAG workflows), CrewAI (role-based multi-agent crews), AutoGen (conversational multi-agent by Microsoft), and OpenAI Agents SDK (official tool-using agents).</p>" },
            { id: "L11_3", num: 3, dur: "35:00", title: "🛠 Project: Prompt Intelligence Agent", content: "<h3>Project: Prompt Intelligence Agent</h3><p>Build a 5-agent system: Analyzer Agent (understands intent), Critic Agent (finds weaknesses), Optimizer Agent (rewrites and improves), Scorer Agent (rates on 5 dimensions), and Formatter Agent (clean JSON output).</p><p><strong>Deliverable:</strong> A deployed multi-agent prompt optimization system.</p>" }
        ]
    },
    {
        id: "M12", num: 12, title: "AI Automation",
        phase: null,
        lessons: [
            { id: "L12_1", num: 1, dur: "18:00", title: "n8n, Make (Integromat) & Zapier AI Automation", content: "<h3>No-Code AI Automation</h3><p>Build production-ready AI automation workflows using n8n (open-source, most powerful), Make (visual workflow builder), and Zapier (simplest, largest app library) — no coding required.</p>" },
            { id: "L12_2", num: 2, dur: "16:00", title: "Google Sheets, Gmail, Slack, WhatsApp & APIs", content: "<h3>Integration Automation</h3><p>Connect AI to your daily business tools: Google Sheets (AI-powered data enrichment), Gmail (automated email generation), Slack (AI productivity bot), WhatsApp (customer-facing AI), and custom APIs with webhooks.</p>" },
            { id: "L12_3", num: 3, dur: "35:00", title: "🛠 Project: AI Workflow Builder", content: "<h3>Project: End-to-End AI Workflow</h3><p>Build a complete automated workflow: new lead triggers AI enrichment, AI generates personalized outreach, email sends via Gmail, Google Sheet updates, and Slack notifies the team.</p><p><strong>Deliverable:</strong> A live, running automation workflow that processes real leads end-to-end.</p>" }
        ]
    },
    {
        id: "M13", num: 13, title: "LLM Application Development",
        phase: "🟣 Phase 6 — AI Application Development",
        lessons: [
            { id: "L13_1", num: 1, dur: "20:00", title: "OpenAI API, Claude API & Gemini API", content: "<h3>The Three Major LLM APIs</h3><p>Learn to authenticate and call OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), and Google (Gemini 2.0). Implement real-time streaming for live chat experiences.</p><ul><li>OpenAI API: setup, chat completions, streaming</li><li>Claude API: messages format, system prompts, vision</li><li>Gemini API: multimodal, function calling</li><li>Streaming: real-time response display</li></ul>" },
            { id: "L13_2", num: 2, dur: "18:00", title: "Function Calling, Structured Outputs, Authentication & Rate Limits", content: "<h3>Production API Patterns</h3><p>Master production-ready patterns: function calling, guaranteed JSON structured outputs, secure API key authentication, error handling with retries, and intelligent rate limit management.</p>" },
            { id: "L13_3", num: 3, dur: "40:00", title: "🛠 Project: AI SaaS Application", content: "<h3>Project: Build and Deploy an AI SaaS App</h3><p>Build a complete AI SaaS application with User Authentication, AI Content Generator (blog posts, emails, social media), AI Data Analyzer (upload CSV, ask questions), Usage Tracking, and a beautiful responsive UI. Then deploy it live.</p><p><strong>Deliverable:</strong> A live deployed AI SaaS product at a public URL.</p>" }
        ]
    },
    {
        id: "M14", num: 14, title: "Prompt Optimization",
        phase: null,
        lessons: [
            { id: "L14_1", num: 1, dur: "16:00", title: "Prompt Evaluation, Hallucination Reduction & Compression", content: "<h3>Prompt Quality Engineering</h3><p>Learn systematic approaches to evaluate prompt quality (G-Eval, RAGAS), reliably reduce AI hallucinations through grounding and citations, and compress prompts for maximum efficiency.</p>" },
            { id: "L14_2", num: 2, dur: "16:00", title: "Latency, Cost, A/B Testing & Benchmarking", content: "<h3>AI Performance Optimization</h3><p>Optimize AI systems for real-world performance: reduce latency (model selection, streaming, caching), cut costs (compression, model tiering, batching), run A/B tests with statistical significance, and benchmark improvements over time.</p>" },
            { id: "L14_3", num: 3, dur: "30:00", title: "🛠 Project: Prompt Optimizer Tool", content: "<h3>Project: Automated Prompt Optimizer</h3><p>Build a tool that scores any prompt on 5 metrics (Clarity, Specificity, Completeness, Safety, Efficiency) and returns an improved version with a detailed scorecard.</p><p><strong>Deliverable:</strong> A deployed Prompt Optimizer with a web UI and API endpoint.</p>" }
        ]
    },
    {
        id: "M15", num: 15, title: "AI Safety & Security",
        phase: null,
        lessons: [
            { id: "L15_1", num: 1, dur: "18:00", title: "Prompt Injection, Jailbreaks & Prompt Leakage", content: "<h3>AI Security Threats</h3><p>Understand the major security threats targeting AI systems: how prompt injection attacks work (direct and indirect), how jailbreaks bypass safety systems (DAN, roleplay, encoding), and how system prompts get leaked.</p>" },
            { id: "L15_2", num: 2, dur: "16:00", title: "Data Privacy, AI Governance & Secure Prompt Design", content: "<h3>Secure AI System Design</h3><p>Design AI systems with enterprise-grade security: PII protection (GDPR compliance), AI governance frameworks, defense-in-depth prompt design patterns, and model security best practices.</p>" },
            { id: "L15_3", num: 3, dur: "30:00", title: "🛠 Project: AI Prompt Firewall", content: "<h3>Project: AI Prompt Firewall</h3><p>Build a production-ready Prompt Firewall middleware: injection detection (pattern matching + AI classification), jailbreak pattern library, PII scrubbing, policy enforcement, and full audit logging.</p><p><strong>Deliverable:</strong> A deployable prompt security middleware package.</p>" }
        ]
    },
    {
        id: "M16", num: 16, title: "Enterprise Prompt Engineering",
        phase: "🔴 Phase 7 — Production & Deployment",
        lessons: [
            { id: "L16_1", num: 1, dur: "16:00", title: "Prompt Versioning, Libraries & Analytics", content: "<h3>Enterprise Prompt Management</h3><p>Learn how the best AI teams manage prompts at scale: versioning systems (Git for prompts), centralized prompt libraries and registries, analytics dashboards for usage and cost tracking, and team collaboration workflows with roles and approvals.</p>" },
            { id: "L16_2", num: 2, dur: "18:00", title: "CI/CD for Prompts, Evaluation Pipelines & Production Deployment", content: "<h3>Production AI DevOps</h3><p>Apply DevOps practices to prompt engineering: automated testing pipelines (CI/CD for every prompt change), evaluation pipelines for benchmarking, production monitoring (quality, cost, latency dashboards), and deployment strategies (canary, blue-green, feature flags).</p>" },
            { id: "L16_3", num: 3, dur: "40:00", title: "🛠 Project: Enterprise Prompt Management System", content: "<h3>Project: Enterprise Prompt Management System</h3><p>Build a complete platform: Prompt Editor with version history, Test Suite (run prompts against test cases), Analytics Dashboard, Team Workspace with roles and comments, programmatic API, and GitHub Actions CI/CD integration.</p><p><strong>Deliverable:</strong> A deployed, production-ready prompt management platform.</p>" }
        ]
    },
    {
        id: "M17", num: 17, title: "Capstone — Build Prompt Bazaar",
        phase: null,
        lessons: [
            { id: "L17_1", num: 1, dur: "25:00", title: "Capstone Phase 1: Prompt Marketplace, Enhancer & Optimizer", content: "<h3>Capstone Phase 1</h3><p>Apply everything from all 16 modules to build your Prompt Bazaar: a Prompt Marketplace (discover and sell prompts), Prompt Enhancer (auto-improve any prompt), Prompt Optimizer (score and optimize), and Prompt Validator (verify safety and quality).</p>" },
            { id: "L17_2", num: 2, dur: "30:00", title: "Capstone Phase 2: AI Portfolio, Course Generator & Multi-Agent System", content: "<h3>Capstone Phase 2</h3><p>Build the advanced features: Prompt Intelligence Agent (multi-agent autonomous improvement), AI Portfolio Builder (generate a portfolio from your work), AI Course Generator (create courses on any topic), Multi-Agent Orchestration System, and Prompt Analytics Dashboard.</p>" },
            { id: "L17_3", num: 3, dur: "20:00", title: "🎓 Final Submission & Professional Certificate", content: "<h3>Final Submission and Graduation</h3><p>Submit your complete Prompt Bazaar: live deployed URL, clean GitHub repo, 5-minute portfolio presentation video, and a reflection document.</p><p><strong>Upon successful completion, you receive your Prompt Engineering Professional Certificate — verifiable, shareable, and recognised by top AI companies worldwide.</strong></p>" }
        ]
    }
];
