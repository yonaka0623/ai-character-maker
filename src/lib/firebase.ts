// src/lib/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBwvmssGrE7OhY_Vx_QQE2BZuIwu7GBSV4",
    authDomain: "ai-friends-5de25.firebaseapp.com",
    projectId: "ai-friends-5de25",
    storageBucket: "ai-friends-5de25.firebasestorage.app",
    messagingSenderId: "1061873493406",
    appId: "1:1061873493406:web:7bcd9d9e34fde973f3e28f",
    measurementId: "G-K1362EX42D"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
