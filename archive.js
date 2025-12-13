import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const postList = document.getElementById("postList");
const keywordInput = document.getElementById("keywordInput");
const searchBtn = document.getElementById("searchBtn");
const searchTagArea = document.getElementById("searchTagArea");

let allPostsData = [];

// 検索用タグリスト
const searchTags = [
  "一般入試", "AO入試", "DP", "課外活動", "履修", "海外大学", 
  "部活", "英検", "IELTS", "TOEFL", "模試", 
  "教育", "キャリア", "AI", "海外", "テクノロジー"
];

// === 1. データ読み込み ===
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  allPostsData = [];
  snapshot.forEach((doc) => {
    allPostsData.push({ id: doc.id, ...doc.data() });
  });
  
  // 初期表示
  performSearch(keywordInput ? keywordInput.value : "");
});

// === 2. 検索実行ロジック ===
function performSearch(keyword) {
  if (!keyword || keyword.trim() === "") {
    renderPosts(allPostsData);
    return;
  }

  const lowerKey = keyword.toLowerCase().trim();
  
  const filtered = allPostsData.filter(post => {
    const inTitle = post.title && post.title.toLowerCase().includes(lowerKey);
    const inContent = post.content && post.content.toLowerCase().includes(lowerKey);
    
    let inTags = false;
    if (post.tags && Array.isArray(post.tags)) {
        inTags = post.tags.some(t => t.toLowerCase().includes(lowerKey));
    }
    
    return inTitle || inContent || inTags;
  });

  renderPosts(filtered);
}

// === 3. 投稿表示関数 ===
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

    let tagsHtml = "";
    if (post.tags && Array.isArray(post.tags)) {
        tagsHtml = post.tags.map(tag => 
          `<span class="tag">#${tag}</span>`
        ).join("");
    }

    const replyCount = post.replies || 0;

    const html = `
      <article class="post-card" onclick="location.href='detail2.html?id=${post.id}'">
        <h3>${post.title || "無題"}</h3>
        <p>${snippet}</p>
        <div class="tags">${tagsHtml}</div>
        
        <div style="margin-bottom: 12px; font-size: 0.9rem; color: #4da6ff; font-weight: bold;">
           💬 回答 ${replyCount}件
        </div>

        <div style="font-size: 0.8rem; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 10px;">
           <div style="display:flex; align-items:center;">
             <img src="${post.authorIcon || 'https://placehold.co/20'}" style="width:20px; height:20px; border-radius:50%; margin-right:6px; object-fit:cover;">
             <span>${post.authorName || "匿名"}</span>
           </div>
           <span>${dateStr}</span>
        </div>
      </article>
    `;
    postList.insertAdjacentHTML("beforeend", html);
  });
}

// === 4. タグ検索UIの制御 ===

// タグ一覧を生成して表示
function renderSearchTags() {
  if (!searchTagArea) return;
  
  searchTagArea.innerHTML = "";
  searchTags.forEach(tag => {
    const chip = document.createElement("div");
    chip.className = "search-tag-chip";
    chip.textContent = "#" + tag;
    
    // タグクリック時
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      keywordInput.value = tag; 
      performSearch(tag);       
      searchTagArea.classList.remove("active");
    });
    
    searchTagArea.appendChild(chip);
  });
}

// 検索バーをクリックしたらタグを表示
if (keywordInput) {
    keywordInput.addEventListener("click", (e) => {
        e.stopPropagation();
        renderSearchTags();
        if(searchTagArea) searchTagArea.classList.add("active");
    });

    // リアルタイム検索
    keywordInput.addEventListener("input", () => {
        performSearch(keywordInput.value);
    });
}

// 検索ボタンクリック
if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!keywordInput.value.trim()) {
            renderSearchTags();
            if(searchTagArea) searchTagArea.classList.add("active");
        } else {
            performSearch(keywordInput.value);
        }
    });
}

// 画面外クリックでタグを閉じる
document.addEventListener("click", (e) => {
    if (searchTagArea && !searchTagArea.contains(e.target) && e.target !== keywordInput && e.target !== searchBtn) {
        searchTagArea.classList.remove("active");
    }
});
