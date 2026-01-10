import { db, auth } from "./firebase.js"; 
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const postList = document.getElementById("postList");
const keywordInput = document.getElementById("keywordInput");
const searchBtn = document.getElementById("searchBtn");
const searchTagArea = document.getElementById("searchTagArea");
const tagFilterContainer = document.getElementById("tagFilter");

// ▼ 追加: 新機能用UI要素
const sortSelect = document.getElementById("sortSelect");
const unansweredCheck = document.getElementById("unansweredCheck");
const bookmarkCheck = document.getElementById("bookmarkCheck");

let allPostsData = [];
let blockedUsers = []; 
let userBookmarks = []; // 追加: ブックマークリスト

// 統一タグリスト
const searchTags = [
  "一般入試", "AO入試", "DP", "課外活動", "履修", "海外大学", 
  "部活", "英検", "IELTS", "TOEFL", "模試", 
  "教育", "キャリア", "AI", "海外", "テクノロジー",
  "理系", "文系", "ボランティア", "帰国生"
];

// === 0. ユーザー情報（ブロック・ブックマーク）取得 ===
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const uDoc = await getDoc(doc(db, "users", user.uid));
            if(uDoc.exists()) {
                const data = uDoc.data();
                blockedUsers = data.blocked || [];
                userBookmarks = data.bookmarks || []; // 追加
            }
        } catch(e) { console.error(e); }
    } else {
        blockedUsers = [];
        userBookmarks = [];
    }
    // ユーザー情報取得後にデータを再表示
    performSearch();
});

// === 1. データ読み込み ===
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  allPostsData = [];
  snapshot.forEach((doc) => {
    allPostsData.push({ id: doc.id, ...doc.data() });
  });
  
  // 初期表示
  performSearch();
});

// === 2. 検索・フィルタリング・ソート実行ロジック ===
function performSearch() {
  const keyword = keywordInput ? keywordInput.value : "";
  
  // 1. ブロックユーザーの除外
  let results = allPostsData.filter(p => !blockedUsers.includes(p.authorId));

  // 2. キーワード検索
  if (keyword && keyword.trim() !== "") {
      const lowerKey = keyword.toLowerCase().trim();
      results = results.filter(post => {
        const inTitle = post.title && post.title.toLowerCase().includes(lowerKey);
        const inContent = post.content && post.content.toLowerCase().includes(lowerKey);
        let inTags = false;
        if (post.tags && Array.isArray(post.tags)) {
            inTags = post.tags.some(t => t.toLowerCase().includes(lowerKey));
        }
        return inTitle || inContent || inTags;
      });
  }

  // 3. 未回答フィルタ (回答募集中のみ)
  if (unansweredCheck && unansweredCheck.checked) {
      results = results.filter(p => !p.isSolved);
  }

  // 4. ブックマークフィルタ
  if (bookmarkCheck && bookmarkCheck.checked) {
      results = results.filter(p => userBookmarks.includes(p.id));
  }

  // 5. ソート処理
  if (sortSelect) {
      const sortType = sortSelect.value;
      results.sort((a, b) => {
          if (sortType === 'popular') {
              // 閲覧数順 (降順)
              return (b.viewCount || 0) - (a.viewCount || 0);
          } else if (sortType === 'updated') {
              // 最終更新順 (降順)
              const ta = a.lastUpdatedAt ? a.lastUpdatedAt.seconds : (a.createdAt ? a.createdAt.seconds : 0);
              const tb = b.lastUpdatedAt ? b.lastUpdatedAt.seconds : (b.createdAt ? b.createdAt.seconds : 0);
              return tb - ta;
          } else {
              // 新着順 (作成日降順) - デフォルト
              const ta = a.createdAt ? a.createdAt.seconds : 0;
              const tb = b.createdAt ? b.createdAt.seconds : 0;
              return tb - ta;
          }
      });
  }

  renderPosts(results);
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

    // Markdown記号を除去してスニペット作成
    let rawContent = post.content || "";
    rawContent = rawContent.replace(/[#*`>!-]/g, ""); 
    const snippet = rawContent.length > 40 ? rawContent.substring(0, 40) + "..." : rawContent;

    let tagsHtml = "";
    if (post.tags && Array.isArray(post.tags)) {
        tagsHtml = post.tags.map(tag => 
          `<span class="tag">#${tag}</span>`
        ).join("");
    }

    const replyCount = post.replies || 0;
    const viewCount = post.viewCount || 0; // 閲覧数

    // 解決済みバッジ
    let statusBadge = "";
    if(post.isSolved) {
        statusBadge = `<span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:10px; font-size:0.7rem; font-weight:bold; margin-right:6px;">✓ 解決済</span>`;
    }

    const html = `
      <article class="post-card" onclick="location.href='detail2.html?id=${post.id}'" style="cursor:pointer;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
             <div>${statusBadge}</div>
             <span style="font-size:0.75rem; color:#999;">${dateStr}</span>
        </div>
        
        <h3 style="margin-top:0;">${post.title || "無題"}</h3>
        <p>${snippet}</p>
        <div class="tags">${tagsHtml}</div>
        
        <div class="card-footer" style="margin-top:auto;">
            <div style="margin-bottom: 12px; font-size: 0.85rem; color: #4da6ff; font-weight: bold; display:flex; gap:10px;">
               <span>💬 ${replyCount}</span>
               <span style="color:#94a3b8;">👀 ${viewCount}</span>
            </div>

            <div style="font-size: 0.8rem; color: #94a3b8; display: flex; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 10px;">
               <img src="${post.authorIcon || 'https://placehold.co/20'}" style="width:20px; height:20px; border-radius:50%; margin-right:6px; object-fit:cover;">
               <span>${post.authorName || "匿名"}</span>
            </div>
        </div>
      </article>
    `;
    postList.insertAdjacentHTML("beforeend", html);
  });
}

