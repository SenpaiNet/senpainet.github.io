import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
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
// 1. ログイン状態の監視
// ---------------------------------------------------
onAuthStateChanged(auth, (user) => {
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (user) {
    // 【ログイン中】
    console.log("ログイン中:", user.displayName);
    if(logoutBtn) {
        logoutBtn.innerHTML = "🚪 ログアウト";
        logoutBtn.href = "#"; 
    }
  } else {
    // 【未ログイン】
    console.log("ゲスト閲覧中");
    // 何もしない（alertもlocation.hrefも書かない！）
    
    // ログアウトボタンをログインボタンに変える処理だけ残す
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.innerHTML = "🔑 ログイン";
        logoutBtn.href = "login.html"; 
    }
}
});

// ---------------------------------------------------
// 2. ログアウト処理
// ---------------------------------------------------
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
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
// 3. 投稿一覧の表示
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
    
    // タグ表示用
    let tagsHtml = "";
    if (post.tags && Array.isArray(post

