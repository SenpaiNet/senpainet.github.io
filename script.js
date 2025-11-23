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

// 1. ログイン状態の確認
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!user) {
    console.log("未ログイン状態です");
  } else {
    console.log("ログイン中:", user.email);
  }
});

// 2. 投稿一覧を表示する処理
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
      
      // タグの表示用HTML作成
      const tagsHtml = post.tags ? post.tags.map(t => `#${t}`).join(" ") : "";

      // カードを作成
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
        
        <!-- ▼▼▼ ここが回答エリア ▼▼▼ -->
        <div class="comments-section">
          <h4>💬 みんなの回答</h4>
          <div id="comments-${postId}" class="comment-list">
            <p style="font-size:0.8em; color:#999;">読み込み中...</p>
          </div>
          
          <!-- 回答入力フォーム -->
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

      // この投稿に対する回答を読み込む関数を呼ぶ
      loadComments(postId);

      // 送信ボタンにイベントを追加
      const submitBtn = card.querySelector(`.submit-comment-btn`);
      submitBtn.addEventListener('click', () => submitComment(postId));
    });
  });
}

// 3. 回答（コメント）を読み込む関数
function loadComments(postId) {
  const commentsRef = collection(db, "posts", postId, "comments");
  // 古い順（時系列）に表示
  const qComments = query(commentsRef, orderBy("createdAt", "asc"));

  onSnapshot(qComments, (snapshot) => {
    const listDiv = document.getElementById(`comments-${postId}`);
    listDiv.innerHTML = ""; // クリア

    if (snapshot.empty) {
      listDiv.innerHTML = "<p style='font-size:0.9em; color:#aaa;'>回答はまだありません。一番乗りで答えよう！</p>";
      return;
    }

    snapshot.forEach((doc) => {
      const comment = doc.data();
      const div = document.createElement('div');
      div.className = 'comment-item';
      
      // ★匿名ロジック: isAnonymousがtrueなら「匿名先輩」、そうでなければ名前を表示
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

// 4. 回答を送信する関数
async function submitComment(postId) {
  // ログインチェック
  if (!currentUser) {
    alert("回答するにはログインが必要です！");
    window.location.href = "login.html";
    return;
  }

  const input = document.getElementById(`input-${postId}`);
  const anonCheck = document.getElementById(`anon-${postId}`);
  const text = input.value.trim();
  const isAnonymous = anonCheck.checked; // チェックボックスの状態を取得

  if (!text) {
    alert("コメントを入力してください");
    return;
  }

  try {
    // Firestoreのサブコレクション 'comments' に保存
    const commentsRef = collection(db, "posts", postId, "comments");
    
    await addDoc(commentsRef, {
      text: text,
      authorId: currentUser.uid,
      authorName: currentUser.displayName || "先輩ユーザー",
      isAnonymous: isAnonymous,  // ★ここで「匿名かどうか」を記録します
      createdAt: serverTimestamp()
    });

    // 入力欄をクリア
    input.value = "";
    // alert("送信しました"); // 邪魔なら消してもOK

  } catch (error) {
    console.error("送信エラー:", error);
    alert("送信に失敗しました。");
  }
}

// ユーティリティ: HTMLエスケープ（セキュリティ対策）
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

// ユーティリティ: 日付フォーマット
function formatDate(timestamp) {
  if (!timestamp) return "";
  const d = timestamp.toDate();
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}
