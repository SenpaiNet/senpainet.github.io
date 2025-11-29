import { db } from "./firebase.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const postList = document.getElementById("postList");

async function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  postList.innerHTML = ""; // 一旦クリア

  snapshot.forEach((doc) => {
    const post = doc.data();
    const id = doc.id;

    const card = document.createElement("a");
    card.href = `detail.html?id=${id}`;
    card.className = "post-card";

    card.innerHTML = `
      <h2>${post.title}</h2>
      <p>${post.content.substring(0, 60)}...</p>
      <div class="tag-box">${post.tags.map(t => `<span>#${t}</span>`).join("")}</div>
      <div class="reply-count">💬 ${post.replies} 件</div>
    `;

    postList.appendChild(card);
  });
}

loadPosts();
