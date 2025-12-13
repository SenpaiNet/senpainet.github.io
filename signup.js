// ===============================
// 0. Firebaseの初期化設定
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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

// === シンプルな色のアイコン画像を生成する関数 ===
function createColorIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="50" fill="${color}"/>
    </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// 5色のデフォルトアイコン (SenpaiNetのテーマに合わせた色 + 定番色)
const defaultIcons = [
  createColorIcon("#4da6ff"), // 水色 (テーマカラー)
  createColorIcon("#ff6b6b"), // 赤 (アクセント)
  createColorIcon("#4ecdc4"), // 緑 (爽やか系)
  createColorIcon("#ffbe0b"), // 黄 (明るい系)
  createColorIcon("#9b5de5")  // 紫 (落ち着き系)
];

// ===============================
// アカウント作成ページロジック
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  
  // === 1. アイコン選択UIの生成処理 ===
  const iconContainer = document.getElementById("iconSelection");
  const iconInput = document.getElementById("selectedIconUrl");

  if (iconContainer && iconInput) {
    // 初期値 (水色)
    iconInput.value = defaultIcons[0];

    defaultIcons.forEach((url, index) => {
      const img = document.createElement("img");
      img.src = url;
      img.className = "tag-option"; // 既存クラス流用
      
      // 見た目の調整（インラインスタイル）
      img.style.width = "40px";
      img.style.height = "40px";
      img.style.borderRadius = "50%";
      img.style.padding = "2px";     // 枠線との隙間を少し減らす
      img.style.objectFit = "cover";
      img.style.border = "1px solid #ccc"; // 薄い枠線を追加して視認性アップ

      // 最初の1つを選択状態に
      if (index === 0) {
        img.classList.add("selected");
      }

      // クリック時の処理
      img.addEventListener("click", () => {
        const siblings = iconContainer.querySelectorAll(".tag-option");
        siblings.forEach(sib => sib.classList.remove("selected"));
        
        img.classList.add("selected");
        iconInput.value = url;
      });

      iconContainer.appendChild(img);
    });
  }

  // === 2. 卒業生タグの表示切り替え ===
  const alumniTags = document.getElementById("alumniTags");
  const tagOptions = document.querySelectorAll("#alumniTags .tag-option");
  let selectedTags = [];

  const userTypeRadios = document.querySelectorAll('input[name="userType"]');
  userTypeRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "卒業生" && radio.checked) {
        if(alumniTags) alumniTags.classList.remove("hidden");
      } else {
        if(alumniTags) alumniTags.classList.add("hidden");
        selectedTags = [];
        tagOptions.forEach(t => t.classList.remove("selected"));
      }
    });
  });

  // === 3. タグ選択ロジック ===
  tagOptions.forEach(tag => {
    tag.addEventListener("click", () => {
      const tagName = tag.dataset.tag;
      if (selectedTags.includes(tagName)) {
        selectedTags = selectedTags.filter(t => t !== tagName);
        tag.classList.remove("selected");
      } else if (selectedTags.length < 3) {
        selectedTags.push(tagName);
        tag.classList.add("selected");
      }
    });
  });

  // === 4. フォーム送信処理 ===
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const nickname = document.getElementById("nickname").value;
      
      // アイコンURLを取得（なければデフォルト）
      const iconUrl = document.getElementById("selectedIconUrl") ? document.getElementById("selectedIconUrl").value : defaultIcons[0];

      // Firebaseでユーザー作成
      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          // プロフィール更新（名前とアイコン画像）
          return updateProfile(user, {
              displayName: nickname,
              photoURL: iconUrl
          });
        })
        .then(() => {
          // アカウント作成済みフラグを保存
          localStorage.setItem("senpaiNet_hasAccount", "true");

          alert(`✅ ${nickname} さんのアカウントを作成しました！`);
          window.location.href = "archive.html";
        })
        .catch((error) => {
          console.error(error);
          let msg = "エラーが発生しました。";
          if (error.code === "auth/email-already-in-use") {
              msg = "そのメールアドレスは既に登録されています。";
          } else if (error.code === "auth/weak-password") {
              msg = "パスワードは6文字以上にしてください。";
          }
          alert(msg);
        });
    });
  }
});
