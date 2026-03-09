import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBiV6zLthJTffJawMlO6C2UbHI9JUjByyc",
    authDomain: "speed-date-karo.firebaseapp.com",
    projectId: "speed-date-karo",
    storageBucket: "speed-date-karo.firebasestorage.app",
    messagingSenderId: "647205295252",
    appId: "1:647205295252:web:82059ed1e82681782d1081"
};

// Note: Replace the above config with your actual Firebase project config from the Firebase Console.

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);