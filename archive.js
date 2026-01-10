import { db, auth } from "./firebase.js"; 
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const postList = document.getElementById("postList");
const scrollLoader = document.getElementById("scrollLoader");
const keywordInput = document.getElementById("keywordInput");
const sortSelect = document.getElementById("sortSelect");
const unansweredCheck = document.getElementById("unansweredCheck");
const bookmarkCheck = document.getElementById("bookmarkCheck");

// データ管理
let allPostsData = [];    // Firestoreからの全データ
let filteredPosts = [];   // フィルタ後のデータ
let renderedCount = 0;    // 現在描画済みの数
const CHUNK_SIZE = 12;    // 1回に描画する数

let blockedUsers = []; 
let userBookmarks = [];

// === ユーザー情報取得 ===
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const uDoc = await getDoc(doc(db, "users", user.uid));
            if(uDoc.exists()) {
                const data = uDoc.data();
                blockedUsers = data.blocked || [];
                userBookmarks = data.bookmarks || [];
            }
        } catch(e) {}
    }
    fetchPosts();
});

// === データ取得 (リアルタイム) ===
function fetchPosts() {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        allPostsData = [];
        snapshot.forEach((doc) => {
            allPostsData.push({ id: doc.id, ...doc.data() });
        });
        applyFilters();
    });
}

// === フィルタリング & ソート ===
function applyFilters() {
    let results = allPostsData.filter(p => !blockedUsers.includes(p.authorId));

    const keyword = keywordInput ? keywordInput.value.toLowerCase().trim() : "";
    if (keyword) {
        results = results.filter(post => {
            const inTitle = post.title && post.title.toLowerCase().includes(keyword);
            const inContent = post.content && post.content.toLowerCase().includes(keyword);
            let inTags = false;
            if (post.tags) inTags = post.tags.some(t => t.toLowerCase().includes(keyword));
            return inTitle || inContent || inTags;
        });
    }

    if (unansweredCheck && unansweredCheck.checked) {
        results = results.filter(p => !p.isSolved);
    }
    if (bookmarkCheck && bookmarkCheck.checked) {
        results = results.filter(p => userBookmarks.includes(p.id));
    }

    // ソート
    if (sortSelect) {
        const sortType = sortSelect.value;
        results.sort((a, b) => {
            if (sortType === 'popular') return (b.viewCount || 0) - (a.viewCount || 0);
            if (sortType === 'updated') {
                const ta = a.lastUpdatedAt ? a.lastUpdatedAt.seconds : (a.createdAt ? a.createdAt.seconds : 0);
                const tb = b.lastUpdatedAt ? b.lastUpdatedAt.seconds : (b.createdAt ? b.createdAt.seconds : 0);
                return tb - ta;
            }
            return (b.createdAt ? b.createdAt.seconds : 0) - (a.createdAt ? a.createdAt.seconds : 0);
        });
    }

    filteredPosts = results;
    renderedCount = 0;
    postList.innerHTML = ""; // リセット
    renderNextBatch();       // 最初のチャンクを描画
}

// === (74) 無限スクロール用描画関数 ===
function renderNextBatch() {
    if (renderedCount >= filteredPosts.length) {
        scrollLoader.classList.remove("active");
        if (filteredPosts.length === 0 && renderedCount === 0) {
            postList.innerHTML = "<div style='grid-column:1/-1; text-align:center;'>投稿が見つかりませんでした</div>";
        }
        return;
    }

    scrollLoader.classList.add("active");
    
    // 少し遅延させて「読み込み感」を出す（UX向上）
    // 実際はDOM生成時間を分散させる効果がある
    setTimeout(() => {
        const nextBatch = filteredPosts.slice(renderedCount, renderedCount + CHUNK_SIZE);
        
        nextBatch.forEach(post => {
            const html = createPostCard(post);
            postList.insertAdjacentHTML("beforeend", html);
        });

        renderedCount += nextBatch.length;
        
        // まだデータがあるか？
        if (renderedCount >= filteredPosts.length) {
            scrollLoader.classList.remove("active");
        }
    }, 300);
}

function createPostCard(post) {
    let dateStr = "日付不明";
    if (post.createdAt) dateStr = post.createdAt.toDate().toLocaleDateString();
    
    let rawContent = post.content || "";
    rawContent = rawContent.replace(/[#*`>!-]/g, ""); 
    const snippet = rawContent.length > 40 ? rawContent.substring(0, 40) + "..." : rawContent;

    const tagsHtml = (post.tags || []).map(tag => `<span class="tag">#${tag}</span>`).join("");
    
    let statusBadge = "";
    if(post.isSolved) statusBadge = `<span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:10px; font-size:0.7rem; font-weight:bold; margin-right:6px;">✓ 解決済</span>`;

    return `
      <article class="post-card" onclick="location.href='detail2.html?id=${post.id}'" style="cursor:pointer; animation:fadeIn 0.3s;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
             <div>${statusBadge}</div>
             <span style="font-size:0.75rem; color:var(--text-sub);">${dateStr}</span>
        </div>
        <h3 style="margin-top:0;">${post.title || "無題"}</h3>
        <p>${snippet}</p>
        <div class="tags">${tagsHtml}</div>
        <div class="card-footer">
            <div style="margin-bottom: 12px; font-size: 0.85rem; color: var(--primary-color); font-weight: bold; display:flex; gap:10px;">
               <span>💬 ${post.replies||0}</span>
               <span style="color:var(--text-sub);">👀 ${post.viewCount||0}</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-sub); display: flex; align-items: center; border-top: 1px solid var(--border-color); padding-top: 10px;">
               <img src="${post.authorIcon || 'https://placehold.co/20'}" style="width:20px; height:20px; border-radius:50%; margin-right:6px; object-fit:cover;">
               <span>${post.authorName || "匿名"}</span>
            </div>
        </div>
      </article>
    `;
}

// === Intersection Observer (スクロール検知) ===
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        renderNextBatch();
    }
}, { rootMargin: "100px" });

observer.observe(scrollLoader);

// イベントリスナー
if (sortSelect) sortSelect.addEventListener("change", applyFilters);
if (unansweredCheck) unansweredCheck.addEventListener("change", applyFilters);
if (bookmarkCheck) bookmarkCheck.addEventListener("change", applyFilters);
if (keywordInput) keywordInput.addEventListener("input", applyFilters);

// タグフィルター (既存コード維持)
const tagFilterContainer = document.getElementById("tagFilter");
if (tagFilterContainer) {
    tagFilterContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("filter-tag")) {
            const tag = e.target.dataset.tag;
            const isActive = e.target.classList.contains("active");
            document.querySelectorAll(".filter-tag").forEach(el => el.classList.remove("active"));
            if (!isActive) {
                e.target.classList.add("active");
                if(keywordInput) keywordInput.value = tag;
            } else {
                if(keywordInput) keywordInput.value = "";
            }
            applyFilters();
        }
    });
}
