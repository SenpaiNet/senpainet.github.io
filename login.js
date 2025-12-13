import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  browserLocalPersistence, 
  setPersistence 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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
const googleProvider = new GoogleAuthProvider();

// Googleログイン
const googleLoginBtn = document.getElementById('googleLoginBtn');
if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      localStorage.setItem("senpaiNet_hasAccount", "true");
      alert(`ようこそ、${user.displayName}さん！`);
      window.location.href = "archive.html";
    } catch (error) {
      console.error("Googleログインエラー:", error);
      alert("ログイン失敗: " + error.message);
    }
  });
}

// メールログイン
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem("senpaiNet_hasAccount", "true");
      alert("ログインしました！");
      window.location.href = "archive.html"; 
    } catch (error) {
      console.error("ログインエラー:", error);
      let msg = "ログインに失敗しました。";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') msg = "メールアドレスかパスワードが間違っています。";
      else if (error.code === 'auth/user-not-found') msg = "登録されていないメールアドレスです。";
      alert(msg);
    }
  });
}
