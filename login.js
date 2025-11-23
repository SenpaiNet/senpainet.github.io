// バージョンを script.js と同じ v11.0.1 に統一
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ★ここを script.js と全く同じ設定に変更しました（データベースがあるプロジェクト）
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

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // ボタンを連打できないように一時的に無効化
        const submitBtn = loginForm.querySelector('button');
        if(submitBtn) submitBtn.disabled = true;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // ログイン成功！
                const user = userCredential.user;
                alert("おかえりなさい！ " + (user.displayName || "先輩") + " さん");
                
                // ★成功したら post.html (または archive.html) へ移動
                window.location.href = "post.html"; 
            })
            .catch((error) => {
                console.error("Login Error:", error);
                
                let msg = "ログインに失敗しました。";
                if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
                    msg = "メールアドレスかパスワードが間違っています。";
                } else if (error.code === "auth/too-many-requests") {
                    msg = "失敗回数が多すぎます。しばらく待ってから試してください。";
                }
                
                alert(msg);
                // 失敗したのでボタンを復活
                if(submitBtn) submitBtn.disabled = false;
            });
    });
}
