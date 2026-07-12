import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Initialize Firebase
const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);

// Apps Script Endpoint
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw995twwCFv2Mp72WaEbMzn5KsPok1KmP-oMcTv380PTNBTQWYua27sC8NWmT8eAIO6/exec';

// State
let currentUser = null;
let courseProgress = null;
let currentView = 'home'; // 'home', 'dashboard', 'module_reader'
let activeModuleId = null;

// DOM Elements
const viewContainer = document.getElementById('academy-view');
const loadingOverlay = document.getElementById('academy-loading');
const toastContainer = document.getElementById('toastContainer');
const headerAvatar = document.getElementById('headerUserAvatar');

// Course Data (Modules)
const COURSE_DATA = [
    {
        id: 1,
        title: "Introduction to Prompt Engineering",
        duration: "1 hour",
        difficulty: "Beginner",
        description: "Learn the core concepts of LLMs, how they work, and why prompt engineering is a critical skill.",
        objectives: ["Understand LLM Architecture", "Learn tokenization basics", "Write your first structured prompt"],
        theory: `
            <h3>Simple English Explanation</h3>
            <p>Prompt engineering is the art of communicating with AI. Just like you would give clear instructions to an intern, you need to give clear, structured instructions to an AI model to get the best results. It involves choosing the right words, context, and formatting.</p>
            
            <h3>Real-Time Examples</h3>
            <p><strong>Bad Prompt:</strong> "Write an email to my boss about being late."<br>
            <strong>Good Prompt:</strong> "Act as a professional employee. Write a polite and concise email to my manager explaining that I will be 30 minutes late today due to unexpected traffic. Apologize for the inconvenience and assure them I will make up the time."</p>

            <h3>Industry Use Cases</h3>
            <ul>
                <li><strong>Customer Support:</strong> Automating ticket routing and drafting responses.</li>
                <li><strong>Marketing:</strong> Generating SEO-optimized blog posts and ad copy.</li>
                <li><strong>Software Development:</strong> Writing boilerplate code, unit tests, and documentation.</li>
            </ul>

            <h3>Best Practices</h3>
            <ul>
                <li>Always provide context and persona.</li>
                <li>Be specific about the desired output format (e.g., JSON, Markdown table).</li>
                <li>Use delimiters (like """ or ###) to separate instructions from data.</li>
            </ul>

            <h3>Common Mistakes</h3>
            <ul>
                <li>Being too vague or assuming the AI "knows what you mean."</li>
                <li>Providing conflicting instructions in the same prompt.</li>
                <li>Failing to specify the target audience or tone.</li>
            </ul>

            <h3>Summary</h3>
            <p>Prompt engineering is an essential skill that transforms how we interact with AI. By mastering clarity, structure, and context, you can unlock the full potential of Large Language Models across any industry.</p>
        `
    },
    {
        id: 2,
        title: "Prompt Fundamentals",
        duration: "1 hour",
        difficulty: "Beginner",
        description: "Learn the core structure of a perfect prompt: Context, Instructions, Constraints, and Output Formatting.",
        objectives: ["Master the CICO framework", "Use delimiters effectively"],
        theory: "<p>Placeholder theory for Module 2.</p>"
    },
    {
        id: 3,
        title: "Advanced Prompting",
        duration: "1.5 hours",
        difficulty: "Intermediate",
        description: "Explore advanced techniques like Few-Shot prompting, Chain of Thought, and ReAct frameworks.",
        objectives: ["Implement Few-Shot", "Use Chain of Thought reasoning"],
        theory: "<p>Placeholder theory for Module 3.</p>"
    },
    {
        id: 4,
        title: "Prompt Optimization",
        duration: "1 hour",
        difficulty: "Intermediate",
        description: "Reduce token usage, eliminate hallucinations, and fine-tune outputs for production environments.",
        objectives: ["Token optimization", "Hallucination mitigation"],
        theory: "<p>Placeholder theory for Module 4.</p>"
    },
    {
        id: 5,
        title: "Business Prompting",
        duration: "2 hours",
        difficulty: "Advanced",
        description: "Apply prompt engineering to marketing, sales, HR, and daily business operations.",
        objectives: ["Marketing automation prompts", "Data analysis prompts"],
        theory: "<p>Placeholder theory for Module 5.</p>"
    },
    {
        id: 6,
        title: "Developer Prompting",
        duration: "2 hours",
        difficulty: "Advanced",
        description: "Write prompts for code generation, debugging, architecture planning, and API integrations.",
        objectives: ["Code generation", "Refactoring with AI"],
        theory: "<p>Placeholder theory for Module 6.</p>"
    },
    {
        id: 7,
        title: "AI Agents & Automation",
        duration: "2.5 hours",
        difficulty: "Expert",
        description: "Build autonomous agent workflows and connect LLMs to external tools and APIs.",
        objectives: ["Agent architecture", "Tool usage"],
        theory: "<p>Placeholder theory for Module 7.</p>"
    },
    {
        id: 8,
        title: "Interview Preparation & Capstone",
        duration: "3 hours",
        difficulty: "Expert",
        description: "Prepare for Prompt Engineering interviews and complete a real-world capstone project.",
        objectives: ["Mock interviews", "Final capstone submission"],
        theory: "<p>Placeholder theory for Module 8.</p>"
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupSidebar();
    
    // Auth Listener
    onAuthStateChanged(auth, (user) => {
        let localUser = localStorage.getItem('currentUser');
        if (localUser) {
            try { localUser = JSON.parse(localUser); } catch(e) { localUser = null; }
        }

        if (user || localUser) {
            currentUser = user || localUser;
            // Handle differences between Firebase User object and localUser object
            const displayName = currentUser.displayName || currentUser.full_name || currentUser.name || '';
            const email = currentUser.email || '';
            const avatarChar = displayName ? displayName.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : 'U');
            
            if (headerAvatar) headerAvatar.innerText = avatarChar;
            fetchProgress();
        } else {
            // Render Home view for guests
            currentUser = null;
            if (headerAvatar) headerAvatar.innerText = 'U';
            renderHome();
        }
    });
});

