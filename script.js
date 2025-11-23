// script.js
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const auth = getAuth(app);

// ★重要：明示的に「ローカル（ブラウザ）に保存しろ」と命令する（念の為）
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    // 保存設定完了
  })
  .catch((error) => {
    console.error("保存設定エラー:", error);
  });


// ★重要：ページを開いた瞬間にログイン状態を監視する
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 【ログインしている時】
    console.log("ログイン中:", user.displayName);
    
    // 1. ログアウトボタンを表示するなどのUI操作があればここに書く
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) logoutBtn.style.display = "block"; // 表示

    // 2. ログインボタンがあれば隠す
    // const loginBtn = document.getElementById('loginBtn');
    // if(loginBtn) loginBtn.style.display = "none";

  } else {
    // 【ログインしていない時】
    console.log("未ログイン（ゲスト）");

    // 1. ログアウトボタンを隠す
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) logoutBtn.style.display = "none"; 

    // 2. ログイン必須のページ（post.htmlなど）に居るなら、強制的に追い出す
    // （index.html や archive.html はゲストでも見ていいなら除外する）
    if (window.location.pathname.includes('post.html')) {
        alert("ログインの有効期限が切れています。再度ログインしてください。");
        window.location.href = "login.html";
    }
  }
});
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase設定 (archive.htmlやdetail.htmlと同じ設定)
const firebaseConfig = {
  apiKey: "AIzaSyCwPtYMU_xiM5YgcqfNsCFESkj-Y4ICD5E",
  authDomain: "senpainet-84a24.firebaseapp.com",
  projectId: "senpainet-84a24",
  storageBucket: "senpainet-84a24.firebasestorage.app",
  messagingSenderId: "1053589632945",
  appId: "1:1053589632945:web:413919be47760675e4ef90",
  measurementId: "G-1GPKNSMMFZ"
};

// アプリの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM要素の取得
const postList = document.getElementById('postList');
const keywordInput = document.getElementById('keywordInput');
const searchBtn = document.getElementById('searchBtn');

// データを保持する配列（検索用）
let allPosts = [];

// Firestoreから投稿データをリアルタイム取得
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  allPosts = []; // リセット
  snapshot.forEach((doc) => {
    const data = doc.data();
    // IDを含めて配列に保存
    allPosts.push({
      id: doc.id, // ★ここ重要：詳細ページへのリンクに必要
      ...data
    });
  });
  renderPosts(allPosts); // 画面描画
});

// 投稿一覧を描画する関数
function renderPosts(posts) {
  postList.innerHTML = ""; // 一旦クリア

  if (posts.length === 0) {
    postList.innerHTML = "<p>投稿が見つかりませんでした。</p>";
    return;
  }

  posts.forEach(post => {
    // 日付のフォーマット
    const dateStr = post.createdAt ? post.createdAt.toDate().toLocaleDateString() : "日付不明";

    // 本文の抜粋（長すぎる場合は省略）
    const snippet = post.content.length > 60 ? post.content.substring(0, 60) + "..." : post.content;

    // タグがある場合のHTML生成（もしデータにあれば）
    // 今回はシンプルにするため省略していますが、必要ならここに追加

    // HTML生成
    // ★ポイント: onclickでdetail.htmlへ遷移させる。idパラメータを渡す。
    // style="cursor: pointer;" でクリックできることを視覚的に伝える。
    const html = `
      <article class="post-card" onclick="location.href='detail.html?id=${post.id}'" style="cursor: pointer;">
        <div class="post-header">
            <h3 class="post-title">${post.title}</h3>
            <span class="post-date">${dateStr}</span>
        </div>
        <div class="post-meta">
            <span class="author-name">👤 ${post.authorName || "匿名"}</span>
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

// 検索ボタンのイベント
searchBtn.addEventListener('click', () => {
  const keyword = keywordInput.value.toLowerCase();
  if (!keyword) {
    renderPosts(allPosts); // 空なら全表示
    return;
  }

  // タイトルか本文にキーワードが含まれるものをフィルタリング
  const filtered = allPosts.filter(post => 
    (post.title && post.title.toLowerCase().includes(keyword)) || 
    (post.content && post.content.toLowerCase().includes(keyword))
  );
  renderPosts(filtered);
});

// CSS調整用（archive.cssで足りない部分をJSで補完する場合、または既存CSSに合わせる）
// 既存のarchive.cssに .post-card:hover { transform: translateY(-3px); box-shadow: ... } 
// などがあると、クリックできる感じが出て良いです。

