// ============================================================================
// PROMPT BAZAAR 3.0 – GALLERY MODULE
// Netflix-style rows, engagement tracking, smart search, recommendations
// ============================================================================

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? window.location.origin
    : "https://prompt-bazaar999.onrender.com";
const REPORT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbynN-ZkLfN7XzjIPKCTmZG1pDjUksqZeLfUWAJCSFWrWhIIGkyYjqk81LAw-HVneSz8/exec";
const WISHLIST_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzeyp93N_8BIW40Qi5isffi5h7FfHvm84_1n3mWMIzYNVVovayy-fL5RNiC6k15i7GL8g/exec";
const PAYMENT_GAS_URL = "https://script.google.com/macros/s/AKfycbyifHkwPbUjkptWjhWT--FmcKBivrsJEGarfEALgf6GLY_S-8y8VvtehVSlSjy7DWs_/exec";

// Category icon map
const CATEGORY_ICONS = {
    "Couple": "💑", "Kids": "👶", "Men": "👨", "Women": "👩",
    "Business": "💼", "LinkedIn": "🔗", "YouTube": "▶️", "Marketing": "📢",
    "Wedding": "💒", "Birthday": "🎂", "General": "✨", "default": "🎨"
};

// ============================================================================
// STATE
// ============================================================================
window.currentUser = null;
window.purchasedPrompts = [];
let allPrompts = [];
let currentCategory = "All";
let searchDebounceTimer = null;
let isShowingSections = true;  // true = Netflix rows, false = flat grid

// ============================================================================
// UTILITY
// ============================================================================
function convertDriveLink(url) {
    if (!url) return '';
    if (url.includes('lh3.googleusercontent.com') || url.includes('drive.google.com/uc')) return url;
    const regex1 = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const regex2 = /[?&]id=([a-zA-Z0-9_-]+)/;
    let match = url.match(regex1);
    if (match && match[1]) return `https://lh3.googleusercontent.com/d/${match[1]}`;
    match = url.match(regex2);
    if (match && match[1]) return `https://lh3.googleusercontent.com/d/${match[1]}`;
    return url;
}

