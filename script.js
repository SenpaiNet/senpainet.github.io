// ===============================================
// script.js (クリック選択式・タグ無制限版)
// ===============================================

// Firebase SDKのインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// プロジェクト設定
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

let currentUser = null;

// ===============================================
// 1. 共通: ログイン状態の監視（修正版）
// ===============================================

// 投稿ボタンをあらかじめ取得（投稿ページにいる場合のみ）
const submitBtn = document.querySelector('#postForm button[type="submit"]');

// 最初はボタンを「確認中」にして押せないようにする
if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "ログイン確認中...";
}

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        console.log("ログイン済み:", user.email);
        
        // ログイン確認ができたらボタンを復活させる
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "相談を投稿する";
            submitBtn.style.backgroundColor = ""; // 元の色に戻す
            submitBtn.style.cursor = "pointer";
        }
    } else {
        console.log("未ログイン状態です");
        
        // 未ログインならボタンを無効のままにし、メッセージを変える
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "ログインが必要です";
            submitBtn.style.backgroundColor = "#ccc"; // グレーアウト
            submitBtn.style.cursor = "not-allowed";
        }
    }
});

// ログアウト処理
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
//    ★ここを「クリック方式・制限なし」に修正しました
// ===============================================
const postForm = document.getElementById("postForm");

if (postForm) {
  let selectedTags = [];
  
  // HTML内の class="tag-option" を持つ要素をすべて取得
  const tagElements = document.querySelectorAll(".tag-option");
  
  tagElements.forEach(tag => {
    tag.addEventListener("click", () => {
      const tagName = tag.dataset.tag; // data-tag="タグ名" を取得
      
      // すでに選ばれている場合 → 解除
      if (selectedTags.includes(tagName)) {
        selectedTags = selectedTags.filter(t => t !== tagName);
        tag.classList.remove("selected");
      } 
      // 選ばれていない場合 → 追加（★個数制限のif文を削除しました）
      else {
        selectedTags.push(tagName);
        tag.classList.add("selected");
      }
    });
  });

  // 送信処理
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert("投稿するにはログインが必要です！");
      return;
    }

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;

    if (!title || !content) {
        alert("タイトルと内容は必須です");
        return;
    }

    try {
      await addDoc(collection(db, "posts"), {
        title: title,
        content: content,
        tags: selectedTags, // 選択されたタグ配列
        authorId: currentUser.uid,
        nickname: currentUser.displayName || "匿名ユーザー",
        createdAt: serverTimestamp()
      });

      // 成功時アニメーション表示
      showSuccessAnimation();

    } catch (error) {
      console.error("投稿エラー:", error);
      alert("投稿に失敗しました: " + error.message);
    }
  });
}

// 成功アニメーション
function showSuccessAnimation() {
  if (document.querySelector('.success-overlay')) return;
  const overlay = document.createElement("div");
  overlay.className = "success-overlay";
  overlay.innerHTML = `
    <div class="success-card">
      <div class="checkmark">✅</div>
      <h3>投稿完了！</h3>
      <p>相談が公開されました。</p>
    </div>
  `;
  document.body.appendChild(overlay);

  if (!document.getElementById('success-style')) {
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
    window.location.href = "archive.html"; 
  }, 2000);
}


// ===============================================
// 3. 一覧ページ (archive.html) 用の処理
//    （ここは前回と同じでOKです）
// ===============================================
const postListElement = document.getElementById('postList');

if (postListElement) {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    postListElement.innerHTML = ""; 

    if (snapshot.empty) {
      postListElement.innerHTML = "<p style='text-align:center; padding:20px;'>まだ相談の投稿がありません。</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const post = docSnap.data();
      const postId = docSnap.id;
      const tagsHtml = post.tags ? post.tags.map(t => `<span style="color:#2563eb; margin-right:5px;">#${t}</span>`).join("") : "";

      const card = document.createElement('div');
      card.className = 'post-card'; 
      card.innerHTML = `
        <div class="post-header">
          <span class="author">👤 ${escapeHtml(post.nickname || "匿名ユーザー")}</span>
          <span class="date">${formatDate(post.createdAt)}</span>
        </div>
        <h3 class="post-title">${escapeHtml(post.title || "無題")}</h3>
        <div class="post-tags">${tagsHtml}</div>
        <div class="post-content">${escapeHtml(post.content || "")}</div>
        
        <hr style="margin: 15px 0; border:0; border-top:1px solid #eee;">
        
        <div class="comments-section">
          <h4>💬 先輩たちからの回答</h4>
          <div id="comments-${postId}" class="comment-list" style="margin-bottom:10px;"></div>
          <div class="comment-form-area" style="display:flex; gap:5px; flex-wrap:wrap;">
             <input type="text" id="input-${postId}" placeholder="回答を入力..." style="flex:1; padding:5px;">
             <label><input type="checkbox" id="anon-${postId}"> 匿名</label>
             <button class="submit-comment-btn" data-id="${postId}" style="cursor:pointer;">送信</button>
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

function loadComments(postId) {
  const commentsRef = collection(db, "posts", postId, "comments");
  const qComments = query(commentsRef, orderBy("createdAt", "asc"));

  onSnapshot(qComments, (snapshot) => {
    const listDiv = document.getElementById(`comments-${postId}`);
    if(!listDiv) return;
    listDiv.innerHTML = ""; 

    if (snapshot.empty) {
      listDiv.innerHTML = "<p style='font-size:0.8em; color:#aaa;'>まだ回答はありません。</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const comment = docSnap.data();
      const div = document.createElement('div');
      div.className = 'comment-item';
      div.style.cssText = "background:#f9f9f9; padding:8px; margin-bottom:5px; border-radius:4px;";
      
      let displayName = comment.authorName || "名無し";
      if (comment.isAnonymous) displayName = "匿名先輩";

      div.innerHTML = `
        <div style="font-size:0.8em; color:#666;">
          <strong>${escapeHtml(displayName)}</strong> 
          <span>${formatDate(comment.createdAt)}</span>
        </div>
        <div style="margin-top:2px;">${escapeHtml(comment.text)}</div>
      `;
      listDiv.appendChild(div);
    });
  });
}

async function submitComment(postId) {
  if (!currentUser) {
    alert("回答するにはログインが必要です！");
    return;
  }
  const input = document.getElementById(`input-${postId}`);
  const anonCheck = document.getElementById(`anon-${postId}`);
  const text = input.value.trim();
  const isAnonymous = anonCheck ? anonCheck.checked : false;

  if (!text) return;

  try {
    await addDoc(collection(db, "posts", postId, "comments"), {
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

