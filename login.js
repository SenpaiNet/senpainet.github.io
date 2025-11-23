import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ↓↓↓ あなたの設定 ↓↓↓
const firebaseConfig = {
  apiKey: "AIzaSyDuDU6ujKlBcxP05XOUwPsGqpxQVqeHgvs",
  authDomain: "senpainet-auth.firebaseapp.com",
  projectId: "senpainet-auth",
  storageBucket: "senpainet-auth.firebasestorage.app",
  messagingSenderId: "694282767766",
  appId: "1:694282767766:web:3e0dd18f697aafb60e61b7",
  measurementId: "G-977F3HXN1F"
};
// ↑↑↑ ここまで ↑↑↑

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // ログイン成功！
      const user = userCredential.user;
      alert("おかえりなさい！ " + (user.displayName || "ゲスト") + " さん");
      
      // メインページへ移動
      window.location.href = "archive.html";
    })
    .catch((error) => {
      // エラー処理
      console.error(error);
      let msg = "ログインに失敗しました。";
      if (error.code === "auth/invalid-credential") {
        msg = "メールアドレスかパスワードが間違っています。";
      }
      alert(msg);
    });
});
