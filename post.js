import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

console.log("post.js loaded");

// === 1. ログイン監視 & ロード画面制御 ===
const loader = document.getElementById("global-loader");

// 安全装置: 5秒待っても応答がなければ強制的にロード画面を消す
const safetyTimer = setTimeout(() => {
  if (loader && loader.style.display !== "none") {
    console.warn("タイムアウト: 強制的にロード画面を解除します");
    loader.style.opacity = "0";
    setTimeout(() => { loader.style.display = "none"; }, 500);
  }
}, 5000);

onAuthStateChanged(auth, (user) => {
  // ユーザー状態が確認できたのでタイマー解除
  clearTimeout(safetyTimer);
  
  if (user) {
    // ログイン済み -> ロード画面をフェードアウト
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => { loader.style.display = "none"; }, 500);
    }
  } else {
    // 未ログイン -> ログイン画面へ
    alert("相談を投稿するにはログインが必要です。");
    window.location.href = "login.html";
  }
});

// === 2. 投稿処理 ===
const postForm = document.getElementById("postForm");
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    
    // 二重送信防止
    const submitBtn = postForm.querySelector(".submit-btn");
    if(submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "送信中...";
    }

    if (!user) {
        alert("ログインセッションが切れました。再ログインしてください。");
        window.location.href = "login.html";
        return;
    }

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    // 選択されたタグを取得
    const tags = [...document.querySelectorAll(".tag-option.selected")].map(el => el.dataset.tag);

    try {
      // Firestoreに保存
      await addDoc(collection(db, "posts"), {
        title: title, 
        content: content, 
        tags: tags,
        authorId: user.uid,
        authorName: user.displayName || "名無し",
        authorIcon: user.photoURL || null,
        createdAt: serverTimestamp(),
        replies: 0
      });

      console.log("投稿成功");
      // 成功したら一覧ページへ
      window.location.href = "archive.html";
      
    } catch (err) {
      console.error("投稿エラー:", err);
      alert("投稿に失敗しました: " + err.message);
      // エラー時はボタンを元に戻す
      if(submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "🚀 投稿する";
      }
    }
  });
}

// === 3. タグ選択のクリックイベント ===
const tagOptions = document.querySelectorAll("#tagSelect .tag-option");
if (tagOptions.length > 0) {
    tagOptions.forEach(tag => {
      tag.addEventListener("click", () => {
          tag.classList.toggle("selected");
      });
    });
}
