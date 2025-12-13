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

// デフォルトアイコンリスト (DiceBear API)
const defaultIcons = [
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Felix",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Aneka",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Shadow",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Molly",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Spooky"
];

// ===============================
// アカウント作成ページロジック
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  
  // === アイコン選択UIの生成処理 ===
  const iconContainer = document.getElementById("iconSelection");
  const iconInput = document.getElementById("selectedIconUrl"); // HTML側に追加したhidden input

  if (iconContainer && iconInput) {
    // 初期値
    iconInput.value = defaultIcons[0];

    defaultIcons.forEach((url, index) => {
      const img = document.createElement("img");
      img.src = url;
      // 既存のCSSクラス .tag-option を流用してデザインを統一
      img.className = "tag-option"; 
      
      // アイコン用の追加スタイル（デザイン崩れ防止のためインラインで微調整）
      img.style.width = "40px";
      img.style.height = "40px";
      img.style.borderRadius = "50%";
      img.style.padding = "4px";
      img.style.objectFit = "cover";

      // 最初の1つを選択状態に
      if (index === 0) {
        img.classList.add("selected");
      }

      // クリック時の処理
      img.addEventListener("click", () => {
        // 他の選択を解除
        const siblings = iconContainer.querySelectorAll(".tag-option");
        siblings.forEach(sib => sib.classList.remove("selected"));
        
        // 自分を選択
        img.classList.add("selected");
        iconInput.value = url;
      });

      iconContainer.appendChild(img);
    });
  }

  // === 卒業生タグの表示切り替え（既存ロジック） ===
  const alumniTags = document.getElementById("alumniTags");
  const tagOptions = document.querySelectorAll("#alumniTags .tag-option"); // アイコン以外のタグ
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

  // === フォーム送信 ===
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const nickname = document.getElementById("nickname").value;
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
          // ★ここで「アカウント作成済み」フラグをローカルストレージに保存
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
