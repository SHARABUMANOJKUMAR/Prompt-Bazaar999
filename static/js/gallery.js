import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? window.location.origin
    : "https://prompt-bazaar999.onrender.com";
const REPORT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbynN-ZkLfN7XzjIPKCTmZG1pDjUksqZeLfUWAJCSFWrWhIIGkyYjqk81LAw-HVneSz8/exec";
const WISHLIST_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzeyp93N_8BIW40Qi5isffi5h7FfHvm84_1n3mWMIzYNVVovayy-fL5RNiC6k15i7GL8g/exec";
const PAYMENT_GAS_URL = "https://script.google.com/macros/s/AKfycbyifHkwPbUjkptWjhWT--FmcKBivrsJEGarfEALgf6GLY_S-8y8VvtehVSlSjy7DWs_/exec";

// Global state
window.currentUser = null;
window.purchasedPrompts = [];
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
    
    // --- Self-healing: Resolve missing sheet USR ID for Google users (NON-BLOCKING BACKGROUND PROCESS) ---
    if (localUser && localUser.email && (!localUser.user_id || !localUser.user_id.toString().startsWith('USR'))) {
        console.log("Self-healing (gallery): Resolving sheet USR ID in background for:", localUser.email);
        (async () => {
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
                    console.log("Self-healing (gallery) successful! USR ID resolved:", localUser.user_id);
                    
                    // Refresh dynamic variables
                    if (window.currentUser) {
                        window.currentUser.uid = localUser.user_id;
                        loadPurchasedPrompts();
                    }
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
                        console.log("Self-healing (gallery) signup successful! USR ID registered:", localUser.user_id);
                        
                        if (window.currentUser) {
                            window.currentUser.uid = localUser.user_id;
                            loadPurchasedPrompts();
                        }
                    }
                }
            } catch (e) {
                console.error("Self-healing (gallery) error:", e);
            }
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
    }

    // 2. Check Firebase user in background
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
            }
        });
    }
};

async function loadPurchasedPrompts() {
    if (!window.currentUser) return;

    const uid   = window.currentUser.uid || '';
    const email = window.currentUser.email || '';

    // Cache keys — dual index mirrors the server dual-index strategy
    const uidCacheKey   = uid   ? `purchases_cache_${uid}`          : null;
    const emailCacheKey = email ? `purchases_cache_email:${email}`   : null;

    // 1. Instantly unlock from ANY available localStorage cache
    function _loadFromCache() {
        const combined = [];
        const seenIds  = new Set();
        [uidCacheKey, emailCacheKey].forEach(key => {
            if (!key) return;
            try {
                const arr = JSON.parse(localStorage.getItem(key) || '[]');
                arr.forEach(p => {
                    const pid = p.prompt_id || p;
                    if (!seenIds.has(String(pid))) {
                        seenIds.add(String(pid));
                        combined.push(p);
                    }
                });
            } catch (e) { /* ignore */ }
        });
        return combined;
    }

    const cached = _loadFromCache();
    if (cached.length > 0) {
        window.purchasedPrompts = cached.map(p => String(p.prompt_id || p));
    }

    // 2. Refresh from server using both uid and email params
    try {
        const params = new URLSearchParams();
        if (uid)   params.set('uid', uid);
        if (email) params.set('email', email);
        const res  = await fetch(`${API_BASE_URL}/api/user/purchases?${params.toString()}`);
        const data = await res.json();

        if (data && data.length > 0) {
            // Merge with local-only items not yet on server
            const serverIds = new Set(data.map(p => String(p.prompt_id)));
            const localOnly = cached.filter(p => !serverIds.has(String(p.prompt_id || p)));
            const merged    = [...data, ...localOnly];

            // Write back to both cache keys
            if (uidCacheKey)   localStorage.setItem(uidCacheKey,   JSON.stringify(merged));
            if (emailCacheKey) localStorage.setItem(emailCacheKey, JSON.stringify(merged));

            window.purchasedPrompts = merged.map(p => String(p.prompt_id || p));
        } else if (data && data.length === 0) {
            // Server empty — preserve local cache (Render may have restarted)
            if (cached.length === 0) {
                window.purchasedPrompts = [];
            }
        }
    } catch(e) {
        console.warn('Server purchases fetch failed, using localStorage cache:', e);
    }
}

initAuth();

