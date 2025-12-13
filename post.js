// firebase.js から auth と db をもらう
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 1. ログイン監視 & ロード画面制御
onAuthStateChanged(auth, (user) => {
  const loader = document.getElementById("global-loader");
  
  if (user) {
    // ログインOK → ロード画面を消す
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => { loader.style.display = "none"; }, 500);
    }
  } else {
    // 未ログイン → ログイン画面へ
    alert("相談を投稿するにはログインが必要です。");
    window.location.href = "login.html";
  }
});

// 2. 投稿処理
const postForm = document.getElementById("postForm");
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const tags = [...document.querySelectorAll(".tag-option.selected")].map(el => el.dataset.tag);

    try {
      await addDoc(collection(db, "posts"), {
        title, content, tags,
        authorId: user.uid,
        authorName: user.displayName,
        authorIcon: user.photoURL,
        createdAt: serverTimestamp(),
        replies: 0
      });
      alert("投稿しました！");
      window.location.href = "archive.html";
    } catch (err) {
      console.error(err);
      alert("投稿失敗: " + err.message);
    }
  });
}

// 3. タグ選択
document.querySelectorAll("#tagSelect .tag-option").forEach(tag => {
  tag.addEventListener("click", () => tag.classList.toggle("selected"));
});
