import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === ロード画面制御 ===
const loader = document.getElementById("global-loader");
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (loader) { loader.style.opacity = "0"; setTimeout(() => { loader.style.display = "none"; }, 500); }
  } else {
    // ログインしていない場合はログイン画面へ
    // alert("ログインが必要です。"); // 邪魔になる場合があるのでコメントアウト可
    window.location.href = "login.html";
  }
});

const postForm = document.getElementById("postForm");
const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");

// === 下書き機能 (LocalStorage) ===
const DRAFT_KEY = "senpaiNet_draft_post";

// 下書き保存ボタン
const saveDraftBtn = document.getElementById("saveDraftBtn");
if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", () => {
        const draft = {
            title: titleInput.value,
            content: contentInput.value,
            tags: [...document.querySelectorAll(".tag-option.selected")].map(el => el.dataset.tag)
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        alert("下書きを保存しました（ブラウザに保存されます）");
    });
}

// 下書き復元ボタン
const loadDraftBtn = document.getElementById("loadDraftBtn");
if (loadDraftBtn) {
    loadDraftBtn.addEventListener("click", () => {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
            const draft = JSON.parse(saved);
            titleInput.value = draft.title || "";
            contentInput.value = draft.content || "";
            // タグ復元
            document.querySelectorAll(".tag-option").forEach(el => {
                if (draft.tags && draft.tags.includes(el.dataset.tag)) el.classList.add("selected");
                else el.classList.remove("selected");
            });
            alert("下書きを復元しました");
        } else {
            alert("保存された下書きはありません");
        }
    });
}

// === 投稿処理 ===
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
        alert("ログイン情報の取得に失敗しました。再ログインしてください。");
        return;
    }

    const submitBtn = postForm.querySelector(".submit-btn");
    
    // 二重送信防止
    submitBtn.disabled = true; 
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "送信中...";

    // 選択されたタグの取得
    const tags = [...document.querySelectorAll(".tag-option.selected")].map(el => el.dataset.tag);

    try {
      await addDoc(collection(db, "posts"), {
        title: titleInput.value, 
        content: contentInput.value, 
        tags: tags,
        authorId: user.uid,
        authorName: user.displayName || "名無し",
        authorIcon: user.photoURL || null,
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        replies: 0,
        viewCount: 0,
        isSolved: false
      });

      // 投稿成功時に下書き削除
      localStorage.removeItem(DRAFT_KEY);
      
      // 完了メッセージなどを出すならここ
      // alert("投稿しました！"); 
      
      window.location.href = "archive.html";
      
    } catch (err) {
      console.error(err);
      alert("投稿失敗: " + err.message);
      // エラー時はボタンを元に戻す
      submitBtn.disabled = false; 
      submitBtn.textContent = originalText;
    }
  });
}

// === タグ選択処理 ===
// 以前はこのコードが到達不能になっていました
document.querySelectorAll(".tag-option").forEach(tag => {
    tag.addEventListener("click", () => {
        tag.classList.toggle("selected");
    });
});