// ============================================================================
// ENGAGEMENT TRACKING (Fire-and-forget)
// ============================================================================
function trackEngagement(promptId, eventType, category) {
    const email = window.currentUser?.email || 'anonymous';
    fetch(`${API_BASE_URL}/api/track-engagement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt_id: promptId,
            event_type: eventType,
            user_email: email,
            category: category || ''
        })
    }).catch(() => {});
}

// ============================================================================
// AUTH INITIALIZATION
// ============================================================================
const initAuth = async () => {
    let localUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    
    if (localUser && localUser.email && (!localUser.user_id || !localUser.user_id.toString().startsWith('USR'))) {
        (async () => {
            try {
                const USERS_API_URL = "https://script.google.com/macros/s/AKfycby92lgxoV3RgYwn6hIj1A7ErMlqXwxAyCSXajDO2Zc4x9a9jR-wnU9DQWdUxdMVDtTn/exec";
                const gasLoginResponse = await fetch(USERS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: "login", email: localUser.email, password: "googlemanoj" })
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
                    if (window.currentUser) {
                        window.currentUser.uid = localUser.user_id;
                        loadPurchasedPrompts();
                    }
                } else {
                    const gasSignupResponse = await fetch(USERS_API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: "signup",
                            full_name: localUser.full_name || localUser.username || localUser.displayName || 'Google User',
                            email: localUser.email, mobile_number: "",
                            password: "googlemanoj", confirm_password: "googlemanoj", login_provider: "Google"
                        })
                    });
                    const gasSignupResult = await gasSignupResponse.json();
                    if (gasSignupResult.success) {
                        localUser.user_id = gasSignupResult.user_id || (gasSignupResult.user ? gasSignupResult.user.user_id : '');
                        localUser.uid = localUser.user_id;
                        localStorage.setItem("currentUser", JSON.stringify(localUser));
                        localStorage.setItem("user", JSON.stringify(localUser));
                        localStorage.setItem("promptbazaar_user", JSON.stringify(localUser));
                        if (window.currentUser) {
                            window.currentUser.uid = localUser.user_id;
                            loadPurchasedPrompts();
                        }
                    }
                }
            } catch (e) { console.error("Self-healing error:", e); }
        })();
    }

    localUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (localUser && localUser.email && (localUser.user_id || localUser.uid)) {
        window.currentUser = {
            uid: localUser.user_id || localUser.uid,
            email: localUser.email,
            name: localUser.full_name || localUser.username
        };
        loadPurchasedPrompts();
        updateUserAvatar();
    }

    if (auth) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                const updatedLocalUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
                window.currentUser = {
                    uid: updatedLocalUser.user_id || user.uid,
                    email: user.email,
                    name: updatedLocalUser.full_name || updatedLocalUser.username || user.displayName,
                    mobile_number: updatedLocalUser.mobile_number
                };
                loadPurchasedPrompts();
                updateUserAvatar();
            }
        });
    }
};

function updateUserAvatar() {
    const avatar = document.getElementById('userAvatar');
    if (avatar && window.currentUser?.name) {
        avatar.textContent = window.currentUser.name.charAt(0).toUpperCase();
    }
}

async function loadPurchasedPrompts() {
    if (!window.currentUser) return;
    const uid = window.currentUser.uid || '';
    const email = window.currentUser.email || '';
    const uidCacheKey = uid ? `purchases_cache_${uid}` : null;
    const emailCacheKey = email ? `purchases_cache_email:${email}` : null;

    function _loadFromCache() {
        const combined = [];
        const seenIds = new Set();
        [uidCacheKey, emailCacheKey].forEach(key => {
            if (!key) return;
            try {
                const arr = JSON.parse(localStorage.getItem(key) || '[]');
                arr.forEach(p => {
                    const pid = p.prompt_id || p;
                    if (!seenIds.has(String(pid))) { seenIds.add(String(pid)); combined.push(p); }
                });
            } catch (e) {}
        });
        return combined;
    }

    const cached = _loadFromCache();
    if (cached.length > 0) {
        window.purchasedPrompts = cached.map(p => String(p.prompt_id || p));
    }

    try {
        const params = new URLSearchParams();
        if (uid) params.set('uid', uid);
        if (email) params.set('email', email);
        const res = await fetch(`${API_BASE_URL}/api/user/purchases?${params.toString()}`);
        const data = await res.json();
        if (data && data.length > 0) {
            const serverIds = new Set(data.map(p => String(p.prompt_id)));
            const localOnly = cached.filter(p => !serverIds.has(String(p.prompt_id || p)));
            const merged = [...data, ...localOnly];
            if (uidCacheKey) localStorage.setItem(uidCacheKey, JSON.stringify(merged));
            if (emailCacheKey) localStorage.setItem(emailCacheKey, JSON.stringify(merged));
            window.purchasedPrompts = merged.map(p => String(p.prompt_id || p));
        }
    } catch(e) {
        console.warn('Server purchases fetch failed, using cache:', e);
    }
}

initAuth();

// ============================================================================
// DOM READY – Core Logic
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- Notification Dropdown ---
    const notifWrapper = document.querySelector('.notification-wrapper');
    const notifBtn = document.getElementById('notificationBtn');
    const notifBadge = document.getElementById('notificationBadge');
    const notifList = document.getElementById('notificationList');
    let notifCount = 0;

    if (notifBtn) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifWrapper.classList.toggle('open');
            if (notifWrapper.classList.contains('open')) {
                notifCount = 0;
                if (notifBadge) { notifBadge.style.display = 'none'; notifBadge.textContent = '0'; }
            }
        });
    }
    document.addEventListener('click', (e) => {
        if (notifWrapper && !notifWrapper.contains(e.target)) notifWrapper.classList.remove('open');
    });

    window.addNotification = function(message, silent = false) {
        if (!notifList) return;
        const emptyState = notifList.querySelector('.empty-notif');
        if (emptyState) emptyState.remove();
        const li = document.createElement('li');
        li.innerHTML = `<strong style="color: var(--pb-primary-light);">New Update</strong><span>${message}</span>`;
        notifList.prepend(li);
        notifCount++;
        if (!silent && notifBadge && !notifWrapper.classList.contains('open')) {
            notifBadge.style.display = 'flex';
            notifBadge.textContent = notifCount;
        }
    };

    // --- Real-time Notifications ---
    let isFirstSnapshot = true;
    const notificationsRef = collection(db, "notifications");
    const q = query(notificationsRef, orderBy("timestamp", "desc"), limit(10));
    onSnapshot(q, (snapshot) => {
        const changes = snapshot.docChanges().reverse();
        changes.forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                if (data.type === "new_prompt") {
                    if (isFirstSnapshot) {
                        window.addNotification(`🔥 New Prompt: "${data.title}"`, true);
                    } else {
                        window.addNotification(`🔥 New Prompt: "${data.title}"`, false);
                        if (typeof showToast === 'function') showToast(`New Prompt: ${data.title}`, 'success');

                        if ('Notification' in window && Notification.permission === 'granted') {
                            try {
                                const notif = new Notification(`🔥 New Prompt: ${data.title}`, {
                                    body: data.prompt_text ? (data.prompt_text.substring(0, 50) + '...') : "A new premium prompt is available!",
                                    icon: data.image_url || '/static/images/logo.png'
                                });
                                notif.onclick = function() { window.focus(); this.close(); };
                            } catch (e) {}
                        }

                        const newPrompt = {
                            prompt_id: data.prompt_id, title: data.title,
                            category: data.category, platform: data.platform,
                            price: data.price, image_url: data.image_url,
                            prompt_text: data.prompt_text, created_at: new Date().toISOString()
                        };
                        const exists = allPrompts.some(p => p.prompt_id === newPrompt.prompt_id);
                        if (!exists) {
                            allPrompts.unshift(newPrompt);
                            localStorage.setItem('bazaar_prompts_cache', JSON.stringify(allPrompts));
                            if (isShowingSections) loadSections();
                            else if (currentCategory === "All" || currentCategory.toLowerCase() === data.category.toLowerCase()) filterPrompts(currentCategory);
                        }
                    }
                }
            }
        });
        isFirstSnapshot = false;
    });

    // --- Toast System ---
    const toastContainer = document.getElementById('toast-container');
    window.showToast = function(message, type = "success") {
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'error' ? 'error' : ''}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    };

    // --- Category Filter ---
    const categoryBtns = document.querySelectorAll('.chip');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            if (category === "All") {
                showSectionView();
            } else {
                filterPrompts(category);
            }
        });
    });

    // --- Search Intelligence ---
    const searchInput = document.getElementById('promptSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            const q = searchInput.value.trim();
            if (!q) {
                showSectionView();
                return;
            }
            searchDebounceTimer = setTimeout(() => smartSearch(q), 350);
        });
    }

    // --- Modal Logic ---
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

        if (modalPrice) modalPrice.textContent = `Free`;
        if (modalPlatform) {
            const platformName = (prompt.platform || 'Midjourney').toUpperCase();
            modalPlatform.textContent = platformName;
            modalPlatform.onclick = (e) => {
                e.stopPropagation();
                const purchased = true;
                if (!purchased) {
                    if (typeof showToast === 'function') showToast('🔒 Purchase this prompt to open it in ' + platformName, 'error');
                    return;
                }
                const textToPaste = prompt.prompt_text || prompt.description || prompt.title;
                navigator.clipboard.writeText(textToPaste).then(() => {
                    let url = '';
                    if (platformName.includes('CHATGPT')) url = 'https://chatgpt.com/?q=' + encodeURIComponent(textToPaste);
                    else if (platformName.includes('CLAUDE')) url = 'https://claude.ai/new?q=' + encodeURIComponent(textToPaste);
                    else if (platformName.includes('GEMINI')) url = 'https://gemini.google.com/app?prompt=' + encodeURIComponent(textToPaste);
                    else if (platformName.includes('MIDJOURNEY')) url = 'https://www.midjourney.com/';
                    else url = 'https://chatgpt.com/?q=' + encodeURIComponent(textToPaste);
                    window.open(url, '_blank');
                    if (typeof showToast === 'function') showToast('Prompt copied & opened in ' + platformName, 'success');
                }).catch(() => { if (typeof showToast === 'function') showToast('Failed to copy prompt', 'error'); });
            };
        }

        isPurchased = true;
        updateActionBtn();

        if (wishlistBtn) {
            wishlistBtn.classList.remove('active');
            wishlistBtn.onclick = (e) => { e.stopPropagation(); handleWishlistAction(prompt, wishlistBtn); };
        }

        modal.classList.add('open');
        if (modalBackdrop) modalBackdrop.classList.add('open');
        document.body.style.overflow = 'hidden';

        // Track view
        trackEngagement(prompt.prompt_id || prompt.id, 'view', prompt.category);

        // Load similar prompts
        loadSimilarPrompts(prompt);
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
            actionBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span class="btn-text">📋 COPY PROMPT</span>`;
            actionBtn.classList.remove('btn-primary');
            actionBtn.classList.add('btn-success');
        } else {
            actionBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span class="btn-text">🔒 UNLOCK PROMPT</span>`;
            actionBtn.classList.add('btn-primary');
            actionBtn.classList.remove('btn-success');
        }
    };

    if (actionBtn) {
        actionBtn.addEventListener('click', async () => {
            if (isPurchased && window.currentPrompt) {
                const textToCopy = window.currentPrompt.prompt_text || window.currentPrompt.description || window.currentPrompt.title;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showToast('Prompt copied successfully!');
                    trackEngagement(window.currentPrompt.prompt_id || window.currentPrompt.id, 'download', window.currentPrompt.category);
                });
            }
        });
    }

    // --- Load Gallery ---
    loadPrompts();

    // Report Form listener
    const reportForm = document.getElementById('reportForm');
    if (reportForm) reportForm.addEventListener('submit', submitReport);
});

// ============================================================================
// SMART SEARCH
// ============================================================================
async function smartSearch(queryText) {
    showGridView();
    const grid = document.getElementById('promptGrid');
    grid.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--pb-text-muted);">🔍 Searching...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(queryText)}`);
        const results = await response.json();
        if (results && results.length > 0) {
            renderPromptGrid(results);
        } else {
            // Fallback: client-side filter
            const filtered = allPrompts.filter(p => {
                const text = `${p.title || ''} ${p.category || ''} ${p.description || ''} ${p.creator_name || ''} ${p.platform || ''}`.toLowerCase();
                return text.includes(queryText.toLowerCase());
            });
            renderPromptGrid(filtered);
        }
    } catch (e) {
        // Fallback: client-side
        const filtered = allPrompts.filter(p => {
            const text = `${p.title || ''} ${p.category || ''} ${p.description || ''} ${p.creator_name || ''} ${p.platform || ''}`.toLowerCase();
            return text.includes(queryText.toLowerCase());
        });
        renderPromptGrid(filtered);
    }
}

