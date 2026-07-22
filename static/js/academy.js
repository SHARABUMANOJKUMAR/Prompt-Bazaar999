/**
 * Academy Frontend Logic
 * Dynamically fetches data from Google Apps Script Backend
 */

const GAS_ACADEMY_URL = "https://script.google.com/macros/s/AKfycbwSbT589gY6HbzPxjeuN3JDzJ5iskug5aWDB4IFGFO84lp9UBMr81KxiHxYMHv3Ml2rfA/exec";

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
        completedModules: []
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
                    ? data.data.results.filter(c => c.Status === 'PUBLISHED').sort((a,b) => a.OrderIndex - b.OrderIndex)
                    : [];
                
                // Fetch modules and lessons
                const resMod = await fetch(GAS_ACADEMY_URL, { method: 'POST', body: JSON.stringify({ action: "searchModule" }) });
                const dataMod = await resMod.json();
                academyData.modules = (dataMod && dataMod.data && dataMod.data.results)
                    ? dataMod.data.results.sort((a,b) => a.OrderIndex - b.OrderIndex)
                    : [];
                
                const resLes = await fetch(GAS_ACADEMY_URL, { method: 'POST', body: JSON.stringify({ action: "searchLesson" }) });
                const dataLes = await resLes.json();
                academyData.lessons = (dataLes && dataLes.data && dataLes.data.results)
                    ? dataLes.data.results.sort((a,b) => a.OrderIndex - b.OrderIndex)
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

    window.toggleLesson = function(id) {
        const body = document.querySelector(`#lesson-body-${id}`);
        if(body) {
            const card = body.parentElement;
            card.classList.toggle('expanded');
        }
    }

    window.markLessonComplete = function(id, xp) {
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
    
    // Bind Hero Start Learning Button
    document.getElementById('startLearningBtn').addEventListener('click', () => {
        window.location.href = '/academy/module1';
    });
});
