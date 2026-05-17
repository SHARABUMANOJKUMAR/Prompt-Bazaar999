import { 
    auth, db, storage, doc, getDoc, setDoc, updateDoc, serverTimestamp, ref, uploadBytes, getDownloadURL,
    EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile 
} from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const USERS_API_URL = "https://script.google.com/macros/s/AKfycby92lgxoV3RgYwn6hIj1A7ErMlqXwxAyCSXajDO2Zc4x9a9jR-wnU9DQWdUxdMVDtTn/exec";
const WISHLIST_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzeyp93N_8BIW40Qi5isffi5h7FfHvm84_1n3mWMIzYNVVovayy-fL5RNiC6k15i7GL8g/exec";

// Global state
window.currentUser = null;
window.currentPrompt = null;
let wishlistData = [];
let selectedAvatarFile = null;
let selectedAvatarUrl = null;

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

// Helper to get user from multiple possible localStorage keys
function getCurrentUser() {
  const possibleKeys = [
    "currentUser",
    "user",
    "promptbazaar_user",
    "firebaseUser"
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      const parsed = JSON.parse(value);

      if (
        parsed &&
        (parsed.user_id || parsed.uid) &&
        parsed.email
      ) {
        return parsed;
      }
    } catch (error) {
      console.warn(`Invalid JSON in localStorage key: ${key}`);
    }
  }

  return null;
}

// Toast Notification System
window.showToast = function(message, type = "success") {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

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

// --- Modal Helpers ---
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.offsetHeight; // trigger reflow
        modal.classList.add('active');
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
};

window.applyAvatarUrl = function() {
    const urlInput = document.getElementById('avatar-url-input');
    if (!urlInput) return;
    
    let url = urlInput.value.trim();
    if (!url) {
        showToast("Please enter a valid image URL.", "error");
        return;
    }

    // Automatically convert Google Drive sharing URL to direct image view link
    url = convertDriveLink(url);
    selectedAvatarUrl = url;
    
    // Update UI Preview
    const img = document.getElementById('avatar-img');
    const initials = document.getElementById('avatar-initials');
    if (img) {
        img.src = url;
        img.style.display = 'block';
        if (initials) initials.style.display = 'none';
    } else if (initials) {
        const newImg = document.createElement('img');
        newImg.id = 'avatar-img';
        newImg.src = url;
        newImg.alt = "Avatar";
        initials.parentElement.prepend(newImg);
        initials.style.display = 'none';
    }

    showToast("Preview updated! Click 'Save Changes' to save your profile picture.", "success");
    closeModal('changeAvatarModal');
};