// ============================================================================
// SIMILAR PROMPTS
// ============================================================================
async function loadSimilarPrompts(prompt) {
    const section = document.getElementById('similar-prompts-section');
    const scroll = document.getElementById('similar-prompts-scroll');
    if (!section || !scroll) return;

    try {
        const pid = prompt.prompt_id || prompt.id;
        const response = await fetch(`${API_BASE_URL}/api/recommend?type=similar&prompt_id=${pid}`);
        const similar = await response.json();

        if (similar && similar.length > 0) {
            scroll.innerHTML = similar.map(p => `
                <div class="similar-card" data-prompt-id="${p.prompt_id || p.id}">
                    <img src="${convertDriveLink(p.image_url) || 'https://via.placeholder.com/120x100?text=...'}" alt="${p.title || ''}" loading="lazy" onerror="this.src='https://via.placeholder.com/120x100?text=...';">
                    <div class="similar-card-title">${p.title || 'Prompt'}</div>
                </div>
            `).join('');

            // Click handlers
            scroll.querySelectorAll('.similar-card').forEach(card => {
                card.addEventListener('click', () => {
                    const targetId = card.dataset.promptId;
                    const target = [...allPrompts, ...similar].find(p => String(p.prompt_id || p.id) === targetId);
                    if (target) window.openPromptModal(target);
                });
            });

            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    } catch (e) {
        section.style.display = 'none';
    }
}

// ============================================================================
// VIEW SWITCHING (Sections vs Grid)
// ============================================================================
function showSectionView() {
    isShowingSections = true;
    currentCategory = "All";
    document.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
    const allChip = document.querySelector('.chip[data-category="All"]');
    if (allChip) allChip.classList.add('active');
    document.getElementById('gallerySections').style.display = '';
    document.getElementById('promptGrid').style.display = 'none';
    loadSections();
}

function showGridView() {
    isShowingSections = false;
    document.getElementById('gallerySections').style.display = 'none';
    document.getElementById('promptGrid').style.display = '';
}

// ============================================================================
// LOAD PROMPTS (Initial)
// ============================================================================
async function loadPrompts() {
    // 1. Instant cache
    const cacheKey = 'bazaar_prompts_cache';
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        try {
            allPrompts = JSON.parse(cachedData) || [];
            loadSections();
        } catch (e) {}
    } else {
        showLoadingSkeleton();
    }

    // 2. Fetch fresh
    try {
        const response = await fetch(`${API_BASE_URL}/api/prompts`);
        const prompts = await response.json();
        if (prompts && prompts.length > 0) {
            allPrompts = prompts;
            localStorage.setItem(cacheKey, JSON.stringify(prompts));
            if (isShowingSections) loadSections();
            else filterPrompts(currentCategory);
        }
    } catch (error) {
        console.error('Error loading prompts:', error);
        if (!allPrompts || allPrompts.length === 0) {
            document.getElementById('gallerySections').innerHTML = '<div class="empty-state"><h3>Failed to load prompts</h3><p>Please check your connection and try again.</p></div>';
        }
    }

    // Update stats
    const statEl = document.getElementById('stat-total-assets');
    if (statEl) statEl.textContent = allPrompts.length;
}

