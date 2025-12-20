import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

console.log("post.js loaded: 処理開始");

// 1. ログイン監視 & ロード画面制御
const loader = document.getElementById("global-loader");

// ★安全策: 5秒待ってもFirebaseから応答がなければ強制的にロード画面を消す
const forceHideTimer = setTimeout(() => {
  if (loader && loader.style.display !== "none") {
    console.warn("タイムアウト: Firebaseからの応答が遅いため、ロード画面を強制解除します。");
    loader.style.opacity = "0";
    setTimeout(() => { loader.style.display = "none"; }, 500);
  }
}, 5000);

onAuthStateChanged(auth, (user) => {
  console.log("Auth State Changed: ", user ? "Logged In" : "Logged Out");
  
  // 応答があったので強制タイマーを解除
  clearTimeout(forceHideTimer);

  if (user) {
    // ログイン済み -> ロード画面を消す
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => { loader.style.display = "none"; }, 500);
    }
  } else {
    // 未ログイン -> ログイン画面へ
    console.log("未ログインのためリダイレクトします");
    alert("相談を投稿するにはログインが必要です。");
    window.location.href = "login.html";
  }
}, (error) => {
  console.error("Auth Error:", error);
  // エラー時もとりあえず画面は見せる
  if (loader) loader.style.display = "none";
});

// 2. 投稿処理
const postForm = document.getElementById("postForm");
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
        alert("ログインセッションが切れています。再ログインしてください。");
        return;
    }

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    // 選択されたタグを取得
    const tags = [...document.querySelectorAll(".tag-option.selected")].map(el => el.dataset.tag);

    if (!title || !content) {
        alert("タイトルと内容は必須です");
        return;
    }

    try {
      const submitBtn = postForm.querySelector(".submit-btn");
      submitBtn.disabled = true;
      submitBtn.textContent = "送信中...";

      await addDoc(collection(db, "posts"), {
        title, 
        content, 
        tags,
        authorId: user.uid,
        authorName: user.displayName || "名無し",
        authorIcon: user.photoURL || null,
        createdAt: serverTimestamp(),
        replies: 0
      });
      
      console.log("投稿成功");
      window.location.href = "archive.html";
    } catch (err) {
      console.error("投稿エラー:", err);
      alert("投稿に失敗しました: " + err.message);
      postForm.querySelector(".submit-btn").disabled = false;
      postForm.querySelector(".submit-btn").textContent = "🚀 投稿する";
    }
  });
}

// 3. タグ選択のクリックイベント
const tagOptions = document.querySelectorAll("#tagSelect .tag-option");
if (tagOptions.length > 0) {
    tagOptions.forEach(tag => {
      tag.addEventListener("click", () => tag.classList.toggle("selected"));
    });
} else {
    console.warn("タグの選択肢が見つかりませんでした (HTMLを確認してください)");
}