// === 4. イベントリスナー ===
// UI変更時に再検索
if (sortSelect) sortSelect.addEventListener("change", performSearch);
if (unansweredCheck) unansweredCheck.addEventListener("change", performSearch);
if (bookmarkCheck) bookmarkCheck.addEventListener("change", performSearch);
if (keywordInput) keywordInput.addEventListener("input", performSearch);

// タグフィルタークリック
if (tagFilterContainer) {
    tagFilterContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("filter-tag")) {
            const tag = e.target.dataset.tag;
            
            // 選択状態の切り替え
            const isActive = e.target.classList.contains("active");
            document.querySelectorAll(".filter-tag").forEach(el => el.classList.remove("active"));
            
            if (!isActive) {
                e.target.classList.add("active");
                keywordInput.value = tag;
            } else {
                keywordInput.value = ""; // 解除
            }
            performSearch();
        }
    });
}

// 検索バー入力時のポップアップタグ制御
function renderSearchTags() {
  if (!searchTagArea) return;
  searchTagArea.innerHTML = "";
  searchTags.forEach(tag => {
    const chip = document.createElement("div");
    chip.className = "search-tag-chip";
    chip.textContent = "#" + tag;
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      keywordInput.value = tag; 
      performSearch();       
      searchTagArea.classList.remove("active");
    });
    searchTagArea.appendChild(chip);
  });
}

if (keywordInput) {
    keywordInput.addEventListener("click", (e) => {
        e.stopPropagation();
        renderSearchTags();
        if(searchTagArea) searchTagArea.classList.add("active");
    });
}

if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!keywordInput.value.trim()) {
            renderSearchTags();
            if(searchTagArea) searchTagArea.classList.add("active");
        } else {
            performSearch();
        }
    });
}

document.addEventListener("click", (e) => {
    if (searchTagArea && !searchTagArea.contains(e.target) && e.target !== keywordInput && e.target !== searchBtn) {
        searchTagArea.classList.remove("active");
    }
});
