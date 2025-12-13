import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ★★★ 接続設定を統一 ★★★
const firebaseConfig = {
  apiKey: "AIzaSyCwPtYMU_xiM5YgcqfNsCFESkj-Y4ICD5E",
  authDomain: "senpainet-84a24.firebaseapp.com",
  projectId: "senpainet-84a24",
  storageBucket: "senpainet-84a24.firebasestorage.app",
  messagingSenderId: "1053589632945",
  appId: "1:1053589632945:web:413919be47760675e4ef90",
  measurementId: "G-1GPKNSMMFZ"
};
// ★★★ 接続設定を統一 ★★★

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// フォールバック用のグレーの丸アイコン
const defaultFallbackIcon = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#cccccc"/></svg>')}`;

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    const authBtns = document.querySelectorAll('.account-btn, .account-link');

    if (user) {
      // === ログイン中 ===
      localStorage.setItem("senpaiNet_hasAccount", "true");

      authBtns.forEach(btn => {
        const iconUrl = user.photoURL || defaultFallbackIcon;
        
        btn.innerHTML = `
          <img src="${iconUrl}" style="width:24px; height:24px; border-radius:50%; vertical-align:middle; margin-right:8px; border:1px solid rgba(255,255,255,0.8);">
          <span style="vertical-align:middle;">${user.displayName || "ユーザー"}</span>
        `;
        btn.href = "profile.html"; 
      });

    } else {
      // === 未ログイン ===
      authBtns.forEach(btn => {
        if (btn.id === 'logoutBtn') {
             btn.innerHTML = "🔑 ログイン";
             btn.href = "login.html";
             return;
        }

        btn.textContent = "ログイン";
        btn.href = "login.html";
      });
    }
  });
});