// Real-time Notifications & Prompts Sync is moved inside DOMContentLoaded
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

    window.addNotification = function(message, silent = false) {
        if (!notifList) return;
        const emptyState = notifList.querySelector('.empty-notif');
        if (emptyState) emptyState.remove();

        const li = document.createElement('li');
        li.innerHTML = `<strong style="color: var(--color-primary);">New Update</strong><span style="color: var(--color-text-main);">${message}</span>`;
        // Prepend so newest is at the top
        notifList.prepend(li);
        
        notifCount++;
        // Only show red badge if not silent and dropdown is closed
        if (!silent && notifBadge && !notifWrapper.classList.contains('open')) {
            notifBadge.style.display = 'flex';
            notifBadge.textContent = notifCount;
        }
    };

    // --- Real-time Notifications & Prompts Sync ---
    let isFirstSnapshot = true;
    const notificationsRef = collection(db, "notifications");
    // Fetch last 10 notifications to populate history
    const q = query(notificationsRef, orderBy("timestamp", "desc"), limit(10));
    onSnapshot(q, (snapshot) => {
        // Reverse so we prepend in correct chronological order
        const changes = snapshot.docChanges().reverse();
        changes.forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                
                if (data.type === "new_prompt") {
                    // If it's the first load, add silently to history without toast
                    if (isFirstSnapshot) {
                        if (typeof window.addNotification === 'function') {
                            window.addNotification(`🔥 New Prompt Added: "${data.title}"`, true);
                        }
                    } else {
                        // New prompt added while user is active on page
                        if (typeof window.addNotification === 'function') {
                            window.addNotification(`🔥 New Prompt Added: "${data.title}"`, false);
                        }
                        if (typeof showToast === 'function') {
                            showToast(`New Prompt: ${data.title}`, 'success');
                        }

                        // Trigger Native OS-level Web Push Notification (Foreground)
                        if ('Notification' in window && Notification.permission === 'granted') {
                            try {
                                const notif = new Notification(`🔥 New Prompt: ${data.title}`, {
                                    body: data.prompt_text ? (data.prompt_text.substring(0, 50) + '...') : "A new premium prompt is available!",
                                    icon: data.image_url || '/static/images/logo.png'
                                });
                                notif.onclick = function() {
                                    window.focus();
                                    this.close();
                                };
                            } catch (e) {
                                console.error("Native notification failed:", e);
                            }
                        }

                        // Real-time Prompt Synchronization
                        const newPrompt = {
                            prompt_id: data.prompt_id,
                            title: data.title,
                            category: data.category,
                            platform: data.platform,
                            price: data.price,
                            image_url: data.image_url,
                            prompt_text: data.prompt_text,
                            created_at: new Date().toISOString()
                        };

                        const exists = allPrompts.some(p => p.prompt_id === newPrompt.prompt_id);
                        if (!exists) {
                            allPrompts.unshift(newPrompt);
                            localStorage.setItem('bazaar_prompts_cache', JSON.stringify(allPrompts));
                            if (currentCategory === "All" || currentCategory.toLowerCase() === data.category.toLowerCase()) {
                                filterPrompts(currentCategory);
                            }
                        }
                    }
                }
            }
        });
        isFirstSnapshot = false;
    });

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
        
        if (modalPrice) modalPrice.textContent = `Free`;
        if (modalPlatform) {
            const platformName = (prompt.platform || 'Midjourney').toUpperCase();
            modalPlatform.textContent = platformName;
            
            // Badge click: only open AI platform AFTER payment
            modalPlatform.onclick = (e) => {
                e.stopPropagation();
                // Bypass payment: Treat all prompts as purchased for free access
                const purchased = true; // window.purchasedPrompts.includes(String(prompt.prompt_id || prompt.id));
                if (!purchased) {
                    if (typeof showToast === 'function') {
                        showToast('🔒 Purchase this prompt to open it in ' + platformName, 'error');
                    }
                    return;
                }
                
                const textToPaste = prompt.prompt_text || prompt.description || prompt.title;
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

        isPurchased = true; // window.purchasedPrompts.includes(String(prompt.prompt_id || prompt.id));
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
        actionBtn.addEventListener('click', async () => {
            if (!isPurchased) {
                if (!window.currentUser) {
                    showToast('Please login to purchase.', 'error');
                    window.location.href = '/login';
                    return;
                }
                
                actionBtn.innerHTML = `<div class="spinner"></div>`;
                actionBtn.disabled = true;
                
                try {
                    const res = await fetch(`${API_BASE_URL}/create-order`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            prompt_id: window.currentPrompt.prompt_id || window.currentPrompt.id,
                            title: window.currentPrompt.title,
                            price: (window.currentPrompt.price !== undefined && window.currentPrompt.price !== null && window.currentPrompt.price !== "") ? window.currentPrompt.price : 99
                        })
                    });
                    const orderData = await res.json();
                    
                    if (!orderData.success) {
                        showToast(orderData.message || 'Error creating order', 'error');
                        updateActionBtn();
                        actionBtn.disabled = false;
                        return;
                    }
                    
                    const options = {
                        key: orderData.key,
                        amount: orderData.amount,
                        currency: orderData.currency,
                        name: "Prompt Bazaar",
                        description: window.currentPrompt.title,
                        image: "https://res.cloudinary.com/dwv8kc9vb/image/upload/v1778935629/Prompt_Bazaar_Logo_h4ga2c.png",
                        order_id: orderData.order_id,
                        prefill: {
                            name: window.currentUser.name || "Customer",
                            email: window.currentUser.email || "",
                            contact: window.currentUser.mobile_number || ""
                        },
                        theme: { color: "#0D6EFD" },
                        handler: async function (response) {
                            try {
                                const verifyRes = await fetch(`${API_BASE_URL}/verify-payment`, {
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify({
                                        razorpay_payment_id: response.razorpay_payment_id,
                                        razorpay_order_id: response.razorpay_order_id,
                                        razorpay_signature: response.razorpay_signature,
                                        prompt_id: window.currentPrompt.prompt_id || window.currentPrompt.id,
                                        title: window.currentPrompt.title,
                                        price: (window.currentPrompt.price !== undefined && window.currentPrompt.price !== null && window.currentPrompt.price !== "") ? window.currentPrompt.price : 99,
                                        prompt_text: window.currentPrompt.prompt_text || "",
                                        image_url: window.currentPrompt.image_url || "",
                                        user: window.currentUser,
                                        created_at: new Date().toISOString()
                                    })
                                });
                                const verifyData = await verifyRes.json();
                                if (verifyData.success) {
                                    isPurchased = true;
                                    const promptIdStr = String(window.currentPrompt.prompt_id || window.currentPrompt.id);
                                    window.purchasedPrompts.push(promptIdStr);

                                    // Immediately cache the purchase in localStorage under BOTH uid and email keys.
                                    // This dual-index ensures prompts stay unlocked even when the UID changes
                                    // between sessions (Firebase UID → GAS USR ID after self-healing).
                                    try {
                                        const uid   = window.currentUser.uid   || '';
                                        const email = window.currentUser.email || '';
                                        const purchaseData = verifyData.purchase || {
                                            prompt_id: promptIdStr,
                                            title: window.currentPrompt.title,
                                            price: (window.currentPrompt.price !== undefined && window.currentPrompt.price !== null && window.currentPrompt.price !== "") ? window.currentPrompt.price : 99,
                                            payment_id: response.razorpay_payment_id,
                                            order_id: response.razorpay_order_id,
                                            prompt_text: window.currentPrompt.prompt_text || '',
                                            image_url: window.currentPrompt.image_url || '',
                                            date: new Date().toISOString(),
                                            payment_status: 'Success',
                                            payment_method: 'Razorpay'
                                        };

                                        // Write to uid-keyed cache
                                        if (uid) {
                                            const uidKey  = `purchases_cache_${uid}`;
                                            const uidArr  = JSON.parse(localStorage.getItem(uidKey) || '[]');
                                            const uidIds  = new Set(uidArr.map(p => p.payment_id));
                                            if (!uidIds.has(purchaseData.payment_id)) uidArr.push(purchaseData);
                                            localStorage.setItem(uidKey, JSON.stringify(uidArr));
                                        }
                                        // Write to email-keyed cache
                                        if (email) {
                                            const emailKey = `purchases_cache_email:${email}`;
                                            const emailArr = JSON.parse(localStorage.getItem(emailKey) || '[]');
                                            const emailIds = new Set(emailArr.map(p => p.payment_id));
                                            if (!emailIds.has(purchaseData.payment_id)) emailArr.push(purchaseData);
                                            localStorage.setItem(emailKey, JSON.stringify(emailArr));
                                        }
                                    } catch (cacheErr) {
                                        console.warn('Purchases localStorage cache update failed:', cacheErr);
                                    }
                                    updateActionBtn();
                                    actionBtn.disabled = false;
                                    showToast('Payment successful! Redirecting to success page...', 'success');
                                    if (typeof window.addNotification === 'function') {
                                        window.addNotification(`You unlocked "${window.currentPrompt.title}".`);
                                    }
                                    setTimeout(() => {
                                        const queryParams = new URLSearchParams({
                                            prompt_id: window.currentPrompt.prompt_id || window.currentPrompt.id,
                                            payment_id: response.razorpay_payment_id || 'N/A',
                                            price: (window.currentPrompt.price !== undefined && window.currentPrompt.price !== null && window.currentPrompt.price !== "") ? window.currentPrompt.price : '2',
                                            title: window.currentPrompt.title
                                        }).toString();
                                        window.location.href = `/success?${queryParams}`;
                                    }, 1500);
                                } else {
                                    showToast(verifyData.message || 'Payment verification failed.', 'error');
                                    updateActionBtn();
                                    actionBtn.disabled = false;
                                }
                            } catch (e) {
                                showToast('Payment verification error: ' + e.message, 'error');
                                updateActionBtn();
                                actionBtn.disabled = false;
                            }
                        },
                        modal: {
                            ondismiss: function() {
                                updateActionBtn();
                                actionBtn.disabled = false;
                            }
                        }
                    };
                    
                    const rzp = new window.Razorpay(options);
                    rzp.on('payment.failed', function (response){
                        showToast('Payment failed: ' + response.error.description, 'error');
                    });
                    rzp.open();
                } catch (e) {
                    showToast('Failed to initialize payment.', 'error');
                    updateActionBtn();
                    actionBtn.disabled = false;
                }
            } else if (window.currentPrompt) {
                const textToCopy = window.currentPrompt.prompt_text || window.currentPrompt.description || window.currentPrompt.title;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showToast('Prompt copied successfully!');
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

const PROMPTS_GAS_URL = "https://script.google.com/macros/s/AKfycbx17A9cGKQk70Uf1ysoYqBjjBxfDcyMywNtA7-PaAflmff_hFp9C3mQjS4K7qZk_Wsb/exec";

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
        // Try direct GAS fetch first to bypass Render cold start
        const response = await fetch(`${PROMPTS_GAS_URL}?action=get_prompts`);
        let prompts = await response.json();
        
        // Handle potential object wrapping from GAS
        if (prompts && !Array.isArray(prompts) && prompts.prompts) {
            prompts = prompts.prompts;
        }

        if (prompts && prompts.length > 0) {
            allPrompts = prompts;
            localStorage.setItem(cacheKey, JSON.stringify(prompts));
            filterPrompts(currentCategory);
        }
    } catch (error) {
        console.warn('Direct GAS fetch failed, falling back to Render API:', error);
        try {
            const response = await fetch(`${API_BASE_URL}/api/prompts`);
            let prompts = await response.json();
            
            if (prompts && !Array.isArray(prompts) && prompts.prompts) {
                prompts = prompts.prompts;
            }

            if (prompts && prompts.length > 0) {
                allPrompts = prompts;
                localStorage.setItem(cacheKey, JSON.stringify(prompts));
                filterPrompts(currentCategory);
            }
        } catch (fallbackError) {
            console.error('Error loading prompts from fallback:', fallbackError);
            if (!allPrompts || allPrompts.length === 0) {
                grid.innerHTML = `
                    <div style="color: red; padding: 40px; font-size: 18px; text-align: center; width: 100%;">
                        Failed to load prompts.
                    </div>
                `;
            }
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
    const price = (prompt.price !== undefined && prompt.price !== null && prompt.price !== "") ? prompt.price : 2;
    const platformName = (prompt.platform || '').toUpperCase();
    const isPurchasedCard = window.purchasedPrompts.includes(String(prompt.prompt_id || prompt.id));

    // Build platform badge label
    let platformLabel = '';
    if (platformName.includes('CHATGPT')) platformLabel = 'ChatGPT';
    else if (platformName.includes('CLAUDE')) platformLabel = 'Claude';
    else if (platformName.includes('GEMINI')) platformLabel = 'Gemini';
    else if (platformName.includes('MIDJOURNEY')) platformLabel = 'Midjourney';
    else if (platformName) platformLabel = prompt.platform;

    const platformBadgeHtml = platformLabel ? `
        <span class="card-platform-badge ${isPurchasedCard ? 'unlocked' : 'locked'}" data-prompt-id="${prompt.prompt_id || prompt.id}" title="${isPurchasedCard ? 'Click to open in ' + platformLabel : 'Purchase to unlock ' + platformLabel}">
            ${isPurchasedCard ? '' : '🔒 '}${platformLabel}
        </span>` : '';

        card.innerHTML = `
            <div class="card-image-wrapper">
                
                ${platformBadgeHtml}
                <button class="wishlist-btn" aria-label="Favorite">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <img src="${imageUrl}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x600?text=No+Image';">
            </div>
            <div class="card-content">
                <h3 class="card-title">${title}</h3>
                <p class="card-desc">${prompt.description || 'Discover this amazing AI prompt and boost your productivity instantly.'}</p>
                <div class="card-meta" style="display: none;"></div>
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

    // Platform badge click: gated behind payment
    const platformBadgeEl = card.querySelector('.card-platform-badge');
    if (platformBadgeEl) {
        platformBadgeEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const purchased = window.purchasedPrompts.includes(String(prompt.prompt_id || prompt.id));
            if (!purchased) {
                if (typeof showToast === 'function') {
                    showToast('🔒 Purchase this prompt to open it on the AI platform', 'error');
                }
                // Still open the modal so user can buy
                window.openPromptModal(prompt);
                return;
            }
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
            }).catch(() => {
                if (typeof showToast === 'function') showToast('Failed to copy prompt', 'error');
            });
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