function showLoadingSkeleton() {
    const sections = document.getElementById('gallerySections');
    sections.innerHTML = `
        <div class="gallery-section">
            <div class="section-header"><div class="section-title">Loading...</div></div>
            <div class="section-scroll">${Array(5).fill(0).map(() => `
                <div class="prompt-card skeleton">
                    <div class="skeleton-img"></div>
                    <div class="skeleton-content">
                        <div class="skeleton-line" style="width: 80%;"></div>
                        <div class="skeleton-line" style="width: 60%;"></div>
                        <div class="skeleton-btn"></div>
                    </div>
                </div>
            `).join('')}</div>
        </div>`;
}

// ============================================================================
// NETFLIX-STYLE SECTIONS
// ============================================================================
async function loadSections() {
    const container = document.getElementById('gallerySections');
    if (!container) return;

    // Build sections from local data first
    const sections = [];

    // 1. Trending Today (by engagement score or fallback to all)
    const trending = [...allPrompts].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 12);
    if (trending.length > 0) {
        sections.push({ title: 'Trending Today', icon: '🔥', prompts: trending });
    }

    // 2. New Arrivals
    const newArrivals = [...allPrompts].sort((a, b) => {
        const dateA = a.created_at || '';
        const dateB = b.created_at || '';
        return dateB.localeCompare(dateA);
    }).slice(0, 12);
    if (newArrivals.length > 0) {
        sections.push({ title: 'New Arrivals', icon: '✨', prompts: newArrivals });
    }

    // 3. Recommended For You (if logged in)
    if (window.currentUser?.email) {
        try {
            const recResp = await fetch(`${API_BASE_URL}/api/recommend?type=personalized&email=${encodeURIComponent(window.currentUser.email)}`);
            const recommended = await recResp.json();
            if (recommended && recommended.length > 0) {
                sections.push({ title: 'Recommended For You', icon: '🎯', prompts: recommended });
            }
        } catch (e) {}
    }

    // 4. Popular Categories
    const catCounts = {};
    allPrompts.forEach(p => {
        const cat = (p.category || 'General').trim();
        catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const popularCategories = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // 5. Category-based rows
    const topCats = popularCategories.slice(0, 4);
    topCats.forEach(([cat, count]) => {
        const catPrompts = allPrompts.filter(p => (p.category || '').toLowerCase() === cat.toLowerCase()).slice(0, 12);
        if (catPrompts.length >= 2) {
            const icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS.default;
            sections.push({ title: `${cat} Prompts`, icon: icon, prompts: catPrompts });
        }
    });

    // Render
    container.innerHTML = '';

    // Popular Categories Section
    if (popularCategories.length > 0) {
        const catSection = document.createElement('div');
        catSection.className = 'gallery-section';
        catSection.innerHTML = `
            <div class="section-header">
                <div class="section-title"><span class="section-icon">📂</span> Popular Categories</div>
            </div>
            <div class="categories-grid">
                ${popularCategories.map(([cat, count]) => {
                    const icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS.default;
                    return `<div class="category-card" data-category="${cat}">
                        <div class="category-card-icon">${icon}</div>
                        <div class="category-card-name">${cat}</div>
                        <div class="category-card-count">${count} assets</div>
                    </div>`;
                }).join('')}
            </div>`;
        container.appendChild(catSection);

        // Category card click
        catSection.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                filterPrompts(card.dataset.category);
            });
        });
    }

    // Prompt Sections
    sections.forEach(section => {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'gallery-section';
        sectionEl.innerHTML = `
            <div class="section-header">
                <div class="section-title"><span class="section-icon">${section.icon}</span> ${section.title}</div>
            </div>
            <div class="section-scroll">
                ${section.prompts.map(p => createPromptCardHTML(p)).join('')}
            </div>`;
        container.appendChild(sectionEl);

        // Attach card events
        sectionEl.querySelectorAll('.prompt-card').forEach((card, idx) => {
            attachCardEvents(card, section.prompts[idx]);
        });
    });

    // Try fetching real trending data from backend (enriches with engagement scores)
    try {
        const trendResp = await fetch(`${API_BASE_URL}/api/trending`);
        const trendData = await trendResp.json();
        if (trendData && trendData.total_assets) {
            const statEl = document.getElementById('stat-total-assets');
            if (statEl) statEl.textContent = trendData.total_assets;
        }
    } catch (e) {}
}

