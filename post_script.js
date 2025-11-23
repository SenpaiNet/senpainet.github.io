// post_script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Firebase設定
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
const db = getFirestore(app);
const auth = getAuth(app);

// 投稿ボタンのイベント処理
const postForm = document.querySelector('form'); // または id="postForm" などに合わせてください

if (postForm) {
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // ★ここが重要：画面のリロードを防ぐ

    const user = auth.currentUser;
    if (!user) {
      alert("投稿するにはログインが必要です");
      return;
    }

    // 入力欄のIDを確認してください。ここでは titleInput, contentInput と仮定します
    const title = document.getElementById('titleInput')?.value;
    const content = document.getElementById('contentInput')?.value; // または textarea

    if (!title || !content) {
        alert("タイトルと内容を入力してください");
        return;
    }

    try {
      await addDoc(collection(db, "posts"), {
        title: title,
        content: content,
        authorName: user.displayName || "名無しユーザー",
        authorId: user.uid,
        createdAt: serverTimestamp()
      });
      
      alert("投稿しました！");
      window.location.href = "archive.html"; // 投稿後に一覧へ移動
    } catch (error) {
      console.error("投稿エラー:", error);
      alert("投稿に失敗しました");
    }
  });
}
