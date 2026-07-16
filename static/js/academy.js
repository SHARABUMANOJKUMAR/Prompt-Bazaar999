document.addEventListener('DOMContentLoaded', () => {
    // === Data Structures ===
    const MODULES = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: i === 0 ? "AI & Generative AI Fundamentals" : `Module ${i + 1} Title`,
        difficulty: i === 0 ? "Beginner" : "Intermediate",
        duration: "8 Hours",
        lessonsCount: 15,
        quizCount: 15,
        xpReward: 500
    }));

    const LESSONS = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        title: `Lesson ${i + 1}: Placeholder Title`,
        readingTime: "5 mins",
        xpReward: 50
    }));

    const LEARNING_OUTCOMES = [
        "Understand Artificial Intelligence",
        "Machine Learning",
        "Deep Learning",
        "Natural Language Processing",
        "Transformers",
        "Large Language Models",
        "Tokens",
        "Embeddings",
        "Context Windows",
        "Temperature",
        "Top-P",
        "Hallucinations",
        "AI Ethics",
        "Responsible AI"
    ];

    // === LocalStorage Manager ===
    const STORAGE_KEY = 'prompt_academy_progress';
    let progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        xp: 0,
        completedLessons: [],
        unlockedLessons: [1],
        completedModules: [],
        unlockedModules: [1]
    };

    function saveProgress() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        updateXPDisplay();
    }

    // === DOM Elements ===
    const modulesContainer = document.getElementById('modules-container');
    const roadmapSection = document.getElementById('learning-roadmap');
    const detailView = document.getElementById('module-detail-view');
    const lessonsContainer = document.getElementById('lessons-container');
    const outcomesContainer = document.getElementById('detail-module-outcomes');
    
    // Header XP
    const xpAmountEl = document.getElementById('user-xp-amount');

    // Detail UI
    const detailProgressFill = document.getElementById('detail-module-progress-fill');
    const detailProgressText = document.getElementById('detail-module-progress-text');
    const quizCard = document.getElementById('quiz-card');
    const projectCard = document.getElementById('project-card');
    const certCard = document.getElementById('certificate-card');
    const backBtn = document.getElementById('backToRoadmapBtn');

    // Sidebar overlay toggles (existing Prompt Bazaar UI pattern)
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarDrawer = document.getElementById('sidebarDrawer');

    if (menuToggleBtn) menuToggleBtn.addEventListener('click', () => { sidebarDrawer.classList.add('open'); sidebarOverlay.classList.add('show'); });
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', () => { sidebarDrawer.classList.remove('open'); sidebarOverlay.classList.remove('show'); });
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => { sidebarDrawer.classList.remove('open'); sidebarOverlay.classList.remove('show'); });

    // === UI Logic ===

    function updateXPDisplay() {
        if (xpAmountEl) {
            xpAmountEl.innerText = progress.xp;
        }
    }

    function renderModules() {
        modulesContainer.innerHTML = '';
        MODULES.forEach(mod => {
            const isUnlocked = progress.unlockedModules.includes(mod.id);
            const isCompleted = progress.completedModules.includes(mod.id);
            
            // Calculate progress for Module 1
            let progressPercentage = 0;
            if (mod.id === 1) {
                progressPercentage = Math.round((progress.completedLessons.length / LESSONS.length) * 100);
            }

            const card = document.createElement('div');
            card.className = `module-card ${isUnlocked ? '' : 'locked'}`;
            
            card.innerHTML = `
                <div class="module-card-left">
                    <div class="module-number">${mod.id}</div>
                    <div class="module-info">
                        <h3>${mod.title}</h3>
                        <div class="module-meta-info">
                            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${mod.duration}</span>
                            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg> ${mod.lessonsCount} Lessons</span>
                        </div>
                    </div>
                </div>
                <div class="module-card-right">
                    ${isUnlocked ? `
                        <div class="module-progress">
                            <span class="progress-text">${progressPercentage}%</span>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" style="width: ${progressPercentage}%"></div>
                            </div>
                        </div>
                    ` : `
                        <div class="lock-badge">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                    `}
                </div>
            `;

            if (isUnlocked) {
                card.addEventListener('click', () => openModuleDetail(mod.id));
            }
            
            modulesContainer.appendChild(card);
        });
    }

    function renderLessons() {
        lessonsContainer.innerHTML = '';
        LESSONS.forEach((lesson, index) => {
            const isUnlocked = progress.unlockedLessons.includes(lesson.id);
            const isCompleted = progress.completedLessons.includes(lesson.id);
            
            const card = document.createElement('div');
            card.className = `lesson-card ${isUnlocked ? '' : 'locked'} ${isCompleted ? 'completed' : ''}`;
            
            let statusBadge = isCompleted ? `<span class="status-badge completed">Completed</span>` : 
                             (isUnlocked ? `<span class="status-badge pending">In Progress</span>` : 
                                           `<span class="status-badge locked">Locked</span>`);
                                           
            let iconSvg = isCompleted ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>` : 
                                        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;

            card.innerHTML = `
                <div class="lesson-header" ${isUnlocked ? `onclick="toggleLesson(${lesson.id})"` : ''}>
                    <div class="lesson-info">
                        <div class="lesson-icon">${iconSvg}</div>
                        <div class="lesson-details">
                            <h4>Lesson ${lesson.id}: ${lesson.title}</h4>
                            <div class="lesson-meta">
                                <span>Reading time: ${lesson.readingTime}</span>
                                <span>Reward: ${lesson.xpReward} XP</span>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-actions">
                        ${statusBadge}
                        ${isUnlocked ? `<button class="expand-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></button>` : ''}
                    </div>
                </div>
                <div class="lesson-content-body" id="lesson-body-${lesson.id}">
                    <div class="lesson-placeholder">
                        <p>This lesson content will be generated in the next phase.</p>
                    </div>
                    <div class="lesson-footer-actions">
                        ${!isCompleted ? `<button class="btn btn-primary" onclick="markLessonComplete(${lesson.id}, ${lesson.xpReward})">Mark Complete</button>` : `<button class="btn btn-secondary" disabled>Completed</button>`}
                    </div>
                </div>
            `;
            
            lessonsContainer.appendChild(card);
        });
    }

    function updateModuleProgressUI() {
        const percentage = Math.round((progress.completedLessons.length / LESSONS.length) * 100);
        detailProgressText.innerText = `${percentage}%`;
        detailProgressFill.style.width = `${percentage}%`;
        
        // Unlock quiz if all lessons completed
        if (progress.completedLessons.length === LESSONS.length) {
            quizCard.classList.remove('locked');
            quizCard.querySelector('button').innerText = 'Start Quiz';
            quizCard.querySelector('button').disabled = false;
            quizCard.querySelector('button').classList.replace('btn-secondary', 'btn-primary');
        }
    }

    function openModuleDetail(moduleId) {
        if (moduleId !== 1) return; // Only Module 1 is allowed for now
        
        roadmapSection.style.display = 'none';
        document.querySelector('.academy-features').style.display = 'none';
        document.querySelector('.academy-hero').style.display = 'none';
        detailView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Populate outcomes
        outcomesContainer.innerHTML = LEARNING_OUTCOMES.map(o => `<li>${o}</li>`).join('');

        renderLessons();
        updateModuleProgressUI();
    }

    backBtn.addEventListener('click', () => {
        detailView.style.display = 'none';
        roadmapSection.style.display = 'block';
        document.querySelector('.academy-features').style.display = 'block';
        document.querySelector('.academy-hero').style.display = 'flex';
        renderModules();
    });

    window.toggleLesson = function(id) {
        const card = document.querySelector(`#lesson-body-${id}`).parentElement;
        card.classList.toggle('expanded');
    }

    window.markLessonComplete = function(id, xp) {
        if (!progress.completedLessons.includes(id)) {
            progress.completedLessons.push(id);
            progress.xp += xp;
            
            // Unlock next lesson
            if (id < LESSONS.length && !progress.unlockedLessons.includes(id + 1)) {
                progress.unlockedLessons.push(id + 1);
            }
            
            saveProgress();
            renderLessons();
            updateModuleProgressUI();
            
            // Open the next lesson automatically
            if (id < LESSONS.length) {
                setTimeout(() => toggleLesson(id + 1), 300);
            }
        }
    }

    // Initialize
    updateXPDisplay();
    renderModules();
    
    // Bind Hero Start Learning Button
    document.getElementById('startLearningBtn').addEventListener('click', () => {
        openModuleDetail(1);
    });
});
