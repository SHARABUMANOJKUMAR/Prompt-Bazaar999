/**
 * Prompt Enhancer Pro - Rule-based AI Prompt Enhancement Engine
 * Runs 100% on the client. No external APIs used.
 */

const PromptEnhancerEngine = (function() {
    
    // --- Rule Definitions ---
    const INTENT_RULES = [
        { intent: 'Coding / Technical', keywords: ['code', 'python', 'javascript', 'html', 'css', 'react', 'debug', 'script', 'function', 'api', 'database', 'sql'] },
        { intent: 'Creative Writing', keywords: ['story', 'poem', 'blog', 'article', 'essay', 'write', 'creative', 'character', 'plot'] },
        { intent: 'Marketing / Copywriting', keywords: ['seo', 'marketing', 'sales', 'ad', 'facebook', 'instagram', 'tweet', 'copy', 'landing page', 'conversion'] },
        { intent: 'Image Generation', keywords: ['midjourney', 'dall-e', 'generate image', 'photo', 'illustration', '4k', '8k', 'unreal engine', 'realistic'] },
        { intent: 'Business / Professional', keywords: ['resume', 'cover letter', 'email', 'proposal', 'business plan', 'professional', 'report'] }
    ];

    const ROLE_SUGGESTIONS = {
        'Coding / Technical': 'Senior Software Engineer and System Architect',
        'Creative Writing': 'Expert Content Writer and Storyteller',
        'Marketing / Copywriting': 'Direct Response Copywriter and SEO Specialist',
        'Image Generation': 'Professional Digital Artist and Prompt Engineer',
        'Business / Professional': 'Executive Business Consultant',
        'General': 'Expert AI Assistant'
    };

    const MODEL_RECOMMENDATIONS = {
        'Coding / Technical': ['Claude 3.5 Sonnet', 'GPT-4o', 'DeepSeek Coder'],
        'Creative Writing': ['Claude 3 Opus', 'Gemini 1.5 Pro', 'Llama 3'],
        'Marketing / Copywriting': ['GPT-4o', 'Claude 3.5 Sonnet'],
        'Image Generation': ['Midjourney v6', 'DALL-E 3', 'Stable Diffusion 3'],
        'Business / Professional': ['GPT-4o', 'Claude 3.5 Sonnet'],
        'General': ['GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro']
    };

    // Helper to detect if a specific section/constraint exists
    const hasPattern = (text, regex) => regex.test(text);

    function detectIntent(text) {
        let textLower = text.toLowerCase();
        let scores = {};
        
        INTENT_RULES.forEach(rule => {
            scores[rule.intent] = 0;
            rule.keywords.forEach(kw => {
                if (textLower.includes(kw)) {
                    scores[rule.intent]++;
                }
            });
        });

        let highestIntent = 'General';
        let highestScore = 0;
        
        for (let [intent, score] of Object.entries(scores)) {
            if (score > highestScore) {
                highestScore = score;
                highestIntent = intent;
            }
        }
        
        return highestIntent;
    }

    function calculateScore(text) {
        let metrics = {
            clarity: 50,
            context: 20,
            structure: 20,
            specificity: 30,
            actionability: 40
        };

        const wordCount = text.trim().split(/\s+/).length;
        const lowerText = text.toLowerCase();

        // 1. Clarity (Word count balance, neither too short nor too long)
        if (wordCount > 15 && wordCount < 300) metrics.clarity += 40;
        else if (wordCount >= 300) metrics.clarity += 20;
        
        // 2. Context (Does it provide background?)
        if (hasPattern(lowerText, /(context:|background:|given that|assuming|in the context of)/)) metrics.context += 50;
        if (wordCount > 40) metrics.context += 30; // Implicit context by length

        // 3. Structure (Does it use formatting?)
        if (hasPattern(text, /\n-/g) || hasPattern(text, /\n\d+\./g)) metrics.structure += 40;
        if (hasPattern(lowerText, /(output format|format:|structure:|json|table|markdown)/)) metrics.structure += 40;

        // 4. Specificity (Clear constraints?)
        if (hasPattern(lowerText, /(tone:|role:|act as|style:|constraints:|must|should not|strictly)/)) metrics.specificity += 50;
        if (hasPattern(lowerText, /(max|min|words|paragraphs|characters|limit)/)) metrics.specificity += 20;

        // 5. Actionability (Clear verbs)
        if (hasPattern(lowerText, /^(write|create|generate|explain|analyze|summarize|code|build|design)/)) metrics.actionability += 40;
        if (hasPattern(lowerText, /(objective:|task:|goal:)/)) metrics.actionability += 20;

        // Cap all at 100
        for (let key in metrics) {
            metrics[key] = Math.min(100, Math.max(0, metrics[key]));
        }

        metrics.overall = Math.round((metrics.clarity + metrics.context + metrics.structure + metrics.specificity + metrics.actionability) / 5);

        return metrics;
    }

    function enhance(text) {
        if (!text || text.trim() === '') {
            return null;
        }

        const originalText = text.trim();
        const lowerText = originalText.toLowerCase();
        
        // Analysis
        const intent = detectIntent(originalText);
        const score = calculateScore(originalText);
        
        let changes = [];
        let missingContext = [];
        let structure = {
            Role: null,
            Objective: null,
            Context: null,
            Constraints: [],
            Tone: null,
            Format: null
        };

        // 1. Role
        if (hasPattern(lowerText, /(act as|you are a|role:)/)) {
            structure.Role = "Retained original role.";
        } else {
            structure.Role = ROLE_SUGGESTIONS[intent];
            changes.push("Added an expert persona/role to improve response quality.");
            missingContext.push("Persona/Role");
        }

        // 2. Objective
        // The original prompt is usually the main objective
        structure.Objective = originalText;
        
        // 3. Context
        if (score.context < 50) {
            structure.Context = `[Optional: Provide any background information, source material, or specific details the AI needs to know here]`;
            changes.push("Added a placeholder for missing background context.");
            missingContext.push("Background Context");
        } else {
            structure.Context = "Context provided in original prompt.";
        }

        // 4. Constraints & Tone
        if (!hasPattern(lowerText, /(tone:|style:|voice:)/)) {
            const toneMap = {
                'Coding / Technical': 'Analytical, precise, and highly technical.',
                'Creative Writing': 'Engaging, vivid, and highly creative.',
                'Marketing / Copywriting': 'Persuasive, compelling, and action-oriented.',
                'Business / Professional': 'Professional, concise, and formal.',
                'Image Generation': 'Descriptive and visually detailed.',
                'General': 'Clear, helpful, and concise.'
            };
            structure.Tone = toneMap[intent];
            changes.push("Defined a specific tone matching your intent.");
            missingContext.push("Tone/Style");
        }

        if (!hasPattern(lowerText, /(format|markdown|json|table|list)/)) {
            if (intent === 'Coding / Technical') structure.Format = "Well-commented code blocks with brief explanations.";
            else if (intent === 'Business / Professional') structure.Format = "Structured format using Markdown headings and bullet points.";
            else structure.Format = "Clear, structured Markdown format.";
            
            changes.push("Specified a structured output format.");
            missingContext.push("Output Format");
        }

        // Assemble Enhanced Prompt
        let enhancedText = '';
        
        if (structure.Role && structure.Role !== "Retained original role.") {
            enhancedText += `**Role:** Act as a ${structure.Role}.\n\n`;
        }

        enhancedText += `**Objective:**\n${structure.Objective}\n\n`;
        
        if (structure.Context && structure.Context.startsWith('[')) {
            enhancedText += `**Context:**\n${structure.Context}\n\n`;
        }

        let rules = [];
        if (structure.Tone) rules.push(`- **Tone/Style:** ${structure.Tone}`);
        if (structure.Format) rules.push(`- **Output Format:** ${structure.Format}`);
        
        if (rules.length > 0) {
            enhancedText += `**Constraints & Guidelines:**\n${rules.join('\n')}\n`;
        }

        // Clean up
        if (changes.length === 0) {
            changes.push("Prompt was already well-structured. Minor formatting applied.");
        }

        return {
            original: originalText,
            enhanced: enhancedText.trim(),
            score: score,
            changes: changes,
            detectedIntent: intent,
            missingContext: missingContext,
            recommendedModels: MODEL_RECOMMENDATIONS[intent]
        };
    }

    return {
        enhance: enhance,
        detectIntent: detectIntent,
        calculateScore: calculateScore
    };
})();

// Export to global scope
window.PromptEnhancerEngine = PromptEnhancerEngine;