// Auth listener
const initDashboard = async () => {
    // 1. Check for manual user first via helper
    let localUser = getCurrentUser();

    // 2. INSTANT CACHE RENDER (Stale-While-Revalidate)
    // Instantly pull cached wishlist items from localStorage so the user sees them in <10ms
    if (localUser) {
        const userId = localUser.user_id || localUser.uid;
        if (userId) {
            console.log("Instant Cache Load: Rendering wishlist from cache...");
            const cacheKey = `wishlist_cache_${userId}`;
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    // Proactively render wishlist immediately
                    const container = document.getElementById('wishlistTableBody');
                    if (container && typeof renderWishlist === 'function') {
                        renderWishlist(parsed);
                    }
                } catch(e) {
                    console.error("Cache render error:", e);
                }
            }
        }
    }
    
    // 3. Start Self-healing in background (NON-BLOCKING!)
    let selfHealingPromise = Promise.resolve();
    if (localUser && localUser.email && (!localUser.user_id || !localUser.user_id.toString().startsWith('USR'))) {
        console.log("Self-healing: Resolving sheet USR ID for:", localUser.email);
        selfHealingPromise = (async () => {
            try {
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
        })();
    }

    localUser = getCurrentUser();

    if (localUser && (localUser.login_provider === 'Manual' || localUser.login_method === 'manual')) {
        console.log("Manual User detected:", localUser.user_id || localUser.uid);
        const userId = localUser.user_id || localUser.uid;
        window.currentUser = {
            uid: userId,
            email: localUser.email,
            name: localUser.full_name || localUser.username,
            photoURL: localUser.profile_picture,
            mobile: localUser.mobile_number || ''
        };
        await loadUserProfile(null, localUser);
        
        // Wait for healing if it was running, otherwise resolves instantly
        await selfHealingPromise;
        const finalUser = getCurrentUser() || localUser;
        await loadUserWishlist(finalUser.user_id || finalUser.uid);
        return; // Skip Firebase check
    }

    // 4. Check for Firebase User
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("Firebase User UID:", user.uid);
            
            // Wait for background self-healing to ensure correct sheet ID is stored
            await selfHealingPromise;
            const updatedLocalUser = getCurrentUser() || {};
            
            window.currentUser = {
                uid: updatedLocalUser.user_id || user.uid,
                email: user.email,
                name: updatedLocalUser.full_name || updatedLocalUser.username || user.displayName,
                photoURL: updatedLocalUser.profile_picture || user.photoURL,
                mobile: updatedLocalUser.mobile_number || ''
            };
            
            await loadUserProfile(user, updatedLocalUser);
            await loadUserWishlist(updatedLocalUser.user_id || user.uid);
        } else {
            console.log("No authenticated user found.");
            window.currentUser = null;
            // Only redirect if no manual user either
            if (!localUser || (localUser.login_provider !== 'Manual' && localUser.login_method !== 'manual')) {
                localStorage.removeItem("currentUser");
                const protectedPaths = ['/wishlist', '/profile', '/payments', '/copy-history'];
                if (protectedPaths.some(path => window.location.pathname.includes(path))) {
                    window.location.href = '/login';
                }
            }
        }
    });
};

initDashboard();

// --- Profile Editing Logic ---

async function loadUserProfile(user, localUser = {}) {
    const nameInput = document.getElementById('edit-display-name');
    const mobileInput = document.getElementById('edit-mobile-number');
    const emailInput = document.getElementById('edit-email');
    const avatarImg = document.getElementById('avatar-img');
    const avatarInitials = document.getElementById('avatar-initials');

    // Load from localUser or Firebase Auth
    if (nameInput) nameInput.value = localUser.full_name || localUser.username || (user ? user.displayName : "");
    if (mobileInput) mobileInput.value = localUser.mobile_number || "";
    if (emailInput) emailInput.value = localUser.email || (user ? user.email : "");
    
    const photoURL = localUser.profile_picture || localUser.photoURL || (user ? user.photoURL : "");
    if (photoURL && avatarImg) {
        avatarImg.src = photoURL;
        avatarImg.style.display = 'block';
        if (avatarInitials) avatarInitials.style.display = 'none';
    }

    // Still check Firestore for fallback/sync (only for Firebase users)
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (mobileInput && !mobileInput.value) mobileInput.value = data.mobileNumber || "";
                if (data.photoURL && avatarImg && !avatarImg.src.includes('http') && !avatarImg.src.includes('data:image')) {
                    avatarImg.src = data.photoURL;
                    if (avatarInitials) avatarInitials.style.display = 'none';
                }
            }
        } catch (error) {
            console.error("Error loading firestore profile:", error);
        }
    }
}

// Helper to convert file to Base64
const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// Avatar Preview
const avatarInput = document.getElementById('avatar-input');
if (avatarInput) {
    avatarInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedAvatarFile = file;
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.getElementById('avatar-img');
                const initials = document.getElementById('avatar-initials');
                if (img) {
                    img.src = event.target.result;
                    if (initials) initials.style.display = 'none';
                } else if (initials) {
                    // Create img if it doesn't exist
                    const newImg = document.createElement('img');
                    newImg.id = 'avatar-img';
                    newImg.src = event.target.result;
                    newImg.alt = "Avatar";
                    initials.parentElement.prepend(newImg);
                    initials.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
        }
    };
}

