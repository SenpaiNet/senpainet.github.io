import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  browserLocalPersistence, 
  setPersistence 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCwPtYMU_xiM5YgcqfNsCFESkj-Y4ICD5E",
  authDomain: "senpainet-84a24.firebaseapp.com",
  projectId: "senpainet-84a24",
  storageBucket: "senpainet-84a24.firebasestorage.app",
  messagingSenderId: "1053589632945",
  appId: "1:1053589632945:web:413919be47760675e4ef90",
  measurementId: "G-1GPKNSMMFZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ------------------------------------------
// 1. Googleログインの処理（一番おすすめ）
// ------------------------------------------
const googleLoginBtn = document.getElementById('googleLoginBtn');

if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', async () => {
    try {
      // ログイン状態を「ローカル」に保存する（ブラウザ閉じても維持）
      await setPersistence(auth, browserLocalPersistence);
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      alert(`ようこそ、${user.displayName}さん！\nログインに成功しました。`);
      window.location.href = "archive.html"; // 一覧ページへ移動
      
    } catch (error) {
      console.error("Googleログインエラー:", error);
      alert("ログインに失敗しました: " + error.message);
    }
  });
}

// ------------------------------------------
// 2. メール・パスワードログインの処理
// ------------------------------------------
const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      await setPersistence(auth, browserLocalPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      alert("ログインしました！");
      window.location.href = "archive.html"; // 一覧ページへ移動

    } catch (error) {
      console.error("ログインエラー:", error);
      let msg = "ログインに失敗しました。";
      if (error.code === 'auth/wrong-password') msg = "パスワードが間違っています。";
      if (error.code === 'auth/user-not-found') msg = "登録されていないメールアドレスです。";
      alert(msg);
    }
  });
}
