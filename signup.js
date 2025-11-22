// ===============================
// 0. Firebaseの初期化設定
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ↓↓↓ ここをあなたの設定に書き換えてください ↓↓↓
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


// ===============================
// アカウント作成ページ (signup.html)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  if (!signupForm) return;

  const alumniTags = document.getElementById("alumniTags");
  const tagOptions = document.querySelectorAll(".tag-option");
  let selectedTags = [];

  // ① 卒業生を選んだときだけタグ表示（既存のまま）
  const userTypeRadios = document.querySelectorAll('input[name="userType"]');
  userTypeRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "卒業生" && radio.checked) {
        alumniTags.classList.remove("hidden");
      } else {
        alumniTags.classList.add("hidden");
        selectedTags = [];
        tagOptions.forEach(t => t.classList.remove("selected"));
      }
    });
  });

  // ② タグ選択処理（既存のまま）
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

  // ③ フォーム送信（ここをFirebase対応に変更！）
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // フォームの値を取得
    const userType = document.querySelector('input[name="userType"]:checked').value;
    const email = document.getElementById("email").value;
    const nickname = document.getElementById("nickname").value;
    const grade = document.getElementById("grade").value;
    
    // ★追加: パスワードを取得 (HTMLに <input id="password"> が必要です)
    const password = document.getElementById("password").value; 

    // Firebaseでユーザー作成
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // 1. アカウント作成成功！
        const user = userCredential.user;

        // 2. ニックネームをFirebaseのプロフィールにも設定しておく
        return updateProfile(user, {
            displayName: nickname
        }).then(() => {
            return user;
        });
      })
      .then((user) => {
        // 3. ローカルストレージにも保存（既存サイトの動きを壊さないため）
        // IDはDate.now()ではなく、Firebaseの本物のID(uid)を使います
        const userData = {
          id: user.uid,       // FirebaseのID
          userType,
          email,
          nickname,
          grade,
          tags: selectedTags,
          created_at: new Date().toISOString()
        };

        localStorage.setItem("currentUser", JSON.stringify(userData));

        alert(`✅ ${nickname} さんのアカウントを作成しました！`);
        window.location.href = "archive.html";
      })
      .catch((error) => {
        // エラー処理
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
});
