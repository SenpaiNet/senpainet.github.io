// Firebase SDKのインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// あなたのプロジェクト設定
const firebaseConfig = {
  apiKey: "AIzaSyCwPtYMU_xiM5YgcqfNsCFESkj-Y4ICD5E",
  authDomain: "senpainet-84a24.firebaseapp.com",
  projectId: "senpainet-84a24",
  storageBucket: "senpainet-84a24.firebasestorage.app",
  messagingSenderId: "1053589632945",
  appId: "1:1053589632945:web:413919be47760675e4ef90",
  measurementId: "G-1GPKNSMMFZ"
};

// 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;

// ===============================================
// 1. 共通: ログイン状態の監視
// ===============================================
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!user) {
    console.log("未ログイン状態です");
    // 投稿ページにいる場合のみ、ログイン画面へ飛ばす等の処理が必要ならここに書く
  } else {
    console.log("ログイン中:", user.email);
  }
});

// ログアウトボタン（共通）
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
      alert("ログアウトしました");
      window.location.href = "login.html";
    });
  });
}


// ===============================================
// 2. 投稿ページ (post.html) 用の処理
// ===============================================
const postForm = document.getElementById("postForm");
if (postForm) {
  // ① タグ選択ロジック
  let selectedTags = [];
  const tagElements = document.querySelectorAll(".tag-option");
  
  tagElements.forEach(tag => {
    tag.addEventListener("click", () => {
      const tagName = tag.dataset.tag;
      if (selectedTags.includes(tagName)) {
        selectedTags = selectedTags.filter(t => t !== tagName);
        tag.classList.remove("selected");
      } else {
        if (selectedTags.length >= 3) {
          alert("タグは3つまでです");
          return;
        }
        selectedTags.push(tagName);
        tag.classList.add("selected");
      }
    });
  });

  // ② 送信処理（Firebaseへ保存）
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert("投稿するにはログインが必要です！");
      window.location.href = "login.html";
      return;
    }

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;

    try {
      // Firestoreに保存
      await addDoc(collection(db, "posts"), {
        title: title,
        content: content,
        tags: selectedTags,
        authorId: currentUser.uid,
        nickname: currentUser.displayName || "匿名ユーザー",
        createdAt: serverTimestamp() // サーバー時間を使う
      });

      // 成功アニメーション（元のコードを再現）
      showSuccessAnimation();

    } catch (error) {
      console.error("投稿エラー:", error);
      alert("投稿に失敗しました。");
    }
  });
}

// 成功時のアニメーション関数
function showSuccessAnimation() {
  const overlay = document.createElement("div");
  overlay.className = "success-overlay";
  overlay.innerHTML = `
    <div class="success-card">
      <div class="checkmark">✅</div>
      <h3>投稿が完了しました！</h3>
      <p>あなたの相談が公開されました。</p>
    </div>
  `;
  document.body.appendChild(overlay);

  // CSSでアニメーションさせるためのスタイルを動的に追加（post.htmlにCSSがない場合用）
  if (!document.querySelector('#success-style')) {
    const style = document.createElement('style');
    style.id = 'success-style';
    style.textContent = `
      .success-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999; }
      .success-card { background:white; padding:30px; border-radius:10px; text-align:center; animation: popIn 0.5s ease; }
      .checkmark { font-size: 40px; margin-bottom: 10px; }
      @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    window.location.href = "archive.html"; // 一覧へ移動
  }, 2000);
}


// ===============================================
// 3. 一覧ページ (archive.html) 用の処理
// ===============================================
const postListElement = document.getElementById('postList');
if (postListElement) {
  // Firestoreから投稿を取得（新しい順）
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    postListElement.innerHTML = ""; // 一旦クリア

    if (snapshot.empty) {
      postListElement.innerHTML = "<p style='text-align:center'>まだ相談の投稿がありません。</p>";
      return;
    }

    snapshot.forEach((doc) => {
      const post = doc.data();
      const postId = doc.id;
      
      const tagsHtml = post.tags ? post.tags.map(t => `#${t}`).join(" ") : "";

      const card = document.createElement('div');
      card.className = 'post-card';
      card.innerHTML = `
        <div class="post-header">
          <span class="author">👤 ${escapeHtml(post.nickname || "匿名ユーザー")}</span>
          <span class="date">${formatDate(post.createdAt)}</span>
        </div>
        <h3 class="post-title">${escapeHtml(post.title || "無題")}</h3>
        <div class="post-content">${escapeHtml(post.content || "")}</div>
        <div class="post-tags">${escapeHtml(tagsHtml)}</div>
        
        <!-- 回答エリア -->
        <div class="comments-section">
          <h4>💬 みんなの回答</h4>
          <div id="comments-${postId}" class="comment-list">
            <p style="font-size:0.8em; color:#999;">読み込み中...</p>
          </div>
          
          <div class="comment-form">
            <textarea id="input-${postId}" placeholder="アドバイスを入力..."></textarea>
            <div class="comment-controls">
              <label class="anonymous-label">
                <input type="checkbox" id="anon-${postId}"> 匿名で回答する
              </label>
              <button class="submit-comment-btn" data-id="${postId}">送信</button>
            </div>
          </div>
        </div>
      `;
      
      postListElement.appendChild(card);
      loadComments(postId);

      const submitBtn = card.querySelector(`.submit-comment-btn`);
      submitBtn.addEventListener('click', () => submitComment(postId));
    });
  });
}

// コメント読み込み関数
function loadComments(postId) {
  const commentsRef = collection(db, "posts", postId, "comments");
  const qComments = query(commentsRef, orderBy("createdAt", "asc"));

  onSnapshot(qComments, (snapshot) => {
    const listDiv = document.getElementById(`comments-${postId}`);
    listDiv.innerHTML = ""; 

    if (snapshot.empty) {
      listDiv.innerHTML = "<p style='font-size:0.9em; color:#aaa;'>回答はまだありません。</p>";
      return;
    }

    snapshot.forEach((doc) => {
      const comment = doc.data();
      const div = document.createElement('div');
      div.className = 'comment-item';
      
      let displayName = comment.authorName || "名無し";
      if (comment.isAnonymous) {
        displayName = "匿名先輩";
      }

      div.innerHTML = `
        <div class="comment-meta">
          <strong>${escapeHtml(displayName)}</strong>
          <span>${formatDate(comment.createdAt)}</span>
        </div>
        <div class="comment-body" style="white-space: pre-wrap;">${escapeHtml(comment.text)}</div>
      `;
      listDiv.appendChild(div);
    });
  });
}

// コメント送信関数
async function submitComment(postId) {
  if (!currentUser) {
    alert("回答するにはログインが必要です！");
    window.location.href = "login.html";
    return;
  }

  const input = document.getElementById(`input-${postId}`);
  const anonCheck = document.getElementById(`anon-${postId}`);
  const text = input.value.trim();
  const isAnonymous = anonCheck.checked;

  if (!text) {
    alert("コメントを入力してください");
    return;
  }

  try {
    const commentsRef = collection(db, "posts", postId, "comments");
    await addDoc(commentsRef, {
      text: text,
      authorId: currentUser.uid,
      authorName: currentUser.displayName || "先輩ユーザー",
      isAnonymous: isAnonymous,
      createdAt: serverTimestamp()
    });

    input.value = "";

  } catch (error) {
    console.error("送信エラー:", error);
    alert("送信に失敗しました。");
  }
}

// ユーティリティ
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

function formatDate(timestamp) {
  if (!timestamp) return "";
  const d = timestamp.toDate();
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}
