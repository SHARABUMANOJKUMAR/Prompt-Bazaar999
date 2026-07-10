/* ============================================================
   PROMPT BAZAAR LABS — tools.js
   All 15 tools, grid router, sidebar, toast, and utilities.
   Everything runs 100% client-side. No external APIs.
   ============================================================ */

(function () {
  'use strict';

  // ── Utility Functions ────────────────────────────────────────
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function showToast(msg, type) {
    type = type || 'success';
    const c = $('#toolsToastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'tools-toast ' + type;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(function () { t.classList.add('fade-out'); }, 2200);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function copyText(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      showToast('Copied to clipboard!', 'success');
    }).catch(function () {
      showToast('Copy failed', 'error');
    });
  }

  function downloadFile(filename, content, mime) {
    mime = mime || 'text/plain';
    var blob = new Blob([content], { type: mime });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Downloaded ' + filename, 'info');
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  function readingTime(text) {
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    var mins = Math.ceil(words / 200);
    return mins < 1 ? '< 1 min' : mins + ' min';
  }

  function speakingTime(text) {
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    var mins = Math.ceil(words / 130);
    return mins < 1 ? '< 1 min' : mins + ' min';
  }

  // ── Tool Registry ───────────────────────────────────────────
  var TOOLS = [
    { id:'prompt-enhancer', name:'Prompt Enhancer Pro', desc:'Premium rule-based prompt enhancement engine.', icon:'🚀', cat:'prompt', tag:'Premium' },
    { id:'prompt-formatter', name:'Prompt Formatter', desc:'Clean, format, and beautify your AI prompts.', icon:'📝', cat:'prompt', tag:'Prompt' },
    { id:'ai-prompt-wizard', name:'AI Prompt Wizard', desc:'Create professional AI prompts in less than 30 seconds without writing prompts yourself.', icon:'✨', cat:'prompt', tag:'Prompt' },
    { id:'prompt-json-converter', name:'Prompt to JSON Converter', desc:'Convert text prompts to JSON and vice-versa.', icon:'🔄', cat:'prompt', tag:'Prompt' },
    { id:'token-estimator', name:'Token Estimator', desc:'Estimate GPT tokens, reading & speaking time.', icon:'🔢', cat:'prompt', tag:'Prompt' },
    { id:'portfolio-builder', name:'Portfolio Builder Pro', desc:'Build a stunning, ATS-friendly portfolio website in minutes — no code required. Choose themes, upload projects, and get a live URL.', icon:'💼', cat:'prompt', tag:'New' },
    { id:'json-formatter', name:'JSON Formatter', desc:'Beautify, minify, and validate JSON with line numbers.', icon:'{ }', cat:'dev', tag:'Developer' },
    { id:'regex-tester', name:'Regex Tester', desc:'Test regex patterns with live match highlighting.', icon:'.*', cat:'dev', tag:'Developer' },
    { id:'base64', name:'Base64 Encoder/Decoder', desc:'Encode and decode Base64 strings and files.', icon:'🔐', cat:'dev', tag:'Developer' },
    { id:'uuid-generator', name:'UUID Generator', desc:'Generate UUID v4 identifiers in bulk.', icon:'🆔', cat:'dev', tag:'Developer' },
    { id:'markdown-editor', name:'Markdown Editor', desc:'Write markdown with live preview and toolbar.', icon:'📄', cat:'text', tag:'Text' },
    { id:'text-compare', name:'Text Compare', desc:'Compare two texts side-by-side with diff highlighting.', icon:'⚖️', cat:'text', tag:'Text' },
    { id:'text-case', name:'Text Case Converter', desc:'Convert text between 9 different casing styles.', icon:'Aa', cat:'text', tag:'Text' },
    { id:'color-palette', name:'Color Palette', desc:'Generate, preview, and save color palettes.', icon:'🎨', cat:'design', tag:'Design' },
    { id:'qr-studio', name:'QR Studio', desc:'Create professional QR Codes that work everywhere.', icon:'📱', cat:'design', tag:'Design' },
    { id:'password-studio', name:'Password Studio', desc:'Premium password generation wizard with intelligent transformations.', icon:'🔐', cat:'security', tag:'Security' }
  ];

  var CATEGORIES = [
    { id:'prompt', label:'Prompt Tools', icon:'📝' },
    { id:'dev', label:'Developer Tools', icon:'💻' },
    { id:'text', label:'Text Tools', icon:'✍️' },
    { id:'design', label:'Design Tools', icon:'🎨' },
    { id:'security', label:'Security Tools', icon:'🔒' }
  ];

  // ── Sidebar Logic ───────────────────────────────────────────
  function initSidebar() {
    var btn = $('#menuToggleBtn');
    var drawer = $('#sidebarDrawer');
    var overlay = $('#sidebarOverlay');
    var closeBtn = $('#sidebarCloseBtn');
    if (!btn || !drawer) return;

    function open() { drawer.classList.add('open'); if (overlay) overlay.classList.add('open'); }
    function close() { drawer.classList.remove('open'); if (overlay) overlay.classList.remove('open'); }

    btn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  // ── Grid Rendering ──────────────────────────────────────────
  var currentFilter = 'all';
  var currentSearch = '';

  function renderGrid() {
    var container = $('#toolsGridContainer');
    if (!container) return;
    var filtered = TOOLS.filter(function (t) {
      var matchCat = currentFilter === 'all' || t.cat === currentFilter;
      var matchSearch = !currentSearch || t.name.toLowerCase().indexOf(currentSearch) !== -1 || t.desc.toLowerCase().indexOf(currentSearch) !== -1;
      return matchCat && matchSearch;
    });

    var catMap = {};
    filtered.forEach(function (t) {
      if (!catMap[t.cat]) catMap[t.cat] = [];
      catMap[t.cat].push(t);
    });

    var html = '';
    CATEGORIES.forEach(function (cat) {
      var tools = catMap[cat.id];
      if (!tools || tools.length === 0) return;
      html += '<div class="tools-category-section">';
      html += '<div class="tools-category-header">';
      html += '<span class="tools-category-icon">' + cat.icon + '</span>';
      html += '<span class="tools-category-title">' + cat.label + '</span>';
      html += '<span class="tools-category-count">' + tools.length + ' tool' + (tools.length > 1 ? 's' : '') + '</span>';
      html += '</div>';
      html += '<div class="tools-grid">';
      tools.forEach(function (t) {
        html += '<div class="tool-card" data-tool="' + t.id + '">';
        html += '<div class="tool-card-icon ' + t.cat + '">' + t.icon + '</div>';
        html += '<div class="tool-card-title">' + t.name + '</div>';
        html += '<div class="tool-card-desc">' + t.desc + '</div>';
        html += '<span class="tool-card-tag">' + t.tag + '</span>';
        html += '</div>';
      });
      html += '</div></div>';
    });

    if (!html) {
      html = '<div style="text-align:center;padding:48px;color:#94A3B8;font-size:1rem;">No tools found matching your search.</div>';
    }
    container.innerHTML = html;

    $$('.tool-card', container).forEach(function (card) {
      card.addEventListener('click', function () {
        openTool(card.getAttribute('data-tool'));
      });
    });
  }

  function openTool(id) {
    var hero = $('#toolsHero');
    var controls = $('#toolsControls');
    var grid = $('#toolsGridContainer');
    var view = $('#toolView');
    if (hero) hero.style.display = 'none';
    if (controls) controls.style.display = 'none';
    if (grid) grid.style.display = 'none';
    if (view) { view.style.display = 'block'; view.innerHTML = ''; }
    var renderer = TOOL_RENDERERS[id];
    if (renderer) renderer(view);
  }

  function closeTool() {
    var hero = $('#toolsHero');
    var controls = $('#toolsControls');
    var grid = $('#toolsGridContainer');
    var view = $('#toolView');
    if (hero) hero.style.display = '';
    if (controls) controls.style.display = '';
    if (grid) grid.style.display = '';
    if (view) { view.style.display = 'none'; view.innerHTML = ''; }
  }

  function makeBackBtn() {
    return '<button class="tool-back-btn" onclick="window.__closeTool()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg> Back to Tools</button>';
  }
  window.__closeTool = closeTool;

  // ── Chips & Search ──────────────────────────────────────────
  function initControls() {
    $$('.tools-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        $$('.tools-chip').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        currentFilter = chip.getAttribute('data-category');
        renderGrid();
      });
    });

    var searchInput = $('#toolsSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(function () {
        currentSearch = searchInput.value.trim().toLowerCase();
        renderGrid();
      }, 200));
    }
  }

  // ── TOOL RENDERERS ──────────────────────────────────────────
  var TOOL_RENDERERS = {};

  // 1. Prompt Formatter
  TOOL_RENDERERS['prompt-formatter'] = function (el) {
    el.innerHTML = makeBackBtn() +
      '<div class="tool-header"><h2>📝 Prompt Formatter</h2><p>Clean, format, and beautify your AI prompts instantly.</p></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Input Prompt</span></div>' +
      '<textarea class="tool-textarea" id="pfInput" placeholder="Paste your prompt here..."></textarea>' +
      '<div class="tool-actions">' +
      '<button class="tool-btn primary" id="pfFormat">✨ Format</button>' +
      '<button class="tool-btn" id="pfCopy">📋 Copy</button>' +
      '<button class="tool-btn" id="pfDownload">💾 Download TXT</button>' +
      '<button class="tool-btn danger" id="pfReset">🗑 Reset</button>' +
      '</div></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Output</span></div>' +
      '<textarea class="tool-textarea" id="pfOutput" placeholder="Formatted prompt will appear here..." readonly></textarea></div>' +
      '<div class="tool-stats" id="pfStats"></div>';

    var inp = $('#pfInput'); var out = $('#pfOutput');
    function updateStats() {
      var text = inp.value;
      var chars = text.length;
      var words = text.trim() ? text.trim().split(/\s+/).length : 0;
      var tokens = estimateTokens(text);
      var rt = readingTime(text);
      $('#pfStats').innerHTML =
        '<div class="tool-stat"><div class="tool-stat-value">' + chars + '</div><div class="tool-stat-label">Characters</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value">' + words + '</div><div class="tool-stat-label">Words</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value">~' + tokens + '</div><div class="tool-stat-label">Tokens</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value">' + rt + '</div><div class="tool-stat-label">Read Time</div></div>';
    }
    inp.addEventListener('input', updateStats);
    updateStats();

    $('#pfFormat').addEventListener('click', function () {
      var t = inp.value;
      t = t.replace(/[ \t]+/g, ' ');
      t = t.replace(/\n{3,}/g, '\n\n');
      t = t.replace(/^\s+|\s+$/gm, '');
      var lines = t.split('\n');
      var result = [];
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.match(/^(\d+[\.\)]\s|[-*]\s)/)) {
          result.push('  ' + line);
        } else {
          result.push(line);
        }
      }
      out.value = result.join('\n').trim();
      showToast('Prompt formatted!', 'success');
    });
    $('#pfCopy').addEventListener('click', function () { copyText(out.value || inp.value); });
    $('#pfDownload').addEventListener('click', function () { downloadFile('prompt.txt', out.value || inp.value); });
    $('#pfReset').addEventListener('click', function () { inp.value = ''; out.value = ''; updateStats(); showToast('Reset!', 'info'); });
  };

  // 2. AI Prompt Wizard
  TOOL_RENDERERS['ai-prompt-wizard'] = function (el) {
    var state = {
      step: 1,
      type: '',
      industry: '',
      businessName: '',
      audience: '',
      goal: '',
      product: '',
      country: '',
      language: 'English',
      personality: '',
      usp: '',
      platform: '',
      limit: '',
      style: '',
      length: 'Detailed',
      model: 'ChatGPT',
      format: 'Paragraph',
      beginnerMode: true,
      advanced: false
    };

    var TYPES = [
      { id: 'Instagram Caption', icon: '📸' }, { id: 'Facebook Ad', icon: '👥' },
      { id: 'LinkedIn Post', icon: '💼' }, { id: 'YouTube Script', icon: '▶️' },
      { id: 'Blog Article', icon: '📝' }, { id: 'Email', icon: '📧' },
      { id: 'Resume', icon: '📄' }, { id: 'Cover Letter', icon: '✉️' },
      { id: 'Business Plan', icon: '📊' }, { id: 'Sales Copy', icon: '💰' },
      { id: 'Product Description', icon: '🛍️' }, { id: 'SEO Article', icon: '🔍' },
      { id: 'Chatbot Prompt', icon: '🤖' }, { id: 'Customer Support', icon: '🎧' },
      { id: 'Custom Prompt', icon: '✨' }
    ];

    var INDUSTRIES = [
      'Restaurant', 'Hospital', 'Education', 'Software', 'Real Estate', 'Finance',
      'Marketing', 'Gym', 'Salon', 'Travel', 'Hotel', 'Automobile', 'Law', 'Construction',
      'Fashion', 'Ecommerce', 'Healthcare', 'Custom'
    ];

    var STYLES = [
      'Professional', 'Luxury', 'Friendly', 'Funny', 'Emotional', 'Persuasive',
      'Minimal', 'Storytelling', 'Corporate', 'Technical', 'Creative'
    ];

    function updateScore() {
      var score = 0;
      var total = 5;
      if (state.type) score++;
      if (state.industry) score++;
      if (state.businessName || state.goal) score++;
      if (state.style) score++;
      if (state.length) score++;
      var pct = Math.round((score / total) * 100);
      
      var sHtml = '<div class="prompt-score-container">' +
        '<div class="prompt-score-box">' +
        '<div class="score-val ' + (pct === 100 ? 'excellent' : 'good') + '">' + pct + '%</div>' +
        '<div class="score-label">Completeness</div></div>' +
        '<div class="prompt-score-box">' +
        '<div class="score-val ' + (pct === 100 ? 'excellent' : 'good') + '">' + (pct === 100 ? 'High' : (pct > 50 ? 'Medium' : 'Low')) + '</div>' +
        '<div class="score-label">Est. Quality</div></div>' +
        '</div>';
      $('#pwScore').innerHTML = sHtml;
    }

    function generatePrompt() {
      var p = [];
      if (state.type) p.push('Act as an expert in ' + (state.industry || 'this field') + '.');
      if (state.type) p.push('Create a professional ' + state.type + (state.businessName ? ' for ' + state.businessName : '') + '.');
      if (state.audience) p.push('The target audience is ' + state.audience + '.');
      if (state.goal) p.push('The main goal is to ' + state.goal + '.');
      if (state.product) p.push('The core product or service is ' + state.product + '.');
      if (state.country) p.push('Target market/country: ' + state.country + '.');
      if (state.language) p.push('Write entirely in ' + state.language + '.');
      if (state.personality) p.push('Brand personality should be ' + state.personality + '.');
      if (state.usp) p.push('Highlight this unique selling point: ' + state.usp + '.');
      if (state.platform) p.push('This is intended for ' + state.platform + '.');
      if (state.style) p.push('Use a ' + state.style + ' tone and writing style.');
      if (state.limit) p.push('Ensure the output is strictly ' + state.limit + '.');
      
      p.push('Make it ' + (state.length || 'detailed') + ' and highly engaging.');
      if (state.format !== 'Paragraph') p.push('Format the output as ' + state.format + '.');
      p.push('Output only the final ' + (state.type ? state.type.toLowerCase() : 'content') + ' without any filler text.');

      var finalStr = p.length > 2 ? p.join('\n') : 'Fill out the wizard to generate your prompt...';
      
      // Syntax highlighting simulation
      var highlighted = escapeHtml(finalStr)
        .replace(/(Act as an expert|Create a professional|target audience is|main goal is|Write entirely in|Use a|Format the output as)/g, '<span class="highlight">$1</span>');
      
      $('#pwPreviewText').innerHTML = highlighted;
      updateScore();
      return finalStr;
    }

    function renderStep() {
      var html = '';
      if (state.step === 1) {
        html += '<h3>What do you want to create?</h3><div class="wizard-grid">';
        TYPES.forEach(function(t) {
          html += '<div class="wizard-card ' + (state.type === t.id ? 'active' : '') + '" data-type="type" data-val="' + t.id + '">' +
            '<div class="wizard-card-icon">' + t.icon + '</div>' +
            '<div class="wizard-card-label">' + t.id + '</div></div>';
        });
        html += '</div>';
      } else if (state.step === 2) {
        html += '<h3>Choose Industry</h3><div class="wizard-grid">';
        INDUSTRIES.forEach(function(ind) {
          html += '<div class="wizard-card ' + (state.industry === ind ? 'active' : '') + '" data-type="industry" data-val="' + ind + '">' +
            '<div class="wizard-card-label" style="margin-top:10px;">' + ind + '</div></div>';
        });
        html += '</div>';
      } else if (state.step === 3) {
        html += '<h3>Business Details</h3>' +
          '<div class="' + (state.beginnerMode ? 'beginner-mode-active' : '') + '">' +
          '<div class="wizard-form-group"><label>Business Name</label><input class="tool-input" id="pwBiz" value="' + state.businessName + '" placeholder="e.g. Prompt Bazaar"><div class="wizard-helper">Example: Manoj Wheels</div></div>' +
          '<div class="wizard-form-group"><label>Main Goal</label><input class="tool-input" id="pwGoal" value="' + state.goal + '" placeholder="e.g. Increase sales"><div class="wizard-helper">Example: Increase Sales, Get Leads</div></div>' +
          '<div class="wizard-form-group"><label>Target Audience</label><input class="tool-input" id="pwAudience" value="' + state.audience + '" placeholder="e.g. Software Developers"><div class="wizard-helper">Example: Car Owners, Students</div></div>' +
          '<div class="wizard-form-group"><label>Language</label><input class="tool-input" id="pwLang" value="' + state.language + '" placeholder="e.g. English"><div class="wizard-helper">Example: English, Spanish, Hindi</div></div>' +
          '</div>';
      } else if (state.step === 4) {
        html += '<h3>Choose Writing Style</h3><div class="wizard-grid">';
        STYLES.forEach(function(s) {
          html += '<div class="wizard-card ' + (state.style === s ? 'active' : '') + '" data-type="style" data-val="' + s + '">' +
            '<div class="wizard-card-label" style="margin-top:10px;">' + s + '</div></div>';
        });
        html += '</div>';
      } else if (state.step === 5) {
        html += '<h3>Prompt Settings</h3>' +
          '<div class="wizard-form-group"><label>Length</label><select class="tool-input" id="pwLength"><option>Short</option><option>Medium</option><option selected>Detailed</option></select></div>' +
          '<div class="wizard-form-group"><label>Output Format</label><select class="tool-input" id="pwFormat"><option selected>Paragraph</option><option>Bullet Points</option><option>Table</option><option>Markdown</option><option>JSON</option></select></div>' +
          '<div class="wizard-form-group"><label>Target AI Model</label><select class="tool-input" id="pwModel"><option selected>ChatGPT</option><option>Claude</option><option>Gemini</option><option>DeepSeek</option></select></div>';
      }

      var stepHTML = '<div class="wizard-progress"><div class="wizard-progress-bar" style="width:' + ((state.step-1)/4 * 100) + '%;"></div>';
      for(var i=1; i<=5; i++) {
        var cls = '';
        if (i < state.step) cls = 'completed';
        else if (i === state.step) cls = 'active';
        stepHTML += '<div class="wizard-step-node ' + cls + '"><div class="wizard-step-circle">' + (i < state.step ? '✓' : i) + '</div><div class="wizard-step-label">Step ' + i + '</div></div>';
      }
      stepHTML += '</div>';

      var buttonsHTML = '<div class="tool-actions" style="margin-top:24px;">' +
        (state.step > 1 ? '<button class="tool-btn" id="pwPrev">← Back</button>' : '<div></div>') +
        (state.step < 5 ? '<button class="tool-btn primary" id="pwNext">Next Step →</button>' : '<button class="tool-btn primary" id="pwFinish">Finish 🎉</button>') +
        '</div>';

      $('#pwStepContainer').innerHTML = stepHTML + html + buttonsHTML;

      // Bind events for this step
      if ($('#pwNext')) $('#pwNext').addEventListener('click', function() { state.step++; renderStep(); });
      if ($('#pwPrev')) $('#pwPrev').addEventListener('click', function() { state.step--; renderStep(); });
      if ($('#pwFinish')) $('#pwFinish').addEventListener('click', function() { showToast('Prompt complete! Copy from the preview panel.', 'success'); });

      $$('.wizard-card').forEach(function(c) {
        c.addEventListener('click', function() {
          var type = c.getAttribute('data-type');
          var val = c.getAttribute('data-val');
          state[type] = val;
          renderStep();
          generatePrompt();
        });
      });

      if (state.step === 3) {
        ['pwBiz', 'pwGoal', 'pwAudience', 'pwLang'].forEach(function(id) {
          var el = $('#' + id);
          if (el) {
            el.addEventListener('input', function() {
              if (id === 'pwBiz') state.businessName = this.value;
              if (id === 'pwGoal') state.goal = this.value;
              if (id === 'pwAudience') state.audience = this.value;
              if (id === 'pwLang') state.language = this.value;
              generatePrompt();
            });
          }
        });
      }

      if (state.step === 5) {
        ['pwLength', 'pwFormat', 'pwModel'].forEach(function(id) {
          var el = $('#' + id);
          if (el) {
            el.addEventListener('change', function() {
              if (id === 'pwLength') state.length = this.value;
              if (id === 'pwFormat') state.format = this.value;
              if (id === 'pwModel') state.model = this.value;
              generatePrompt();
            });
          }
        });
      }
      generatePrompt();
    }

    el.innerHTML = makeBackBtn() +
      '<div class="tool-header" style="margin-bottom:24px;"><h2>✨ AI Prompt Wizard</h2><p>Create professional AI prompts in less than 30 seconds without writing prompts yourself.</p></div>' +
      '<div class="wizard-layout">' +
      '<div class="wizard-main">' +
      '<div class="tool-panel" id="pwStepContainer" style="padding:32px 24px;"></div>' +
      '</div>' +
      '<div class="wizard-preview-panel">' +
      '<div id="pwScore"></div>' +
      '<div style="font-weight:700;margin-bottom:12px;font-size:0.9rem;">Live Preview</div>' +
      '<div class="live-preview-box" id="pwPreviewText"></div>' +
      '<div class="preview-actions"><button class="tool-btn primary" style="width:100%;justify-content:center;" id="pwCopy">📋 Copy Prompt</button></div>' +
      '</div>' +
      '</div>';

    renderStep();

    $('#pwCopy').addEventListener('click', function() {
      copyText(generatePrompt());
    });
  };

  // 3. Prompt to JSON Converter
  TOOL_RENDERERS['prompt-json-converter'] = function (el) {
    el.innerHTML = makeBackBtn() +
      '<div class="tool-header"><h2>🔄 Prompt to JSON Converter</h2><p>Convert text prompts into structured JSON, or paste JSON to reconstruct the prompt.</p></div>' +
      '<div class="tool-split">' +
      '<div class="tool-panel"><div class="tool-panel-title" style="margin-bottom:10px;">Text Prompt</div><textarea class="tool-textarea" id="pjText" placeholder="Paste your text prompt here..." style="min-height:300px;"></textarea></div>' +
      '<div class="tool-panel"><div class="tool-panel-title" style="margin-bottom:10px;">JSON Format</div><textarea class="tool-textarea" id="pjJson" placeholder="JSON structure will appear here..." style="min-height:300px;"></textarea></div>' +
      '</div>' +
      '<div class="tool-actions" style="margin-bottom:20px;">' +
      '<button class="tool-btn primary" id="pjToJson">Text ➔ JSON</button>' +
      '<button class="tool-btn primary" id="pjToText">JSON ➔ Text</button>' +
      '<button class="tool-btn" id="pjCopy">📋 Copy Output</button>' +
      '<button class="tool-btn danger" id="pjClear">🗑 Clear</button>' +
      '</div>';

    $('#pjToJson').addEventListener('click', function () {
      var text = $('#pjText').value.trim();
      if (!text) { showToast('Enter text prompt first', 'error'); return; }
      var parts = text.split('\n\n').filter(Boolean);
      var json = { prompt: text, sections: parts, length: text.length };
      $('#pjJson').value = JSON.stringify(json, null, 2);
      showToast('Converted to JSON!', 'success');
    });

    $('#pjToText').addEventListener('click', function () {
      var jsonStr = $('#pjJson').value.trim();
      if (!jsonStr) { showToast('Enter JSON first', 'error'); return; }
      try {
        var obj = JSON.parse(jsonStr);
        if (obj.prompt) {
          $('#pjText').value = obj.prompt;
        } else if (obj.sections) {
          $('#pjText').value = obj.sections.join('\n\n');
        } else {
          $('#pjText').value = JSON.stringify(obj, null, 2);
        }
        showToast('Converted to Text!', 'success');
      } catch(e) {
        showToast('Invalid JSON structure', 'error');
      }
    });

    $('#pjCopy').addEventListener('click', function () { 
      var jsonF = $('#pjJson').value;
      var textF = $('#pjText').value;
      copyText(jsonF || textF); 
    });
    $('#pjClear').addEventListener('click', function () { 
      $('#pjText').value = ''; $('#pjJson').value = ''; showToast('Cleared', 'info'); 
    });
  };

  // 5. Token Estimator
  TOOL_RENDERERS['token-estimator'] = function (el) {
    el.innerHTML = makeBackBtn() +
      '<div class="tool-header"><h2>🔢 AI Token Estimator</h2><p>Estimate tokens, characters, words, and more in real time.</p></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Input Text</span></div>' +
      '<textarea class="tool-textarea" id="teInput" placeholder="Paste or type text to analyze..."></textarea></div>' +
      '<div class="tool-stats" id="teStats"></div>';

    function update() {
      var text = $('#teInput').value;
      var chars = text.length;
      var words = text.trim() ? text.trim().split(/\s+/).length : 0;
      var lines = text ? text.split('\n').length : 0;
      var paragraphs = text.trim() ? text.trim().split(/\n\s*\n/).length : 0;
      var tokens = estimateTokens(text);
      var rt = readingTime(text);
      var st = speakingTime(text);
      $('#teStats').innerHTML =
        '<div class="tool-stat"><div class="tool-stat-value">' + chars + '</div><div class="tool-stat-label">Characters</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value">' + words + '</div><div class="tool-stat-label">Words</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value">' + lines + '</div><div class="tool-stat-label">Lines</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value">' + paragraphs + '</div><div class="tool-stat-label">Paragraphs</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value">~' + tokens + '</div><div class="tool-stat-label">GPT Tokens</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value">' + rt + '</div><div class="tool-stat-label">Reading</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value">' + st + '</div><div class="tool-stat-label">Speaking</div></div>';
    }
    $('#teInput').addEventListener('input', update);
    update();
  };

  // 6. JSON Formatter
  TOOL_RENDERERS['json-formatter'] = function (el) {
    el.innerHTML = makeBackBtn() +
      '<div class="tool-header"><h2>{ } JSON Formatter</h2><p>Beautify, minify, and validate JSON with error highlighting.</p></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Input</span></div>' +
      '<textarea class="tool-textarea" id="jfInput" placeholder=\'Paste JSON here...\' style="min-height:200px;"></textarea>' +
      '<div class="tool-actions">' +
      '<button class="tool-btn primary" id="jfBeautify">✨ Beautify</button>' +
      '<button class="tool-btn" id="jfMinify">📦 Minify</button>' +
      '<button class="tool-btn" id="jfValidate">✅ Validate</button>' +
      '<button class="tool-btn" id="jfCopy">📋 Copy</button>' +
      '<button class="tool-btn" id="jfDownload">💾 Download</button>' +
      '</div></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Output</span></div>' +
      '<div id="jfOutput" style="background:var(--color-bg-main);border:1px solid var(--color-border);border-radius:12px;overflow:auto;max-height:400px;"></div>' +
      '<div id="jfError" style="color:#EF4444;font-size:0.84rem;margin-top:8px;display:none;"></div></div>';

    function showOutput(json) {
      var lines = json.split('\n');
      var nums = lines.map(function (_, i) { return i + 1; }).join('\n');
      $('#jfOutput').innerHTML = '<div class="json-line-numbers"><div class="json-line-nums">' + escapeHtml(nums) + '</div><div class="json-code">' + escapeHtml(json) + '</div></div>';
      $('#jfError').style.display = 'none';
    }
    function showError(msg) {
      $('#jfError').textContent = msg;
      $('#jfError').style.display = 'block';
    }

    $('#jfBeautify').addEventListener('click', function () {
      try {
        var obj = JSON.parse($('#jfInput').value);
        var out = JSON.stringify(obj, null, 2);
        $('#jfInput').value = out;
        showOutput(out);
        showToast('Beautified!', 'success');
      } catch (e) { showError('Invalid JSON: ' + e.message); showToast('Invalid JSON', 'error'); }
    });
    $('#jfMinify').addEventListener('click', function () {
      try {
        var obj = JSON.parse($('#jfInput').value);
        var out = JSON.stringify(obj);
        $('#jfInput').value = out;
        showOutput(out);
        showToast('Minified!', 'success');
      } catch (e) { showError('Invalid JSON: ' + e.message); showToast('Invalid JSON', 'error'); }
    });
    $('#jfValidate').addEventListener('click', function () {
      try {
        JSON.parse($('#jfInput').value);
        showError('');
        $('#jfError').style.display = 'none';
        showToast('Valid JSON ✅', 'success');
      } catch (e) { showError('Invalid JSON: ' + e.message); showToast('Invalid JSON', 'error'); }
    });
    $('#jfCopy').addEventListener('click', function () { copyText($('#jfInput').value); });
    $('#jfDownload').addEventListener('click', function () { downloadFile('data.json', $('#jfInput').value, 'application/json'); });
  };

  // 7. Regex Tester
  TOOL_RENDERERS['regex-tester'] = function (el) {
    el.innerHTML = makeBackBtn() +
      '<div class="tool-header"><h2>.* Regex Tester</h2><p>Test regular expressions with live match highlighting.</p></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Pattern</span></div>' +
      '<input class="tool-input" id="rxPattern" placeholder="Enter regex pattern..." style="margin-bottom:8px;">' +
      '<div class="tool-options">' +
      '<label class="tool-option"><input type="checkbox" id="rxGlobal" checked> Global (g)</label>' +
      '<label class="tool-option"><input type="checkbox" id="rxCase"> Case Insensitive (i)</label>' +
      '<label class="tool-option"><input type="checkbox" id="rxMulti"> Multiline (m)</label>' +
      '</div></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Test String</span></div>' +
      '<textarea class="tool-textarea" id="rxInput" placeholder="Enter text to test against..."></textarea></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Matches</span><span id="rxCount" style="font-size:0.82rem;color:var(--color-primary);">0 matches</span></div>' +
      '<div id="rxResult" style="font-family:monospace;font-size:0.88rem;line-height:1.8;word-break:break-all;"></div>' +
      '<div class="tool-actions"><button class="tool-btn" id="rxCopy">📋 Copy Matches</button></div></div>';

    function test() {
      var pattern = $('#rxPattern').value;
      var text = $('#rxInput').value;
      if (!pattern || !text) { $('#rxResult').innerHTML = '<span style="color:#94A3B8;">Enter pattern and text above.</span>'; $('#rxCount').textContent = '0 matches'; return; }
      var flags = '';
      if ($('#rxGlobal').checked) flags += 'g';
      if ($('#rxCase').checked) flags += 'i';
      if ($('#rxMulti').checked) flags += 'm';
      try {
        var rx = new RegExp(pattern, flags);
        var matches = text.match(rx);
        var count = matches ? matches.length : 0;
        $('#rxCount').textContent = count + ' match' + (count !== 1 ? 'es' : '');
        var result = [];
        var lastIdx = 0;
        var rx2 = new RegExp(pattern, flags);
        var match;
        var maxMatches = 5000;
        var iterations = 0;
        
        while ((match = rx2.exec(text)) !== null && iterations++ < maxMatches) {
          result.push(escapeHtml(text.slice(lastIdx, match.index)));
          var mText = match[0] ? escapeHtml(match[0]) : '<span style="opacity:0.5;font-size:0.8em;">[empty]</span>';
          result.push('<span class="regex-highlight" style="background:rgba(13,110,253,0.25);border-radius:4px;padding:2px 4px;font-weight:700;box-shadow:0 0 0 1px rgba(13,110,253,0.3);color:var(--color-primary);">' + mText + '</span>');
          lastIdx = match.index + match[0].length;
          if (!rx2.global) break;
          if (match[0].length === 0) rx2.lastIndex++;
        }
        result.push(escapeHtml(text.slice(lastIdx)));
        $('#rxResult').innerHTML = result.join('');
      } catch (e) {
        $('#rxResult').innerHTML = '<span style="color:#EF4444;">' + escapeHtml(e.message) + '</span>';
        $('#rxCount').textContent = 'Error';
      }
    }

    $('#rxPattern').addEventListener('input', test);
    $('#rxInput').addEventListener('input', test);
    $('#rxGlobal').addEventListener('change', test);
    $('#rxCase').addEventListener('change', test);
    $('#rxMulti').addEventListener('change', test);
    $('#rxCopy').addEventListener('click', function () {
      var pattern = $('#rxPattern').value;
      var text = $('#rxInput').value;
      if (!pattern || !text) return;
      try {
        var flags = '';
        if ($('#rxGlobal').checked) flags += 'g';
        if ($('#rxCase').checked) flags += 'i';
        if ($('#rxMulti').checked) flags += 'm';
        var matches = text.match(new RegExp(pattern, flags));
        copyText(matches ? matches.join('\n') : '');
      } catch (e) { showToast('Invalid regex', 'error'); }
    });
  };

  // 8. Base64
  TOOL_RENDERERS['base64'] = function (el) {
    el.innerHTML = makeBackBtn() +
      '<div class="tool-header"><h2>🔐 Base64 Encoder / Decoder</h2><p>Encode and decode Base64 strings instantly.</p></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Input</span></div>' +
      '<textarea class="tool-textarea" id="b64Input" placeholder="Enter text or Base64 string..."></textarea>' +
      '<div class="tool-actions">' +
      '<button class="tool-btn primary" id="b64Encode">🔒 Encode</button>' +
      '<button class="tool-btn primary" id="b64Decode">🔓 Decode</button>' +
      '<button class="tool-btn" id="b64Copy">📋 Copy</button>' +
      '<button class="tool-btn" id="b64Download">💾 Download</button>' +
      '<button class="tool-btn danger" id="b64Clear">🗑 Clear</button>' +
      '</div></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Output</span></div>' +
      '<textarea class="tool-textarea" id="b64Output" placeholder="Result will appear here..." readonly></textarea></div>';

    $('#b64Encode').addEventListener('click', function () {
      try { $('#b64Output').value = btoa(unescape(encodeURIComponent($('#b64Input').value))); showToast('Encoded!', 'success'); }
      catch (e) { showToast('Encoding failed', 'error'); }
    });
    $('#b64Decode').addEventListener('click', function () {
      try { $('#b64Output').value = decodeURIComponent(escape(atob($('#b64Input').value.trim()))); showToast('Decoded!', 'success'); }
      catch (e) { showToast('Invalid Base64 string', 'error'); }
    });
    $('#b64Copy').addEventListener('click', function () { copyText($('#b64Output').value); });
    $('#b64Download').addEventListener('click', function () { downloadFile('base64-result.txt', $('#b64Output').value); });
    $('#b64Clear').addEventListener('click', function () { $('#b64Input').value = ''; $('#b64Output').value = ''; showToast('Cleared!', 'info'); });
  };

  // 9. UUID Generator
  TOOL_RENDERERS['uuid-generator'] = function (el) {
    function uuidv4() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    }

    el.innerHTML = makeBackBtn() +
      '<div class="tool-header"><h2>🆔 UUID Generator</h2><p>Generate UUID v4 identifiers in bulk.</p></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Generate</span></div>' +
      '<div class="tool-actions" style="margin-top:0;">' +
      '<button class="tool-btn primary" data-count="1">1 UUID</button>' +
      '<button class="tool-btn primary" data-count="10">10 UUIDs</button>' +
      '<button class="tool-btn primary" data-count="100">100 UUIDs</button>' +
      '<button class="tool-btn primary" data-count="1000">1000 UUIDs</button>' +
      '</div></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Output</span><span id="uuidCount" style="font-size:0.82rem;color:var(--color-primary);">0 UUIDs</span></div>' +
      '<textarea class="tool-textarea" id="uuidOutput" readonly style="min-height:250px;"></textarea>' +
      '<div class="tool-actions">' +
      '<button class="tool-btn" id="uuidCopy">📋 Copy All</button>' +
      '<button class="tool-btn" id="uuidDownload">💾 Download TXT</button>' +
      '</div></div>';

    $$('[data-count]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var n = parseInt(btn.getAttribute('data-count'));
        var uuids = [];
        for (var i = 0; i < n; i++) uuids.push(uuidv4());
        $('#uuidOutput').value = uuids.join('\n');
        $('#uuidCount').textContent = n + ' UUID' + (n > 1 ? 's' : '');
        showToast('Generated ' + n + ' UUID' + (n > 1 ? 's' : '') + '!', 'success');
      });
    });

    $('#uuidCopy').addEventListener('click', function () { copyText($('#uuidOutput').value); });
    $('#uuidDownload').addEventListener('click', function () { downloadFile('uuids.txt', $('#uuidOutput').value); });
  };

  // 10. Markdown Editor
  TOOL_RENDERERS['markdown-editor'] = function (el) {
    function parseMd(md) {
      var html = md;
      // Code blocks
      html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (m, lang, code) {
        return '<pre><code>' + escapeHtml(code) + '</code></pre>';
      });
      // Inline code
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      // Headings
      html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
      html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
      html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
      // Bold & Italic
      html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
      // Blockquote
      html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
      // Links & Images
      html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      // Unordered list
      html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
      // Ordered list
      html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
      // Horizontal rule
      html = html.replace(/^---$/gm, '<hr>');
      // Paragraphs
      html = html.replace(/^(?!<[a-z])((?!$).+)$/gm, '<p>$1</p>');
      // Tables
      html = html.replace(/^\|(.+)\|$/gm, function (m, row) {
        var cells = row.split('|').map(function (c) { return c.trim(); });
        if (cells.every(function (c) { return /^[-:]+$/.test(c); })) return '';
        var tag = 'td';
        return '<tr>' + cells.map(function (c) { return '<' + tag + '>' + c + '</' + tag + '>'; }).join('') + '</tr>';
      });
      html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>');
      return html;
    }

    el.innerHTML = makeBackBtn() +
      '<div class="tool-header"><h2>📄 Markdown Editor</h2><p>Write markdown with a live preview and formatting toolbar.</p></div>' +
      '<div class="md-toolbar" id="mdToolbar">' +
      '<button data-md="bold" title="Bold (Ctrl+B)"><b>B</b></button>' +
      '<button data-md="italic" title="Italic (Ctrl+I)"><em>I</em></button>' +
      '<button data-md="h1" title="Heading 1">H1</button>' +
      '<button data-md="h2" title="Heading 2">H2</button>' +
      '<button data-md="h3" title="Heading 3">H3</button>' +
      '<button data-md="ul" title="Unordered List">• List</button>' +
      '<button data-md="ol" title="Ordered List">1. List</button>' +
      '<button data-md="quote" title="Blockquote">" Quote</button>' +
      '<button data-md="code" title="Code Block">{ } Code</button>' +
      '<button data-md="link" title="Link">🔗 Link</button>' +
      '<button data-md="img" title="Image">🖼 Image</button>' +
      '<button data-md="table" title="Table">📊 Table</button>' +
      '<button data-md="hr" title="Horizontal Rule">— HR</button>' +
      '</div>' +
      '<div class="tool-split"><textarea class="tool-textarea" id="mdInput" placeholder="Write markdown here..." style="border-radius:0 0 0 12px;min-height:350px;"></textarea>' +
      '<div class="md-preview" id="mdPreview"></div></div>' +
      '<div class="tool-actions">' +
      '<button class="tool-btn" id="mdCopy">📋 Copy Markdown</button>' +
      '<button class="tool-btn" id="mdExport">💾 Export .md</button>' +
      '</div>';

    function update() { $('#mdPreview').innerHTML = parseMd($('#mdInput').value); }
    $('#mdInput').addEventListener('input', update);
    update();

    function insertMd(type) {
      var ta = $('#mdInput');
      var start = ta.selectionStart, end = ta.selectionEnd;
      var sel = ta.value.substring(start, end);
      var insert = '';
      switch (type) {
        case 'bold': insert = '**' + (sel || 'bold text') + '**'; break;
        case 'italic': insert = '*' + (sel || 'italic text') + '*'; break;
        case 'h1': insert = '\n# ' + (sel || 'Heading 1'); break;
        case 'h2': insert = '\n## ' + (sel || 'Heading 2'); break;
        case 'h3': insert = '\n### ' + (sel || 'Heading 3'); break;
        case 'ul': insert = '\n- ' + (sel || 'List item'); break;
        case 'ol': insert = '\n1. ' + (sel || 'List item'); break;
        case 'quote': insert = '\n> ' + (sel || 'Quote'); break;
        case 'code': insert = '\n```\n' + (sel || 'code') + '\n```'; break;
        case 'link': insert = '[' + (sel || 'text') + '](url)'; break;
        case 'img': insert = '![' + (sel || 'alt') + '](url)'; break;
        case 'table': insert = '\n| Header | Header |\n|--------|--------|\n| Cell   | Cell   |'; break;
        case 'hr': insert = '\n---'; break;
      }
      ta.value = ta.value.substring(0, start) + insert + ta.value.substring(end);
      ta.focus();
      update();
    }

    $$('#mdToolbar button').forEach(function (btn) {
      btn.addEventListener('click', function () { insertMd(btn.getAttribute('data-md')); });
    });

    $('#mdInput').addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.key === 'b') { e.preventDefault(); insertMd('bold'); }
      if (e.ctrlKey && e.key === 'i') { e.preventDefault(); insertMd('italic'); }
    });

    $('#mdCopy').addEventListener('click', function () { copyText($('#mdInput').value); });
    $('#mdExport').addEventListener('click', function () { downloadFile('document.md', $('#mdInput').value); });
  };

  // 11. Text Compare
  TOOL_RENDERERS['text-compare'] = function (el) {
    el.innerHTML = makeBackBtn() +
      '<div class="tool-header"><h2>⚖️ Text Compare Tool</h2><p>Compare two texts side-by-side and see differences.</p></div>' +
      '<div class="tool-split">' +
      '<div class="tool-panel"><div class="tool-panel-title" style="margin-bottom:10px;">Original Text</div><textarea class="tool-textarea" id="tcLeft" placeholder="Paste original text..."></textarea></div>' +
      '<div class="tool-panel"><div class="tool-panel-title" style="margin-bottom:10px;">Modified Text</div><textarea class="tool-textarea" id="tcRight" placeholder="Paste modified text..."></textarea></div>' +
      '</div>' +
      '<div class="tool-actions"><button class="tool-btn primary" id="tcCompare">⚖️ Compare</button></div>' +
      '<div class="tool-panel" id="tcResult" style="display:none;"><div class="tool-panel-header"><span class="tool-panel-title">Diff Result</span></div>' +
      '<div id="tcDiff" style="font-family:monospace;font-size:0.84rem;line-height:1.8;white-space:pre-wrap;"></div></div>' +
      '<div class="tool-stats" id="tcStats" style="display:none;"></div>';

    $('#tcCompare').addEventListener('click', function () {
      var left = $('#tcLeft').value.split('\n');
      var right = $('#tcRight').value.split('\n');
      var max = Math.max(left.length, right.length);
      var html = '';
      var additions = 0, removals = 0, unchanged = 0;

      for (var i = 0; i < max; i++) {
        var l = left[i] !== undefined ? left[i] : null;
        var r = right[i] !== undefined ? right[i] : null;
        if (l === r) {
          html += '<div>  ' + escapeHtml(l) + '</div>';
          unchanged++;
        } else {
          if (l !== null) { html += '<div class="diff-del">- ' + escapeHtml(l) + '</div>'; removals++; }
          if (r !== null) { html += '<div class="diff-add">+ ' + escapeHtml(r) + '</div>'; additions++; }
        }
      }

      var totalCharsL = $('#tcLeft').value.length;
      var totalCharsR = $('#tcRight').value.length;
      var wordsL = $('#tcLeft').value.trim() ? $('#tcLeft').value.trim().split(/\s+/).length : 0;
      var wordsR = $('#tcRight').value.trim() ? $('#tcRight').value.trim().split(/\s+/).length : 0;
      var similarity = max > 0 ? Math.round((unchanged / max) * 100) : 100;

      $('#tcResult').style.display = '';
      $('#tcDiff').innerHTML = html || '<span style="color:#22C55E;">Texts are identical!</span>';
      $('#tcStats').style.display = '';
      $('#tcStats').innerHTML =
        '<div class="tool-stat"><div class="tool-stat-value" style="color:#22C55E;">+' + additions + '</div><div class="tool-stat-label">Additions</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value" style="color:#EF4444;">-' + removals + '</div><div class="tool-stat-label">Removals</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value">' + totalCharsL + ' → ' + totalCharsR + '</div><div class="tool-stat-label">Characters</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value">' + wordsL + ' → ' + wordsR + '</div><div class="tool-stat-label">Words</div></div>' +
        '<div class="tool-stat"><div class="tool-stat-value">' + similarity + '%</div><div class="tool-stat-label">Similarity</div></div>';
      showToast('Comparison complete!', 'success');
    });
  };

  // 12. Text Case Converter
  TOOL_RENDERERS['text-case'] = function (el) {
    el.innerHTML = makeBackBtn() +
      '<div class="tool-header"><h2>Aa Text Case Converter</h2><p>Convert text between 9 different casing styles instantly.</p></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Input Text</span></div>' +
      '<textarea class="tool-textarea" id="tcaseInput" placeholder="Type or paste text here..."></textarea></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Choose Case</span></div>' +
      '<div class="tool-actions" style="margin-top:0;">' +
      '<button class="tool-btn" data-case="upper">UPPERCASE</button>' +
      '<button class="tool-btn" data-case="lower">lowercase</button>' +
      '<button class="tool-btn" data-case="title">Title Case</button>' +
      '<button class="tool-btn" data-case="sentence">Sentence case</button>' +
      '<button class="tool-btn" data-case="camel">camelCase</button>' +
      '<button class="tool-btn" data-case="pascal">PascalCase</button>' +
      '<button class="tool-btn" data-case="snake">snake_case</button>' +
      '<button class="tool-btn" data-case="kebab">kebab-case</button>' +
      '<button class="tool-btn" data-case="reverse">esreveR</button>' +
      '</div></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Output</span></div>' +
      '<textarea class="tool-textarea" id="tcaseOutput" readonly></textarea>' +
      '<div class="tool-actions"><button class="tool-btn" id="tcaseCopy">📋 Copy</button></div></div>';

    function getWords(text) { return text.trim().split(/[\s_\-]+/).filter(Boolean); }

    function convertCase(text, type) {
      var words = getWords(text);
      switch (type) {
        case 'upper': return text.toUpperCase();
        case 'lower': return text.toLowerCase();
        case 'title': return words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(' ');
        case 'sentence': return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        case 'camel': return words.map(function (w, i) { return i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join('');
        case 'pascal': return words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join('');
        case 'snake': return words.map(function (w) { return w.toLowerCase(); }).join('_');
        case 'kebab': return words.map(function (w) { return w.toLowerCase(); }).join('-');
        case 'reverse': return text.split('').reverse().join('');
        default: return text;
      }
    }

    $$('[data-case]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = $('#tcaseInput').value;
        if (!text) { showToast('Enter some text first', 'error'); return; }
        var result = convertCase(text, btn.getAttribute('data-case'));
        $('#tcaseOutput').value = result;
        showToast('Converted!', 'success');
      });
    });
    $('#tcaseCopy').addEventListener('click', function () { copyText($('#tcaseOutput').value); });
  };

  // 13. Color Palette Generator
  TOOL_RENDERERS['color-palette'] = function (el) {
    function randomHex() {
      return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }
    function hexToRgb(hex) {
      var r = parseInt(hex.slice(1, 3), 16);
      var g = parseInt(hex.slice(3, 5), 16);
      var b = parseInt(hex.slice(5, 7), 16);
      return 'rgb(' + r + ', ' + g + ', ' + b + ')';
    }
    function hexToHsl(hex) {
      var r = parseInt(hex.slice(1, 3), 16) / 255;
      var g = parseInt(hex.slice(3, 5), 16) / 255;
      var b = parseInt(hex.slice(5, 7), 16) / 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h, s, l = (max + min) / 2;
      if (max === min) { h = s = 0; } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
      }
      return 'hsl(' + Math.round(h * 360) + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%)';
    }
    function luminance(hex) {
      var r = parseInt(hex.slice(1, 3), 16) / 255;
      var g = parseInt(hex.slice(3, 5), 16) / 255;
      var b = parseInt(hex.slice(5, 7), 16) / 255;
      r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
      g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
      b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    function contrastRatio(hex1, hex2) {
      var l1 = luminance(hex1); var l2 = luminance(hex2);
      var lighter = Math.max(l1, l2); var darker = Math.min(l1, l2);
      return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
    }

    var palette = [];
    function generate() {
      palette = [];
      for (var i = 0; i < 5; i++) palette.push(randomHex());
      renderPalette();
    }

    function renderPalette() {
      var html = '<div class="color-swatch-grid" style="gap:16px;margin-bottom:16px;">';
      palette.forEach(function (hex, i) {
        html += '<div style="text-align:center;">' +
          '<div class="color-swatch" style="background:' + hex + ';width:80px;height:80px;" data-idx="' + i + '" title="Click to copy"></div>' +
          '<div class="color-swatch-label">' + hex + '</div>' +
          '<div style="font-size:0.68rem;color:#94A3B8;">' + hexToRgb(hex) + '</div>' +
          '<div style="font-size:0.68rem;color:#94A3B8;">' + hexToHsl(hex) + '</div>' +
          '</div>';
      });
      html += '</div>';

      // Contrast checker
      if (palette.length >= 2) {
        var cr = contrastRatio(palette[0], palette[1]);
        var pass = parseFloat(cr) >= 4.5;
        html += '<div style="font-size:0.84rem;margin-top:8px;"><strong>Contrast Ratio (1st vs 2nd):</strong> ' + cr + ':1 ' +
          '<span style="color:' + (pass ? '#22C55E' : '#EF4444') + ';">' + (pass ? '✅ AA Pass' : '❌ AA Fail') + '</span></div>';
      }

      $('#cpPalette').innerHTML = html;

      $$('.color-swatch').forEach(function (sw) {
        sw.addEventListener('click', function () {
          var idx = parseInt(sw.getAttribute('data-idx'));
          copyText(palette[idx]);
        });
      });
    }

    el.innerHTML = makeBackBtn() +
      '<div class="tool-header"><h2>🎨 Color Palette Generator</h2><p>Generate, preview, and copy beautiful color palettes.</p></div>' +
      '<div class="tool-panel"><div class="tool-panel-header"><span class="tool-panel-title">Palette</span></div>' +
      '<div id="cpPalette"></div>' +
      '<div class="tool-actions">' +
      '<button class="tool-btn primary" id="cpGenerate">🎲 Generate New Palette</button>' +
      '<button class="tool-btn" id="cpCopyAll">📋 Copy All HEX</button>' +
      '</div></div>';

    generate();

    $('#cpGenerate').addEventListener('click', function () { generate(); showToast('New palette generated!', 'success'); });
    $('#cpCopyAll').addEventListener('click', function () { copyText(palette.join('\n')); });
  };

  // 14. QR Studio
  TOOL_RENDERERS['qr-studio'] = function (el) {
    var state = {
      type: 'url', fgColor: '#000000', bgColor: '#ffffff', margin: 2, errorCorrection: 'M',
      inputs: {
        text: '', url: '', email: { to: '', sub: '', body: '' },
        phone: '', sms: { to: '', msg: '' }, wa: { to: '', msg: '' },
        wifi: { ssid: '', pass: '', enc: 'WPA', hidden: false },
        vcard: { fn: '', org: '', tel: '', email: '', url: '', title: '' },
        geo: { lat: '', lng: '' }, cal: { title: '', loc: '', desc: '', start: '', end: '' }
      },
      currentPayload: ''
    };
    var history = JSON.parse(localStorage.getItem('qrHistory') || '[]');
    var TYPES = [
      { id: 'url', icon: '🔗', name: 'URL' }, { id: 'text', icon: '📝', name: 'Text' },
      { id: 'email', icon: '📧', name: 'Email' }, { id: 'phone', icon: '📞', name: 'Phone' },
      { id: 'sms', icon: '💬', name: 'SMS' }, { id: 'wa', icon: '🟩', name: 'WhatsApp' },
      { id: 'wifi', icon: '📶', name: 'WiFi' }, { id: 'vcard', icon: '📇', name: 'Contact' },
      { id: 'geo', icon: '📍', name: 'Location' }, { id: 'cal', icon: '📅', name: 'Event' }
    ];

    function getPayload() {
      var t = state.type, i = state.inputs[t];
      if (t === 'text') return i || '';
      if (t === 'url') { var u = i.trim(); if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u; return u; }
      if (t === 'email') return i.to ? ('mailto:' + i.to + '?subject=' + encodeURIComponent(i.sub) + '&body=' + encodeURIComponent(i.body)) : '';
      if (t === 'phone') return i ? 'tel:' + i : '';
      if (t === 'sms') return i.to ? 'SMSTO:' + i.to + ':' + i.msg : '';
      if (t === 'wa') return i.to ? 'https://wa.me/' + i.to.replace(/\D/g,'') + '?text=' + encodeURIComponent(i.msg) : '';
      if (t === 'wifi') return i.ssid ? 'WIFI:T:' + i.enc + ';S:' + i.ssid + ';P:' + i.pass + ';' + (i.hidden ? 'H:true' : '') + ';;' : '';
      if (t === 'vcard') {
        if (!i.fn) return '';
        var vc = 'BEGIN:VCARD\nVERSION:3.0\nFN:' + i.fn + '\n';
        if (i.org) vc += 'ORG:' + i.org + '\n';
        if (i.title) vc += 'TITLE:' + i.title + '\n';
        if (i.tel) vc += 'TEL:' + i.tel + '\n';
        if (i.email) vc += 'EMAIL:' + i.email + '\n';
        if (i.url) vc += 'URL:' + i.url + '\n';
        vc += 'END:VCARD'; return vc;
      }
      if (t === 'geo') return (i.lat && i.lng) ? 'geo:' + i.lat + ',' + i.lng : '';
      if (t === 'cal') {
        if (!i.title || !i.start) return '';
        var ds = i.start.replace(/[-:]/g, '') + '00Z', de = i.end ? i.end.replace(/[-:]/g, '') + '00Z' : ds;
        return 'BEGIN:VEVENT\nSUMMARY:' + i.title + '\nLOCATION:' + i.loc + '\nDESCRIPTION:' + i.desc + '\nDTSTART:' + ds + '\nDTEND:' + de + '\nEND:VEVENT';
      }
      return '';
    }

    function renderFields() {
      var t = state.type, i = state.inputs[t];
      if (t === 'text') return '<div class="wizard-form-group"><label>Text Content</label><textarea class="tool-textarea" id="qr_text" rows="4">' + i + '</textarea></div>';
      if (t === 'url') return '<div class="wizard-form-group"><label>Website URL</label><input class="tool-input" id="qr_url" value="' + i + '" placeholder="google.com"></div>';
      if (t === 'email') return '<div class="wizard-form-group"><label>Email Address</label><input class="tool-input" id="qr_em_to" value="' + i.to + '" placeholder="name@example.com"></div><div class="wizard-form-group"><label>Subject</label><input class="tool-input" id="qr_em_sub" value="' + i.sub + '"></div><div class="wizard-form-group"><label>Body</label><textarea class="tool-textarea" id="qr_em_body">' + i.body + '</textarea></div>';
      if (t === 'phone') return '<div class="wizard-form-group"><label>Phone Number</label><input class="tool-input" id="qr_phone" value="' + i + '" placeholder="+1234567890"></div>';
      if (t === 'sms' || t === 'wa') return '<div class="wizard-form-group"><label>Phone Number</label><input class="tool-input" id="qr_' + t + '_to" value="' + i.to + '" placeholder="+1234567890"></div><div class="wizard-form-group"><label>Message</label><textarea class="tool-textarea" id="qr_' + t + '_msg">' + i.msg + '</textarea></div>';
      if (t === 'wifi') return '<div class="wizard-form-group"><label>Network Name (SSID)</label><input class="tool-input" id="qr_wi_ssid" value="' + i.ssid + '"></div><div class="wizard-form-group"><label>Password</label><input class="tool-input" id="qr_wi_pass" value="' + i.pass + '"></div><div class="wizard-form-group"><label>Encryption</label><select class="tool-input" id="qr_wi_enc"><option value="WPA" '+(i.enc==='WPA'?'selected':'')+'>WPA/WPA2</option><option value="WEP" '+(i.enc==='WEP'?'selected':'')+'>WEP</option><option value="nopass" '+(i.enc==='nopass'?'selected':'')+'>None</option></select></div><div class="wizard-form-group"><label><input type="checkbox" id="qr_wi_hid" '+(i.hidden?'checked':'')+'> Hidden Network</label></div>';
      if (t === 'vcard') return '<div class="wizard-form-group"><label>Full Name</label><input class="tool-input" id="qr_vc_fn" value="' + i.fn + '"></div><div class="wizard-form-group"><label>Organization</label><input class="tool-input" id="qr_vc_org" value="' + i.org + '"></div><div class="wizard-form-group"><label>Job Title</label><input class="tool-input" id="qr_vc_title" value="' + i.title + '"></div><div class="wizard-form-group"><label>Phone</label><input class="tool-input" id="qr_vc_tel" value="' + i.tel + '"></div><div class="wizard-form-group"><label>Email</label><input class="tool-input" id="qr_vc_email" value="' + i.email + '"></div><div class="wizard-form-group"><label>Website</label><input class="tool-input" id="qr_vc_url" value="' + i.url + '"></div>';
      if (t === 'geo') return '<div class="wizard-form-group"><label>Latitude</label><input type="number" step="any" class="tool-input" id="qr_geo_lat" value="' + i.lat + '"></div><div class="wizard-form-group"><label>Longitude</label><input type="number" step="any" class="tool-input" id="qr_geo_lng" value="' + i.lng + '"></div>';
      if (t === 'cal') return '<div class="wizard-form-group"><label>Event Title</label><input class="tool-input" id="qr_cal_title" value="' + i.title + '"></div><div class="wizard-form-group"><label>Location</label><input class="tool-input" id="qr_cal_loc" value="' + i.loc + '"></div><div class="wizard-form-group"><label>Start (YYYY-MM-DDTHH:MM)</label><input type="datetime-local" class="tool-input" id="qr_cal_start" value="' + i.start + '"></div><div class="wizard-form-group"><label>End</label><input type="datetime-local" class="tool-input" id="qr_cal_end" value="' + i.end + '"></div><div class="wizard-form-group"><label>Description</label><textarea class="tool-textarea" id="qr_cal_desc">' + i.desc + '</textarea></div>';
      return '';
    }

    function bindFields() {
      var t = state.type, i = state.inputs[t];
      function bindStr(id, key) { var e = $('#'+id); if(e) e.addEventListener('input', function() { if(typeof i === 'string') state.inputs[t] = this.value; else i[key] = this.value; generateLive(); }); }
      function bindChk(id, key) { var e = $('#'+id); if(e) e.addEventListener('change', function() { i[key] = this.checked; generateLive(); }); }
      
      if (t === 'text') bindStr('qr_text');
      if (t === 'url') bindStr('qr_url');
      if (t === 'email') { bindStr('qr_em_to', 'to'); bindStr('qr_em_sub', 'sub'); bindStr('qr_em_body', 'body'); }
      if (t === 'phone') bindStr('qr_phone');
      if (t === 'sms' || t === 'wa') { bindStr('qr_'+t+'_to', 'to'); bindStr('qr_'+t+'_msg', 'msg'); }
      if (t === 'wifi') { bindStr('qr_wi_ssid', 'ssid'); bindStr('qr_wi_pass', 'pass'); bindStr('qr_wi_enc', 'enc'); bindChk('qr_wi_hid', 'hidden'); }
      if (t === 'vcard') { bindStr('qr_vc_fn', 'fn'); bindStr('qr_vc_org', 'org'); bindStr('qr_vc_title', 'title'); bindStr('qr_vc_tel', 'tel'); bindStr('qr_vc_email', 'email'); bindStr('qr_vc_url', 'url'); }
      if (t === 'geo') { bindStr('qr_geo_lat', 'lat'); bindStr('qr_geo_lng', 'lng'); }
      if (t === 'cal') { bindStr('qr_cal_title', 'title'); bindStr('qr_cal_loc', 'loc'); bindStr('qr_cal_start', 'start'); bindStr('qr_cal_end', 'end'); bindStr('qr_cal_desc', 'desc'); }
    }

    function generateLive() {
      var payload = getPayload();
      state.currentPayload = payload;
      var canvas = $('#qrCanvas');
      var ctn = $('#qrContainer');
      var msg = $('#qrMessage');
      var pre = $('#qrPayloadPreview');
      pre.textContent = payload || 'Awaiting input...';

      if (!payload) {
        ctn.style.display = 'none';
        msg.style.display = 'block';
        return;
      }

      if (typeof QRCode === 'undefined') {
        msg.textContent = 'Loading QR library...';
        return;
      }

      ctn.style.display = 'block';
      msg.style.display = 'none';

      QRCode.toCanvas(canvas, payload, {
        width: 260, margin: state.margin,
        color: { dark: state.fgColor, light: state.bgColor },
        errorCorrectionLevel: state.errorCorrection
      }, function (err) {
        if (err) { ctn.style.display = 'none'; msg.style.display = 'block'; msg.textContent = 'Error generating QR code.'; }
      });
    }

    function renderUI() {
      var html = '<div class="tool-header" style="margin-bottom:24px;"><h2>📱 QR Studio</h2><p>Create professional, 100% compliant QR Codes that work everywhere.</p></div>' +
      '<div class="qr-layout"><div class="qr-main"><div class="tool-panel">' +
      '<div class="tool-panel-header"><span class="tool-panel-title">1. Select Data Type</span></div><div class="qr-grid">';
      TYPES.forEach(function(t) {
        html += '<div class="qr-type-btn ' + (state.type === t.id ? 'active' : '') + '" data-id="' + t.id + '"><div class="qr-type-icon">' + t.icon + '</div>' + t.name + '</div>';
      });
      html += '</div><div class="tool-panel-header"><span class="tool-panel-title">2. Enter Information</span></div>' +
      '<div id="qrFieldsContainer">' + renderFields() + '</div>' +
      '<div class="tool-panel-header" style="margin-top:24px;"><span class="tool-panel-title">3. Customization</span></div>' +
      '<div style="display:flex;gap:24px;flex-wrap:wrap;">' +
      '<div><label style="display:block;font-size:0.8rem;margin-bottom:6px;font-weight:600;">Foreground</label><div class="qr-color-picker"><input type="color" id="qrFg" value="' + state.fgColor + '"></div></div>' +
      '<div><label style="display:block;font-size:0.8rem;margin-bottom:6px;font-weight:600;">Background</label><div class="qr-color-picker"><input type="color" id="qrBg" value="' + state.bgColor + '"></div></div>' +
      '<div><label style="display:block;font-size:0.8rem;margin-bottom:6px;font-weight:600;">Error Correction</label><select class="tool-input" id="qrErr" style="width:100px;"><option value="L" '+(state.errorCorrection==='L'?'selected':'')+'>Low (7%)</option><option value="M" '+(state.errorCorrection==='M'?'selected':'')+'>Med (15%)</option><option value="Q" '+(state.errorCorrection==='Q'?'selected':'')+'>Quartile (25%)</option><option value="H" '+(state.errorCorrection==='H'?'selected':'')+'>High (30%)</option></select></div>' +
      '<div style="flex:1;min-width:150px;"><label style="display:block;font-size:0.8rem;margin-bottom:6px;font-weight:600;">Margin: <span id="qrMarVal">' + state.margin + '</span></label><input type="range" class="tool-input" id="qrMar" min="0" max="10" value="' + state.margin + '"></div>' +
      '</div></div></div>';

      html += '<div class="qr-side"><div class="ps-privacy-badge" style="margin-bottom:8px;">🔒 Generated entirely on-device</div>' +
      '<div style="font-size:0.9rem;font-weight:700;margin-bottom:16px;">Live Preview</div>' +
      '<div class="qr-canvas-container" id="qrContainer" style="display:none;"><canvas id="qrCanvas"></canvas></div>' +
      '<div class="qr-canvas-container" id="qrMessage" style="color:var(--color-text-muted,#94A3B8);font-size:0.9rem;text-align:center;">Enter data to generate QR</div>' +
      '<div style="font-size:0.8rem;font-weight:600;margin-bottom:6px;align-self:flex-start;">Encoded Payload:</div>' +
      '<div class="qr-payload-preview" id="qrPayloadPreview">Awaiting input...</div>' +
      '<div style="display:flex;gap:8px;width:100%;margin-bottom:24px;">' +
      '<button class="tool-btn primary" id="qrDownloadBtn" style="flex:1;">💾 PNG</button>' +
      '<button class="tool-btn" id="qrCopyImgBtn" style="flex:1;" title="Copy Image">📋 Image</button>' +
      '<button class="tool-btn" id="qrSaveHistBtn" style="flex:1;" title="Save to History">⭐ Save</button></div>' +
      '<div style="font-size:0.9rem;font-weight:700;margin-bottom:12px;align-self:flex-start;">Recent History</div><div id="qrHistoryList" style="width:100%;">';
      if (history.length === 0) html += '<div style="font-size:0.8rem;color:var(--color-text-muted,#94A3B8);">No history yet.</div>';
      else {
        history.forEach(function(h, idx) {
          html += '<div class="ps-history-item"><div class="ps-history-pwd" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">' + escapeHtml(h) + '</div><button class="tool-btn ps-copy-btn" data-idx="' + idx + '" style="padding:4px 8px;font-size:0.75rem;">Load</button></div>';
        });
        html += '<button class="tool-btn danger" id="qrClearHist" style="width:100%;margin-top:12px;">Clear History</button>';
      }
      html += '</div></div></div>';

      el.innerHTML = makeBackBtn() + html;

      $$('.qr-type-btn').forEach(function(b) {
        b.addEventListener('click', function() { state.type = b.getAttribute('data-id'); renderUI(); });
      });

      bindFields();

      $('#qrFg').addEventListener('input', function() { state.fgColor = this.value; generateLive(); });
      $('#qrBg').addEventListener('input', function() { state.bgColor = this.value; generateLive(); });
      $('#qrErr').addEventListener('change', function() { state.errorCorrection = this.value; generateLive(); });
      $('#qrMar').addEventListener('input', function() { state.margin = parseInt(this.value); $('#qrMarVal').textContent = state.margin; generateLive(); });

      $('#qrDownloadBtn').addEventListener('click', function() {
        if (!state.currentPayload) return showToast('Nothing to download', 'error');
        var link = document.createElement('a'); link.download = 'QR_Studio_' + Date.now() + '.png'; link.href = $('#qrCanvas').toDataURL('image/png'); link.click();
        showToast('Downloaded QR code!', 'success');
      });

      $('#qrCopyImgBtn').addEventListener('click', function() {
        if (!state.currentPayload) return showToast('Nothing to copy', 'error');
        $('#qrCanvas').toBlob(function(blob) {
          try { navigator.clipboard.write([new ClipboardItem({'image/png': blob})]).then(function() { showToast('Image copied!', 'success'); }); } 
          catch(e) { showToast('Browser does not support image copying', 'error'); }
        });
      });

      $('#qrSaveHistBtn').addEventListener('click', function() {
        if (!state.currentPayload) return showToast('Nothing to save', 'error');
        if (!history.includes(state.currentPayload)) {
          history.unshift(state.currentPayload); if (history.length > 20) history.pop();
          localStorage.setItem('qrHistory', JSON.stringify(history)); renderUI(); showToast('Saved!', 'success');
        } else { showToast('Already in history', 'info'); }
      });

      if ($('#qrClearHist')) $('#qrClearHist').addEventListener('click', function() { history = []; localStorage.removeItem('qrHistory'); renderUI(); });
      $$('.ps-copy-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.getAttribute('data-idx'));
          state.type = 'text'; state.inputs.text = history[idx]; renderUI(); showToast('Loaded from history', 'info');
        });
      });

      generateLive();
    }
    renderUI();
  };

  // 15. Password Studio
  TOOL_RENDERERS['password-studio'] = function (el) {
    var state = {
      step: 1,
      source: '',
      word1: '',
      word2: '',
      num: '',
      year: '',
      security: 'Balanced',
      advanced: false,
      advType: 'random',
      advLen: 16
    };
    var history = JSON.parse(localStorage.getItem('psHistory') || '[]');
    var generated = [];

    var SOURCES = [
      { id: 'My Name', icon: '👤' }, { id: 'Company Name', icon: '🏢' },
      { id: 'Brand Name', icon: '🏷️' }, { id: 'Custom Words', icon: '✍️' },
      { id: 'Completely Random', icon: '🎲' }
    ];

    function calcEntropy(pwd) {
      var pool = 0;
      if (/[a-z]/.test(pwd)) pool += 26;
      if (/[A-Z]/.test(pwd)) pool += 26;
      if (/[0-9]/.test(pwd)) pool += 10;
      if (/[^a-zA-Z0-9]/.test(pwd)) pool += 32;
      if (pool === 0) return 0;
      return Math.round(pwd.length * (Math.log(pool) / Math.log(2)));
    }

    function getCrackTime(entropy) {
      if (entropy < 40) return 'Instantly';
      if (entropy < 60) return 'Hours';
      if (entropy < 80) return 'Months';
      if (entropy < 100) return 'Years';
      return 'Centuries';
    }

    function generateRandom(len, useUpper, useLower, useNum, useSym) {
      var chars = '';
      if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
      if (useNum) chars += '0123456789';
      if (useSym) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
      if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
      var res = '';
      var array = new Uint32Array(len);
      crypto.getRandomValues(array);
      for (var i = 0; i < len; i++) res += chars[array[i] % chars.length];
      return res;
    }

    function transformWord(word, security) {
      var w = word.toLowerCase();
      if (security !== 'Easy to Remember') {
        w = w.replace(/a/g, '@').replace(/s/g, '$').replace(/i/g, '1').replace(/o/g, '0').replace(/e/g, '3');
      }
      if (w.length > 0) w = w.charAt(0).toUpperCase() + w.slice(1);
      return w;
    }

    function generateBatch() {
      generated = [];
      if (state.source === 'Completely Random' || state.advanced) {
        var count = state.advanced && state.advType === 'uuid' ? 5 : 8;
        for (var i=0; i<count; i++) {
          var pwd = '';
          if (state.advanced && state.advType === 'uuid') {
            pwd = crypto.randomUUID();
          } else if (state.advanced && state.advType === 'pin') {
            pwd = generateRandom(state.advLen, false, false, true, false);
          } else if (state.advanced && state.advType === 'api') {
            pwd = 'sk_live_' + generateRandom(32, true, true, true, false);
          } else {
            var len = state.advanced ? state.advLen : (state.security === 'Maximum Security' ? 24 : state.security === 'Balanced' ? 16 : 12);
            pwd = generateRandom(len, true, true, true, state.security !== 'Easy to Remember');
          }
          generated.push(pwd);
        }
      } else {
        // Smart generation based on inputs
        var w1 = transformWord(state.word1 || 'Password', state.security);
        var w2 = transformWord(state.word2 || '', state.security);
        var n = state.num || generateRandom(2, false, false, true, false);
        var y = state.year || new Date().getFullYear().toString();
        var sym = state.security === 'Maximum Security' ? '!@#$%' : (state.security === 'Balanced' ? '!' : '');
        
        generated.push(w1 + n + sym);
        generated.push(w1 + (w2 ? '-' + w2 : '') + y + sym);
        generated.push(w1 + '_' + y + '_' + n + sym);
        generated.push(sym + w1 + n + y);
        generated.push(w1 + w2 + n + sym);
        generated.push(generateRandom(4, true, true, false, false) + '-' + w1 + '-' + n);
        generated.push(w1 + sym + n + y + sym);
        generated.push(y + w1 + n + sym);
      }
    }

    function saveHistory(pwd) {
      if (!history.includes(pwd)) {
        history.unshift(pwd);
        if (history.length > 20) history.pop();
        localStorage.setItem('psHistory', JSON.stringify(history));
        renderStep();
      }
    }

    function renderStep() {
      var html = '';
      if (state.advanced) {
        html += '<h3>Advanced Mode</h3>' +
          '<div class="wizard-form-group"><label>Generator Type</label><select class="tool-input" id="psAdvType"><option value="random" '+(state.advType==='random'?'selected':'')+'>Random Password</option><option value="pin" '+(state.advType==='pin'?'selected':'')+'>Numeric PIN</option><option value="uuid" '+(state.advType==='uuid'?'selected':'')+'>UUID v4</option><option value="api" '+(state.advType==='api'?'selected':'')+'>API Key</option></select></div>' +
          '<div class="wizard-form-group"><label>Length: <span id="psLenVal">'+state.advLen+'</span></label><input type="range" class="tool-input" id="psLen" min="4" max="64" value="'+state.advLen+'"></div>';
      } else {
        if (state.step === 1) {
          html += '<h3>Choose Password Source</h3><div class="ps-grid" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));">';
          SOURCES.forEach(function(s) {
            html += '<div class="ps-card ' + (state.source === s.id ? 'active' : '') + '" style="text-align:center;cursor:pointer;" data-type="source" data-val="' + s.id + '">' +
              '<div style="font-size:2rem;margin-bottom:8px;">' + s.icon + '</div><div style="font-weight:600;">' + s.id + '</div></div>';
          });
          html += '</div>';
        } else if (state.step === 2) {
          html += '<h3>Provide Details</h3>' +
            '<div class="wizard-form-group"><label>Primary Word (Name/Brand)</label><input class="tool-input" id="psWord1" value="' + state.word1 + '" placeholder="e.g. PromptBazaar"></div>' +
            '<div class="wizard-form-group"><label>Secondary Word (Optional)</label><input class="tool-input" id="psWord2" value="' + state.word2 + '" placeholder="e.g. Studio"></div>' +
            '<div class="wizard-form-group"><label>Lucky/Favorite Number</label><input type="number" class="tool-input" id="psNum" value="' + state.num + '" placeholder="e.g. 7"></div>' +
            '<div class="wizard-form-group"><label>Significant Year (Optional)</label><input type="number" class="tool-input" id="psYear" value="' + state.year + '" placeholder="e.g. 2025"></div>';
        } else if (state.step === 3) {
          html += '<h3>Choose Security Profile</h3><div class="ps-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">';
          ['Easy to Remember', 'Balanced', 'Maximum Security'].forEach(function(s) {
            html += '<div class="ps-card ' + (state.security === s ? 'active' : '') + '" style="text-align:center;cursor:pointer;" data-type="security" data-val="' + s + '">' +
              '<div style="font-weight:600;font-size:1.1rem;margin-bottom:8px;">' + s + '</div>' +
              '<div style="font-size:0.8rem;color:var(--color-text-muted,#94A3B8);">' + (s==='Balanced'?'Best for everyday use':(s==='Easy to Remember'?'Fewer symbols':'Highly complex')) + '</div></div>';
          });
          html += '</div>';
        } else if (state.step === 4) {
          // step 4 title handled below
        }
      }

      if (state.advanced || state.step === 4) {
        html += '<h3>Generated Passwords</h3><div class="ps-grid">';
        generated.forEach(function(pwd, idx) {
          var ent = calcEntropy(pwd);
          var crack = getCrackTime(ent);
          var stars = ent > 80 ? 5 : ent > 60 ? 4 : ent > 40 ? 3 : ent > 20 ? 2 : 1;
          var colorClass = stars >= 4 ? 'max' : stars >= 3 ? 'balanced' : 'easy';
          
          html += '<div class="ps-card"><div class="ps-password">' + escapeHtml(pwd) + '</div>' +
            '<div class="ps-meta-row"><span>Strength</span><div class="ps-strength-stars">';
          for(var j=0; j<5; j++) html += '<span class="ps-star '+(j<stars?'filled '+colorClass:'')+'">★</span>';
          html += '</div></div>' +
            '<div class="ps-badges"><span class="ps-badge entropy">Entropy: ' + ent + ' bits</span><span class="ps-badge">Crack: ' + crack + '</span></div>' +
            '<div class="ps-actions"><button class="ps-action-btn ps-copy-btn" data-pwd="' + escapeHtml(pwd) + '">📋 Copy</button></div></div>';
        });
        html += '</div>';
      }

      var stepHTML = '';
      if (!state.advanced) {
        stepHTML = '<div class="wizard-progress"><div class="wizard-progress-bar" style="width:' + ((state.step-1)/3 * 100) + '%;"></div>';
        for(var i=1; i<=4; i++) {
          var cls = (i < state.step) ? 'completed' : (i === state.step) ? 'active' : '';
          stepHTML += '<div class="wizard-step-node ' + cls + '"><div class="wizard-step-circle">' + (i < state.step ? '✓' : i) + '</div><div class="wizard-step-label">Step ' + i + '</div></div>';
        }
        stepHTML += '</div>';
      }

      var buttonsHTML = '<div class="tool-actions" style="margin-top:24px;">';
      if (state.advanced) {
        buttonsHTML += '<button class="tool-btn" id="psCloseAdv">← Back to Wizard</button><button class="tool-btn primary" id="psGenAdv">🔄 Generate</button>';
      } else {
        if (state.step > 1) buttonsHTML += '<button class="tool-btn" id="psPrev">← Back</button>';
        else buttonsHTML += '<div></div>';
        if (state.step < 3 && state.source !== 'Completely Random') buttonsHTML += '<button class="tool-btn primary" id="psNext">Next Step →</button>';
        else if (state.step === 3 || state.source === 'Completely Random') buttonsHTML += '<button class="tool-btn primary" id="psNext">Generate Passwords ✨</button>';
        else if (state.step === 4) buttonsHTML += '<button class="tool-btn primary" id="psRegen">🔄 Regenerate</button>';
      }
      buttonsHTML += '</div>';

      $('#psStepContainer').innerHTML = stepHTML + html + buttonsHTML;

      // History Side Panel
      var histHTML = '<div class="ps-privacy-badge">🔒 Generated entirely on-device</div><div style="font-weight:700;margin-bottom:12px;font-size:0.9rem;">Recent Passwords</div>';
      if (history.length === 0) histHTML += '<div style="font-size:0.8rem;color:var(--color-text-muted,#94A3B8);">No history yet.</div>';
      else {
        history.forEach(function(h) {
          histHTML += '<div class="ps-history-item"><div class="ps-history-pwd">' + escapeHtml(h) + '</div><button class="tool-btn ps-copy-btn" data-pwd="' + escapeHtml(h) + '" style="padding:4px 8px;font-size:0.75rem;">Copy</button></div>';
        });
        histHTML += '<button class="tool-btn danger" id="psClearHist" style="width:100%;margin-top:12px;">Clear History</button>';
      }
      if (!state.advanced) {
        histHTML += '<hr style="border:none;border-top:1px solid var(--color-border,#E5E7EB);margin:24px 0;"><button class="tool-btn" id="psOpenAdv" style="width:100%;">⚙️ Advanced Mode</button>';
      }
      $('#psSidePanel').innerHTML = histHTML;

      // Event Binding
      if ($('#psNext')) $('#psNext').addEventListener('click', function() {
        if (state.step === 3 || state.source === 'Completely Random') { state.step = 4; generateBatch(); }
        else state.step++;
        renderStep();
      });
      if ($('#psPrev')) $('#psPrev').addEventListener('click', function() { state.step--; renderStep(); });
      if ($('#psRegen')) $('#psRegen').addEventListener('click', function() { generateBatch(); renderStep(); });
      
      if ($('#psOpenAdv')) $('#psOpenAdv').addEventListener('click', function() { state.advanced = true; generateBatch(); renderStep(); });
      if ($('#psCloseAdv')) $('#psCloseAdv').addEventListener('click', function() { state.advanced = false; state.step = 1; renderStep(); });
      if ($('#psGenAdv')) $('#psGenAdv').addEventListener('click', function() { generateBatch(); renderStep(); });

      if ($('#psClearHist')) $('#psClearHist').addEventListener('click', function() { history = []; localStorage.removeItem('psHistory'); renderStep(); });

      if ($('#psAdvType')) $('#psAdvType').addEventListener('change', function() { state.advType = this.value; generateBatch(); renderStep(); });
      if ($('#psLen')) $('#psLen').addEventListener('input', function() { state.advLen = parseInt(this.value); $('#psLenVal').textContent = state.advLen; });
      if ($('#psLen')) $('#psLen').addEventListener('change', function() { generateBatch(); renderStep(); });

      $$('.ps-card[data-type]').forEach(function(c) {
        c.addEventListener('click', function() {
          var type = c.getAttribute('data-type');
          var val = c.getAttribute('data-val');
          state[type] = val;
          renderStep();
        });
      });

      if (state.step === 2) {
        ['psWord1', 'psWord2', 'psNum', 'psYear'].forEach(function(id) {
          var el = $('#' + id);
          if (el) el.addEventListener('input', function() {
            if (id === 'psWord1') state.word1 = this.value;
            if (id === 'psWord2') state.word2 = this.value;
            if (id === 'psNum') state.num = this.value;
            if (id === 'psYear') state.year = this.value;
          });
        });
      }

      $$('.ps-copy-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var pwd = btn.getAttribute('data-pwd');
          copyText(pwd);
          saveHistory(pwd);
        });
      });
    }

    el.innerHTML = makeBackBtn() +
      '<div class="tool-header" style="margin-bottom:24px;"><h2>🔐 Password Studio</h2><p>Premium password generation wizard with intelligent transformations and strict on-device privacy.</p></div>' +
      '<div class="ps-layout">' +
      '<div class="ps-main"><div class="tool-panel" id="psStepContainer" style="padding:32px 24px;"></div></div>' +
      '<div class="ps-side-panel" id="psSidePanel"></div>' +
      '</div>';

    renderStep();
  };

  // 15. Prompt Enhancer Pro
      
    TOOL_RENDERERS['prompt-enhancer'] = function (el) {
    el.innerHTML = makeBackBtn() +
      '<div class="tool-header" style="margin-bottom:24px;">' +
      '<h2>✨ Prompt Intelligence Agent</h2>' +
      '<p>Premium AI inference engine. Transforms ideas into production-ready AI specifications.</p>' +
      '</div>' +

      '<div class="pe-v5-container">' +
      // --- LEFT PANEL ---
      '<div class="pe-v5-left">' +
      '<div class="pe-v5-left-header">' +
      '<h2>Prompt Editor</h2>' +
      '<div id="peMetaTags" style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; opacity:0; transition:opacity 0.3s;">' +
      '<span class="badge" style="background:#e0e7ff; color:#3730a3;" id="metaDomain"></span>' +
      '<span class="badge" style="background:#dcfce7; color:#166534;" id="metaIntent"></span>' +
      '<span class="badge" style="background:#fef3c7; color:#92400e;" id="metaComplexity"></span>' +
      '</div>' +
      '</div>' +
      '<textarea id="peInput" class="pe-v5-textarea" placeholder="Describe what you want the AI to do in plain English...\n\nExample: Build a responsive e-commerce website for sneakers."></textarea>' +
      
      '<div class="pe-v5-stats-bar">' +
      '<div class="pe-v5-stats-item"><i class="fas fa-font"></i> <span id="statChars">0</span> chars</div>' +
      '<div class="pe-v5-stats-item"><i class="fas fa-align-left"></i> <span id="statWords">0</span> words</div>' +
      '<div class="pe-v5-stats-item"><i class="fas fa-microchip"></i> ~<span id="statTokens">0</span> tokens</div>' +
      '</div>' +

      '<div class="pe-v5-actions">' +
      '<button id="peClear" class="pe-v5-btn pe-v5-btn-secondary" style="flex:1;"><i class="fas fa-trash-alt"></i> Clear</button>' +
      '<button id="peEnhance" class="pe-v5-btn pe-v5-btn-primary" style="flex:2;"><i class="fas fa-magic"></i> Generate Intelligence</button>' +
      '</div>' +
      '</div>' +

      // --- RIGHT PANEL ---
      '<div class="pe-v5-right">' +
      
      // Empty State
      '<div id="peEmptyState" style="position:absolute; top:0;left:0;right:0;bottom:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#64748b;">' +
      '<div style="font-size:3rem; margin-bottom:16px; opacity:0.3;"><i class="fas fa-bolt"></i></div>' +
      '<h3 style="font-weight:600; color:#0f172a;">Awaiting Input</h3>' +
      '<p style="max-width:280px; text-align:center; font-size:0.95rem; margin-top:8px;">Enter your prompt on the left to activate the intelligence pipeline.</p>' +
      '</div>' +

      // Pipeline State — 10 Agents
      '<div id="pePipeline" class="pe-v5-pipeline" style="display:none;">' +
      '<h3 style="margin-bottom:28px; font-weight:700; color:#0f172a;">Running 10-Agent Intelligence Pipeline</h3>' +
      '<div class="pe-v5-pipe-step" id="pipe1"><div class="pe-v5-pipe-icon"><i class="fas fa-brain"></i></div><div class="pe-v5-pipe-label">A1 · Intent Intelligence</div></div>' +
      '<div class="pe-v5-pipe-step" id="pipe2"><div class="pe-v5-pipe-icon"><i class="fas fa-sitemap"></i></div><div class="pe-v5-pipe-label">A2 · Domain Classifier</div></div>' +
      '<div class="pe-v5-pipe-step" id="pipe3"><div class="pe-v5-pipe-icon"><i class="fas fa-project-diagram"></i></div><div class="pe-v5-pipe-label">A3 · Knowledge Graph</div></div>' +
      '<div class="pe-v5-pipe-step" id="pipe4"><div class="pe-v5-pipe-icon"><i class="fas fa-users"></i></div><div class="pe-v5-pipe-label">A4 · Expert Personas</div></div>' +
      '<div class="pe-v5-pipe-step" id="pipe5"><div class="pe-v5-pipe-icon"><i class="fas fa-chart-line"></i></div><div class="pe-v5-pipe-label">A5 · Business Intelligence</div></div>' +
      '<div class="pe-v5-pipe-step" id="pipe6"><div class="pe-v5-pipe-icon"><i class="fas fa-expand-alt"></i></div><div class="pe-v5-pipe-label">A6 · Requirement Expansion</div></div>' +
      '<div class="pe-v5-pipe-step" id="pipe7"><div class="pe-v5-pipe-icon"><i class="fas fa-cogs"></i></div><div class="pe-v5-pipe-label">A7 · Reasoning Engine</div></div>' +
      '<div class="pe-v5-pipe-step" id="pipe8"><div class="pe-v5-pipe-icon"><i class="fas fa-pen-fancy"></i></div><div class="pe-v5-pipe-label">A8 · Prompt Composer</div></div>' +
      '<div class="pe-v5-pipe-step" id="pipe9"><div class="pe-v5-pipe-icon"><i class="fas fa-rocket"></i></div><div class="pe-v5-pipe-label">A9 · AI Optimization</div></div>' +
      '<div class="pe-v5-pipe-step" id="pipe10"><div class="pe-v5-pipe-icon"><i class="fas fa-shield-alt"></i></div><div class="pe-v5-pipe-label">A10 · Quality Validation</div></div>' +
      '</div>' +

      // Result State
      '<div id="peResult" style="display:none; flex-direction:column; height:100%;">' +
      
      '<div class="pe-v5-tabs">' +
      '<div class="pe-v5-tab active" data-tab="tPreview"><i class="fas fa-file-alt"></i> Preview</div>' +
      '<div class="pe-v5-tab" data-tab="tMarkdown"><i class="fab fa-markdown"></i> Markdown</div>' +
      '<div class="pe-v5-tab" data-tab="tPlain"><i class="fas fa-align-left"></i> Plain Text</div>' +
      '<div class="pe-v5-tab" data-tab="tJSON"><i class="fas fa-code"></i> JSON</div>' +
      '<div class="pe-v5-tab" data-tab="tInsights"><i class="fas fa-chart-pie"></i> Insights</div>' +
      '</div>' +

      '<div id="tPreview" class="pe-v5-content active"></div>' +
      '<div id="tMarkdown" class="pe-v5-content"><div class="pe-v5-code" id="codeMarkdown"></div></div>' +
      '<div id="tPlain" class="pe-v5-content"><div class="pe-v5-code" style="white-space:pre-wrap; background:#f8fafc; color:#334155; border:1px solid #e2e8f0; box-shadow:none;" id="codePlain"></div></div>' +
      '<div id="tJSON" class="pe-v5-content"><div class="pe-v5-code" id="codeJSON" style="color:#a5b4fc;"></div></div>' +
      '<div id="tInsights" class="pe-v5-content" style="padding-bottom:100px;">' +
      '<div id="insightsContainer"></div>' +
      '</div>' +

      // Export Action Bar
      '<div class="pe-v5-export-bar">' +
      '<div class="pe-v5-export-title">Export</div>' +
      '<button class="pe-v5-export-btn" id="btnCopyMD"><i class="fab fa-markdown"></i> Copy MD</button>' +
      '<button class="pe-v5-export-btn" id="btnCopyJSON"><i class="fas fa-code"></i> Copy JSON</button>' +
      '<button class="pe-v5-export-btn" id="btnCopyPlain"><i class="fas fa-copy"></i> Copy Plain</button>' +
      '<button class="pe-v5-export-btn" id="btnDownloadTXT"><i class="fas fa-file-download"></i> TXT</button>' +
      '<button class="pe-v5-export-btn" id="btnDownloadPDF"><i class="fas fa-file-pdf"></i> PDF</button>' +
      '<div style="flex:1;"></div>' +
      '<button class="pe-v5-export-btn" id="btnEmail" style="color:#3b82f6;"><i class="fas fa-envelope"></i> Email</button>' +
      '<button class="pe-v5-export-btn" id="btnWhatsApp" style="color:#10b981;"><i class="fab fa-whatsapp"></i> WhatsApp</button>' +
      '</div>' +

      '</div>' + // end result

      '</div>' + // end right panel
      '</div>'; // end container

    var _currentResult = null;

    // Real-time Stats (V4 API)
    $("#peInput").addEventListener("input", function() {
        var val = this.value;
        if(window.PromptEnhancerEngine) {
            var stats = window.PromptEnhancerEngine.getStats(val);
            $("#statChars").textContent = stats.chars;
            $("#statWords").textContent = stats.words;
            $("#statTokens").textContent = stats.tokens;
            if(val.length > 20) {
                var intent = window.PromptEnhancerEngine.detectIntent(val);
                var domains = window.PromptEnhancerEngine.detectDomains(val);
                // V4: domains is an array of {domain, confidence} objects
                var d0 = (domains && domains[0]) ? domains[0].domain : 'General';
                var conf = (domains && domains[0] && domains[0].confidence) ? domains[0].confidence + '%' : '';
                $("#metaDomain").innerHTML = '<i class="fas fa-layer-group"></i> ' + d0 + ' ' + conf;
                $("#metaIntent").innerHTML = '<i class="fas fa-bullseye"></i> ' + (intent.primary_intent || intent.primaryAction || intent.action || 'Create');
                $("#metaComplexity").innerHTML = '<i class="fas fa-tachometer-alt"></i> ' + (intent.complexity || 'Standard');
                $("#peMetaTags").style.opacity = "1";
            } else {
                $("#peMetaTags").style.opacity = "0";
            }
        }
    });

    $("#peClear").addEventListener("click", function() {
        $("#peInput").value = "";
        $("#peInput").dispatchEvent(new Event("input"));
        $("#peEmptyState").style.display = "flex";
        $("#pePipeline").style.display = "none";
        $("#peResult").style.display = "none";
        _currentResult = null;
    });

    // Semantic Parser for Preview Tab — V4 Enhanced
    function renderPreview(md) {
        if (!md) return '<div style="padding:20px;text-align:center;">No preview available.</div>';
        let parts = md.split(/(?=## )/g);
        let html = '<div class="pe-doc-container" style="padding-bottom:100px;">';
        const iconMap = {
            'EXPERT': '👤', 'TEAM': '👤', 'ROLE': '👤', 'PERSONA': '👥',
            'OBJECTIVE': '🎯', 'GOAL': '🎯', 'VISION': '🎯', 'MISSION': '🎯',
            'CONTEXT': '🧠', 'INTEL': '🧠', 'BUSINESS': '🧠', 'ANALYSIS': '🧠', 'STRATEGY': '🧠',
            'REQUIRE': '⚙️', 'FUNCTIONAL': '⚙️', 'TECHNICAL': '⚙️', 'ARCHITECTURE': '⚙️',
            'CONSTRAINT': '🛡️', 'SECURITY': '🛡️', 'COMPLI': '🛡️', 'STANDARD': '🛡️', 'PRIVACY': '🛡️',
            'DELIVER': '✅', 'RESULT': '✅', 'OUTPUT': '✅', 'SUCCESS': '✅',
            'AUDIENCE': '👥', 'CUSTOMER': '👥', 'TARGET': '👥', 'PATIENT': '👥',
            'SEO': '🔍', 'MARKETING': '📣', 'CHANNEL': '📣', 'CAMPAIGN': '📣',
            'COMPOSITION': '🎨', 'LIGHTING': '💡', 'CAMERA': '📷', 'COLOR': '🎨',
            'NEGATIVE': '⛔', 'PLATFORM': '🚀', 'DEPLOY': '🚀', 'DEVOPS': '🚀',
            'DATA': '📊', 'MODEL': '🤖', 'ML': '🤖', 'AI': '🤖', 'AGENT': '🤖',
            'SUBJECT': '🖼️', 'CREATIVE': '✨', 'STYLE': '✨', 'MOOD': '✨', 'VISUAL': '✨',
            'MEASURE': '📈', 'KPI': '📈', 'METRIC': '📈', 'ETHIC': '⚖️',
            'AI RESPONSE': '💬', 'OPTIM': '💬', 'WORKFLOW': '🔄', 'CODE': '💻'
        };
        parts.forEach(p => {
            if (!p || !p.trim()) return;
            let lines = p.trim().split('\n');
            let headerMatch = lines[0].match(/## (.*)/);
            if (headerMatch) {
                let headerText = headerMatch[1].trim();
                let icon = '📝';
                for (const [key, ico] of Object.entries(iconMap)) {
                    if (headerText.toUpperCase().includes(key)) { icon = ico; break; }
                }
                let contentBody = lines.slice(1).join('\n').trim();
                if(!contentBody || contentBody === 'undefined' || contentBody === 'null') return;
                
                // Process markdown formatting
                contentBody = contentBody.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                contentBody = contentBody.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                contentBody = contentBody.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:0.85em;">$1</code>');
                // Convert bullet chars (•, -, *) at line start
                contentBody = contentBody.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
                contentBody = contentBody.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
                // Wrap remaining paragraphs
                contentBody = contentBody.split('\n\n').map(c => {
                    c = c.trim();
                    if (!c || c.startsWith('<ul') || c.startsWith('<li')) return c;
                    return `<p>${c}</p>`;
                }).join('');
                html += `<div class="pe-doc-section"><div class="pe-doc-section-header">${icon} ${headerText}</div><div class="pe-doc-section-content">${contentBody}</div></div>`;
            }
        });
        html += '</div>';
        return html;
    }

    function renderInsights(insights) {
        if (!insights) return '<div style="padding:20px;text-align:center;">No insights generated.</div>';
        const escapeHtml = (unsafe) => (unsafe || '').toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        
        let h = `<div style="display:flex; gap:24px; margin-bottom:24px; flex-wrap:wrap; align-items:center;">
            <div style="text-align:center;">
                <div style="font-size:3rem; font-weight:800; color:#0f172a; line-height:1;">${insights.overallScore || 99}<span style="font-size:1.5rem; color:#94a3b8;">/100</span></div>
                <div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:#64748b; margin-top:4px;">Enterprise Quality Score</div>
            </div>
            <div style="flex:1; min-width:200px; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div><span style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:#64748b;">Detected Intent</span><br><strong style="color:#2563eb;">${escapeHtml(insights.detectedIntent)}</strong></div>
                <div><span style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:#64748b;">Complexity</span><br><strong>${escapeHtml(insights.estimatedComplexity)}</strong></div>
                <div><span style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:#64748b;">Confidence</span><br><strong style="color:#10b981;">${escapeHtml(insights.confidenceLevel)}</strong></div>
                <div><span style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:#64748b;">Readiness</span><br><strong style="color:#8b5cf6;">${escapeHtml(insights.estimatedPromptReadiness)}</strong></div>
            </div>
        </div>`;

        // Domains
        if (insights.detectedDomains && Array.isArray(insights.detectedDomains) && insights.detectedDomains.length > 0) {
            h += `<div style="margin-bottom:16px;"><div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:#64748b; margin-bottom:8px;">Detected Domains (Multi-Classification)</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">${insights.detectedDomains.map(d => `<span style="background:#f1f5f9; color:#0f172a; padding:6px 12px; border-radius:8px; font-size:0.85rem; font-weight:600; border:1px solid #e2e8f0;">${escapeHtml(d.domain || d)} <span style="color:#64748b;font-weight:400;margin-left:4px;">${d.confidence ? d.confidence + '%' : ''}</span></span>`).join('')}</div></div>`;
        }

        // Knowledge Packs
        if (insights.knowledgePacks && insights.knowledgePacks.length > 0) {
            h += `<div style="margin-bottom:16px;"><div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:#64748b; margin-bottom:8px;">Knowledge Packs Utilized</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">${insights.knowledgePacks.map(k => `<span style="background:#dcfce7; color:#166534; padding:6px 12px; border-radius:8px; font-size:0.85rem; font-weight:600; border:1px solid #bbf7d0;"><i class="fas fa-database" style="margin-right:6px;"></i>${escapeHtml(k)}</span>`).join('')}</div></div>`;
        }

        // Expert Team
        if (insights.expertTeam && insights.expertTeam.length > 0) {
            h += `<div style="margin-bottom:24px;"><div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:#64748b; margin-bottom:8px;">Assigned Expert Task Force</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">${insights.expertTeam.map(e => `<span style="background:#e0e7ff; color:#3730a3; padding:6px 12px; border-radius:8px; font-size:0.85rem; font-weight:600; border:1px solid #c7d2fe;"><i class="fas fa-user-tie" style="margin-right:6px;"></i>${escapeHtml(e)}</span>`).join('')}</div></div>`;
        }

        // Value Add Metrics
        h += `<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
                <div style="font-size:2rem; font-weight:700; color:#2563eb; margin-bottom:4px;">${insights.businessContextInferred || 0}</div>
                <div style="font-size:0.8rem; font-weight:600; color:#64748b; text-transform:uppercase;">Context Rules Inferred</div>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
                <div style="font-size:2rem; font-weight:700; color:#10b981; margin-bottom:4px;">${insights.requirementsAdded || 0}</div>
                <div style="font-size:0.8rem; font-weight:600; color:#64748b; text-transform:uppercase;">Requirements Expanded</div>
            </div>
        </div>`;

        // Optimization Summary
        if (insights.optimizationSummary) {
            h += `<div style="background:#eff6ff; border:1px solid #bfdbfe; padding:16px; border-radius:12px; margin-bottom:12px;">
                <strong style="color:#1d4ed8;"><i class="fas fa-bolt"></i> Optimization Summary:</strong>
                <p style="color:#1e40af; margin:8px 0 0 0; font-size:0.95rem;">${escapeHtml(insights.optimizationSummary)}</p>
            </div>`;
        }

        return h;
    }

    $("#peEnhance").addEventListener("click", async function () {
        var input = $("#peInput").value.trim();
        if (!input) { showToast("Please enter a prompt.", "error"); return; }

        var btn = this;
        var originalBtnContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        btn.disabled = true;

        // Start loading UI immediately
        $("#peEmptyState").style.display = "none";
        $("#peResult").style.display = "none";
        $("#pePipeline").style.display = "flex";
        
        var agentIcons = ['fa-brain','fa-sitemap','fa-project-diagram','fa-users','fa-chart-line','fa-expand-alt','fa-cogs','fa-pen-fancy','fa-rocket','fa-shield-alt'];
        var steps = [];
        for(var i = 1; i <= 10; i++) {
            var el2 = $("#pipe" + i);
            if (el2) steps.push({el: el2, icon: agentIcons[i-1]});
        }
        steps.forEach(s => {
            s.el.className = "pe-v5-pipe-step";
            s.el.querySelector('.pe-v5-pipe-icon').innerHTML = '<i class="fas ' + s.icon + '"></i>';
        });
        
        // Show the first agent is active while waiting for API
        if (steps[0]) steps[0].el.className = "pe-v5-pipe-step active";

        // Call the V7 API
        var result = await window.PromptEnhancerEngine.enhance(input);
        
        if (!result) { 
            showToast("Enhancement failed. Please try again.", "error"); 
            btn.innerHTML = originalBtnContent;
            btn.disabled = false;
            $("#pePipeline").style.display = "none";
            $("#peEmptyState").style.display = "flex";
            return; 
        }

        // Run the rest of the pipeline animation quickly
        var stepIdx = 0;
        var interval = setInterval(function() {
            if (stepIdx > 0 && steps[stepIdx-1]) {
                steps[stepIdx-1].el.className = "pe-v5-pipe-step done";
                steps[stepIdx-1].el.querySelector('.pe-v5-pipe-icon').innerHTML = '<i class="fas fa-check"></i>';
            }
            if (stepIdx < steps.length) {
                steps[stepIdx].el.className = "pe-v5-pipe-step active";
                stepIdx++;
            } else {
                clearInterval(interval);
                finishEnhance(result, btn);
            }
        }, 150);
    });

    function finishEnhance(result, btn) {
        _currentResult = result;
        $("#pePipeline").style.display = "none";
        $("#peResult").style.display = "flex";
        btn.innerHTML = '<i class="fas fa-magic"></i> Generate Intelligence';
        btn.disabled = false;

        var el_container = document.querySelector(".pe-v5-container"); // Handle context issues with el if needed
        var tabsToClear = document.querySelectorAll(".pe-v5-tab");
        var contentToClear = document.querySelectorAll(".pe-v5-content");
        
        if (tabsToClear.length > 0) {
            tabsToClear.forEach(t => t.classList.remove("active"));
            contentToClear.forEach(c => c.classList.remove("active"));
            var previewTab = document.querySelector(".pe-v5-tab[data-tab='tPreview']");
            if (previewTab) previewTab.classList.add("active");
            var previewContent = $("#tPreview");
            if (previewContent) previewContent.classList.add("active");
        }

        $("#tPreview").innerHTML = renderPreview(result.enhanced);
        $("#codeMarkdown").textContent = result.enhanced;
        $("#codePlain").textContent = result.enhanced
            .replace(/\*\*/g, '').replace(/\*/g, '')
            .replace(/## /g, '').replace(/##/g, '')
            .replace(/---/g, '─────────────');
        $("#codeJSON").textContent = JSON.stringify({
            prompt: result.enhanced,
            insights: result.insights,
            rawContext: result.raw
        }, null, 2);
        $("#insightsContainer").innerHTML = renderInsights(result.insights || {});
    }

    // Tabs Logic
    var tabs = el.querySelectorAll(".pe-v5-tab");
    var contents = el.querySelectorAll(".pe-v5-content");
    tabs.forEach(t => {
        t.addEventListener("click", function() {
            tabs.forEach(x => x.classList.remove("active"));
            contents.forEach(x => x.classList.remove("active"));
            this.classList.add("active");
            $("#" + this.getAttribute("data-tab")).classList.add("active");
        });
    });

    // Export Logic
    $("#btnCopyMD").addEventListener("click", function() { if(_currentResult) copyText(_currentResult.enhanced); });
    $("#btnCopyJSON").addEventListener("click", function() { if(_currentResult) copyText($("#codeJSON").textContent); });
    $("#btnCopyPlain").addEventListener("click", function() { if(_currentResult) copyText($("#codePlain").textContent); });
    
    $("#btnDownloadTXT").addEventListener("click", function() { if(_currentResult) downloadFile("prompt.txt", $("#codePlain").textContent); });
    
    $("#btnDownloadPDF").addEventListener("click", function() { 
        if(_currentResult) {
            // Very simple window.print() mapping for PDF
            var originalContents = document.body.innerHTML;
            var printContents = $("#tPreview").innerHTML;
            document.body.innerHTML = "<h1>AI Specification</h1>" + printContents;
            window.print();
            document.body.innerHTML = originalContents;
            location.reload(); // Quick restore state hack for simplicity without complex iframes
        }
    });

    $("#btnEmail").addEventListener("click", function() {
        if(_currentResult) {
            window.open("mailto:?subject=AI Prompt Specification&body=" + encodeURIComponent(_currentResult.enhanced));
        }
    });
    $("#btnWhatsApp").addEventListener("click", function() {
        if(_currentResult) {
            window.open("https://wa.me/?text=" + encodeURIComponent("I generated this prompt:\n\n" + _currentResult.enhanced));
        }
    });

  };



  // ── Portfolio Builder Pro ────────────────────────────────────
  TOOL_RENDERERS['portfolio-builder'] = function (el) {
    el.innerHTML = `
      <div class="tool-header" style="margin-bottom: 24px; display:flex; align-items:center; gap:14px;">
        <button class="tool-back-btn" id="pbBackBtn" style="display:flex; align-items:center; gap:6px; font-weight:600; padding: 6px 12px; border-radius: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Go Back
        </button>
        <div class="tool-title-group">
          <div class="tool-title" style="font-weight:800; font-size:1.55rem; color:#0f172a;">💼 Portfolio Builder Pro</div>
          <div class="tool-subtitle">AI-powered portfolio generator for students & professionals</div>
        </div>
      </div>
      
      <div class="wizard-layout">
        <div class="wizard-main">
          <div class="tool-panel" id="pbStepContainer" style="padding: 32px 24px;"></div>
        </div>
        <div class="wizard-preview-panel">
          <div style="font-weight:700;margin-bottom:12px;font-size:0.9rem;">Generation Status</div>
          <div class="live-preview-box" id="pbStatusText">
            Fill out the form to generate your AI portfolio.
          </div>
          <div class="preview-actions">
            <button class="tool-btn primary" style="width:100%;justify-content:center;display:none;" id="pbOpenUrl">🌐 Open Portfolio</button>
          </div>
        </div>
      </div>
    `;

    var state = {
      step: 1,
      personal: { firstName: '', lastName: '', role: '', email: '', phone: '', headline: '', photoUrl: '', resumeUrl: '' },
      summary: '',
      skills: '',
      education: [],
      experience: [],
      projects: [],
      certificates: [],
      achievements: '',
      socials: { github: '', linkedin: '' },
      theme: 'Minimal',
      colorPalette: '#0D6EFD',
      font: 'Inter'
    };

    var THEMES = ['Minimal', 'Dark Pro', 'Gradient', 'Glassmorphism', 'Terminal'];
    var COLORS = [
      {name: 'Ocean Blue', val: '#0D6EFD'}, 
      {name: 'Emerald Green', val: '#10B981'},
      {name: 'Purple Haze', val: '#8B5CF6'},
      {name: 'Crimson Red', val: '#E11D48'},
      {name: 'Sunset Orange', val: '#F97316'},
      {name: 'Slate Gray', val: '#475569'}
    ];
    var FONTS = ['Inter', 'Outfit', 'Roboto', 'Poppins', 'Playfair Display'];

    function renderStep() {
      var html = '';
      if (state.step === 1) {
        html += '<h3>Personal Information</h3>';
        html += '<div style="display:flex; gap:12px;">';
        html += '<div class="wizard-form-group" style="flex:1"><label>First Name</label><input class="tool-input" id="pbFirstName" value="'+state.personal.firstName+'"></div>';
        html += '<div class="wizard-form-group" style="flex:1"><label>Last Name</label><input class="tool-input" id="pbLastName" value="'+state.personal.lastName+'"></div>';
        html += '</div>';
        html += '<div class="wizard-form-group"><label>Professional Role / Headline</label><input class="tool-input" id="pbRole" value="'+state.personal.role+'"></div>';
        html += '<div class="wizard-form-group"><label>Email</label><input type="email" class="tool-input" id="pbEmail" value="'+state.personal.email+'"></div>';
        html += '<div class="wizard-form-group"><label>Phone</label><input class="tool-input" id="pbPhone" value="'+state.personal.phone+'"></div>';
        html += '<div class="wizard-form-group"><label>Profile Photo URL</label><input class="tool-input" id="pbPhotoUrl" value="'+state.personal.photoUrl+'"></div>';
        html += '<div class="wizard-form-group"><label>Resume/CV URL</label><input class="tool-input" id="pbResumeUrl" value="'+state.personal.resumeUrl+'"></div>';
      } else if (state.step === 2) {
        html += '<h3>Professional Summary & Skills</h3>';
        html += '<div class="wizard-form-group"><label>Summary</label><textarea class="tool-textarea" id="pbSummary" style="min-height:120px;" placeholder="Write a brief summary about yourself.">'+state.summary+'</textarea></div>';
        html += '<div class="wizard-form-group"><label>Core Skills (comma separated)</label><textarea class="tool-textarea" id="pbSkills" style="min-height:80px;" placeholder="e.g. React, Python, UI/UX Design, Agile">'+state.skills+'</textarea></div>';
      } else if (state.step === 3) {
        html += '<h3>Experience & Education</h3>';
        html += '<h4>Experience</h4><div id="pbExpList"></div>';
        html += '<button class="tool-btn" id="pbAddExp" style="margin-bottom:24px;">+ Add Experience</button>';
        html += '<h4>Education</h4><div id="pbEduList"></div>';
        html += '<button class="tool-btn" id="pbAddEdu">+ Add Education</button>';
      } else if (state.step === 4) {
        html += '<h3>Projects, Certificates & Achievements</h3>';
        html += '<h4>Projects</h4><div id="pbProjList"></div>';
        html += '<button class="tool-btn" id="pbAddProj" style="margin-bottom:24px;">+ Add Project</button>';
        html += '<h4>Certificates</h4><div id="pbCertList"></div>';
        html += '<button class="tool-btn" id="pbAddCert" style="margin-bottom:24px;">+ Add Certificate</button>';
        html += '<h4>Achievements</h4>';
        html += '<div class="wizard-form-group"><textarea class="tool-textarea" id="pbAchievements" style="min-height:80px;" placeholder="Key awards or recognitions...">'+state.achievements+'</textarea></div>';
      } else if (state.step === 5) {
        html += '<h3>Design & Socials</h3>';
        html += '<div style="display:flex; gap:12px;">';
        html += '<div class="wizard-form-group" style="flex:1"><label>LinkedIn URL</label><input class="tool-input" id="pbLinkedin" value="'+state.socials.linkedin+'"></div>';
        html += '<div class="wizard-form-group" style="flex:1"><label>GitHub URL</label><input class="tool-input" id="pbGithub" value="'+state.socials.github+'"></div>';
        html += '</div>';
        
        html += '<h4>Theme Selection</h4><div class="wizard-grid">';
        THEMES.forEach(function(t) {
          html += '<div class="wizard-card '+(state.theme === t ? 'active' : '')+'" data-type="theme" data-val="'+t+'"><div class="wizard-card-label" style="margin-top:10px;">'+t+'</div></div>';
        });
        html += '</div>';

        html += '<h4>Color Palette</h4><div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom: 20px;">';
        COLORS.forEach(function(c) {
          html += '<div class="wizard-card '+(state.colorPalette === c.val ? 'active' : '')+'" data-type="color" data-val="'+c.val+'" style="width:auto; padding:10px; min-height:auto; display:flex; align-items:center; gap:8px;">';
          html += '<div style="width:20px; height:20px; border-radius:50%; background:'+c.val+';"></div><span>'+c.name+'</span></div>';
        });
        html += '</div>';

        html += '<h4>Typography Font</h4><div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom: 20px;">';
        FONTS.forEach(function(f) {
          html += '<div class="wizard-card '+(state.font === f ? 'active' : '')+'" data-type="font" data-val="'+f+'" style="width:auto; padding:10px; min-height:auto;">'+f+'</div>';
        });
        html += '</div>';
      }

      var totalSteps = 5;
      var stepHTML = '<div class="wizard-progress"><div class="wizard-progress-bar" style="width:' + ((state.step-1)/(totalSteps-1) * 100) + '%;"></div>';
      for(var i=1; i<=totalSteps; i++) {
        var cls = (i < state.step) ? 'completed' : (i === state.step ? 'active' : '');
        stepHTML += '<div class="wizard-step-node ' + cls + '"><div class="wizard-step-circle">' + (i < state.step ? '✓' : i) + '</div><div class="wizard-step-label">Step ' + i + '</div></div>';
      }
      stepHTML += '</div>';

      var buttonsHTML = '<div class="tool-actions" style="margin-top:24px;">' +
        (state.step > 1 ? '<button class="tool-btn" id="pbPrev">← Back</button>' : '<div></div>') +
        (state.step < totalSteps ? '<button class="tool-btn primary" id="pbNext">Next Step →</button>' : '<button class="tool-btn primary" id="pbGenerate" style="background:#10b981;border-color:#059669;color:#fff;">🚀 Generate Portfolio</button>') +
        '</div>';

      document.getElementById('pbStepContainer').innerHTML = stepHTML + html + buttonsHTML;

      // Event Listeners
      if (document.getElementById('pbNext')) document.getElementById('pbNext').addEventListener('click', function() { saveCurrentStep(); state.step++; renderStep(); });
      if (document.getElementById('pbPrev')) document.getElementById('pbPrev').addEventListener('click', function() { saveCurrentStep(); state.step--; renderStep(); });
      if (document.getElementById('pbGenerate')) document.getElementById('pbGenerate').addEventListener('click', generatePortfolio);

      if (document.getElementById('pbAddExp')) {
        renderRepeater('pbExpList', state.experience, ['Company', 'Role', 'Duration', 'Description (Key achievements)']);
        document.getElementById('pbAddExp').addEventListener('click', function() {
          saveCurrentStep();
          state.experience.push({company: '', role: '', duration: '', description: ''});
          renderStep();
        });
      }
      if (document.getElementById('pbAddEdu')) {
        renderRepeater('pbEduList', state.education, ['Institution', 'Degree', 'Year']);
        document.getElementById('pbAddEdu').addEventListener('click', function() {
          saveCurrentStep();
          state.education.push({institution: '', degree: '', year: ''});
          renderStep();
        });
      }
      if (document.getElementById('pbAddProj')) {
        renderRepeater('pbProjList', state.projects, ['Project Title', 'Description', 'Demo/Repo Link', 'Project Image URL']);
        document.getElementById('pbAddProj').addEventListener('click', function() {
          saveCurrentStep();
          state.projects.push({title: '', description: '', link: '', imageUrl: ''});
          renderStep();
        });
      }
      if (document.getElementById('pbAddCert')) {
        renderRepeater('pbCertList', state.certificates, ['Certificate Name', 'Issuer', 'Year', 'Certificate Image URL']);
        document.getElementById('pbAddCert').addEventListener('click', function() {
          saveCurrentStep();
          state.certificates.push({name: '', issuer: '', year: '', imageUrl: ''});
          renderStep();
        });
      }

      document.querySelectorAll('.wizard-card').forEach(function(c) {
        c.addEventListener('click', function() {
          if (c.getAttribute('data-type') === 'theme') state.theme = c.getAttribute('data-val');
          if (c.getAttribute('data-type') === 'color') state.colorPalette = c.getAttribute('data-val');
          if (c.getAttribute('data-type') === 'font') state.font = c.getAttribute('data-val');
          renderStep();
        });
      });
      
      var backBtn = el.querySelector('#pbBackBtn');
      if (backBtn) {
        backBtn.addEventListener('click', function () {
          document.getElementById('toolView').style.display = 'none';
          document.getElementById('toolsGridContainer').style.display = '';
        });
      }
    }

    function saveCurrentStep() {
      if (state.step === 1) {
        state.personal.firstName = document.getElementById('pbFirstName').value;
        state.personal.lastName = document.getElementById('pbLastName').value;
        state.personal.role = document.getElementById('pbRole').value;
        state.personal.email = document.getElementById('pbEmail').value;
        state.personal.phone = document.getElementById('pbPhone').value;
        state.personal.photoUrl = document.getElementById('pbPhotoUrl').value;
        state.personal.resumeUrl = document.getElementById('pbResumeUrl').value;
        state.personal.name = state.personal.firstName + ' ' + state.personal.lastName;
      } else if (state.step === 2) {
        state.summary = document.getElementById('pbSummary').value;
        state.skills = document.getElementById('pbSkills').value;
      } else if (state.step === 3) {
        var elist = document.getElementById('pbExpList').children;
        state.experience = [];
        for(var i=0; i<elist.length; i++) {
          var einputs = elist[i].querySelectorAll('input');
          state.experience.push({
            company: einputs[0] ? einputs[0].value : '',
            role: einputs[1] ? einputs[1].value : '',
            duration: einputs[2] ? einputs[2].value : '',
            description: einputs[3] ? einputs[3].value : ''
          });
        }
        var edlist = document.getElementById('pbEduList').children;
        state.education = [];
        for(var i=0; i<edlist.length; i++) {
          var edinputs = edlist[i].querySelectorAll('input');
          state.education.push({
            institution: edinputs[0] ? edinputs[0].value : '',
            degree: edinputs[1] ? edinputs[1].value : '',
            year: edinputs[2] ? edinputs[2].value : ''
          });
        }
      } else if (state.step === 4) {
        var plist = document.getElementById('pbProjList').children;
        state.projects = [];
        for(var i=0; i<plist.length; i++) {
          var pinputs = plist[i].querySelectorAll('input');
          state.projects.push({
            title: pinputs[0] ? pinputs[0].value : '',
            description: pinputs[1] ? pinputs[1].value : '',
            link: pinputs[2] ? pinputs[2].value : '',
            imageUrl: pinputs[3] ? pinputs[3].value : ''
          });
        }
        var clist = document.getElementById('pbCertList').children;
        state.certificates = [];
        for(var i=0; i<clist.length; i++) {
          var cinputs = clist[i].querySelectorAll('input');
          state.certificates.push({
            name: cinputs[0] ? cinputs[0].value : '',
            issuer: cinputs[1] ? cinputs[1].value : '',
            year: cinputs[2] ? cinputs[2].value : '',
            imageUrl: cinputs[3] ? cinputs[3].value : ''
          });
        }
        state.achievements = document.getElementById('pbAchievements').value;
      } else if (state.step === 5) {
        state.socials.linkedin = document.getElementById('pbLinkedin').value;
        state.socials.github = document.getElementById('pbGithub').value;
      }
    }

    function renderRepeater(containerId, dataArray, placeholders) {
      var html = '';
      dataArray.forEach(function(item, idx) {
        html += '<div style="background:#f8fafc;padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;">';
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><strong>Item '+(idx+1)+'</strong><span style="color:#ef4444;cursor:pointer;font-size:12px;" onclick="window.pbRemoveItem(\\\'' + containerId + '\\\', '+idx+')">Remove</span></div>';
        var keys = Object.keys(item);
        keys.forEach(function(k, kIdx) {
          html += '<input class="tool-input" style="margin-bottom:8px;" placeholder="'+placeholders[kIdx]+'" value="'+item[k]+'">';
        });
        html += '</div>';
      });
      document.getElementById(containerId).innerHTML = html;
    }
    
    window.pbRemoveItem = function(type, idx) {
      saveCurrentStep();
      if (type === 'pbExpList') state.experience.splice(idx, 1);
      if (type === 'pbEduList') state.education.splice(idx, 1);
      if (type === 'pbProjList') state.projects.splice(idx, 1);
      if (type === 'pbCertList') state.certificates.splice(idx, 1);
      renderStep();
    };

    function generatePortfolio() {
      saveCurrentStep();
      if (document.getElementById('pbPhotoUrl')) state.personal.photoUrl = document.getElementById('pbPhotoUrl').value.trim();
      if (document.getElementById('pbFirstName')) state.personal.firstName = document.getElementById('pbFirstName').value.trim();
      if (document.getElementById('pbLastName')) state.personal.lastName = document.getElementById('pbLastName').value.trim();
      if (document.getElementById('pbRole')) state.personal.role = document.getElementById('pbRole').value.trim();
      if (document.getElementById('pbEmail')) state.personal.email = document.getElementById('pbEmail').value.trim();
      if (document.getElementById('pbPhone')) state.personal.phone = document.getElementById('pbPhone').value.trim();
      if (document.getElementById('pbResumeUrl')) state.personal.resumeUrl = document.getElementById('pbResumeUrl').value.trim();
      if (document.getElementById('pbAchievements')) state.achievements = document.getElementById('pbAchievements').value.trim();
      if (document.getElementById('pbSummary')) state.summary = document.getElementById('pbSummary').value.trim();
      if (document.getElementById('pbSkills')) state.skills = document.getElementById('pbSkills').value.trim();
      state.personal.name = (state.personal.firstName + ' ' + state.personal.lastName).trim();

      var statusText = document.getElementById('pbStatusText');
      statusText.innerHTML = 'Submitting to AI Agents...<br><span style="color:#6366f1;">Agent 1 (Validator): Checking inputs...</span>';
      
      // Need a unique username for subdomain format
      var username = state.personal.name ? state.personal.name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user' + Math.floor(Math.random()*1000);
      if(!username) username = 'user' + Math.floor(Math.random()*1000);
      
      var payload = {
        user_id: (window.sessionUser ? window.sessionUser.uid : 'guest'),
        username: username,
        data: state
      };
      
      function normalizeImageUrl(url) {
        if (!url) return '';
        url = url.trim().replace(/^['"]|['"]$/g, '');
        var gdriveMatch = url.match(/drive\.google\.com\/.*(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/);
        if (gdriveMatch && gdriveMatch[1]) {
          return 'https://lh3.googleusercontent.com/d/' + gdriveMatch[1];
        }
        if (url.indexOf('dropbox.com') !== -1) {
          return url.replace('dl=0', 'raw=1');
        }
        return url;
      }

      function buildClientSidePortfolioHtml(username, state) {
        var name = state.personal.name || 'My Portfolio';
        var role = state.personal.role || 'Professional';
        var photoUrl = normalizeImageUrl(state.personal.photoUrl || state.personal.photo);
        var primary = state.colorPalette || '#0D6EFD';
        var font = state.font || 'Inter';
        var summary = state.summary || 'Welcome to my professional portfolio.';
        var skills = (state.skills || '').split(',').map(s=>s.trim()).filter(Boolean);

        var validExp = (state.experience || []).filter(e => (e.company||'').trim() || (e.role||'').trim() || (e.description||'').trim());
        var validProj = (state.projects || []).filter(p => (p.title||'').trim() || (p.description||'').trim() || (p.imageUrl||'').trim() || (p.link||'').trim());
        var validEdu = (state.education || []).filter(ed => (ed.institution||'').trim() || (ed.degree||'').trim() || (ed.year||'').trim());
        var validCert = (state.certificates || []).filter(c => (c.name||'').trim() || (c.issuer||'').trim() || (c.imageUrl||'').trim());

        var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">';
        html += '<title>'+name+' | '+role+'</title>';
        html += '<meta name="description" content="'+summary.replace(/"/g, '&quot;')+'">';
        html += '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">';
        html += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">';
        html += '<style>:root{--primary:'+primary+';--text-main:#0f172a;--text-muted:#475569;--bg-base:#f8fafc;}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:"'+font+'",sans-serif;background:var(--bg-base);color:var(--text-main);line-height:1.6;}.navbar{position:sticky;top:0;background:rgba(255,255,255,0.85);backdrop-filter:blur(10px);padding:16px 40px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,0.05);z-index:100;}.nav-brand{font-weight:800;font-size:1.3rem;color:var(--primary);text-decoration:none;}.hero{padding:80px 20px;text-align:center;max-width:800px;margin:0 auto;}.hero img{width:140px;height:140px;border-radius:50%;object-fit:cover;border:4px solid var(--primary);box-shadow:0 8px 24px rgba(13,110,253,0.25);margin-bottom:24px;display:inline-block;}.hero h1{font-size:2.8rem;font-weight:800;margin-bottom:10px;}.hero h2{font-size:1.4rem;color:var(--primary);margin-bottom:20px;}.hero p{color:var(--text-muted);font-size:1.1rem;}.section{max-width:960px;margin:60px auto;padding:0 20px;}.section-title{font-size:1.8rem;font-weight:700;margin-bottom:24px;color:var(--text-main);border-left:4px solid var(--primary);padding-left:12px;}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;}.card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 4px 16px rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.06);transition:transform 0.2s;}.card:hover{transform:translateY(-4px);}.card h3{font-size:1.25rem;margin-bottom:8px;}.card .sub{color:var(--text-muted);font-size:0.9rem;margin-bottom:12px;}.tag-container{display:flex;flex-wrap:wrap;gap:8px;}.tag{background:rgba(13,110,253,0.1);color:var(--primary);padding:6px 14px;border-radius:20px;font-weight:600;font-size:0.9rem;}.proj-img{width:100%;height:180px;object-fit:cover;border-radius:10px;margin-bottom:14px;display:block;}.btn{display:inline-block;background:var(--primary);color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:14px;}footer{text-align:center;padding:50px 20px;color:var(--text-muted);font-size:0.9rem;}</style></head><body>';
        html += '<nav class="navbar"><a href="#" class="nav-brand"><i class="fas fa-briefcase"></i> '+name+'</a></nav>';
        html += '<div class="hero">';
        if (photoUrl) {
          html += '<img src="'+photoUrl+'" alt="'+name+'" onerror="this.onerror=null;this.src=\'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80\';">';
        }
        html += '<h1>'+name+'</h1><h2>'+role+'</h2><p>'+summary+'</p></div>';

        if (skills.length > 0) {
          html += '<div class="section"><h2 class="section-title">Core Competencies</h2><div class="tag-container">';
          skills.forEach(s => html += '<span class="tag">'+s+'</span>');
          html += '</div></div>';
        }
        if (validExp.length > 0) {
          html += '<div class="section"><h2 class="section-title">Experience</h2><div class="grid">';
          validExp.forEach(e => {
            html += '<div class="card"><h3>'+(e.role||'Role')+'</h3><div class="sub"><i class="fas fa-building"></i> '+(e.company||'')+' | '+(e.duration||'')+'</div><p>'+(e.description||'')+'</p></div>';
          });
          html += '</div></div>';
        }
        if (validProj.length > 0) {
          html += '<div class="section"><h2 class="section-title">Selected Projects</h2><div class="grid">';
          validProj.forEach(p => {
            html += '<div class="card">';
            var normProjImg = normalizeImageUrl(p.imageUrl);
            if (normProjImg) {
              html += '<img src="'+normProjImg+'" class="proj-img" alt="'+(p.title||'Project')+'" onerror="this.onerror=null;this.style.display=\'none\';">';
            }
            html += '<h3>'+(p.title||'Project')+'</h3><p>'+(p.description||'')+'</p>';
            if (p.link) html += '<a href="'+p.link+'" target="_blank" class="btn">View Project <i class="fas fa-arrow-right"></i></a>';
            html += '</div>';
          });
          html += '</div></div>';
        }
        if (validEdu.length > 0) {
          html += '<div class="section"><h2 class="section-title">Education</h2><div class="grid">';
          validEdu.forEach(ed => {
            html += '<div class="card"><h3>'+(ed.degree||'Degree')+'</h3><div class="sub"><i class="fas fa-university"></i> '+(ed.institution||'')+' | '+(ed.year||'')+'</div></div>';
          });
          html += '</div></div>';
        }
        if (validCert.length > 0) {
          html += '<div class="section"><h2 class="section-title">Certifications</h2><div class="grid">';
          validCert.forEach(c => {
            html += '<div class="card">';
            var normCertImg = normalizeImageUrl(c.imageUrl);
            if (normCertImg) {
              html += '<img src="'+normCertImg+'" class="proj-img" alt="'+(c.name||'Certificate')+'" onerror="this.onerror=null;this.style.display=\'none\';">';
            }
            html += '<h3>'+(c.name||'Certificate')+'</h3><div class="sub"><i class="fas fa-award"></i> '+(c.issuer||'')+' | '+(c.year||'')+'</div></div>';
          });
          html += '</div></div>';
        }
        var achievementsText = (state.achievements || '').trim();
        if (achievementsText) {
          var achievementLines = achievementsText.split('\n').map(s => s.trim()).filter(Boolean);
          if (achievementLines.length > 0) {
            html += '<div class="section"><h2 class="section-title">Honors &amp; Achievements</h2><div class="grid">';
            achievementLines.forEach(function(item) {
              html += '<div class="card" style="display:flex;align-items:flex-start;gap:14px;"><i class="fas fa-trophy" style="color:#f59e0b;font-size:1.5rem;margin-top:2px;"></i><div><h3 style="margin-bottom:4px;">Achievement</h3><p style="color:var(--text-muted);font-size:0.95rem;">'+item+'</p></div></div>';
            });
            html += '</div></div>';
          }
        }
        html += '<footer>&copy; '+name+' &bull; Powered by AI Portfolio Builder Pro</footer></body></html>';
        return html;
      }

      function renderSuccessUI(url) {
        statusText.innerHTML = '<div style="background:#ecfdf5;border:1px solid #10b981;border-radius:12px;padding:16px;text-align:center;">' +
          '<div style="font-size:1.1rem;font-weight:700;color:#065f46;margin-bottom:8px;">🎉 Your Real Custom Portfolio is Ready!</div>' +
          '<p style="font-size:0.9rem;color:#047857;margin-bottom:12px;">Built using your exact form data, images &amp; animations.</p>' +
          '<a href="'+url+'" target="_blank" style="display:inline-block;background:#10b981;color:#fff;padding:10px 20px;border-radius:8px;font-weight:600;text-decoration:none;box-shadow:0 4px 12px rgba(16,185,129,0.3);">🌐 Open Your Real Portfolio Now</a>' +
          '</div>';
        var btn = document.getElementById('pbOpenUrl');
        if (btn) {
          btn.style.display = 'flex';
          btn.onclick = () => window.open(url, '_blank');
        }
        showToast('Portfolio Generated successfully!', 'success');
      }

      fetch('/api/tools/portfolio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => {
        var ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) {
          throw new Error('StaticServerFallback');
        }
        return res.json();
      })
      .then(data => {
        if (data && data.success) {
          renderSuccessUI(data.url);
        } else {
          throw new Error('FallbackToClientEngine');
        }
      })
      .catch(err => {
        // Automatically build & deploy client-side when hosted on Firebase / Netlify static CDN
        var htmlContent = buildClientSidePortfolioHtml(username, state);
        try {
          localStorage.setItem('portfolio_html_' + username, htmlContent);
          localStorage.setItem('portfolio_latest_html', htmlContent);
        } catch(e){}
        var targetUrl = '/portfolio-viewer.html?u=' + encodeURIComponent(username);
        renderSuccessUI(targetUrl);
      });
    }

    renderStep();
  };

  // ── Initialize ──────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    initSidebar();
    initControls();
    renderGrid();
  });
})();
