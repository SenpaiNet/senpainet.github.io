import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------------------------------------------
// 1. ログイン状態の監視 & ロード画面の制御
// ---------------------------------------------------
onAuthStateChanged(auth, (user) => {
  const loader = document.getElementById("global-loader");

  if (user) {
    // === ログイン中 ===
    // ロード画面を非表示にする
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => {
        loader.style.display = "none";
      }, 500); // 0.5秒かけてフェードアウト
    }
    console.log("投稿ページ: ログイン確認済み");

  } else {
    // === 未ログイン ===
    // ログイン画面へ強制移動
    alert("相談を投稿するにはログインが必要です。");
    window.location.href = "login.html";
  }
});

// ---------------------------------------------------
// 2. 投稿フォームの送信処理
// ---------------------------------------------------
const postForm = document.getElementById("postForm");
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("ログインセッションが切れました。再度ログインしてください。");
      window.location.href = "login.html";
      return;
    }

    // 入力値の取得
    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    
    // 選択されたタグの取得
    const tags = [];
    document.querySelectorAll(".tag-option.selected").forEach(el => {
      tags.push(el.dataset.tag);
    });

    try {
      // 投稿ボタンを一時的に無効化（連打防止）
      const btn = postForm.querySelector("button");
      btn.disabled = true;
      btn.textContent = "送信中...";

      await addDoc(collection(db, "posts"), {
        title: title,
        content: content,
        tags: tags,
        authorId: user.uid,              // 誰が書いたか
        authorName: user.displayName,    // 表示名
        authorIcon: user.photoURL,       // アイコン
        createdAt: serverTimestamp(),    // サーバー時間
        replies: 0
      });

      alert("投稿が完了しました！");
      window.location.href = "archive.html"; // 一覧へ戻る

    } catch (err) {
      console.error("投稿エラー:", err);
      alert("投稿に失敗しました: " + err.message);
      
      // ボタンを元に戻す
      const btn = postForm.querySelector("button");
      btn.disabled = false;
      btn.textContent = "🚀 投稿する";
    }
  });
}

// ---------------------------------------------------
// 3. タグ選択のUI制御（クリックで色が変わる処理）
// ---------------------------------------------------
const tagOptions = document.querySelectorAll("#tagSelect .tag-option");
tagOptions.forEach(tag => {
  tag.addEventListener("click", () => {
    tag.classList.toggle("selected");
  });
});
