import { auth, googleProvider } from './firebase-config.js?v=2';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
    sendPasswordResetEmail,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? window.location.origin
    : "https://prompt-bazaar999.onrender.com";
const USERS_API_URL = "https://script.google.com/macros/s/AKfycby92lgxoV3RgYwn6hIj1A7ErMlqXwxAyCSXajDO2Zc4x9a9jR-wnU9DQWdUxdMVDtTn/exec";

class AuthController {
    static async handleManualSessionLogin(userData) {
        try {
            // Save to localStorage as requested
            const currentUser = {
                user_id: userData.user_id || userData.uid,
                full_name: userData.full_name || userData.username || userData.name || '',
                email: userData.email,
                mobile_number: userData.mobile_number || '',
                profile_picture: userData.profile_picture || '',
                login_provider: "Manual"
            };
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
            localStorage.setItem("user", JSON.stringify(currentUser));
            localStorage.setItem("promptbazaar_user", JSON.stringify(currentUser));

            // Inform backend about manual session in background
            fetch(`${API_BASE_URL}/api/sessionLogin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isManual: true,
                    user: currentUser
                })
            }).catch(err => console.warn("Background session sync failed:", err));

            // Instantly redirect!
            window.location.href = '/gallery';
        } catch (error) {
            console.error('Manual session error:', error);
            this.showError('Authentication failed. Please try again.');
            this.setLoading(false);
        }
    }

    static async handleSessionLogin(user, method = 'manual', extraData = {}) {
        try {
            const idToken = await user.getIdToken();
            
            // Save to localStorage
            const currentUser = {
                user_id: user.uid,
                full_name: user.displayName || extraData.full_name || extraData.username || '',
                email: user.email,
                mobile_number: extraData.mobile_number || '',
                profile_picture: user.photoURL || '',
                login_provider: "Google"
            };
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
            localStorage.setItem("user", JSON.stringify(currentUser));
            localStorage.setItem("promptbazaar_user", JSON.stringify(currentUser));

            // Inform backend about session in background
            fetch(`${API_BASE_URL}/api/sessionLogin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idToken: idToken,
                    user: {
                        uid: user.uid,
                        email: user.email,
                        displayName: currentUser.full_name,
                        photoURL: currentUser.profile_picture
                    }
                })
            }).catch(err => console.warn("Background session sync failed:", err));

            // Instantly redirect!
            window.location.href = '/gallery';
        } catch (error) {
            console.error('Session error:', error);
            this.showError('Authentication failed. Please try again.');
            this.setLoading(false);
        }
    }

    static async handleSessionLogout() {
        try {
            localStorage.removeItem("currentUser");
            localStorage.removeItem("user");
            localStorage.removeItem("promptbazaar_user");
            window.currentUser = null;
            await fetch(`${API_BASE_URL}/api/sessionLogout`, { method: 'POST' }).catch(err => console.warn("Background session logout failed", err));
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            window.location.href = '/login';
        }
    }

    static showError(message) {
        const errorElement = document.getElementById('form-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('visible');
        }
    }

    static hideError() {
        const errorElement = document.getElementById('form-error');
        if (errorElement) {
            errorElement.classList.remove('visible');
        }
    }

    static setLoading(isLoading) {
        const btn = document.getElementById('submit-btn');
        if (btn) {
            if (isLoading) {
                btn.classList.add('loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        }
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validateMobile(mobile) {
        const re = /^\+?[\d\s-]{10,15}$/;
        return re.test(mobile);
    }
}

// Event Listeners for pages
document.addEventListener('DOMContentLoaded', () => {

    // Sign Up Form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            AuthController.hideError();

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const mobile = document.getElementById('mobile').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (!AuthController.validateEmail(email)) {
                return AuthController.showError('Invalid email format');
            }
            if (!AuthController.validateMobile(mobile)) {
                return AuthController.showError('Invalid mobile number');
            }
            if (password !== confirmPassword) {
                return AuthController.showError('Passwords do not match');
            }
            if (password.length < 6) {
                return AuthController.showError('Password must be at least 6 characters');
            }

            AuthController.setLoading(true);
            try {
                // Submit only to GAS
                const gasResponse = await fetch(USERS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: "signup",
                        full_name: username,
                        email: email,
                        mobile_number: mobile,
                        password: password,
                        confirm_password: confirmPassword,
                        login_provider: "Manual"
                    })
                });
                const gasResult = await gasResponse.json();
                
                if (gasResult.success) {
                    alert("🎉 Welcome to Prompt Bazaar! Your account has been created successfully.");
                    // Use the returned user object to populate localStorage
                    await AuthController.handleManualSessionLogin(gasResult.user || gasResult.data || { 
                        full_name: username, 
                        email, 
                        mobile_number: mobile,
                        user_id: gasResult.user_id 
                    });
                } else {
                    throw new Error(gasResult.message || 'Failed to create account');
                }
                
            } catch (error) {
                AuthController.showError(error.message);
                AuthController.setLoading(false);
            }
        });
    }

    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            AuthController.hideError();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!AuthController.validateEmail(email)) {
                return AuthController.showError('Invalid email format');
            }

            AuthController.setLoading(true);
            try {
                // Submit only to GAS
                const gasResponse = await fetch(USERS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: "login",
                        email: email,
                        password: password
                    })
                });
                const gasResult = await gasResponse.json();

                if (gasResult.success) {
                    await AuthController.handleManualSessionLogin(gasResult.user || gasResult.data);
                } else {
                    throw new Error(gasResult.message || 'Invalid email or password');
                }

            } catch (error) {
                AuthController.showError(error.message || 'Invalid email or password');
                AuthController.setLoading(false);
            }
        });
    }

    // Google Sign In (KEEPS FIREBASE AND SYNCS WITH GAS SPREADSHEET)
    const googleBtn = document.getElementById("googleSignInBtn");
    if (googleBtn) {
        googleBtn.addEventListener("click", async () => {
            const originalHTML = googleBtn.innerHTML;
            try {
                if (!auth) throw new Error('Firebase not initialized');
                
                // Show loading spinner
                googleBtn.innerHTML = '<span class="spinner" style="display:inline-block; width:16px; height:16px; border-width:2px; margin-right:8px; vertical-align:middle"></span> Signing you in...';
                googleBtn.disabled = true;

                const result = await signInWithPopup(auth, googleProvider);

                const email = result.user.email;
                const displayName = result.user.displayName || email.split('@')[0];
                const photoURL = result.user.photoURL || '';

                // 1. Instantly check if we have the spreadsheet user ID cached to avoid any slow Apps Script API delays for return users
                let sheetUserId = localStorage.getItem(`pb_google_uid_${email}`);

                if (!sheetUserId) {
                    // Use Firebase UID instantly to prevent ANY blocking delay!
                    sheetUserId = result.user.uid;
                    localStorage.setItem(`pb_google_uid_${email}`, sheetUserId);
                    
                    // Fire Apps Script check and registration in the background completely asynchronously
                    (async () => {
                        try {
                            const gasLoginResponse = await fetch(USERS_API_URL, {
                                method: 'POST',
                                keepalive: true,
                                body: JSON.stringify({
                                    action: "login",
                                    email: email,
                                    password: "googlemanoj"
                                })
                            });
                            const gasLoginResult = await gasLoginResponse.json();
                            
                            if (gasLoginResult.success && gasLoginResult.user) {
                                localStorage.setItem(`pb_google_uid_${email}`, gasLoginResult.user.user_id);
                            } else {
                                // Trigger signup if not found in spreadsheet
                                fetch(USERS_API_URL, {
                                    method: 'POST',
                                    keepalive: true,
                                    body: JSON.stringify({
                                        action: "signup",
                                        full_name: displayName,
                                        email: email,
                                        mobile_number: "",
                                        password: "googlemanoj",
                                        confirm_password: "googlemanoj",
                                        login_provider: "Google"
                                    })
                                }).then(r => r.json()).then(res => {
                                    if (res.success) {
                                        const newId = res.user_id || (res.user ? res.user.user_id : '');
                                        if (newId) localStorage.setItem(`pb_google_uid_${email}`, newId);
                                    }
                                }).catch(err => console.warn("Background user registration sync:", err));
                            }
                        } catch (e) {
                            console.warn("Background user check sync failed:", e);
                        }
                    })();
                }

                const finalUserId = sheetUserId || result.user.uid;

                // Save to localStorage
                const currentUser = {
                    user_id: finalUserId,
                    uid: finalUserId,
                    username: displayName,
                    full_name: displayName,
                    email: email,
                    mobile_number: '',
                    profile_picture: photoURL,
                    login_method: 'google',
                    login_provider: 'Google'
                };
                localStorage.setItem("currentUser", JSON.stringify(currentUser));
                localStorage.setItem("user", JSON.stringify(currentUser));
                localStorage.setItem("promptbazaar_user", JSON.stringify(currentUser));

                // Inform Flask backend in background
                fetch(`${API_BASE_URL}/google-login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        uid: finalUserId,
                        name: displayName,
                        email: email
                    })
                }).catch(err => console.warn("Background session sync failed:", err));

                // Instantly redirect to the profile page!
                window.location.href = "/gallery";
            } catch (error) {
                console.error("Google Sign-In Error:", error);
                AuthController.showError(error.message || "Failed to sign in with Google.");
                
                // Restore button
                if (googleBtn) {
                    googleBtn.innerHTML = originalHTML;
                    googleBtn.disabled = false;
                }
            }
        });
    }


    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!auth) return AuthController.handleSessionLogout();
            try {
                await signOut(auth);
                await AuthController.handleSessionLogout();
            } catch (error) {
                console.error('Error logging out:', error);
            }
        });
    }

    // Check Firebase Auth state for automatic redirection if already authenticated
    try {
        if (auth) {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    const currentPath = window.location.pathname;
                    if (currentPath.includes('login') || currentPath.includes('signup')) {
                        // Ensure local storage has at least the basic details
                        if (!localStorage.getItem("currentUser")) {
                            const currentUser = {
                                user_id: user.uid,
                                uid: user.uid,
                                full_name: user.displayName || user.email.split('@')[0],
                                email: user.email,
                                profile_picture: user.photoURL || '',
                                login_provider: "Google"
                            };
                            localStorage.setItem("currentUser", JSON.stringify(currentUser));
                        }
                        window.location.replace("/gallery");
                    }
                }
            });
        }
    } catch(e) {
        console.error("Auth state redirect listener initialization failed:", e);
    }
});
