import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// アイコン生成関数などは既存のまま
function createColorIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${color}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
const defaultIcons = [
  createColorIcon("#4da6ff"), createColorIcon("#ff6b6b"), 
  createColorIcon("#4ecdc4"), createColorIcon("#ffbe0b"), createColorIcon("#9b5de5")
];
let selectedTags = [];

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  
  // アイコン選択ロジック (既存のまま)
  const iconContainer = document.getElementById("iconSelection");
  const iconInput = document.getElementById("selectedIconUrl");
  if (iconContainer && iconInput) {
    iconInput.value = defaultIcons[0];
    defaultIcons.forEach((url, index) => {
      const img = document.createElement("img");
      img.src = url;
      img.className = "tag-option";
      img.style.width = "40px"; 
      img.style.height = "40px";
      img.style.borderRadius = "50%";
      if (index === 0) img.classList.add("selected");
      
      img.addEventListener("click", () => {
        document.querySelectorAll("#iconSelection img").forEach(el => el.classList.remove("selected"));
        img.classList.add("selected");
        iconInput.value = url;
      });
      iconContainer.appendChild(img);
    });
  }

  // 卒業生タグ選択ロジック (既存のまま)
  const userTypeRadios = document.querySelectorAll('input[name="userType"]');
  const alumniTagsDiv = document.getElementById("alumniTags");
  userTypeRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      if (e.target.value === "卒業生") {
        alumniTagsDiv.classList.remove("hidden");
      } else {
        alumniTagsDiv.classList.add("hidden");
        selectedTags = [];
        document.querySelectorAll(".tag-option.selected").forEach(el => el.classList.remove("selected"));
      }
    });
  });

  const tagOptions = document.querySelectorAll("#alumniTags .tag-option");
  tagOptions.forEach(tag => {
    tag.addEventListener("click", () => {
      const val = tag.dataset.tag;
      if (selectedTags.includes(val)) {
        selectedTags = selectedTags.filter(t => t !== val);
        tag.classList.remove("selected");
      } else {
        if (selectedTags.length < 3) {
          selectedTags.push(val);
          tag.classList.add("selected");
        }
      }
    });
  });

  // ▼ アカウント作成処理
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const nickname = document.getElementById("nickname").value;
      const iconUrl = document.getElementById("selectedIconUrl") ? document.getElementById("selectedIconUrl").value : defaultIcons[0];
      const userType = document.querySelector('input[name="userType"]:checked').value;
      const grade = document.getElementById("grade").value;
      
      // ▼ 追加: 通知許可のチェック状態を取得
      const allowEmailNotification = document.getElementById("emailNotifCheck").checked;

      const submitBtn = signupForm.querySelector(".submit-btn");
      submitBtn.disabled = true;
      submitBtn.textContent = "処理中...";

      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          return updateProfile(user, { displayName: nickname, photoURL: iconUrl })
            .then(() => {
              // Firestoreにユーザー情報を保存
              return setDoc(doc(db, "users", user.uid), {
                nickname: nickname,
                email: email, // ログイン用IDとして保存
                userType: userType,
                grade: grade,
                tags: selectedTags,
                iconUrl: iconUrl,
                allowEmailNotification: allowEmailNotification, // ▼ ここに設定を保存
                createdAt: new Date(),
                bookmarks: []
              });
            });
        })
        .then(() => {
          localStorage.setItem("senpaiNet_hasAccount", "true");
          window.location.href = "archive.html";
        })
        .catch((error) => {
          console.error(error);
          let msg = "エラーが発生しました: " + error.code;
          if (error.code === "auth/email-already-in-use") msg = "このメールアドレスは既に登録されています。";
          if (error.code === "auth/weak-password") msg = "パスワードは6文字以上にしてください。";
          alert(msg);
          submitBtn.disabled = false;
          submitBtn.textContent = "🚀 アカウント作成";
        });
    });
  }
});
