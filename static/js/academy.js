/**
 * Academy Frontend Logic
 * Dynamically fetches data from Google Apps Script Backend
 */

const GAS_ACADEMY_URL = "https://script.google.com/macros/s/AKfycbz2tLd0RahqFHzAZ4BNJYSkwnuvZ11XqCDga-B3vBgyYVtcOm-0Roz08_XkEUobi0Cu/exec";
                        
document.addEventListener('DOMContentLoaded', () => {
    // === Data Cache ===
    let academyData = {
        courses: [],
        modules: [],
        lessons: []
    };

    let currentCourse = null;

    // === LocalStorage Manager ===
    const STORAGE_KEY = 'prompt_academy_progress';
    let progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        xp: 0,
        completedLessons: [],
        unlockedCourses: [],
        completedCourses: [],
        unlockedModules: [],
        completedModules: [],
        isEnrolled: false,
        userName: "",
        userEmail: "",
        userId: ""
    };

    function saveProgress() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        updateXPDisplay();
    }

    // === DOM Elements ===
    const modulesContainer = document.getElementById('modules-container'); // We'll show Courses here now
    const roadmapSection = document.getElementById('learning-roadmap');
    const detailView = document.getElementById('module-detail-view');
    const lessonsContainer = document.getElementById('lessons-container');
    const outcomesContainer = document.getElementById('detail-module-outcomes');

    // Header XP
    const xpAmountEl = document.getElementById('user-xp-amount');

    // Detail UI
    const detailTitle = document.getElementById('detail-module-title');
    const detailProgressFill = document.getElementById('detail-module-progress-fill');
    const detailProgressText = document.getElementById('detail-module-progress-text');
    const backBtn = document.getElementById('backToRoadmapBtn');

    // Sidebar overlay toggles
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarDrawer = document.getElementById('sidebarDrawer');

    if (menuToggleBtn) menuToggleBtn.addEventListener('click', () => { sidebarDrawer.classList.add('open'); sidebarOverlay.classList.add('show'); });
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', () => { sidebarDrawer.classList.remove('open'); sidebarOverlay.classList.remove('show'); });
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => { sidebarDrawer.classList.remove('open'); sidebarOverlay.classList.remove('show'); });

    // === API Logic ===
    async function fetchAcademyData() {
        try {
            if (modulesContainer) {
                modulesContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><div class="loading-spinner" style="width: 40px; height: 40px; border: 4px solid var(--color-bg-secondary); border-top: 4px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div><p style="margin-top: 16px; color: var(--color-text-secondary);">Loading Academy Data...</p></div>';
            }

            // For the frontend, we only want PUBLISHED courses. 
            const res = await fetch(GAS_ACADEMY_URL, {
                method: 'POST',
                body: JSON.stringify({ action: "searchCourse" })
            });
            const data = await res.json();

            if (data.success) {
                academyData.courses = (data && data.data && data.data.results)
                    ? data.data.results.filter(c => c.Status === 'PUBLISHED').sort((a, b) => a.OrderIndex - b.OrderIndex)
                    : [];

                // Fetch modules and lessons
                const resMod = await fetch(GAS_ACADEMY_URL, { method: 'POST', body: JSON.stringify({ action: "searchModule" }) });
                const dataMod = await resMod.json();
                academyData.modules = (dataMod && dataMod.data && dataMod.data.results)
                    ? dataMod.data.results.sort((a, b) => a.OrderIndex - b.OrderIndex)
                    : [];

                const resLes = await fetch(GAS_ACADEMY_URL, { method: 'POST', body: JSON.stringify({ action: "searchLesson" }) });
                const dataLes = await resLes.json();
                academyData.lessons = (dataLes && dataLes.data && dataLes.data.results)
                    ? dataLes.data.results.sort((a, b) => a.OrderIndex - b.OrderIndex)
                    : [];

                // Fallback if API is empty or hasn't been populated via Admin Dashboard yet
                if (academyData.courses.length === 0) {
                    academyData.courses = [{
                        CourseID: 'C1',
                        CourseName: 'Prompt Engineering Master Course',
                        CourseLevel: 'Beginner to Advanced',
                        CourseDescription: 'Master Prompt Engineering from Scratch to Professional Level. Build real AI-powered projects. Learn enterprise-grade techniques used by top companies worldwide.',
                        Status: 'PUBLISHED',
                        OrderIndex: 0
                    }];

                    academyData.modules = [];
                    academyData.lessons = [];

                    if (typeof ACADEMY_CURRICULUM !== 'undefined') {
                        ACADEMY_CURRICULUM.forEach(mod => {
                            academyData.modules.push({
                                ModuleID: mod.id,
                                CourseID: 'C1',
                                ModuleNumber: mod.num,
                                ModuleTitle: mod.title,
                                Phase: mod.phase,
                                OrderIndex: mod.num
                            });
                            mod.lessons.forEach(les => {
                                academyData.lessons.push({
                                    LessonID: les.id,
                                    ModuleID: mod.id,
                                    LessonNumber: les.num,
                                    LessonTitle: les.title,
                                    LessonDuration: les.dur,
                                    LessonContent: les.content,
                                    OrderIndex: les.num
                                });
                            });
                        });
                    }
                }

                // Initialize progress for first course if empty
                if (academyData.courses.length > 0 && progress.unlockedCourses.length === 0) {
                    progress.unlockedCourses.push(academyData.courses[0].CourseID);
                    saveProgress();
                }

                if (modulesContainer) {
                    renderCourses();
                }
            } else {
                if (modulesContainer) modulesContainer.innerHTML = `<div class="error-msg">Failed to load courses. Please try again.</div>`;
            }
        } catch (err) {
            console.error(err);
            if (modulesContainer) modulesContainer.innerHTML = `<div class="error-msg">Could not connect to the Academy API. Please check your config.</div>`;
        }
    }

    // === UI Logic ===
    function updateXPDisplay() {
        if (xpAmountEl) {
            xpAmountEl.innerText = progress.xp;
        }
    }

    function renderCourses() {
        if (!modulesContainer) return;
        modulesContainer.innerHTML = '';
        if (academyData.courses.length === 0) {
            modulesContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-secondary);">No courses available at the moment.</div>`;
            return;
        }

        academyData.courses.forEach((course, index) => {
            const isUnlocked = index === 0 || progress.unlockedCourses.includes(course.CourseID);
            const courseModules = academyData.modules.filter(m => m.CourseID === course.CourseID);

            const card = document.createElement('div');
            card.className = `module-card ${isUnlocked ? '' : 'locked'}`;

            card.innerHTML = `
                <div class="module-card-left">
                    <div class="module-number">${index + 1}</div>
                    <div class="module-info">
                        <h3>${course.CourseName}</h3>
                        <div class="module-meta-info">
                            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${course.CourseLevel || 'Beginner'}</span>
                            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg> ${courseModules.length} Modules</span>
                        </div>
                    </div>
                </div>
                <div class="module-card-right">
                    ${isUnlocked ? `
                        <button class="btn btn-primary btn-sm">View Course</button>
                    ` : `
                        <div class="lock-badge">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                    `}
                </div>
            `;

            if (isUnlocked) {
                card.addEventListener('click', () => openCourseDetail(course.CourseID));
            }

            modulesContainer.appendChild(card);
        });
    }

    function openCourseDetail(courseId) {
        if (!progress.isEnrolled) {
            document.getElementById('enrollmentModal').classList.add('show');
            return;
        }

        currentCourse = academyData.courses.find(c => c.CourseID === courseId);
        if (!currentCourse) return;

        roadmapSection.style.display = 'none';
        document.querySelector('.academy-features').style.display = 'none';
        document.querySelector('.academy-hero').style.display = 'none';
        detailView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });

        detailTitle.textContent = currentCourse.CourseName;
        document.getElementById('detail-module-difficulty').textContent = currentCourse.CourseLevel || 'Beginner';

        if (currentCourse.CourseDescription) {
            outcomesContainer.innerHTML = currentCourse.CourseDescription.split('.').filter(x => x.trim()).map(o => `<li>${o.trim()}</li>`).join('');
        } else {
            outcomesContainer.innerHTML = "<li>Master the fundamentals of " + currentCourse.CourseName + "</li>";
        }

        renderCourseContent(courseId);
    }

    function renderCourseContent(courseId) {
        lessonsContainer.innerHTML = '';

        const modules = academyData.modules.filter(m => m.CourseID === courseId);

        let totalLessons = 0;
        let completedLessonsInCourse = 0;

        modules.forEach(mod => {
            const modHeader = document.createElement('div');
            modHeader.className = 'module-section-header';
            modHeader.innerHTML = `<h3 style="margin-top:24px; margin-bottom:16px; border-bottom:1px solid var(--color-border); padding-bottom:8px;">Module ${mod.ModuleNumber}: ${mod.ModuleTitle}</h3>`;
            lessonsContainer.appendChild(modHeader);

            const lessons = academyData.lessons.filter(l => l.ModuleID === mod.ModuleID);

            if (lessons.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'lesson-placeholder';
                empty.innerHTML = '<p>No lessons available in this module yet.</p>';
                lessonsContainer.appendChild(empty);
            }

            lessons.forEach((lesson, index) => {
                totalLessons++;
                const isCompleted = progress.completedLessons.includes(lesson.LessonID);
                if (isCompleted) completedLessonsInCourse++;

                const isUnlocked = true;

                const card = document.createElement('div');
                card.className = `lesson-card ${isUnlocked ? '' : 'locked'} ${isCompleted ? 'completed' : ''}`;

                let statusBadge = isCompleted ? `<span class="status-badge completed">Completed</span>` :
                    (isUnlocked ? `<span class="status-badge pending">Start</span>` :
                        `<span class="status-badge locked">Locked</span>`);

                let iconSvg = isCompleted ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>` :
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;

                card.innerHTML = `
                    <div class="lesson-header" ${isUnlocked ? `onclick="toggleLesson('${lesson.LessonID}')"` : ''}>
                        <div class="lesson-info">
                            <div class="lesson-icon">${iconSvg}</div>
                            <div class="lesson-details">
                                <h4>Lesson ${lesson.LessonNumber}: ${lesson.LessonTitle}</h4>
                                <div class="lesson-meta">
                                    <span>${lesson.LessonDuration || '10:00'} mins</span>
                                    <span>Reward: 50 XP</span>
                                </div>
                            </div>
                        </div>
                        <div class="lesson-actions">
                            ${statusBadge}
                            ${isUnlocked ? `<button class="expand-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></button>` : ''}
                        </div>
                    </div>
                    <div class="lesson-content-body" id="lesson-body-${lesson.LessonID}">
                        <div class="lesson-rich-content">
                            ${lesson.LessonVideoURL ? `<div class="lesson-video mb-4"><iframe src="${lesson.LessonVideoURL}" width="100%" height="400" frameborder="0" allowfullscreen></iframe></div>` : ''}
                            <div class="markdown-content">
                                ${lesson.LessonContent || '<p>No content provided for this lesson.</p>'}
                            </div>
                        </div>
                        <div class="lesson-footer-actions mt-4 pt-4" style="border-top:1px solid var(--color-border); text-align:right;">
                            ${!isCompleted ? `<button class="btn btn-primary" onclick="markLessonComplete('${lesson.LessonID}', 50)">Mark Complete (+50 XP)</button>` : `<button class="btn btn-secondary" disabled>Completed</button>`}
                        </div>
                    </div>
                `;

                lessonsContainer.appendChild(card);
            });
        });

        // Update Progress UI
        const percentage = totalLessons === 0 ? 0 : Math.round((completedLessonsInCourse / totalLessons) * 100);
        detailProgressText.innerText = `${percentage}%`;
        detailProgressFill.style.width = `${percentage}%`;

        document.getElementById('detail-module-lessons').innerText = `${totalLessons} Lessons`;
    }

    backBtn.addEventListener('click', () => {
        detailView.style.display = 'none';
        roadmapSection.style.display = 'block';
        document.querySelector('.academy-features').style.display = 'block';
        document.querySelector('.academy-hero').style.display = 'flex';
        renderCourses();
    });

    window.toggleLesson = function (id) {
        const body = document.querySelector(`#lesson-body-${id}`);
        if (body) {
            const card = body.parentElement;
            card.classList.toggle('expanded');
        }
    }

    window.markLessonComplete = function (id, xp) {
        if (!progress.completedLessons.includes(id)) {
            progress.completedLessons.push(id);
            progress.xp += xp;
            saveProgress();

            if (currentCourse) {
                renderCourseContent(currentCourse.CourseID);
            }
        }
    }

    // Initialize
    updateXPDisplay();
    fetchAcademyData();
    renderRoadmapFromData();

    // === Dynamic Roadmap Rendering & Progress Dashboard ===
    function renderRoadmapFromData() {
        const wrapper = document.getElementById('roadmap-curriculum-wrapper');
        if (!wrapper) return;

        wrapper.innerHTML = '';
        let lastPhase = null;
        let nextIncompleteModuleNum = null;

        let totalLessonsCourse = 0;
        let totalCompletedLessonsCourse = 0;
        let completedModulesCount = 0;

        ACADEMY_CURRICULUM.forEach((module, index) => {
            const moduleNum = index + 1;
            const moduleId = `M${moduleNum}`;

            // Phase Separator
            if (module.phase && module.phase !== lastPhase) {
                const phaseLabel = document.createElement('div');
                phaseLabel.className = 'rm-phase-label';
                phaseLabel.innerText = module.phase;
                wrapper.appendChild(phaseLabel);
                lastPhase = module.phase;
            }

            // Count lesson completion
            const totalLessons = module.lessons.length;
            totalLessonsCourse += totalLessons;

            let completedInModule = 0;
            module.lessons.forEach((l, lessonIndex) => {
                const lessonId = `${moduleId}_L${lessonIndex + 1}`;
                if (progress.completedLessons.includes(lessonId)) {
                    completedInModule++;
                    totalCompletedLessonsCourse++;
                }
            });

            const modulePercent = totalLessons === 0 ? 0 : Math.round((completedInModule / totalLessons) * 100);

            // Determine Lock State
            let isUnlocked = true;
            if (moduleNum > 1) {
                const prevModule = ACADEMY_CURRICULUM[index - 1];
                const prevModuleId = `M${moduleNum - 1}`;
                let prevCompleted = 0;
                prevModule.lessons.forEach((pl, pli) => {
                    if (progress.completedLessons.includes(`${prevModuleId}_L${pli + 1}`)) {
                        prevCompleted++;
                    }
                });
                const prevPercent = prevModule.lessons.length === 0 ? 0 : Math.round((prevCompleted / prevModule.lessons.length) * 100);
                isUnlocked = prevPercent === 100;
            }

            // Sync unlockedModules array in progress
            if (isUnlocked && !progress.unlockedModules.includes(moduleId)) {
                progress.unlockedModules.push(moduleId);
            }

            // Track first incomplete module
            if (modulePercent < 100 && nextIncompleteModuleNum === null && isUnlocked) {
                nextIncompleteModuleNum = moduleNum;
            }

            // Track completed modules
            if (modulePercent === 100) {
                completedModulesCount++;
                if (!progress.completedModules.includes(moduleId)) {
                    progress.completedModules.push(moduleId);
                }
            }

            const card = document.createElement('div');
            card.className = `rm-module-card ${isUnlocked ? '' : 'is-locked'} ${moduleNum === 17 ? 'rm-capstone' : ''}`;
            card.setAttribute('data-module-num', moduleNum);

            // Header status badge
            let badgeHtml = '';
            if (!isUnlocked) {
                badgeHtml = '<span class="rm-module-progress-badge">🔒 Locked</span>';
            } else if (modulePercent === 100) {
                badgeHtml = '<span class="rm-module-progress-badge completed">✓ Completed</span>';
            } else if (modulePercent > 0) {
                badgeHtml = `<span class="rm-module-progress-badge in-progress">⏳ ${modulePercent}%</span>`;
            } else {
                badgeHtml = '<span class="rm-module-progress-badge">0%</span>';
            }

            const metaText = totalLessons > 0
                ? `${totalLessons} Lessons`
                : 'Capstone Assessment';

            card.innerHTML = `
                <div class="rm-module-header" onclick="toggleRoadmapModule(this)">
                    <div class="rm-module-left">
                        <div class="rm-module-num ${moduleNum === 17 ? 'rm-capstone-num' : ''}">${moduleNum < 10 ? '0' + moduleNum : moduleNum}</div>
                        <div>
                            <div class="rm-module-title">${module.title}</div>
                            <div class="rm-module-meta">
                                <span>${metaText}</span>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${badgeHtml}
                        <svg class="rm-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                </div>
                <div class="rm-module-body">
                    <div class="rm-lessons-grid"></div>
                    <div class="rm-action-row"></div>
                </div>
            `;

            // Append lessons inside body
            const lessonsGrid = card.querySelector('.rm-lessons-grid');
            const actionRow = card.querySelector('.rm-action-row');

            if (totalLessons === 0) {
                lessonsGrid.style.display = 'none';
                card.querySelector('.rm-module-body').innerHTML = `
                    <div class="rm-project-tag">🏆 Final Deliverable: Prompt Bazaar SaaS Platform — Live & Deployed</div>
                    <div class="rm-action-row">
                        <span class="rm-action-hint">Graduation Reward: +500 XP & Certificate</span>
                        ${isUnlocked
                        ? `<a href="/academy/module17" class="btn btn-primary btn-sm rm-study-btn" style="background:#7C3AED; border-color:#7C3AED;">Launch Capstone Assessment →</a>`
                        : `<button class="btn btn-secondary btn-sm rm-study-btn locked" disabled>Locked 🔒</button>`
                    }
                    </div>
                `;
            } else {
                module.lessons.forEach((lessonTitle, lessonIndex) => {
                    const lessonNum = lessonIndex + 1;
                    const lessonId = `${moduleId}_L${lessonNum}`;
                    const isLessonCompleted = progress.completedLessons.includes(lessonId);

                    const span = document.createElement('span');
                    span.className = `rm-lesson ${isLessonCompleted ? 'completed' : ''}`;
                    span.setAttribute('data-lesson-id', lessonId);
                    span.innerText = lessonTitle;
                    lessonsGrid.appendChild(span);
                });

                if (isUnlocked) {
                    actionRow.innerHTML = `
                        <span class="rm-action-hint">Potential Reward: +${totalLessons * 50} XP</span>
                        <a href="/academy/module${moduleNum}" class="btn btn-primary btn-sm rm-study-btn">Study Module ${moduleNum} →</a>
                    `;
                } else {
                    actionRow.innerHTML = `
                        <span class="rm-action-hint" style="color: var(--color-danger);">Prerequisite: Complete Module ${moduleNum - 1} first</span>
                        <button class="btn btn-secondary btn-sm rm-study-btn locked" disabled>Locked 🔒</button>
                    `;
                }
            }

            wrapper.appendChild(card);
        });

        // Update overall Progress Dashboard UI
        const overallPercent = totalLessonsCourse === 0 ? 0 : Math.round((totalCompletedLessonsCourse / totalLessonsCourse) * 100);

        const dbPctEl = document.getElementById('db-progress-percentage');
        const dbFillBar = document.getElementById('db-progress-fill-bar');
        const dbModulesEl = document.getElementById('db-completed-modules');
        const dbLessonsEl = document.getElementById('db-completed-lessons');
        const dbXpEl = document.getElementById('db-current-xp');
        const dbBadgesEl = document.getElementById('db-earned-badges');
        const dbRankEl = document.getElementById('db-user-rank-text');

        if (dbPctEl) dbPctEl.innerText = `${overallPercent}%`;
        if (dbFillBar) dbFillBar.style.width = `${overallPercent}%`;
        if (dbModulesEl) dbModulesEl.innerText = `${completedModulesCount} / 17`;
        if (dbLessonsEl) dbLessonsEl.innerText = `${totalCompletedLessonsCourse} / ${totalLessonsCourse}`;
        if (dbXpEl) dbXpEl.innerText = `${progress.xp} XP`;
        if (dbBadgesEl) dbBadgesEl.innerText = completedModulesCount;

        // Level Formula
        const userLevel = Math.floor(progress.xp / 500) + 1;
        let rankName = "Novice Prompt Engineer";
        if (userLevel >= 15) rankName = "Grandmaster AI Architect";
        else if (userLevel >= 10) rankName = "Master AI Developer";
        else if (userLevel >= 6) rankName = "Advanced Prompt Engineer";
        else if (userLevel >= 3) rankName = "Specialist Prompt Engineer";
        else if (userLevel >= 2) rankName = "Apprentice Prompt Engineer";

        if (dbRankEl) {
            dbRankEl.innerText = `Level ${userLevel}: ${rankName}`;
        }

        // Save progress updates
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));

        // Bind Resume Learning button
        const resumeBtn = document.getElementById('db-resume-btn');
        if (resumeBtn) {
            resumeBtn.onclick = (e) => {
                e.preventDefault();
                if (!progress.isEnrolled) {
                    document.getElementById('enrollmentModal').classList.add('show');
                    return;
                }
                const targetModule = nextIncompleteModuleNum || 1;
                window.location.href = `/academy/module${targetModule}`;
            };
        }

        // Bind Start Learning Hero Button
        const startBtn = document.getElementById('startLearningBtn');
        if (startBtn) {
            startBtn.onclick = (e) => {
                e.preventDefault();
                if (!progress.isEnrolled) {
                    document.getElementById('enrollmentModal').classList.add('show');
                    return;
                }
                const targetModule = nextIncompleteModuleNum || 1;
                window.location.href = `/academy/module${targetModule}`;
            };
        }
    }

    // Dynamic toggle handler
    window.toggleRoadmapModule = function (headerElement) {
        const parentCard = headerElement.closest('.rm-module-card');
        if (parentCard && parentCard.classList.contains('is-locked')) {
            const moduleNum = parentCard.getAttribute('data-module-num') || 'next';
            alert(`🔒 Module ${moduleNum} is locked. Complete the previous module's lessons to unlock it!`);
            return;
        }

        // Close all other expanded cards
        const allCards = document.querySelectorAll('.rm-module-card');
        allCards.forEach(card => {
            if (card !== parentCard) {
                card.classList.remove('expanded');
            }
        });

        // Toggle current card
        parentCard.classList.toggle('expanded');
    }

    // === Enrollment Modal Logic ===
    const enrollModal = document.getElementById('enrollmentModal');
    const enrollCloseBtn = document.getElementById('enrollmentCloseBtn');
    const enrollForm = document.getElementById('enrollmentForm');
    const enrollStatus = document.getElementById('enrollmentStatus');
    const enrollSubmitBtn = document.getElementById('enrollSubmitBtn');

    if (enrollCloseBtn) {
        enrollCloseBtn.addEventListener('click', () => {
            enrollModal.classList.remove('show');
        });
    }

    if (enrollForm) {
        enrollForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('enrollFullName').value;
            const email = document.getElementById('enrollEmail').value;

            enrollSubmitBtn.disabled = true;
            enrollSubmitBtn.innerHTML = 'Enrolling... <div class="loading-spinner" style="width: 16px; height: 16px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; vertical-align: middle; margin-left: 8px;"></div>';
            enrollStatus.style.display = 'block';
            enrollStatus.style.color = '#334155';
            enrollStatus.innerText = 'Creating your account...';

            try {
                const res = await fetch(GAS_ACADEMY_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'enroll',
                        fullName: fullName,
                        email: email
                    })
                });

                const data = await res.json();

                if (data.success) {
                    progress.isEnrolled = true;
                    progress.userName = fullName;
                    progress.userEmail = email;
                    progress.userId = data.userId;
                    saveProgress();

                    enrollStatus.style.color = '#10b981';
                    enrollStatus.innerText = 'Successfully enrolled! You can now start learning.';

                    setTimeout(() => {
                        enrollModal.classList.remove('show');
                        enrollSubmitBtn.disabled = false;
                        enrollSubmitBtn.innerText = 'Enroll & Start Learning';

                        if (academyData.courses.length > 0) {
                            openCourseDetail(academyData.courses[0].CourseID);
                        }
                    }, 1500);
                } else {
                    enrollStatus.style.color = '#ef4444';
                    enrollStatus.innerText = data.error || 'Failed to enroll. Please try again.';
                    enrollSubmitBtn.disabled = false;
                    enrollSubmitBtn.innerText = 'Enroll & Start Learning';
                }
            } catch (err) {
                console.error(err);
                enrollStatus.style.color = '#ef4444';
                enrollStatus.innerText = 'Network error. Please try again.';
                enrollSubmitBtn.disabled = false;
                enrollSubmitBtn.innerText = 'Enroll & Start Learning';
            }
        });
    }
});

