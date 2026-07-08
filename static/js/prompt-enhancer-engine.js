/* ============================================================================
   PROMPT BAZAAR — V7 MULTI-AGENT API CLIENT
   Thin frontend client that calls the V7 backend pipeline.
   ============================================================================ */
'use strict';
(function () {

  /* ══════════════════════════════════════════════════════════════════════════
     LOCAL UTILITIES — Stats and lightweight preview detection
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Compute character, word, and estimated token counts locally.
   * Runs in the browser — no API call needed.
   */
  function getStats(text) {
    if (!text) return { chars: 0, words: 0, tokens: 0 };
    var words = text.trim().split(/\s+/).filter(Boolean);
    return { chars: text.length, words: words.length, tokens: Math.ceil(words.length * 1.33) };
  }

  /**
   * Lightweight local intent detection for the real-time preview badges.
   * This does NOT use ML — it's a quick heuristic for UX responsiveness.
   * The real ML classification happens server-side in Agent 2.
   */
  function detectIntent(text) {
    var t = (text || '').toLowerCase().trim();
    var words = t.split(/\s+/).filter(Boolean);
    var wc = words.length;

    var primaryIntent = 'Create & Build';
    if (/\b(write|draft|compose|generate|create)\b/.test(t)) primaryIntent = 'Create & Produce';
    else if (/\b(analyze|review|audit|evaluate|assess)\b/.test(t)) primaryIntent = 'Analyze & Audit';
    else if (/\b(fix|debug|resolve|troubleshoot|repair)\b/.test(t)) primaryIntent = 'Fix & Debug';
    else if (/\b(optimize|improve|refactor|enhance)\b/.test(t)) primaryIntent = 'Optimize & Improve';
    else if (/\b(plan|strategy|roadmap|architect|design)\b/.test(t)) primaryIntent = 'Plan & Architect';
    else if (/\b(research|investigate|study|explore)\b/.test(t)) primaryIntent = 'Research & Explore';
    else if (/\b(summarize|condense|brief|tldr)\b/.test(t)) primaryIntent = 'Summarize & Condense';
    else if (/\b(teach|explain|tutorial|learn)\b/.test(t)) primaryIntent = 'Teach & Explain';

    var complexity = wc < 6 ? 'Underspecified' : (wc > 30 ? 'Enterprise' : 'Standard');

    return { primary_intent: primaryIntent, complexity: complexity };
  }

  /**
   * Lightweight local domain detection for the real-time preview badges.
   * This does NOT use ML — it's a quick heuristic for UX responsiveness.
   * The real ML classification happens server-side in Agent 3.
   */
  function detectDomains(text) {
    var t = (text || '').toLowerCase();
    var signals = {
      'Restaurant': ['restaurant', 'cafe', 'bistro', 'dining', 'menu', 'chef', 'food', 'cuisine', 'reservation', 'bakery'],
      'Programming': ['code', 'programming', 'python', 'javascript', 'react', 'api', 'database', 'backend', 'frontend', 'software'],
      'Marketing': ['marketing', 'seo', 'campaign', 'brand', 'advertising', 'social media', 'content', 'growth'],
      'Healthcare': ['health', 'medical', 'hospital', 'patient', 'doctor', 'clinic', 'hipaa', 'telemedicine'],
      'Education': ['education', 'learning', 'school', 'student', 'teacher', 'course', 'lms', 'curriculum'],
      'Finance': ['finance', 'fintech', 'bank', 'trading', 'payment', 'investment', 'crypto'],
      'Legal': ['legal', 'law', 'compliance', 'contract', 'gdpr', 'privacy'],
      'Cloud': ['cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'serverless', 'devops'],
      'Cybersecurity': ['security', 'cybersecurity', 'encryption', 'owasp', 'firewall', 'penetration'],
      'DataScience': ['data science', 'analytics', 'dataset', 'visualization', 'etl', 'statistics'],
      'MachineLearning': ['machine learning', 'ml', 'deep learning', 'neural network', 'pytorch', 'tensorflow'],
      'ImageGeneration': ['image', 'midjourney', 'dall-e', 'stable diffusion', 'artwork', 'illustration'],
      'VideoGeneration': ['video', 'runway', 'sora', 'animation', 'footage'],
      'Writing': ['write', 'blog', 'article', 'essay', 'copywriting', 'content writing'],
      'Resume': ['resume', 'cv', 'cover letter', 'job application', 'linkedin'],
      'AIAgents': ['agent', 'ai agent', 'langchain', 'crewai', 'autonomous', 'tool calling'],
      'Business': ['business', 'strategy', 'startup', 'management', 'ecommerce']
    };

    var results = [];
    for (var domain in signals) {
      var score = 0;
      signals[domain].forEach(function(sig) {
        if (t.includes(sig)) score += (sig.includes(' ') ? 3 : 1);
      });
      if (score > 0) results.push({ domain: domain, confidence: Math.min(99, 70 + score * 5) });
    }

    results.sort(function(a, b) { return b.confidence - a.confidence; });
    if (results.length === 0) results.push({ domain: 'Business', confidence: 70 });
    return results.slice(0, 4);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     V7 API CLIENT — Async call to the backend multi-agent pipeline
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Call the V7 backend API to enhance the user's prompt.
   * This is an async function that returns a Promise.
   *
   * @param {string} input - The user's raw input text.
   * @returns {Promise<object>} - The V7 response: { enhanced, insights, raw, normalized }
   */
  async function enhance(input) {
    if (!input || !input.trim()) return null;

    try {
      var response = await fetch('/api/v7/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() })
      });

      if (!response.ok) {
        var errorData = await response.json().catch(function() { return {}; });
        console.error('[V7 Engine] API error:', response.status, errorData);
        return null;
      }

      return await response.json();

    } catch (error) {
      console.error('[V7 Engine] Network error:', error);
      return null;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     PUBLIC API — Exposed on window.PromptEnhancerEngine
     ══════════════════════════════════════════════════════════════════════════ */

  window.PromptEnhancerEngine = {
    enhance: enhance,
    getStats: getStats,
    detectIntent: detectIntent,
    detectDomains: detectDomains,
    version: '7.0.0',
    architecture: 'Multi-Agent Pipeline (7 Agents)',
  };

})();
