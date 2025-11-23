// script.js (archive.html 用の修正版)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
// 認証機能を追加
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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

// ---------------------------------------------------
// 1. ログイン状態の監視（※ここが修正ポイント！）
// ---------------------------------------------------
onAuthStateChanged(auth, (user) => {
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (user) {
    // 【ログインしている時】
    console.log("ログイン中:", user.displayName);
    if(logoutBtn) {
        logoutBtn.innerHTML = "🚪 ログアウト";
        logoutBtn.href = "#"; // ログアウト処理へ
    }
  } else {
    // 【ログインしていない時】
    console.log("ゲスト閲覧中");
    
    // ★重要：ここで alert() や window.location.href を書かない！
    // 閲覧ページは誰でも見てOKにするため、追い出し処理を削除しました。
    
    // ログアウトボタンを「ログイン」に変えてあげる
    if(logoutBtn) {
        logoutBtn.innerHTML = "🔑 ログイン";
        logoutBtn.href = "login.html"; // ログインページへ誘導
    }
  }
});

// ---------------------------------------------------
// 2. ログアウト処理
// ---------------------------------------------------
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    // ボタンが「ログアウト」の時だけ機能させる
    if (auth.currentUser) {
        e.preventDefault();
        signOut(auth).then(() => {
          alert("ログアウトしました 👋");
          window.location.href = "login.html";
        }).catch((error) => {
          console.error("ログアウトエラー:", error);
        });
    }
  });
}

// ---------------------------------------------------
// 3. 投稿一覧の表示（変更なし）
// ---------------------------------------------------
const postList = document.getElementById('postList');
const keywordInput = document.getElementById('keywordInput');
const searchBtn = document.getElementById('searchBtn');

let allPosts = [];

const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  allPosts = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    allPosts.push({
      id: doc.id,
      ...data
    });
  });
  renderPosts(allPosts);
});

function renderPosts(posts) {
  postList.innerHTML = "";

  if (posts.length === 0) {
    postList.innerHTML = "<p>投稿が見つかりませんでした。</p>";
    return;
  }

  posts.forEach(post => {
    const dateStr = post.createdAt ? post.createdAt.toDate().toLocaleDateString() : "日付不明";
    const snippet = post.content.length > 60 ? post.content.substring(0, 60) + "..." : post.content;
    
    // タグの表示（あれば）
    let tagsHtml = "";
    if (post.tags && Array.isArray(post.tags)) {
        tagsHtml = post.tags.map(tag => `<span style="font-size:0.8em; background:#eee; padding:2px 5px; margin-right:5px; border-radius:4px;">#${tag}</span>`).join("");
    }

    const html = `
      <article class="post-card" onclick="location.href='detail.html?id=${post.id}'" style="cursor: pointer;">
        <div class="post-header">
            <h3 class="post-title">${post.title}</h3>
            <span class="post-date">${dateStr}</span>
        </div>
        <div class="post-meta">
            <span class="author-name">👤 ${post.authorName || "匿名"}</span>
            <div style="margin-top:5px;">${tagsHtml}</div>
        </div>
        <p class="post-content">${snippet}</p>
        <div class="card-footer">
            <span class="read-more">回答を見る・相談に乗る &rarr;</span>
        </div>
      </article>
    `;

    postList.insertAdjacentHTML('beforeend', html);
  });
}

// 検索ボタン
if(searchBtn) {
    searchBtn.addEventListener('click', () => {
      const keyword = keywordInput.value.toLowerCase();
      if (!keyword) {
        renderPosts(allPosts);
        return;
      }
      const filtered = allPosts.filter(post => 
        (post.title && post.title.toLowerCase().includes(keyword)) || 
        (post.content && post.content.toLowerCase().includes(keyword))
      );
      renderPosts(filtered);
    });
}
