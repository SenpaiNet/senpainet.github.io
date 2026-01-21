import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === ロード画面制御 ===
const loader = document.getElementById("global-loader");
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (loader) { loader.style.opacity = "0"; setTimeout(() => { loader.style.display = "none"; }, 500); }
  } else {
    alert("ログインが必要です。");
    window.location.href = "login.html";
  }
});

const postForm = document.getElementById("postForm");
const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");

// === (26) 下書き機能 (LocalStorage) ===
const DRAFT_KEY = "senpaiNet_draft_post";

document.getElementById("saveDraftBtn").addEventListener("click", () => {
    const draft = {
        title: titleInput.value,
        content: contentInput.value,
        tags: [...document.querySelectorAll(".tag-option.selected")].map(el => el.dataset.tag)
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    alert("下書きを保存しました（ブラウザに保存されます）");
});

document.getElementById("loadDraftBtn").addEventListener("click", () => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
        const draft = JSON.parse(saved);
        titleInput.value = draft.title || "";
        contentInput.value = draft.content || "";
        // タグ復元
        document.querySelectorAll(".tag-option").forEach(el => {
            if(draft.tags && draft.tags.includes(el.dataset.tag)) el.classList.add("selected");
            else el.classList.remove("selected");
        });
        alert("下書きを復元しました");
    } else {
        alert("保存された下書きはありません");
    }
});

// 初期状態のスタイル設定（任意）
    submitBtn.style.opacity = "0.5";
    submitBtn.style.cursor = "not-allowed";

// === 投稿処理 ===
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const submitBtn = postForm.querySelector(".submit-btn");
    submitBtn.disabled = true; submitBtn.textContent = "送信中...";

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
        lastUpdatedAt: serverTimestamp(), // (37) 最終更新日時
        replies: 0,
        viewCount: 0,   // (31) 閲覧数
        isSolved: false // (22) 解決済みフラグ
      });

      // 投稿成功時に下書き削除
      localStorage.removeItem(DRAFT_KEY);
      window.location.href = "archive.html";
      
    } catch (err) {
      console.error(err);
      alert("投稿失敗: " + err.message);
      submitBtn.disabled = false; submitBtn.textContent = "🚀 投稿する";
    }
  });
}

// タグ選択
document.querySelectorAll(".tag-option").forEach(tag => {
    tag.addEventListener("click", () => tag.classList.toggle("selected"));
});

<script>
    // ページ読み込み完了時に実行
    window.addEventListener('load', function() {
        const checkbox = document.getElementById('agree-checkbox');
        const submitBtn = document.getElementById('submit-btn'); // 投稿ボタンのIDに合わせてください

        if (checkbox && submitBtn) {
            // 最初はボタンを無効化
            submitBtn.disabled = true;

            // チェックボックスの変更を監視
            checkbox.addEventListener('change', function() {
                submitBtn.disabled = !this.checked;
            });
        }
    });
</script>
