import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ★★★ 設定を senpainet-auth に統一 ★★★
const firebaseConfig = {
  apiKey: "AIzaSyDuDU6ujKlBcxP05XOUwPsGqpxQVqeHgvs",
  authDomain: "senpainet-auth.firebaseapp.com",
  projectId: "senpainet-auth",
  storageBucket: "senpainet-auth.firebasestorage.app",
  messagingSenderId: "694282767766",
  appId: "1:694282767766:web:3e0dd18f697aafb60e61b7",
  measurementId: "G-977F3HXN1F"
};
// ★★★ 設定ここまで ★★★

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const defaultFallbackIcon = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#cccccc"/></svg>')}`;

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    const authBtns = document.querySelectorAll('.account-btn, .account-link');
    if (user) {
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