// Profile Edit Form Submit
const profileForm = document.getElementById('profile-edit-form');
if (profileForm) {
    profileForm.onsubmit = async (e) => {
        e.preventDefault();
        
        // Use helper to get currentUser
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showToast("User session not found. Please login again.", "error");
            return;
        }

        const userId = currentUser.user_id || currentUser.uid;
        const fullName = document.getElementById('edit-display-name').value.trim();
        const mobileNumber = document.getElementById('edit-mobile-number').value.trim();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validation
        if (!fullName) {
            showToast("Full Name is required.", "error");
            return;
        }

        if (newPassword) {
            if (!currentPassword) {
                showToast("Current Password is required to set a new password.", "error");
                return;
            }
            if (newPassword !== confirmPassword) {
                showToast("New passwords do not match.", "error");
                return;
            }
            if (newPassword.length < 6) {
                showToast("New password must be at least 6 characters.", "error");
                return;
            }
        }

        try {
            let photoURL = currentUser.profile_picture || currentUser.photoURL;

            // 1. Handle Avatar (Image URL or Base64 File)
            if (selectedAvatarUrl) {
                photoURL = selectedAvatarUrl;
            } else if (selectedAvatarFile) {
                let base64Image = await fileToBase64(selectedAvatarFile);
                photoURL = base64Image;
            }

            // 2. Build Payload
            const gasPayload = {
                action: "update_profile",
                user_id: userId,
                full_name: fullName,
                mobile_number: mobileNumber,
                profile_picture: photoURL,
                password: newPassword || ""
            };

            // 3. Send POST request to USERS_API_URL
            let gasResponse;
            try {
                gasResponse = await fetch(USERS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify(gasPayload)
                });
            } catch (err) {
                throw new Error("Unable to connect to server.");
            }

            const gasResult = await gasResponse.json();

            if (!gasResult.success) {
                throw new Error(gasResult.message || 'Failed to update profile.');
            }

            // 4. Update Firebase if user is logged in via Firebase Google Auth
            const fbUser = auth.currentUser;
            if (fbUser && (currentUser.login_provider === 'Google' || currentUser.login_method === 'google')) {
                try {
                    await updateProfile(fbUser, { displayName: fullName, photoURL: photoURL.startsWith('data:') ? fbUser.photoURL : photoURL });
                    
                    const userRef = doc(db, "users", fbUser.uid);
                    await setDoc(userRef, {
                        name: fullName,
                        mobileNumber: mobileNumber,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                } catch (fbErr) {
                    console.error("Firebase sync error:", fbErr);
                }
            }

            // 5. Update localStorage across ALL possible keys
            const updatedUser = {
                ...currentUser,
                user_id: userId,
                uid: userId, // for compatibility
                full_name: fullName,
                username: fullName, // for compatibility
                mobile_number: mobileNumber,
                profile_picture: photoURL || currentUser.profile_picture
            };

            localStorage.setItem("currentUser", JSON.stringify(updatedUser));
            localStorage.setItem("user", JSON.stringify(updatedUser));
            localStorage.setItem("promptbazaar_user", JSON.stringify(updatedUser));

            // Sync session back to Flask server context
            try {
                await fetch('/api/session/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        displayName: fullName,
                        photoURL: photoURL
                    })
                });
            } catch (err) {
                console.error("Failed to sync session with Flask:", err);
            }

            // 6. Success UI Feedback
            showToast("✅ Profile updated successfully!");
            
            // Immediately refresh all displayed profile fields
            refreshDashboardUI(updatedUser);

            // Clear password fields
            document.getElementById('current-password').value = "";
            document.getElementById('new-password').value = "";
            document.getElementById('confirm-password').value = "";
            selectedAvatarFile = null;
            selectedAvatarUrl = null;

        } catch (error) {
            console.error("Update error:", error);
            showToast(error.message || "Failed to update profile.", "error");
        }
    };
}

