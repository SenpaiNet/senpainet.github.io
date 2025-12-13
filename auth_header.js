import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwPtYMU_xiM5YgcqfNsCFESkj-Y4ICD5E", // あなたのAPIキー
  authDomain: "senpainet-84a24.firebaseapp.com",
  projectId: "senpainet-84a24",
  storageBucket: "senpainet-84a24.firebasestorage.app",
  messagingSenderId: "1053589632945",
  appId: "1:1053589632945:web:413919be47760675e4ef90",
  measurementId: "G-1GPKNSMMFZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 5つのデフォルトアイコン（DiceBear APIを使用）
const defaultIcons = [
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Felix",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Aneka",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Shadow",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Molly",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Spooky"
];

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    // ページ内のすべてのアカウントボタン対象（.account-btn, .account-link 両方対応）
    const authBtns = document.querySelectorAll('.account-btn, .account-link');

    if (user) {
      // === ログイン中 ===
      // ローカルストレージにアカウント所持フラグを保存
      localStorage.setItem("senpaiNet_hasAccount", "true");

      authBtns.forEach(btn => {
        // アイコンと名前を表示
        const iconUrl = user.photoURL || defaultIcons[0];
        // 既存のデザインを崩さないよう、インラインスタイルで微調整
        btn.innerHTML = `
          <img src="${iconUrl}" style="width:24px; height:24px; border-radius:50%; vertical-align:middle; margin-right:8px; border:1px solid rgba(255,255,255,0.5);">
          <span style="vertical-align:middle;">${user.displayName || "ユーザー"}</span>
        `;
        btn.href = "profile.html"; // プロフィールへ
        
        // ログアウトボタンの場合は処理を変える（archive.htmlなど）
        if (btn.id === 'logoutBtn') {
           // 既存のログアウト処理があるため、ここはテキスト変更のみにとどめる場合もあるが
           // 仕様通り「アイコン+名前」にする
        }
      });

    } else {
      // === 未ログイン ===
      const hasAccount = localStorage.getItem("senpaiNet_hasAccount");
      
      authBtns.forEach(btn => {
        // ログアウトボタン(ID付き)は "ログイン" 表記に戻す
        if (btn.id === 'logoutBtn') {
             btn.innerHTML = "🔑 ログイン";
             btn.href = "login.html";
             return;
        }

        if (hasAccount) {
          // アカウント作成済みユーザー → ログインボタン
          btn.textContent = "ログイン";
          btn.href = "login.html"; // 押すとログインページへ（自動ログインはFirebaseがブラウザ保存機能で実施）
        } else {
          // 新規ユーザー → アカウント作成ボタン
          btn.textContent = "アカウント作成";
          btn.href = "signup.html";
        }
      });
    }
  });
});