// ============================================================================
// FILTER PROMPTS (Grid mode)
// ============================================================================
function filterPrompts(category) {
    currentCategory = category;
    showGridView();

    document.querySelectorAll('.chip').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.chip[data-category="${category}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    let filteredPrompts;
    if (category === "All") {
        filteredPrompts = allPrompts;
    } else {
        filteredPrompts = allPrompts.filter(prompt =>
            (prompt.category || "").toLowerCase() === category.toLowerCase()
        );
    }
    renderPromptGrid(filteredPrompts);
}

// ============================================================================
// CARD RENDERING
// ============================================================================
function createPromptCardHTML(prompt) {
    const imageUrl = convertDriveLink(prompt.image_url) || 'https://via.placeholder.com/400x600?text=No+Image';
    const title = prompt.title || 'Untitled Prompt';
    const platformName = (prompt.platform || '').toUpperCase();
    const isPurchasedCard = true; // Free access

    let platformLabel = '';
    if (platformName.includes('CHATGPT')) platformLabel = 'ChatGPT';
    else if (platformName.includes('CLAUDE')) platformLabel = 'Claude';
    else if (platformName.includes('GEMINI')) platformLabel = 'Gemini';
    else if (platformName.includes('MIDJOURNEY')) platformLabel = 'Midjourney';
    else if (platformName) platformLabel = prompt.platform;

    const platformBadgeHtml = platformLabel ? `
        <span class="card-platform-badge ${isPurchasedCard ? 'unlocked' : 'locked'}">${platformLabel}</span>` : '';

    const views = prompt.views || 0;
    const saves = prompt.saves || 0;

    return `
        <div class="prompt-card" data-prompt-id="${prompt.prompt_id || prompt.id}">
            <div class="card-image-wrapper">
                ${platformBadgeHtml}
                <button class="wishlist-btn" aria-label="Save">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <img src="${imageUrl}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x600?text=No+Image';">
                <div class="card-engagement-bar">
                    <span>👁 ${views}</span>
                    <span>❤️ ${saves}</span>
                </div>
            </div>
            <div class="card-content">
                <h3 class="card-title">${title}</h3>
                <p class="card-desc">${prompt.description || 'Discover this amazing AI prompt and boost your productivity instantly.'}</p>
                <div class="card-creator">
                    <span>${prompt.creator_name || 'Shaivika AI'}</span>
                    <span class="card-category">${prompt.category || 'General'}</span>
                </div>
                <button class="view-prompt-btn">View Prompt</button>
            </div>
        </div>`;
}

function attachCardEvents(card, prompt) {
    const heartBtn = card.querySelector('.wishlist-btn');
    if (heartBtn) {
        heartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleWishlistAction(prompt, heartBtn);
        });
    }

    const platformBadgeEl = card.querySelector('.card-platform-badge');
    if (platformBadgeEl) {
        platformBadgeEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const pName = (prompt.platform || '').toUpperCase();
            const textToPaste = prompt.prompt_text || prompt.description || prompt.title;
            navigator.clipboard.writeText(textToPaste).then(() => {
                let url = '';
                if (pName.includes('CHATGPT')) url = 'https://chatgpt.com/?q=' + encodeURIComponent(textToPaste);
                else if (pName.includes('CLAUDE')) url = 'https://claude.ai/new?q=' + encodeURIComponent(textToPaste);
                else if (pName.includes('GEMINI')) url = 'https://gemini.google.com/app?prompt=' + encodeURIComponent(textToPaste);
                else if (pName.includes('MIDJOURNEY')) url = 'https://www.midjourney.com/';
                else url = 'https://chatgpt.com/?q=' + encodeURIComponent(textToPaste);
                window.open(url, '_blank');
                if (typeof showToast === 'function') showToast('Prompt copied & opened in ' + prompt.platform, 'success');
            }).catch(() => { if (typeof showToast === 'function') showToast('Failed to copy prompt', 'error'); });
        });
    }

    card.addEventListener('click', () => window.openPromptModal(prompt));
}

