import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const postList = document.getElementById("postList");

// 投稿を新しい順に取得するクエリ
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

// リアルタイムでデータを監視して表示
onSnapshot(q, (snapshot) => {
  postList.innerHTML = ""; // 一旦クリア

  if (snapshot.empty) {
    postList.innerHTML = "<p style='text-align:center; color:#666;'>まだ投稿がありません。</p>";
    return;
  }

  snapshot.forEach((doc) => {
    const post = doc.data();
    
    // 日付のフォーマット
    let dateStr = "日付不明";
    if (post.createdAt) {
      dateStr = post.createdAt.toDate().toLocaleDateString();
    }

    // 本文の省略表示（60文字まで）
    const snippet = post.content.length > 60 ? post.content.substring(0, 60) + "..." : post.content;

    // タグのHTML生成
    const tagsHtml = (post.tags || []).map(tag => 
      `<span class="tag">#${tag}</span>`
    ).join("");

    // カードのHTML生成
    const html = `
      <article class="post-card" onclick="location.href='detail2.html?id=${doc.id}'" style="cursor: pointer;">
        <h3>${post.title}</h3>
        <p>${snippet}</p>
        <div class="tags">${tagsHtml}</div>
        <div style="margin-top: 10px; font-size: 0.85rem; color: #888; display: flex; justify-content: space-between;">
           <span>👤 ${post.authorName || "匿名"}</span>
           <span>📅 ${dateStr}</span>
        </div>
        <div style="margin-top: 8px; font-weight: bold; color: #4da6ff;">
           💬 返信 ${post.replies || 0}件
        </div>
      </article>
    `;

    postList.insertAdjacentHTML("beforeend", html);
  });
});