function setupSidebar() {
    const toggle = document.getElementById('menuToggleBtn');
    const close = document.getElementById('sidebarCloseBtn');
    const overlay = document.getElementById('sidebarOverlay');
    const drawer = document.getElementById('sidebarDrawer');

    if (toggle) toggle.addEventListener('click', () => { drawer.classList.add('open'); overlay.classList.add('show'); });
    if (close) close.addEventListener('click', () => { drawer.classList.remove('open'); overlay.classList.remove('show'); });
    if (overlay) overlay.addEventListener('click', () => { drawer.classList.remove('open'); overlay.classList.remove('show'); });
}

function showToast(msg, type='success') {
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.innerText = msg;
    toastContainer.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

// API Calls
async function fetchProgress() {
    showLoading();
    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'get_academy',
                user_id: currentUser.uid || currentUser.user_id,
                email: currentUser.email,
                name: currentUser.displayName || currentUser.full_name || currentUser.name || 'User'
            })
        });
        const data = await res.json();
        if (data.success) {
            courseProgress = data.progress; // { currentModule: 1, completedModules: 0, progressPct: 0 }
            renderDashboard(); // Default to dashboard if logged in
        } else {
            throw new Error(data.error || 'Failed to fetch progress');
        }
    } catch (e) {
        console.error(e);
        showToast("Error loading course progress", "error");
        // Fallback progress
        courseProgress = { currentModule: 1, completedModules: 0, progressPct: 0 };
        renderDashboard();
    }
}

async function completeModule(moduleId) {
    if (moduleId > courseProgress.completedModules + 1) {
        showToast("You cannot complete this module yet.", "error");
        return;
    }
    
    showLoading();
    
    // Calculate new progress
    let newCompleted = Math.max(courseProgress.completedModules, moduleId);
    let newCurrent = newCompleted < 8 ? newCompleted + 1 : 8;
    let newPct = Math.round((newCompleted / 8) * 100);

    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'update_academy',
                user_id: currentUser.uid || currentUser.user_id,
                email: currentUser.email,
                name: currentUser.displayName || currentUser.full_name || currentUser.name || 'User',
                completedModules: newCompleted,
                currentModule: newCurrent,
                progressPct: newPct
            })
        });
        const data = await res.json();
        if (data.success) {
            courseProgress.completedModules = newCompleted;
            courseProgress.currentModule = newCurrent;
            courseProgress.progressPct = newPct;
            showToast("Module " + moduleId + " Completed! 🎉");
            renderDashboard();
        } else {
            throw new Error(data.error || 'Failed to update progress');
        }
    } catch (e) {
        console.error(e);
        showToast("Error saving progress", "error");
        hideLoading();
    }
}

