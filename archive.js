import { db } from "./firebase.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const postList = document.getElementById("postList");

async function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  postList.innerHTML = "";

  snap.forEach(doc => {
    const p = doc.data();
    const id = doc.id;

    const card = document.createElement("a");
    card.className = "post-card";
    card.href = `detail.html?id=${id}`;

    card.innerHTML = `
      <h2>${p.title}</h2>
      <p>${p.content.substring(0, 60)}...</p>
      <div class="tag-box">
        ${p.tags.map(t => `<span>#${t}</span>`).join("")}
      </div>
      <div class="reply-count">💬 ${p.replies}件</div>
    `;

    postList.appendChild(card);
  });
}

loadPosts();
