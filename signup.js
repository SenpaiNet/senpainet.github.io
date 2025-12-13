import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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

// === アイコン生成関数 ===
function createColorIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="50" fill="${color}"/>
    </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const defaultIcons = [
  createColorIcon("#4da6ff"), createColorIcon("#ff6b6b"), 
  createColorIcon("#4ecdc4"), createColorIcon("#ffbe0b"), createColorIcon("#9b5de5")
];

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  
  // 1. アイコン選択UI
  const iconContainer = document.getElementById("iconSelection");
  const iconInput = document.getElementById("selectedIconUrl");

  if (iconContainer && iconInput) {
    iconInput.value = defaultIcons[0];
    defaultIcons.forEach((url, index) => {
      const img = document.createElement("img");
      img.src = url;
      img.className = "tag-option";
      img.style.width = "40px"; img.style.height = "40px"; img.style.borderRadius = "50%";
      img.style.padding = "2px"; img.style.objectFit = "cover"; img.style.border = "1px solid #ccc";

      if (index === 0) img.classList.add("selected");
      img.addEventListener("click", () => {
        iconContainer.querySelectorAll(".tag-option").forEach(sib => sib.classList.remove("selected"));
        img.classList.add("selected");
        iconInput.value = url;
      });
      iconContainer.appendChild(img);
    });
  }

  // 2. 卒業生タグ
  const alumniTags = document.getElementById("alumniTags");
  const tagOptions = document.querySelectorAll("#alumniTags .tag-option");
  let selectedTags = [];
  document.querySelectorAll('input[name="userType"]').forEach(radio => {
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

  // 3. フォーム送信処理
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const nickname = document.getElementById("nickname").value;
      const iconUrl = document.getElementById("selectedIconUrl") ? document.getElementById("selectedIconUrl").value : defaultIcons[0];

      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          return updateProfile(userCredential.user, {
              displayName: nickname,
              photoURL: iconUrl
          });
        })
        .then(() => {
          localStorage.setItem("senpaiNet_hasAccount", "true");
          alert(`✅ ${nickname} さんのアカウントを作成しました！`);
          window.location.href = "archive.html";
        })
        .catch((error) => {
          console.error(error);
          let msg = "エラーが発生しました。\n" + error.code;
          if (error.code === "auth/email-already-in-use") msg = "そのメールアドレスは既に登録されています。";
          else if (error.code === "auth/weak-password") msg = "パスワードは6文字以上にしてください。";
          else if (error.code === "auth/operation-not-allowed") msg = "管理画面でメール認証が許可されていません。Firebase Consoleの[Authentication]→[Sign-in method]で有効にしてください。";
          alert(msg);
        });
    });
  }
});
