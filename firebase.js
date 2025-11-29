// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6poRy4I0DY9xGK3099GqRvyKSR-kUubA",
  authDomain: "senpainet-faa7a.firebaseapp.com",
  projectId: "senpainet-faa7a",
  storageBucket: "senpainet-faa7a.firebasestorage.app",
  messagingSenderId: "1040425714188",
  appId: "1:1040425714188:web:be28dc1ecde20a8b52e429",
  measurementId: "G-53L04J0GHB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
