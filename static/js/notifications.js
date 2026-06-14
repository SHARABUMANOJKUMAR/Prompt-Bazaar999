// Push Notification Manager using Firebase Cloud Messaging (FCM)
import { messaging, db, auth } from './firebase-config.js';
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    setDoc, 
    doc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// VAPID Public Key for Web Push Certificates (configured in Firebase Console)
// Default placeholder - can be overridden by window.FCM_VAPID_KEY if needed.
const VAPID_KEY = window.FCM_VAPID_KEY || "BFO4CLZGt_ocJn1eHem_dsXPiYhc93tg8LEX9XCVjBWdsC1KhU4Ftc1psrYFiM24WIrMU53ALTl7EqBiJKRcgig"; 

class NotificationManager {
    static async init() {
        if (!('Notification' in window)) {
            console.warn("This browser does not support desktop notifications.");
            return;
        }

        // Register FCM Service Worker
        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log("FCM Service Worker registered successfully:", registration);
            
            // Listen for changes in Auth state to save the token for the current user
            auth.onAuthStateChanged(async (user) => {
                const permission = Notification.permission;
                if (permission === 'granted') {
                    await this.requestAndSaveToken(registration, user);
                } else if (permission === 'default') {
                    // Show a subtle, beautiful delay popup or prompt before asking browser permission
                    this.showPermissionPrompt(registration, user);
                }
            });

        } catch (error) {
            console.error("Service worker or FCM registration failed:", error);
        }

        // Handle foreground notifications (when page is open)
        onMessage(messaging, (payload) => {
            console.log("Foreground notification received:", payload);
            this.showInAppNotification(payload);
        });
    }

    static showPermissionPrompt(registration, user) {
        // Automatically ask for permission after a short, non-intrusive delay of 2.5 seconds
        setTimeout(async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    console.log("Notification permission granted!");
                    await this.requestAndSaveToken(registration, user);
                }
            } catch (err) {
                console.error("Error requesting notification permission:", err);
            }
        }, 2500);
    }

    static async requestAndSaveToken(registration, user) {
        try {
            // Retrieve current token
            const currentToken = await getToken(messaging, {
                serviceWorkerRegistration: registration,
                vapidKey: VAPID_KEY
            });

            if (currentToken) {
                console.log("FCM Token retrieved successfully:", currentToken);
                await this.saveTokenToFirestore(currentToken, user);
            } else {
                console.warn("No registration token available. Request permission to generate one.");
            }
        } catch (err) {
            console.error("An error occurred while retrieving FCM token:", err);
        }
    }

    static async saveTokenToFirestore(token, user) {
        try {
            const email = user ? user.email : (localStorage.getItem("currentUser") ? JSON.parse(localStorage.getItem("currentUser")).email : "guest");
            const name = user ? (user.displayName || email.split('@')[0]) : (localStorage.getItem("currentUser") ? JSON.parse(localStorage.getItem("currentUser")).full_name : "Anonymous");

            // Post the token to the Render backend to bypass client-side Firestore Rules
            const API_BASE_URL = window.API_BASE_URL || 'https://prompt-bazaar999.onrender.com';
            const response = await fetch(`${API_BASE_URL}/save-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, email, name })
            });

            if (response.ok) {
                console.log("FCM Token successfully synced to Backend for:", email);
            } else {
                console.error("Failed to sync FCM Token to Backend.");
            }
        } catch (error) {
            console.error("Error saving token to backend:", error);
        }
    }

    static showInAppNotification(payload) {
        // Create a premium, beautiful foreground notification popup
        const notificationContainer = document.getElementById('toast-container') || document.body;
        
        const card = document.createElement('div');
        card.style.position = 'fixed';
        card.style.bottom = '24px';
        card.style.right = '24px';
        card.style.zIndex = '9999';
        card.style.background = 'rgba(255, 255, 255, 0.95)';
        card.style.border = '1px solid var(--color-border, #E5E7EB)';
        card.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        card.style.borderRadius = '16px';
        card.style.padding = '16px';
        card.style.maxWidth = '360px';
        card.style.display = 'flex';
        card.style.gap = '12px';
        card.style.cursor = 'pointer';
        card.style.transition = 'all 0.3s ease';
        card.style.backdropFilter = 'blur(10px)';
        card.style.animation = 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)';

        // Image template if exists
        const imgHtml = payload.notification.image ? `
            <img src="${payload.notification.image}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" alt="Prompt Image">
        ` : `
            <div style="width: 50px; height: 50px; border-radius: 8px; background: var(--gradient-primary, #0D6EFD); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">🔥</div>
        `;

        card.innerHTML = `
            ${imgHtml}
            <div style="flex: 1;">
                <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--color-text-primary, #0F172A);">${payload.notification.title || "🔥 New Prompt Added!"}</h4>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--color-text-secondary, #475569); line-height: 1.4;">${payload.notification.body}</p>
            </div>
            <button class="close-btn" style="background: none; border: none; font-size: 18px; cursor: pointer; color: var(--color-text-secondary, #475569); padding: 0; margin-top: -4px;">&times;</button>
        `;

        // Style animation
        const styleSheet = document.createElement("style");
        styleSheet.innerText = `
            @keyframes slideInRight {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styleSheet);

        // Click actions
        card.onclick = (e) => {
            if (e.target.classList.contains('close-btn')) {
                card.remove();
                return;
            }
            window.location.href = payload.data?.click_action || '/prompt-gallery';
        };

        notificationContainer.appendChild(card);

        // Auto dismiss after 6 seconds
        setTimeout(() => {
            if (card.parentNode) {
                card.style.transform = 'translateX(120%)';
                card.style.opacity = '0';
                setTimeout(() => card.remove(), 300);
            }
        }, 6000);
    }
}

// Automatically Initialize on Page Load
document.addEventListener('DOMContentLoaded', () => {
    NotificationManager.init();
});

export default NotificationManager;