function renderPromptGrid(prompts) {
    const grid = document.getElementById('promptGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!prompts || prompts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <h3>No prompts found</h3>
                <p>Try selecting a different category or adjusting your search.</p>
            </div>`;
        return;
    }

    prompts.forEach(prompt => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = createPromptCardHTML(prompt);
        const card = wrapper.firstElementChild;
        attachCardEvents(card, prompt);
        grid.appendChild(card);
    });
}

// ============================================================================
// WISHLIST
// ============================================================================
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
        const response = await fetch(WISHLIST_WEBAPP_URL, { method: "POST", body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.success) {
            btn.classList.add('active');
            showToast('Saved to Wishlist ❤️');
            trackEngagement(prompt.prompt_id || prompt.id, 'save', prompt.category);
            if (typeof window.addNotification === 'function') window.addNotification(`You saved "${prompt.title || 'a prompt'}" to your wishlist.`);
        } else {
            showToast(result.message || 'Failed to update wishlist', 'error');
        }
    } catch (error) {
        console.error('Wishlist error:', error);
        showToast('Something went wrong.', 'error');
    }
}

// ============================================================================
// REPORT
// ============================================================================
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
    if (!payload.user_name) { showToast("Please enter your name", "error"); return; }
    if (!payload.user_email) { showToast("Please enter your email", "error"); return; }
    if (!payload.reason) { showToast("Please select a reason", "error"); return; }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Submitting...";
        const response = await fetch(REPORT_WEBAPP_URL, { method: "POST", body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.success) {
            showToast("Report submitted successfully!", "success");
            document.getElementById("reportForm").reset();
            closeReportModal();
        } else {
            showToast(result.message || "Failed to submit report.", "error");
        }
    } catch (error) {
        showToast("Something went wrong while submitting the report.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ============================================================================
// GLOBAL WINDOW FUNCTIONS
// ============================================================================
window.currentPrompt = null;

window.sharePrompt = function(prompt) {
    if (!prompt) return;
    const shareUrl = `${window.location.origin}/prompt/${prompt.prompt_id || prompt.id}`;
    const shareData = { title: prompt.title, text: `Check out this amazing prompt: ${prompt.title}`, url: shareUrl };
    trackEngagement(prompt.prompt_id || prompt.id, 'share', prompt.category);

    if (navigator.share) {
        navigator.share(shareData).then(() => showToast('Prompt shared successfully!')).catch(() => {});
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
