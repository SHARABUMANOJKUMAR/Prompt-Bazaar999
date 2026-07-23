/**
 * Academy Textbook Module Progress Tracker
 * Dynamically handles lesson completion, XP updates, and progress indicator injections
 * on individual /academy/moduleX pages.
 */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const moduleMatch = path.match(/\/academy\/module(\d+)/);
    if (!moduleMatch) return;

    const moduleNum = parseInt(moduleMatch[1]);
    const moduleId = `M${moduleNum}`;
    
    // === LocalStorage Key ===
    const STORAGE_KEY = 'prompt_academy_progress';
    let progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        xp: 0,
        completedLessons: [],
        unlockedCourses: [],
        completedCourses: [],
        unlockedModules: [],
        completedModules: []
    };

    // Save Progress Helper
    function saveProgress() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        updateHeaderXP();
        updateProgressUI();
    }

    // Update Header XP if present
    function updateHeaderXP() {
        const xpAmountEl = document.getElementById('user-xp-amount');
        if (xpAmountEl) {
            xpAmountEl.innerText = progress.xp;
        }
    }

    // Find all lesson cards on the page
    const lessonCards = document.querySelectorAll('.lesson-card');
    if (lessonCards.length === 0) return;

    // Track total lessons for the progress bar
    const totalLessons = lessonCards.length;

    // Inject styles for badges, checkmarks, and bottom bar
    const style = document.createElement('style');
    style.innerHTML = `
        .lesson-card {
            position: relative;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1.5px solid var(--color-border, #E5E7EB) !important;
        }
        .lesson-card.is-completed {
            border-color: #22C55E !important;
            box-shadow: 0 8px 30px rgba(34, 197, 94, 0.08) !important;
            background: linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 100%) !important;
        }
        .lesson-status-badge {
            position: absolute;
            top: 24px;
            right: 24px;
            font-size: 12px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 9999px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .lesson-status-badge.pending {
            background-color: var(--color-bg-tertiary, #F1F5F9);
            color: var(--color-text-secondary, #475569);
        }
        .lesson-status-badge.completed {
            background-color: #DCFCE7;
            color: #15803D;
        }
        .btn-lesson-complete {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 12px 24px;
            margin-top: 24px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
        }
        .btn-lesson-complete.pending {
            background-color: var(--color-primary, #0D6EFD);
            color: #FFFFFF;
            box-shadow: 0 4px 12px rgba(13, 110, 253, 0.15);
        }
        .btn-lesson-complete.pending:hover {
            background-color: var(--color-primary-hover, #0B5ED7);
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(13, 110, 253, 0.25);
        }
        .btn-lesson-complete.completed {
            background-color: #22C55E;
            color: #FFFFFF;
            cursor: not-allowed;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
        }
        
        /* Floating Progress Tracker Bar at Bottom */
        .academy-bottom-bar {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            width: 90%;
            max-width: 800px;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1.5px solid rgba(229, 231, 235, 0.8);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
            padding: 16px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            z-index: 1000;
            transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .academy-bottom-bar.show {
            transform: translateX(-50%) translateY(0);
        }
        .bottom-bar-left {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
        }
        .bottom-bar-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--color-text-primary, #0F172A);
        }
        .bottom-bar-progress-container {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
        }
        .bottom-bar-progress-bg {
            flex: 1;
            height: 8px;
            background: #E2E8F0;
            border-radius: 999px;
            overflow: hidden;
        }
        .bottom-bar-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--color-primary, #0D6EFD), #22C55E);
            border-radius: 999px;
            width: 0%;
            transition: width 0.4s ease;
        }
        .bottom-bar-percentage {
            font-size: 13px;
            font-weight: 700;
            color: var(--color-text-secondary, #475569);
            min-width: 40px;
            text-align: right;
        }
        .bottom-bar-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .bottom-bar-btn {
            padding: 10px 18px;
            border-radius: 10px;
            font-size: 13.5px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .bottom-bar-btn-secondary {
            background-color: var(--color-bg-tertiary, #F1F5F9);
            color: var(--color-text-secondary, #475569);
            border: 1.5px solid var(--color-border, #E5E7EB);
        }
        .bottom-bar-btn-secondary:hover {
            background-color: var(--color-border, #E5E7EB);
        }
        
        @media (max-width: 640px) {
            .academy-bottom-bar {
                flex-direction: column;
                align-items: stretch;
                bottom: 16px;
                padding: 16px;
                gap: 12px;
            }
            .bottom-bar-actions {
                justify-content: space-between;
            }
            .bottom-bar-btn {
                flex: 1;
                justify-content: center;
            }
            .lesson-status-badge {
                position: static;
                margin-bottom: 12px;
                margin-top: -8px;
            }
        }
    `;
    document.head.appendChild(style);

    // Dynamic lesson processing
    lessonCards.forEach((card, index) => {
        const lessonNum = index + 1;
        const lessonId = `${moduleId}_L${lessonNum}`;
        const isCompleted = progress.completedLessons.includes(lessonId);

        // Adjust card classes
        if (isCompleted) {
            card.classList.add('is-completed');
        }

        // 1. Inject Top Right Status Badge
        const statusBadge = document.createElement('span');
        statusBadge.className = `lesson-status-badge ${isCompleted ? 'completed' : 'pending'}`;
        statusBadge.innerHTML = isCompleted ? 'Completed ✓' : 'Reading';
        card.appendChild(statusBadge);

        const isQuiz = card.getAttribute('data-is-quiz') === 'true';

        // 2. Inject Bottom Completion Button
        const completeBtn = document.createElement('button');
        completeBtn.className = `btn-lesson-complete ${isCompleted ? 'completed' : 'pending'}`;
        
        if (isQuiz) {
            completeBtn.innerHTML = isCompleted ? 'Quiz Passed ✓' : 'Submit Final Quiz';
        } else {
            completeBtn.innerHTML = isCompleted ? 'Completed ✓' : 'Mark Lesson Complete (+50 XP)';
        }
        if (isCompleted) {
            completeBtn.disabled = true;
        }

        // Bind click event
        completeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (progress.completedLessons.includes(lessonId)) return;

            if (isQuiz) {
                // EXAMINER QUIZ EVALUATION LOGIC
                const radioGroups = {};
                const allRadios = card.querySelectorAll('input[type=\"radio\"]');
                allRadios.forEach(r => {
                    if (!radioGroups[r.name]) radioGroups[r.name] = [];
                    radioGroups[r.name].push(r);
                });
                
                let allCorrect = true;
                let correctCount = 0;
                let totalQuestions = Object.keys(radioGroups).length;
                Object.keys(radioGroups).forEach(groupName => {
                    const radios = radioGroups[groupName];
                    let groupCorrect = false;
                    let hasSelection = false;
                    
                    radios.forEach(r => {
                        // Reset parent label style
                        r.parentElement.style.borderColor = 'var(--color-border)';
                        r.parentElement.style.backgroundColor = 'var(--color-bg-secondary)';
                        
                        if (r.checked) {
                            hasSelection = true;
                            if (r.getAttribute('data-correct') === 'true') {
                                groupCorrect = true;
                                r.parentElement.style.borderColor = '#22c55e';
                                r.parentElement.style.backgroundColor = '#f0fdf4';
                            } else {
                                r.parentElement.style.borderColor = '#ef4444';
                                r.parentElement.style.backgroundColor = '#fef2f2';
                            }
                        }
                    });
                    
                    if (!hasSelection || !groupCorrect) {
                        allCorrect = false;
                    } else {
                        correctCount++;
                    }
                });
                
                if (!allCorrect) {
                    let wrongCount = totalQuestions - correctCount;
                    alert(`Quiz Evaluation:\nCorrect: ${correctCount}\nWrong/Missing: ${wrongCount}\n\nPlease review your incorrect answers (highlighted in red) and try again.`);
                    return; // Do not mark as complete!
                } else {
                    alert(`Perfect Score! (${correctCount}/${totalQuestions})\n\nYou earned +100 XP!`);
                }
            }

            // Update Progress
            progress.completedLessons.push(lessonId);
            progress.xp += (isQuiz ? 100 : 50);

            // Check if all lessons of this module are complete
            let allCompleted = true;
            for (let i = 1; i <= totalLessons; i++) {
                if (!progress.completedLessons.includes(`${moduleId}_L${i}`)) {
                    allCompleted = false;
                    break;
                }
            }
            if (allCompleted && !progress.completedModules.includes(moduleId)) {
                progress.completedModules.push(moduleId);
                // Unlock next module
                const nextModuleId = `M${moduleNum + 1}`;
                if (!progress.unlockedModules.includes(nextModuleId)) {
                    progress.unlockedModules.push(nextModuleId);
                }
            }

            saveProgress();

            // Update local button & card UI
            completeBtn.className = 'btn-lesson-complete completed';
            if (isQuiz) {
                completeBtn.innerHTML = 'Quiz Passed ✓';
            } else {
                completeBtn.innerHTML = 'Completed ✓';
            }
            completeBtn.disabled = true;
            card.classList.add('is-completed');
            
            statusBadge.className = 'lesson-status-badge completed';
            statusBadge.innerHTML = 'Completed ✓';

            // Show a floating visual indicator
            showFloatIndicator(e.clientX, e.clientY, isQuiz ? 100 : 50);
        });

        card.appendChild(completeBtn);
    });

    // Create and inject the bottom floating progress bar
    const bottomBar = document.createElement('div');
    bottomBar.className = 'academy-bottom-bar';
    bottomBar.innerHTML = `
        <div class="bottom-bar-left">
            <div class="bottom-bar-title" id="bottom-bar-title-text">Module Progress</div>
            <div class="bottom-bar-progress-container">
                <div class="bottom-bar-progress-bg">
                    <div class="bottom-bar-progress-fill" id="bottom-bar-progress-fill-el"></div>
                </div>
                <div class="bottom-bar-percentage" id="bottom-bar-percentage-el">0%</div>
            </div>
        </div>
        <div class="bottom-bar-actions">
            <a href="/academy" class="bottom-bar-btn bottom-bar-btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Dashboard
            </a>
            <button class="bottom-bar-btn" id="bottom-bar-next-btn" style="background-color: var(--color-primary, #0D6EFD); color: white; display: none;">
                Next Module
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
        </div>
    `;
    document.body.appendChild(bottomBar);

    // Bind next module button click
    const nextBtn = document.getElementById('bottom-bar-next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            window.location.href = `/academy/module${moduleNum + 1}`;
        });
    }

    // Function to calculate and update bottom progress display
    function updateProgressUI() {
        let completedCount = 0;
        for (let i = 1; i <= totalLessons; i++) {
            if (progress.completedLessons.includes(`${moduleId}_L${i}`)) {
                completedCount++;
            }
        }

        const percentage = Math.round((completedCount / totalLessons) * 100);
        
        const fillEl = document.getElementById('bottom-bar-progress-fill-el');
        const percentEl = document.getElementById('bottom-bar-percentage-el');
        const titleEl = document.getElementById('bottom-bar-title-text');

        if (fillEl) fillEl.style.width = `${percentage}%`;
        if (percentEl) percentEl.innerText = `${percentage}%`;
        if (titleEl) {
            titleEl.innerText = `Module ${moduleNum} Progress: ${completedCount}/${totalLessons} Lessons`;
        }

        // Show Next Module button if current module is 100% complete and not module 17
        if (percentage === 100 && moduleNum < 17 && nextBtn) {
            nextBtn.style.display = 'inline-flex';
        } else if (nextBtn) {
            nextBtn.style.display = 'none';
        }

        // Reveal bottom bar after calculation
        bottomBar.classList.add('show');
    }

    // Float XP animation
    function showFloatIndicator(x, y, xpAmount = 50) {
        const floatEl = document.createElement('div');
        floatEl.innerText = `+${xpAmount} XP`;
        floatEl.style.position = 'fixed';
        floatEl.style.left = `${x || window.innerWidth / 2}px`;
        floatEl.style.top = `${y || window.innerHeight / 2}px`;
        floatEl.style.transform = 'translate(-50%, -50%)';
        floatEl.style.color = '#22C55E';
        floatEl.style.fontWeight = '800';
        floatEl.style.fontSize = '24px';
        floatEl.style.pointerEvents = 'none';
        floatEl.style.zIndex = '9999';
        floatEl.style.transition = 'all 1s cubic-bezier(0.25, 1, 0.5, 1)';
        floatEl.style.textShadow = '0 0 10px rgba(34, 197, 94, 0.4)';
        document.body.appendChild(floatEl);

        setTimeout(() => {
            floatEl.style.transform = 'translate(-50%, -150%) scale(1.2)';
            floatEl.style.opacity = '0';
        }, 50);

        setTimeout(() => {
            floatEl.remove();
        }, 1050);
    }

    // Initialize progress bar
    updateHeaderXP();
    updateProgressUI();

    // ==========================================
    // Generic Quiz Evaluator for Academy Modules
    // ==========================================
    function initializeQuizzes() {
        // Find all containers that look like a quiz (have radio buttons)
        const quizContainers = [];
        document.querySelectorAll('.lesson-card').forEach(card => {
            if (card.querySelector('input[type="radio"]')) {
                quizContainers.push(card);
            }
        });

        quizContainers.forEach((quizCard, index) => {
            // Check if actions already exist
            if (quizCard.querySelector('.quiz-actions')) return;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'quiz-actions';
            actionsDiv.style.marginTop = '30px';
            actionsDiv.style.paddingTop = '20px';
            actionsDiv.style.borderTop = '1px solid var(--color-border)';
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '15px';
            actionsDiv.style.alignItems = 'center';

            const submitBtn = document.createElement('button');
            submitBtn.className = 'btn btn-primary';
            submitBtn.innerText = 'Submit Quiz';
            submitBtn.style.padding = '12px 24px';
            submitBtn.style.fontWeight = '600';
            submitBtn.style.borderRadius = '8px';

            const retryBtn = document.createElement('button');
            retryBtn.className = 'btn btn-secondary';
            retryBtn.innerText = 'Rewrite / Retry';
            retryBtn.style.padding = '12px 24px';
            retryBtn.style.fontWeight = '600';
            retryBtn.style.borderRadius = '8px';
            retryBtn.style.display = 'none'; // hidden initially

            const resultText = document.createElement('span');
            resultText.style.fontWeight = '600';
            resultText.style.fontSize = '16px';
            resultText.style.display = 'none';

            actionsDiv.appendChild(submitBtn);
            actionsDiv.appendChild(retryBtn);
            actionsDiv.appendChild(resultText);
            quizCard.appendChild(actionsDiv);

            // Get all unique question names in this card
            const radios = Array.from(quizCard.querySelectorAll('input[type="radio"]'));
            const questionNames = [...new Set(radios.map(r => r.name))];

            submitBtn.addEventListener('click', () => {
                let score = 0;
                let answered = 0;

                questionNames.forEach(qName => {
                    const options = quizCard.querySelectorAll(`input[name="${qName}"]`);
                    let selected = null;
                    
                    // Reset styles first
                    options.forEach(opt => {
                        const label = opt.closest('label');
                        label.style.backgroundColor = 'var(--color-bg-secondary)';
                        label.style.borderColor = 'var(--color-border)';
                        if (opt.checked) {
                            selected = opt;
                            answered++;
                        }
                    });

                    if (selected) {
                        // Demo evaluation logic: If data-correct="true" is present on ANY option, use that.
                        // Otherwise, fallback to assuming the selected answer is correct for UX demo purposes.
                        let hasCorrectAttr = false;
                        let correctOpt = null;
                        
                        options.forEach(opt => {
                            if (opt.getAttribute('data-correct') === 'true') {
                                hasCorrectAttr = true;
                                correctOpt = opt;
                            }
                        });

                        const selectedLabel = selected.closest('label');
                        
                        if (hasCorrectAttr) {
                            if (selected === correctOpt) {
                                score++;
                                selectedLabel.style.backgroundColor = '#dcfce7'; // green bg
                                selectedLabel.style.borderColor = '#22c55e'; // green border
                            } else {
                                selectedLabel.style.backgroundColor = '#fee2e2'; // red bg
                                selectedLabel.style.borderColor = '#ef4444'; // red border
                                const correctLabel = correctOpt.closest('label');
                                correctLabel.style.backgroundColor = '#dcfce7';
                                correctLabel.style.borderColor = '#22c55e';
                            }
                        } else {
                            // Fallback: Just mark selected as correct to show the UI
                            score++;
                            selectedLabel.style.backgroundColor = '#dcfce7';
                            selectedLabel.style.borderColor = '#22c55e';
                        }
                    }
                });

                if (answered < questionNames.length) {
                    alert('Please answer all questions before submitting.');
                    return;
                }

                // Show results
                submitBtn.style.display = 'none';
                retryBtn.style.display = 'inline-block';
                resultText.style.display = 'inline-block';
                resultText.innerText = `Result: ${score}/${questionNames.length} Correct`;
                resultText.style.color = score === questionNames.length ? '#15803d' : '#b45309';
                
                // Disable radios
                radios.forEach(r => r.disabled = true);
            });

            retryBtn.addEventListener('click', () => {
                // Reset quiz
                radios.forEach(r => {
                    r.disabled = false;
                    r.checked = false;
                    const label = r.closest('label');
                    if(label) {
                        label.style.backgroundColor = 'var(--color-bg-secondary)';
                        label.style.borderColor = 'var(--color-border)';
                    }
                });
                submitBtn.style.display = 'inline-block';
                retryBtn.style.display = 'none';
                resultText.style.display = 'none';
            });
        });
    }

    // Run quiz init
    initializeQuizzes();
});
