// Service Worker for Firebase Cloud Messaging (FCM)
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Initialize the Firebase app in the service worker by passing in the messagingSenderId
firebase.initializeApp({
    apiKey: "AIzaSyAduQIGrEvz5fot8nileGQpKRZNh77ZB3w",
    authDomain: "prompt-bazaar.firebaseapp.com",
    projectId: "prompt-bazaar",
    storageBucket: "prompt-bazaar.firebasestorage.app",
    messagingSenderId: "1054342245439",
    appId: "1:1054342245439:web:3a2350db386962c4a85c8a"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message: ", payload);
    
    // Customize notification behavior here
    const notificationTitle = payload.notification.title || "🔥 New Prompt Added!";
    const notificationOptions = {
        body: payload.notification.body || "A new premium prompt is available!",
        icon: payload.notification.icon || "/static/images/logo.png",
        image: payload.notification.image || "",
        data: {
            click_action: payload.data?.click_action || "/prompt-gallery"
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to open link
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const clickAction = event.notification.data?.click_action || '/prompt-gallery';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window open with this app
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.navigate(clickAction).then(c => c.focus());
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(clickAction);
            }
        })
    );
});
