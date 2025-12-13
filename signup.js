import { auth, db } from "./firebase.js"; // dbを追加
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js"; // Firestore書き込み用

// アイコン生成関数
function createColorIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${color}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
const defaultIcons = [
  createColorIcon("#4da6ff"), createColorIcon("#ff6b6b"), 
  createColorIcon("#4ecdc4"), createColorIcon("#ffbe0b"), createColorIcon("#9b5de5")
];

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  
  // 1. アイコン選択
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

  // 3. 送信処理
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const nickname = document.getElementById("nickname").value;
      const iconUrl = document.getElementById("selectedIconUrl") ? document.getElementById("selectedIconUrl").value : defaultIcons[0];
      const userType = document.querySelector('input[name="userType"]:checked').value;
      const grade = document.getElementById("grade").value;

      // Authでユーザー作成
      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          // プロフィール更新
          return updateProfile(user, { displayName: nickname, photoURL: iconUrl })
            .then(() => {
              // ★重要: ユーザー情報をFirestoreにも保存（タグ情報などを記録するため）
              return setDoc(doc(db, "users", user.uid), {
                nickname: nickname,
                email: email,
                userType: userType,
                grade: grade,
                tags: selectedTags, // ここで選んだタグを保存
                iconUrl: iconUrl,
                createdAt: new Date()
              });
            });
        })
        .then(() => {
          localStorage.setItem("senpaiNet_hasAccount", "true");
          alert(`✅ ${nickname} さんのアカウントを作成しました！`);
          window.location.href = "archive.html";
        })
        .catch((error) => {
          console.error(error);
          alert("エラー: " + error.code);
        });
    });
  }
});