function refreshDashboardUI(user) {
    // Update Form Fields
    const nameInput = document.getElementById('edit-display-name');
    const mobileInput = document.getElementById('edit-mobile-number');
    const emailInput = document.getElementById('edit-email');
    
    if (nameInput) nameInput.value = user.full_name || user.username || "";
    if (mobileInput) mobileInput.value = user.mobile_number || "";
    if (emailInput) emailInput.value = user.email || "";

    // Update Avatar Preview
    const avatarImg = document.getElementById('avatar-img');
    const avatarInitials = document.getElementById('avatar-initials');
    const avatarContainer = document.querySelector('.profile-avatar-large');

    if (user.profile_picture || user.photoURL) {
        const photo = user.profile_picture || user.photoURL;
        if (avatarImg) {
            avatarImg.src = photo;
            avatarImg.style.display = 'block';
        } else if (avatarContainer) {
            const newImg = document.createElement('img');
            newImg.id = 'avatar-img';
            newImg.src = photo;
            newImg.alt = "Avatar";
            avatarContainer.prepend(newImg);
        }
        if (avatarInitials) avatarInitials.style.display = 'none';
    } else if (avatarInitials) {
        const initials = (user.full_name || user.username || 'U')[0].toUpperCase();
        avatarInitials.textContent = initials;
        avatarInitials.style.display = 'flex';
        if (avatarImg) avatarImg.style.display = 'none';
    }

    // Update global state
    window.currentUser = {
        uid: user.user_id || user.uid,
        email: user.email,
        name: user.full_name || user.username,
        photoURL: user.profile_picture || user.photoURL,
        mobile: user.mobile_number
    };
}

// --- Wishlist Optimization & Logic ---

