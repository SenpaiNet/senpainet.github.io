import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const googleProvider = new GoogleAuthProvider();

// Googleログイン
const googleLoginBtn = document.getElementById('googleLoginBtn');
if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
      localStorage.setItem("senpaiNet_hasAccount", "true");
      // アラート削除
      window.location.href = "archive.html";
    } catch (error) {
      console.error(error);
      alert("ログイン失敗: " + error.message);
    }
  });
}

// メールログイン
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem("senpaiNet_hasAccount", "true");
      // アラート削除
      window.location.href = "archive.html"; 
    } catch (error) {
      console.error(error);
      alert("ログイン失敗: " + error.code);
    }
  });
}
