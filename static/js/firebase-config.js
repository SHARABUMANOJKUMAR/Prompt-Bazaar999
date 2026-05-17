// Firebase SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAduQIGrEvz5fot8nileGQpKRZNh77ZB3w",
    authDomain: "prompt-bazaar.firebaseapp.com",
    projectId: "prompt-bazaar",
    storageBucket: "prompt-bazaar.firebasestorage.app",
    messagingSenderId: "1054342245439",
    appId: "1:1054342245439:web:3a2350db386962c4a85c8a",
    measurementId: "G-G0135DF3B1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Providers
const googleProvider = new GoogleAuthProvider();

// Export
export { 
    auth, 
    db, 
    storage, 
    googleProvider, 
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    updateProfile,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    ref,
    uploadBytes,
    getDownloadURL
};