function renderWishlist(wishlist) {
    const container = document.getElementById('wishlistTableBody');
    if (!container) return;

    if (!wishlist || wishlist.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-center text-secondary" style="padding: 60px;">No wishlist items yet ❤️</td></tr>';
        wishlistData = [];
        return;
    }

    wishlistData = wishlist;
    let html = '';

    wishlist.forEach((item, index) => {
        const categoryBadge = `<span class="badge" style="background: rgba(139, 92, 246, 0.1); color: #a855f7; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">${item.category || '-'}</span>`;
        const platformBadge = `<span class="badge" style="background: rgba(255, 255, 255, 0.05); color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1);">${item.platform || '-'}</span>`;

        html += `
            <tr>
                <td>
                    <img 
                        src="${convertDriveLink(item.image_url) || '/static/images/placeholder.png'}" 
                        style="width: 60px; height: 60px; object-fit: cover; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);" 
                        alt="Thumbnail"
                        onerror="this.src='/static/images/placeholder.png';"
                    >
                </td>
                <td style="vertical-align: middle;"><strong>${item.prompt_title || item.title || 'Untitled'}</strong></td>
                <td style="vertical-align: middle;">${categoryBadge}</td>
                <td style="vertical-align: middle;">${platformBadge}</td>
                <td style="vertical-align: middle;"><span class="price-badge" style="position:static; display:inline-block; padding: 4px 12px; font-size: 13px;">₹${item.price || 0}</span></td>
                <td style="vertical-align: middle;">
                    <div class="action-group" style="display:flex; gap:10px">
                        <button class="btn btn-primary btn-sm view-wishlist-item" data-index="${index}" style="padding:6px 14px; font-size:12px; border-radius: 10px;">View</button>
                        <button class="btn-icon delete remove-wishlist-item" data-id="${item.wishlist_id}" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 10px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    container.innerHTML = html;
    attachWishlistListeners();
}

async function loadUserWishlist(uid) {
    const container = document.getElementById('wishlistTableBody');
    if (!container) return;

    const cacheKey = `wishlist_cache_${uid}`;
    const cachedData = localStorage.getItem(cacheKey);

    // 1. Instant load from cache if available
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            renderWishlist(parsed);
        } catch (e) {
            console.error("Cache parse error", e);
        }
    } else {
        // Only show loading if no cache exists
        container.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px;">Loading wishlist...</td></tr>';
    }

    // 2. Fetch fresh data in background
    try {
        const response = await fetch(`${WISHLIST_WEBAPP_URL}?action=get_user_wishlist&user_uid=${uid}`);
        const result = await response.json();
        
        let freshWishlist = [];
        if (Array.isArray(result)) {
            freshWishlist = result;
        } else if (result.data && Array.isArray(result.data)) {
            freshWishlist = result.data;
        } else if (result.wishlist && Array.isArray(result.wishlist)) {
            freshWishlist = result.wishlist;
        }

        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify(freshWishlist));

        // 3. Update UI only if data has changed (simple length check or deep comparison if needed)
        // For simplicity and performance, we'll re-render if it's the first load or if lengths differ
        if (!cachedData || JSON.stringify(freshWishlist) !== cachedData) {
            renderWishlist(freshWishlist);
        }

    } catch (error) {
        console.error('Error loading fresh wishlist:', error);
        // If no cache and API fails
        if (!cachedData) {
            container.innerHTML = '<tr><td colspan="6" class="text-center text-danger" style="padding: 40px;">Unable to load wishlist. Please try again later.</td></tr>';
        }
    }
}

function attachWishlistListeners() {
    document.querySelectorAll('.view-wishlist-item').forEach(btn => {
        btn.onclick = () => {
            const index = btn.dataset.index;
            openWishlistItem(wishlistData[index]);
        };
    });

    document.querySelectorAll('.remove-wishlist-item').forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            removeFromWishlist(id);
        };
    });
}

async function removeFromWishlist(wishlistId) {
    if (!confirm('Remove this item from your wishlist?')) return;

    try {
        // Optimistic UI Update: Filter out the item and re-render
        const currentUid = window.currentUser ? (window.currentUser.user_id || window.currentUser.uid) : null;
        if (currentUid) {
            const updatedWishlist = wishlistData.filter(item => item.wishlist_id !== wishlistId);
            renderWishlist(updatedWishlist);
            localStorage.setItem(`wishlist_cache_${currentUid}`, JSON.stringify(updatedWishlist));
        }

        const payload = {
            action: "remove_from_wishlist",
            wishlist_id: wishlistId
        };

        const response = await fetch(WISHLIST_WEBAPP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            showToast('Removed from Wishlist');
            // Background sync to ensure consistency
            if (currentUid) {
                await loadUserWishlist(currentUid);
            }
        } else {
            showToast(result.message || 'Failed to remove item', 'error');
            // Re-fetch on failure to restore state
            if (currentUid) await loadUserWishlist(currentUid);
        }
    } catch (error) {
        console.error('Remove error:', error);
        showToast('Something went wrong.', 'error');
        // Re-fetch on error to restore state
        const currentUid = window.currentUser ? (window.currentUser.user_id || window.currentUser.uid) : null;
        if (currentUid) await loadUserWishlist(currentUid);
    }
}

// Modal Logic
const modal = document.getElementById('prompt-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const closeBtn = document.getElementById('close-modal');
const actionBtn = document.getElementById('modal-primary-action');

function openWishlistItem(item) {
    window.currentPrompt = item;
    
    // Populate Modal
    document.getElementById('modal-title').textContent = item.prompt_title || item.title || 'Untitled';
    document.getElementById('modal-image').src = convertDriveLink(item.image_url) || '/static/images/placeholder.png';
    document.getElementById('modal-price').textContent = `₹${item.price || 0}`;
    document.getElementById('modal-platform').textContent = (item.platform || '-').toUpperCase();
    
    // Set up Copy Button
    if (actionBtn) {
        actionBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span class="btn-text">📋 COPY PROMPT</span>
        `;
        actionBtn.onclick = () => copyPromptText(item.prompt_text);
    }

    // Hide unnecessary modal buttons
    const modalWishlist = document.getElementById('modal-wishlist');
    if (modalWishlist) modalWishlist.style.display = 'none';

    // Show Modal
    if (modal) modal.classList.add('open');
    if (modalBackdrop) modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
}

const closeModal = () => {
    if (modal) modal.classList.remove('open');
    if (modalBackdrop) modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
};

if (closeBtn) closeBtn.onclick = closeModal;
if (modalBackdrop) modalBackdrop.onclick = closeModal;

async function copyPromptText(text) {
    if (!text) {
        showToast("No prompt text available to copy.", "error");
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        showToast("Prompt copied successfully!", "success");
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast("Failed to copy prompt.", "error");
    }
}
