import { db } from "./firebase.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const listContainer = document.getElementById("senpaiList");

async function loadSenpai() {
  // 卒業生のみ取得
  const q = query(collection(db, "users"), where("userType", "==", "卒業生"));
  const snapshot = await getDocs(q);

  listContainer.innerHTML = "";

  if (snapshot.empty) {
    listContainer.innerHTML = "<p style='text-align:center; grid-column:1/-1;'>まだ登録されている先輩はいません。</p>";
    return;
  }

  snapshot.forEach((doc) => {
    const user = doc.data();
    const icon = user.iconUrl || "https://placehold.co/50";
    const name = user.nickname || "名無し先輩";
    const bio = user.bio ? user.bio : "自己紹介はまだありません。";
    const tags = user.tags || [];

    // Bioを少し短くして表示
    const bioSnippet = bio.length > 50 ? bio.substring(0, 50) + "..." : bio;
    
    const tagsHtml = tags.map(t => 
        `<span class="tag">#${t}</span>`
    ).join("");

    const html = `
      <article class="post-card" style="cursor: default;">
        <div style="display:flex; align-items:center; margin-bottom:15px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
             <img src="${icon}" style="width:40px; height:40px; border-radius:50%; margin-right:10px; object-fit:cover; border:1px solid #eee;">
             <div>
                 <h3 style="margin:0; font-size:1rem; color:#1e3a8a;">${name}</h3>
                 <span style="font-size:0.8rem; color:#999;">${user.grade || ""}</span>
             </div>
        </div>
        
        <p style="font-size:0.9rem; color:#444; min-height:40px;">${bioSnippet}</p>
        
        <div class="tags" style="margin-top:auto;">${tagsHtml}</div>
      </article>
    `;
    listContainer.insertAdjacentHTML("beforeend", html);
  });
}

loadSenpai();
