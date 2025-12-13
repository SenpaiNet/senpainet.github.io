import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const postList = document.getElementById("postList");
const keywordInput = document.getElementById("keywordInput");
const searchTagArea = document.getElementById("searchTagArea");
const searchBtn = document.getElementById("searchBtn");

// 検索用に全データを保持しておく変数
let allPostsData = [];

// 検索用タグリスト
const searchTags = ["一般入試", "AO入試", "DP", "課外活動", "履修", "海外大学", "部活", "英検", "IELTS", "TOEFL", "模試", "教育", "キャリア", "AI", "海外", "テクノロジー"];

// === 1. データの読み込み ===
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  allPostsData = []; // リセット

  snapshot.forEach((doc) => {
    allPostsData.push({
      id: doc.id,
      ...doc.data()
    });
  });

  // 初回表示
  renderPosts(allPostsData);
});

// === 2. 投稿を表示する関数 ===
function renderPosts(posts) {
  postList.innerHTML = "";

  if (posts.length === 0) {
    postList.innerHTML = "<div style='grid-column: 1 / -1; text-align:center; padding:20px; color:#666;'>該当する投稿が見つかりませんでした。</div>";
    return;
  }

  posts.forEach((post) => {
    let dateStr = "日付不明";
    if (post.createdAt && typeof post.createdAt.toDate === 'function') {
      dateStr = post.createdAt.toDate().toLocaleDateString();
    }

    const contentStr = post.content || "";
    const snippet = contentStr.length > 40 ? contentStr.substring(0, 40) + "..." : contentStr;

    const tagsHtml = (post.tags || []).map(tag => 
      `<span class="tag" style="background:#e0f2fe; color:#0284c7; padding:2px 6px; border-radius:10px; font-size:0.7rem; margin-right:3px;">#${tag}</span>`
    ).join("");

    const html = `
      <article class="post-card" onclick="location.href='detail2.html?id=${post.id}'" style="
        background: white;
        border-radius: 12px;
        padding: 15px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        cursor: pointer;
        transition: transform 0.2s;
        display: flex;
        flex-direction: column;
        height: 100%;
        box-sizing: border-box;
      ">
        <h3 style="margin:0 0 8px 0; color:#1e3a8a; font-size:1rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${post.title || "無題"}</h3>
        <p style="color:#475569; font-size:0.85rem; flex-grow:1; margin-bottom:10px; word-break: break-all;">${snippet}</p>
        <div class="tags" style="margin-bottom:8px; display:flex; flex-wrap:wrap; gap:4px;">${tagsHtml}</div>
        <div style="font-size: 0.75rem; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; margin-top:auto;">
           <div style="display:flex; align-items:center; overflow:hidden;">
             <img src="${post.authorIcon || 'https://placehold.co/20'}" style="width:18px; height:18px; border-radius:50%; margin-right:4px; flex-shrink:0;">
             <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px;">${post.authorName || "匿名"}</span>
           </div>
           <span>${dateStr}</span>
        </div>
      </article>
    `;

    postList.insertAdjacentHTML("beforeend", html);
  });
}

// === 3. 検索バーとタグの挙動制御 (改良版) ===

// タグ一覧を生成
function renderSearchTags() {
  searchTagArea.innerHTML = "";
  searchTags.forEach(tag => {
    const span = document.createElement("span");
    span.className = "search-tag";
    span.textContent = "#" + tag;
    
    // タグをクリックした時の処理
    span.addEventListener("click", (e) => {
      e.stopPropagation(); // クリックイベントが親に伝わらないようにする
      keywordInput.value = tag; 
      performSearch(tag);       
      searchTagArea.style.display = "none";
    });
    
    searchTagArea.appendChild(span);
  });
}

// 検索バー(入力欄)をクリックしたらタグを表示
keywordInput.addEventListener("click", (e) => {
  e.stopPropagation(); // 閉じる処理が走らないようにする
  renderSearchTags();
  searchTagArea.style.display = "flex";
});

// 検索ボタンをクリックした時の処理
searchBtn.addEventListener("click", (e) => {
  // 入力が空ならタグを出す親切設計
  if (!keywordInput.value.trim()) {
    e.stopPropagation();
    renderSearchTags();
    searchTagArea.style.display = "flex";
    return;
  }
  // 入力があれば検索実行
  performSearch(keywordInput.value);
});

// 画面のどこかをクリックした時の処理（タグエリア外なら閉じる）
document.addEventListener("click", (e) => {
  // クリックされた場所が「検索バー」でも「タグエリア」でもない場合
  if (e.target !== keywordInput && !searchTagArea.contains(e.target)) {
    searchTagArea.style.display = "none";
  }
});

// === 4. 検索実行ロジック ===
function performSearch(keyword) {
  if (!keyword) {
    renderPosts(allPostsData); // 空なら全件表示
    return;
  }

  const lowerKey = keyword.toLowerCase();
  
  const filtered = allPostsData.filter(post => {
    const inTitle = post.title && post.title.toLowerCase().includes(lowerKey);
    const inContent = post.content && post.content.toLowerCase().includes(lowerKey);
    const inTags = post.tags && post.tags.some(t => t.toLowerCase().includes(lowerKey));
    
    return inTitle || inContent || inTags;
  });

  renderPosts(filtered);
}

// Enterキーでも検索
keywordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    performSearch(keywordInput.value);
    searchTagArea.style.display = "none";
  }
});
