import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const postList = document.getElementById("postList");

// 投稿を新しい順に取得するクエリ
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

console.log("読み込み開始...");

// リアルタイムでデータを監視
onSnapshot(q, 
  // === 成功時 ===
  (snapshot) => {
    postList.innerHTML = ""; // クリア

    if (snapshot.empty) {
      postList.innerHTML = "<div style='text-align:center; padding:20px; color:#666;'>まだ投稿がありません。<br>右上のボタンから最初の投稿をしてみましょう！</div>";
      return;
    }

    snapshot.forEach((doc) => {
      const post = doc.data();
      
      // 日付変換（エラー防止付き）
      let dateStr = "日付不明";
      if (post.createdAt && typeof post.createdAt.toDate === 'function') {
        dateStr = post.createdAt.toDate().toLocaleDateString();
      }

      // 60文字制限
      const contentStr = post.content || "";
      const snippet = contentStr.length > 60 ? contentStr.substring(0, 60) + "..." : contentStr;

      // タグ生成
      const tagsHtml = (post.tags || []).map(tag => 
        `<span class="tag" style="background:#e0f2fe; color:#0284c7; padding:2px 8px; border-radius:10px; font-size:0.8rem; margin-right:5px;">#${tag}</span>`
      ).join("");

      // HTML生成
      const html = `
        <article class="post-card" onclick="location.href='detail2.html?id=${doc.id}'" style="
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          cursor: pointer;
          transition: transform 0.2s;
        ">
          <h3 style="margin:0 0 10px 0; color:#1e3a8a;">${post.title || "無題"}</h3>
          <p style="color:#475569; font-size:0.95rem;">${snippet}</p>
          <div class="tags" style="margin:10px 0;">${tagsHtml}</div>
          <div style="font-size: 0.85rem; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
             <div style="display:flex; align-items:center;">
               <img src="${post.authorIcon || 'https://placehold.co/20'}" style="width:20px; height:20px; border-radius:50%; margin-right:5px;">
               <span>${post.authorName || "匿名"}</span>
             </div>
             <span>📅 ${dateStr}</span>
          </div>
          <div style="margin-top: 10px; font-weight: bold; color: #4da6ff; font-size:0.9rem;">
             💬 返信 ${post.replies || 0}件
          </div>
        </article>
      `;

      postList.insertAdjacentHTML("beforeend", html);
    });
  },
  // === エラー時 (ここが重要) ===
  (error) => {
    console.error("詳細エラー:", error);
    
    let msg = "データの読み込みに失敗しました。\n";
    
    if (error.code === 'permission-denied') {
      msg += "原因: データベースの権限がありません。\n対策: Firebaseコンソールの「Firestore Rules」を修正してください。";
    } else if (error.code === 'failed-precondition') {
      msg += "原因: インデックスが必要です。\n対策: Consoleに出ているURLをクリックしてインデックスを作成してください。";
    } else {
      msg += error.message;
    }
    
    alert(msg);
  }
);
