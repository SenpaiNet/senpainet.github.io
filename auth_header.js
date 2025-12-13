import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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

// フォールバック用のグレーの丸アイコン（ユーザー設定がない場合用）
const defaultFallbackIcon = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#cccccc"/></svg>')}`;

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    // ページ内のすべてのアカウントボタン対象（.account-btn, .account-link 両方対応）
    const authBtns = document.querySelectorAll('.account-btn, .account-link');

    if (user) {
      // === ログイン中 ===
      // アカウント作成済みフラグを念のため更新
      localStorage.setItem("senpaiNet_hasAccount", "true");

      authBtns.forEach(btn => {
        // 保存された色アイコン(photoURL) または グレーの丸
        const iconUrl = user.photoURL || defaultFallbackIcon;
        
        // アイコン画像と名前を表示するHTMLに書き換え
        // CSSクラスは既存のものを維持
        btn.innerHTML = `
          <img src="${iconUrl}" style="width:24px; height:24px; border-radius:50%; vertical-align:middle; margin-right:8px; border:1px solid rgba(255,255,255,0.8);">
          <span style="vertical-align:middle;">${user.displayName || "ユーザー"}</span>
        `;
        btn.href = "profile.html"; // プロフィール画面へリンク
        
        // ※ログアウトボタン(ID="logoutBtn")に関しては、ここでの書き換え対象外とするか、
        // 既存のscript.js等が別途制御している可能性があるため、ここでは主に「ヘッダーのアカウントボタン」を想定しています。
      });

    } else {
      // === 未ログイン ===
      // 常に「ログイン」ボタンを表示する（新規作成はログイン画面の下部から）
      
      authBtns.forEach(btn => {
        // ログアウトボタン(ID="logoutBtn")だった場合も「ログイン」に戻す
        if (btn.id === 'logoutBtn') {
             btn.innerHTML = "🔑 ログイン";
             btn.href = "login.html";
             return;
        }

        // 通常のアカウントボタン
        btn.textContent = "ログイン";
        btn.href = "login.html";
      });
    }
  });
});
