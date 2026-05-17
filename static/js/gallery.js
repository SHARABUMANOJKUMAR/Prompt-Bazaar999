import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const REPORT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbynN-ZkLfN7XzjIPKCTmZG1pDjUksqZeLfUWAJCSFWrWhIIGkyYjqk81LAw-HVneSz8/exec";
const WISHLIST_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzeyp93N_8BIW40Qi5isffi5h7FfHvm84_1n3mWMIzYNVVovayy-fL5RNiC6k15i7GL8g/exec";

// Global state
window.currentUser = null;
let allPrompts = [];
let currentCategory = "All";

function convertDriveLink(url) {
    if (!url) return '';
    if (url.includes('lh3.googleusercontent.com') || url.includes('drive.google.com/uc')) {
        return url;
    }
    const regex1 = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const regex2 = /[?&]id=([a-zA-Z0-9_-]+)/;
    
    let match = url.match(regex1);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    
    match = url.match(regex2);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    
    return url;
}

// Listen for Auth State to prefill forms
const initAuth = async () => {
    // 1. Check manual user
    let localUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    
    // --- Self-healing: Resolve missing sheet USR ID for Google users ---
    if (localUser && localUser.email && (!localUser.user_id || !localUser.user_id.toString().startsWith('USR'))) {
        console.log("Self-healing (gallery): Resolving sheet USR ID for:", localUser.email);
        try {
            const USERS_API_URL = "https://script.google.com/macros/s/AKfycby92lgxoV3RgYwn6hIj1A7ErMlqXwxAyCSXajDO2Zc4x9a9jR-wnU9DQWdUxdMVDtTn/exec";
            const gasLoginResponse = await fetch(USERS_API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: "login",
                    email: localUser.email,
                    password: "googlemanoj"
                })
            });
            const gasLoginResult = await gasLoginResponse.json();
            if (gasLoginResult.success && gasLoginResult.user) {
                localUser.user_id = gasLoginResult.user.user_id;
                localUser.uid = gasLoginResult.user.user_id;
                localUser.full_name = gasLoginResult.user.full_name || localUser.full_name;
                localUser.mobile_number = gasLoginResult.user.mobile_number || localUser.mobile_number;
                
                localStorage.setItem("currentUser", JSON.stringify(localUser));
                localStorage.setItem("user", JSON.stringify(localUser));
                localStorage.setItem("promptbazaar_user", JSON.stringify(localUser));
                console.log("Self-healing successful! USR ID resolved:", localUser.user_id);
            } else {
                // Try registering them in GAS
                const gasSignupResponse = await fetch(USERS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: "signup",
                        full_name: localUser.full_name || localUser.username || localUser.displayName || 'Google User',
                        email: localUser.email,
                        mobile_number: "",
                        password: "googlemanoj",
                        confirm_password: "googlemanoj",
                        login_provider: "Google"
                    })
                });
                const gasSignupResult = await gasSignupResponse.json();
                if (gasSignupResult.success) {
                    localUser.user_id = gasSignupResult.user_id || (gasSignupResult.user ? gasSignupResult.user.user_id : '');
                    localUser.uid = localUser.user_id;
                    localStorage.setItem("currentUser", JSON.stringify(localUser));
                    localStorage.setItem("user", JSON.stringify(localUser));
                    localStorage.setItem("promptbazaar_user", JSON.stringify(localUser));
                    console.log("Self-healing signup successful! USR ID registered:", localUser.user_id);
                }
            }
        } catch (e) {
            console.error("Self-healing error:", e);
        }
    }

    localUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (localUser && (localUser.login_provider === 'Manual' || localUser.login_method === 'manual')) {
        window.currentUser = {
            uid: localUser.user_id,
            email: localUser.email,
            name: localUser.full_name || localUser.username
        };
        return;
    }

    // 2. Check Firebase user
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const updatedLocalUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
            window.currentUser = {
                uid: updatedLocalUser.user_id || user.uid,
                email: user.email,
                name: updatedLocalUser.full_name || updatedLocalUser.username || user.displayName
            };
        } else {
            window.currentUser = null;
        }
    });
};

initAuth();