// UI Rendering
function showLoading() {
    viewContainer.style.display = 'none';
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
    viewContainer.style.display = 'block';
}

window.goToDashboard = function() {
    if (!currentUser) {
        window.location.href = '/login.html?redirect=/academy';
        return;
    }
    renderDashboard();
};

window.goToModule = function(id) {
    if (!currentUser) {
        window.location.href = '/login.html?redirect=/academy';
        return;
    }
    if (id > courseProgress.completedModules + 1) {
        showToast("This module is locked.", "error");
        return;
    }
    renderModuleReader(id);
};

window.triggerCompleteModule = function(id) {
    completeModule(id);
};

function renderHome() {
    currentView = 'home';
    let html = `
        <div class="academy-hero">
            <div class="hero-content">
                <div class="academy-hero-badges">
                    <span class="hero-badge"><i class="fas fa-graduation-cap"></i> Prompt Bazaar Academy</span>
                    <span class="hero-badge"><i class="fas fa-star"></i> Professional Certification</span>
                </div>
                <h1>Prompt Engineering Master Course</h1>
                <p>Learn Prompt Engineering from Scratch to Professional Level with Real-World Projects, Company Tasks, and Industry Experience.</p>
                <div style="display:flex; gap:16px; margin-top:30px;">
                    <button class="btn-academy-primary" onclick="goToDashboard()">Start Learning</button>
                    <a href="#curriculum" class="btn-academy-secondary">View Course Curriculum</a>
                </div>
            </div>
        </div>

        <div class="overview-grid">
            <div class="overview-card">
                <h3>Duration</h3>
                <div class="stat">14+ Hours</div>
            </div>
            <div class="overview-card">
                <h3>Level</h3>
                <div class="stat">Beginner to Expert</div>
            </div>
            <div class="overview-card">
                <h3>Modules</h3>
                <div class="stat">8 Modules</div>
            </div>
            <div class="overview-card">
                <h3>Projects</h3>
                <div class="stat">4 Assignments</div>
            </div>
        </div>

        <div class="roadmap-container" id="curriculum">
            <h2 class="roadmap-title">Course Curriculum</h2>
    `;
    
    COURSE_DATA.forEach(mod => {
        html += `
            <div class="roadmap-item">
                <div class="roadmap-icon">${mod.id}</div>
                <div class="roadmap-content">
                    <h4>${mod.title}</h4>
                    <p>${mod.description}</p>
                    <div style="margin-top:12px; font-size:0.85rem; color:var(--pb-text-muted);">
                        <span><i class="far fa-clock"></i> ${mod.duration}</span> &nbsp;&nbsp;|&nbsp;&nbsp; 
                        <span><i class="fas fa-layer-group"></i> ${mod.difficulty}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    viewContainer.innerHTML = html;
    hideLoading();
}

function renderDashboard() {
    currentView = 'dashboard';
    let html = `
        <div class="dashboard-header">
            <div class="dashboard-avatar">${currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : (currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U')}</div>
            <div class="dashboard-stats">
                <h2>Welcome back, ${currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Student'}!</h2>
                <div style="color:var(--pb-text-muted);">Prompt Engineering Master Course</div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${courseProgress.progressPct}%"></div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:0.9rem; color:var(--pb-text-muted);">
                    <span>Overall Progress</span>
                    <span style="font-weight:700; color:var(--pb-primary);">${courseProgress.progressPct}%</span>
                </div>
                
                <div class="dashboard-badges">
                    <div class="dash-badge">
                        <i class="fas fa-fire" style="color:#ef4444;"></i> <span>3 Day Streak</span>
                    </div>
                    <div class="dash-badge">
                        <i class="fas fa-star" style="color:#eab308;"></i> <span>1250 XP</span>
                    </div>
                    <div class="dash-badge">
                        <i class="fas fa-certificate" style="color:var(--pb-primary);"></i> <span>Level 2</span>
                    </div>
                </div>
            </div>
        </div>

        <h3 style="margin-bottom:24px;">Course Modules</h3>
        <div class="module-grid">
    `;

    COURSE_DATA.forEach((mod, idx) => {
        const isLocked = mod.id > courseProgress.completedModules + 1;
        const isCompleted = mod.id <= courseProgress.completedModules;
        
        let statusBadge = '';
        if (isCompleted) statusBadge = '<span style="color:#10b981; font-weight:600;"><i class="fas fa-check-circle"></i> Completed</span>';
        else if (!isLocked) statusBadge = '<span style="color:var(--pb-primary); font-weight:600;"><i class="fas fa-play-circle"></i> In Progress</span>';
        else statusBadge = '<span style="color:var(--pb-text-muted);"><i class="fas fa-lock"></i> Locked</span>';

        let btnClass = isLocked ? 'btn-module-action locked-btn' : 'btn-module-action';
        let btnText = isCompleted ? 'Review Module' : (isLocked ? 'Locked' : 'Start Learning');
        let clickAttr = isLocked ? '' : `onclick="goToModule(${mod.id})"`;

        html += `
            <div class="module-card ${isLocked ? 'locked' : ''}">
                <div class="module-card-header">
                    <span class="mod-num">Module ${mod.id}</span>
                    ${statusBadge}
                </div>
                <div class="module-card-body">
                    <h3>${mod.title}</h3>
                    <p>${mod.description}</p>
                    <div style="display:flex; gap:16px; font-size:0.85rem; color:var(--pb-text-muted);">
                        <span><i class="far fa-clock"></i> ${mod.duration}</span>
                        <span><i class="fas fa-layer-group"></i> ${mod.difficulty}</span>
                    </div>
                </div>
                <div class="module-card-footer">
                    <button class="${btnClass}" ${clickAttr}>${btnText}</button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    viewContainer.innerHTML = html;
    hideLoading();
}

function renderModuleReader(id) {
    currentView = 'module_reader';
    const mod = COURSE_DATA.find(m => m.id === id);
    if (!mod) return;
    
    activeModuleId = id;
    const isCompleted = id <= courseProgress.completedModules;

    let html = `
        <div class="reader-container">
            <div class="reader-header">
                <div class="reader-breadcrumb">
                    <a href="javascript:void(0)" onclick="goToDashboard()">Course Dashboard</a> / Module ${id}
                </div>
                <h1>${mod.title}</h1>
                <div style="margin-top:12px; color:var(--pb-text-muted); display:flex; gap:16px;">
                    <span><i class="far fa-clock"></i> ${mod.duration}</span>
                    <span><i class="fas fa-bullseye"></i> ${mod.difficulty}</span>
                </div>
            </div>
            
            <div class="reader-content">
                <h2>Learning Objectives</h2>
                <ul>
                    ${mod.objectives.map(obj => `<li>${obj}</li>`).join('')}
                </ul>
                
                ${mod.theory}
                
                <!-- Placeholders for Phase 2 -->
                <div class="reader-alert" style="background:#f1f5f9; border-color:#94a3b8; margin-top:60px;">
                    <i class="fas fa-lock"></i> <strong>Interactive Quiz & Assignment</strong> (Coming in Phase 2)
                </div>
            </div>
            
            <div class="reader-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                <div class="reader-nav-buttons" style="display:flex; gap:12px;">
                    ${id > 1 ? `<button class="btn-reader-nav" onclick="goToModule(${id - 1})"><i class="fas fa-chevron-left"></i> Previous Module</button>` : `<button class="btn-reader-nav" disabled style="opacity:0.5; cursor:not-allowed;"><i class="fas fa-chevron-left"></i> Previous Module</button>`}
                    ${id < 8 ? `<button class="btn-reader-nav" onclick="goToModule(${id + 1})">Next Module <i class="fas fa-chevron-right"></i></button>` : ''}
                </div>
                <div class="reader-action-buttons">
                    ${!isCompleted ? `<button class="btn-reader-complete" onclick="triggerCompleteModule(${id})">Complete Module</button>` : `<div style="color:#10b981; font-weight:600;"><i class="fas fa-check-circle"></i> Module Completed</div>`}
                </div>
            </div>
        </div>
    `;

    viewContainer.innerHTML = html;
    window.scrollTo(0, 0);
    hideLoading();
}
