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
        duration: "45 mins",
        difficulty: "Beginner",
        description: "Understand the fundamentals of Generative AI and how prompt engineering bridges human intent with machine output.",
        objectives: ["Define Prompt Engineering", "Understand LLM limitations", "Write your first clear prompt"],
        theory: `
            <h3>What is Prompt Engineering?</h3>
            <p>Prompt engineering is the practice of designing and refining inputs (prompts) to guide Generative AI models to produce optimal, accurate, and relevant outputs.</p>
            <div class="reader-alert">
                <strong>Key Concept:</strong> AI models don't "think" like humans. They predict the next most likely token based on the context you provide. Better context equals better prediction.
            </div>
            <h3>Core Principles</h3>
            <ul>
                <li><strong>Clarity:</strong> Be explicit about what you want.</li>
                <li><strong>Context:</strong> Provide background information.</li>
                <li><strong>Constraints:</strong> Tell the AI what NOT to do.</li>
            </ul>
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
        if (user) {
            currentUser = user;
            if (headerAvatar) headerAvatar.innerText = user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();
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
                user_id: currentUser.uid,
                email: currentUser.email,
                name: currentUser.displayName || 'User'
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
                user_id: currentUser.uid,
                email: currentUser.email,
                name: currentUser.displayName || 'User',
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
            <div class="dashboard-avatar">${currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}</div>
            <div class="dashboard-stats">
                <h2>Welcome back, ${currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Student'}!</h2>
                <div style="color:var(--pb-text-muted);">Prompt Engineering Master Course</div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${courseProgress.progressPct}%"></div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:0.85rem; color:var(--pb-text-muted);">
                    <span>Overall Progress</span>
                    <span style="font-weight:600; color:var(--pb-primary);">${courseProgress.progressPct}%</span>
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
            
            <div class="reader-footer">
                <button class="btn-reader-nav" onclick="goToDashboard()">Back to Dashboard</button>
                ${!isCompleted ? `<button class="btn-reader-complete" onclick="triggerCompleteModule(${id})">Complete Module</button>` : `<div style="color:#10b981; font-weight:600;"><i class="fas fa-check-circle"></i> Module Completed</div>`}
            </div>
        </div>
    `;

    viewContainer.innerHTML = html;
    window.scrollTo(0, 0);
    hideLoading();
}