document.addEventListener('DOMContentLoaded', () => {
    // Notification Dropdown Logic
    const notifWrapper = document.querySelector('.notification-wrapper');
    const notifBtn = document.getElementById('notificationBtn');
    const notifBadge = document.getElementById('notificationBadge');
    const notifList = document.getElementById('notificationList');
    let notifCount = 0;

    if (notifBtn) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifWrapper.classList.toggle('open');
            // Hide badge when opened
            if (notifWrapper.classList.contains('open')) {
                notifCount = 0;
                if (notifBadge) {
                    notifBadge.style.display = 'none';
                    notifBadge.textContent = '0';
                }
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (notifWrapper && !notifWrapper.contains(e.target)) {
            notifWrapper.classList.remove('open');
        }
    });

    window.addNotification = function(message) {
        if (!notifList) return;
        const emptyState = notifList.querySelector('.empty-notif');
        if (emptyState) emptyState.remove();

        const li = document.createElement('li');
        li.innerHTML = `<strong style="color: var(--color-primary);">New Update</strong><span style="color: var(--color-text-main);">${message}</span>`;
        notifList.prepend(li);
        
        notifCount++;
        if (notifBadge && !notifWrapper.classList.contains('open')) {
            notifBadge.style.display = 'flex';
            notifBadge.textContent = notifCount;
        }
    };

    // Toast Notification System
    const toastContainer = document.getElementById('toast-container');
    
    window.showToast = function(message, type = "success") {
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'error' ? 'error' : ''}`;
        
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    };

    // Category Filter Event Listeners
    const categoryBtns = document.querySelectorAll('.chip');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            filterPrompts(category);
        });
    });

    // Modal Logic
    const modal = document.getElementById('prompt-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const closeBtn = document.getElementById('close-modal');
    const actionBtn = document.getElementById('modal-primary-action');
    const wishlistBtn = document.getElementById('modal-wishlist');
    const promptTitle = document.getElementById('modal-title');
    const promptImage = document.getElementById('modal-image');
    
    let isPurchased = false;

    window.openPromptModal = function(prompt) {
        window.currentPrompt = prompt;
        promptImage.src = convertDriveLink(prompt.image_url) || 'https://via.placeholder.com/400x600?text=No+Image';
        promptTitle.textContent = prompt.title || 'Untitled Prompt';
        
        const modalPrice = document.getElementById('modal-price');
        const modalPlatform = document.getElementById('modal-platform');
        
        if (modalPrice) modalPrice.textContent = `₹${prompt.price || 2}`;
        if (modalPlatform) {
            const platformName = (prompt.platform || 'Midjourney').toUpperCase();
            modalPlatform.textContent = platformName;
            
            // Add click listener to open the AI platform with the prompt text
            modalPlatform.onclick = (e) => {
                e.stopPropagation();
                // Fallback to description or title if prompt_text is not yet available
                const textToPaste = prompt.prompt_text || prompt.description || prompt.title;
                
                // Copy to clipboard for safety, then open URL
                navigator.clipboard.writeText(textToPaste).then(() => {
                    let url = '';
                    if (platformName.includes('CHATGPT')) {
                        url = 'https://chatgpt.com/?q=' + encodeURIComponent(textToPaste);
                    } else if (platformName.includes('CLAUDE')) {
                        url = 'https://claude.ai/new?q=' + encodeURIComponent(textToPaste);
                    } else if (platformName.includes('GEMINI')) {
                        url = 'https://gemini.google.com/app?prompt=' + encodeURIComponent(textToPaste);
                    } else if (platformName.includes('MIDJOURNEY')) {
                        url = 'https://www.midjourney.com/';
                    } else {
                        url = 'https://chatgpt.com/?q=' + encodeURIComponent(textToPaste);
                    }
                    
                    window.open(url, '_blank');
                    if (typeof showToast === 'function') {
                        showToast('Prompt copied & opened in ' + platformName, 'success');
                    }
                }).catch(() => {
                    if (typeof showToast === 'function') showToast('Failed to copy prompt', 'error');
                });
            };
        }

        isPurchased = false;
        updateActionBtn();
        
        // Reset wishlist button state in modal
        if (wishlistBtn) {
            wishlistBtn.classList.remove('active');
            wishlistBtn.onclick = (e) => {
                e.stopPropagation();
                handleWishlistAction(prompt, wishlistBtn);
            };
        }

        modal.classList.add('open');
        if (modalBackdrop) modalBackdrop.classList.add('open');
        document.body.style.overflow = 'hidden'; 
    };

    const closeModal = () => {
        modal.classList.remove('open');
        if (modalBackdrop) modalBackdrop.classList.remove('open');
        document.body.style.overflow = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

    const updateActionBtn = () => {
        if (!actionBtn) return;
        if (isPurchased) {
            actionBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span class="btn-text">📋 COPY PROMPT</span>
            `;
            actionBtn.classList.remove('btn-primary');
            actionBtn.classList.add('btn-success');
        } else {
            actionBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span class="btn-text">🔒 UNLOCK PROMPT</span>
            `;
            actionBtn.classList.add('btn-primary');
            actionBtn.classList.remove('btn-success');
        }
    };

    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            if (!isPurchased) {
                actionBtn.innerHTML = `<div class="spinner"></div>`;
                setTimeout(() => {
                    isPurchased = true;
                    updateActionBtn();
                    showToast('Prompt unlocked successfully!');
                }, 1500);
            } else if (window.currentPrompt) {
                navigator.clipboard.writeText(window.currentPrompt.prompt_text).then(() => {
                    showToast('Prompt copied to clipboard!');
                });
            }
        });
    }

    // Load Prompts on Init
    loadPrompts();

    // Report Form listener
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', submitReport);
    }
});

async function loadPrompts() {
    const grid = document.getElementById('promptGrid');
    if (!grid) return;

    // 1. Instant Cache Load (SWR Pattern)
    const cacheKey = 'bazaar_prompts_cache';
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            allPrompts = parsed || [];
            // Render the cached list instantly
            filterPrompts(currentCategory);
        } catch (e) {
            console.error("Cache load error:", e);
        }
    } else {
        // Show premium skeleton loading state instead of plain text loader
        grid.innerHTML = Array(6).fill(0).map(() => `
            <div class="prompt-card skeleton">
                <div class="skeleton-img"></div>
                <div class="skeleton-content">
                    <div class="skeleton-line" style="width: 80%;"></div>
                    <div class="skeleton-line" style="width: 95%;"></div>
                    <div class="skeleton-line" style="width: 60%;"></div>
                    <div class="skeleton-btn"></div>
                </div>
            </div>
        `).join('');
    }

    // 2. Fetch fresh data in parallel
    try {
        const response = await fetch('/api/prompts');
        const prompts = await response.json();

        if (prompts && prompts.length > 0) {
            allPrompts = prompts;
            // Update localStorage cache
            localStorage.setItem(cacheKey, JSON.stringify(prompts));
            // Seamlessly render fresh prompts
            filterPrompts(currentCategory);
        }
    } catch (error) {
        console.error('Error loading prompts:', error);
        if (!allPrompts || allPrompts.length === 0) {
            grid.innerHTML = `
                <div style="color: red; padding: 40px; font-size: 18px; text-align: center; width: 100%;">
                    Failed to load prompts.
                </div>
            `;
        }
    }
}

function filterPrompts(category) {
    currentCategory = category;

    // Update active button
    document.querySelectorAll('.chip').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`.chip[data-category="${category}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    let filteredPrompts;
    if (category === "All") {
        filteredPrompts = allPrompts;
    } else {
        filteredPrompts = allPrompts.filter(prompt =>
            (prompt.category || "").toLowerCase() === category.toLowerCase()
        );
    }

    renderPromptGallery(filteredPrompts);
}

function renderPromptGallery(prompts) {
    const grid = document.getElementById('promptGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!prompts || prompts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <h3>No prompts found</h3>
                <p>Try selecting a different category or adjusting your search.</p>
            </div>
        `;
        return;
    }

    prompts.forEach(prompt => {
        const card = createPromptCard(prompt);
        grid.appendChild(card);
    });
}

function createPromptCard(prompt) {
    const card = document.createElement('div');
    card.className = 'prompt-card';

    const imageUrl = convertDriveLink(prompt.image_url) || 'https://via.placeholder.com/400x600?text=No+Image';
    const title = prompt.title || 'Untitled Prompt';
    const price = prompt.price || 2;

        card.innerHTML = `
            <div class="card-image-wrapper">
                <span class="price-pill">₹${price}</span>
                <button class="wishlist-btn" aria-label="Favorite">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <img src="${imageUrl}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x600?text=No+Image';">
            </div>
            <div class="card-content">
                <h3 class="card-title">${title}</h3>
                <p class="card-desc">${prompt.description || 'Discover this amazing AI prompt and boost your productivity instantly.'}</p>
                <div class="card-meta">
                    <div class="meta-stats">
                        <span class="rating">⭐ ${prompt.rating || '4.9'}</span>
                        <span>${prompt.sales || '1.2k'} sales</span>
                    </div>
                </div>
                <div class="card-creator">
                    <span>${prompt.creator_name || 'Shaivika AI'}</span>
                    <span class="card-category">${prompt.category || 'General'}</span>
                </div>
                <button class="view-prompt-btn">View Prompt</button>
            </div>
        `;

    // Heart toggle logic
    const heartBtn = card.querySelector('.wishlist-btn');
    if (heartBtn) {
        heartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleWishlistAction(prompt, heartBtn);
        });
    }

    card.addEventListener('click', () => {
        window.openPromptModal(prompt);
    });

    return card;
}

async function handleWishlistAction(prompt, btn) {
    if (!window.currentUser) {
        showToast('Please login to use wishlist', 'error');
        window.location.href = '/login';
        return;
    }

    if (btn.classList.contains('active')) {
        showToast('Already in Wishlist ❤️');
        return;
    }

    try {
        const payload = {
            action: "add_to_wishlist",
            user_uid: window.currentUser.uid,
            user_name: window.currentUser.name,
            user_email: window.currentUser.email,
            prompt_id: prompt.prompt_id || prompt.id,
            prompt_title: prompt.title,
            category: prompt.category,
            platform: prompt.platform,
            price: prompt.price,
            image_url: prompt.image_url,
            prompt_text: prompt.prompt_text
        };

        const response = await fetch(WISHLIST_WEBAPP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            btn.classList.add('active');
            showToast('Added to Wishlist ❤️');
            if (typeof window.addNotification === 'function') {
                window.addNotification(`You added "${prompt.title || 'a prompt'}" to your wishlist.`);
            }
        } else {
            showToast(result.message || 'Failed to update wishlist', 'error');
        }
    } catch (error) {
        console.error('Wishlist error:', error);
        showToast('Something went wrong.', 'error');
    }
}

async function submitReport(event) {
    event.preventDefault();

    const submitBtn = document.querySelector('.report-submit-btn');
    const originalText = submitBtn.innerHTML;

    const payload = {
        action: "submit_report",
        prompt_id: document.getElementById("reportPromptId").value,
        prompt_title: window.currentPrompt?.title || "",
        user_name: document.getElementById("reportUserName").value.trim(),
        user_email: document.getElementById("reportUserEmail").value.trim(),
        reason: document.getElementById("reportReason").value,
        details: document.getElementById("reportDetails").value.trim()
    };

    // Validation
    if (!payload.user_name) {
        showToast("Please enter your name", "error");
        return;
    }
    if (!payload.user_email) {
        showToast("Please enter your email", "error");
        return;
    }
    if (!payload.reason) {
        showToast("Please select a reason", "error");
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Submitting...";

        const response = await fetch(REPORT_WEBAPP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            showToast("Report submitted successfully!", "success");
            document.getElementById("reportForm").reset();
            closeReportModal();
        } else {
            showToast(result.message || "Failed to submit report.", "error");
        }

    } catch (error) {
        console.error("Report submission error:", error);
        showToast("Something went wrong while submitting the report.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Global window functions
window.currentPrompt = null;

window.sharePrompt = function(prompt) {
    if (!prompt) return;
    const shareUrl = `${window.location.origin}/prompt/${prompt.prompt_id || prompt.id}`;
    const shareData = {
        title: prompt.title,
        text: `Check out this amazing prompt: ${prompt.title}`,
        url: shareUrl
    };

    if (navigator.share) {
        navigator.share(shareData)
            .then(() => showToast('Prompt shared successfully!'))
            .catch(() => {});
    } else {
        navigator.clipboard.writeText(shareUrl)
            .then(() => showToast('Link copied to clipboard!'))
            .catch(() => showToast('Unable to copy link.', 'error'));
    }
};

window.openReportModal = function(prompt) {
    if (!prompt) return;
    window.currentPrompt = prompt;
    document.getElementById("reportPromptId").value = prompt.prompt_id || prompt.id || "";
    document.getElementById("reportUserName").value = window.currentUser?.name || "";
    document.getElementById("reportUserEmail").value = window.currentUser?.email || "";
    document.getElementById("reportReason").value = "";
    document.getElementById("reportDetails").value = "";
    document.getElementById("reportModal").classList.add("active");
};

window.closeReportModal = function() {
    document.getElementById("reportModal").classList.remove("active");
};
